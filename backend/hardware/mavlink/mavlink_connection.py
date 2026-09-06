import time
import threading
import logging
import collections
from typing import Optional, Dict, Any, List, Deque
from backend.telemetry.schema import ConnectionStatus
from backend.hardware.mavlink.mavlink_parser import mavlink_parser
from backend.hardware.mavlink.telemetry_mapper import telemetry_mapper

logger = logging.getLogger(__name__)

class MAVLinkConnectionManager:
    """
    Real-Time Hardware-First MAVLink Ingress Manager for APM / ArduPilot Flight Controllers.
    Manages USB-Serial and UDP network streams with automatic port detection, reconnect loop,
    packet loss tracking, message rate computation, and rolling frame traces.
    """
    def __init__(self):
        self.connection = None
        self.connection_status: ConnectionStatus = ConnectionStatus.DISCONNECTED
        self.connection_type: str = "USB_SERIAL"  # "USB_SERIAL" or "UDP"
        self.connection_string: str = "COM3"
        self.baud_rate: int = 115200
        self.udp_ip: str = "0.0.0.0"
        self.udp_port: int = 14550
        self.auto_reconnect: bool = True
        
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.reconnect_thread: Optional[threading.Thread] = None
        
        # Diagnostic & Liveness State
        self.last_packet_time: float = 0.0
        self.last_heartbeat_time: float = 0.0
        self.packets_received: int = 0
        self.packets_dropped: int = 0
        self.last_seq: Optional[int] = None
        self.last_error: Optional[str] = None
        
        # APM Identity & Protocol
        self.system_id: Optional[int] = None
        self.component_id: Optional[int] = None
        self.mavlink_protocol: str = "MAVLink 2.0"
        self.autopilot_type: Optional[str] = "ArduPilot (APM)"
        
        # Sliding rate tracker (timestamps of last 100 packets)
        self._packet_timestamps: Deque[float] = collections.deque(maxlen=100)
        
        # Rolling message trace (last 50 decoded frames)
        self.recent_messages: Deque[Dict[str, Any]] = collections.deque(maxlen=50)

    @staticmethod
    def list_available_ports() -> List[Dict[str, str]]:
        """
        Scans and returns ONLY active physical USB/UART serial telemetry ports.
        Filters out Bluetooth virtual COM ports and phantom software endpoints.
        """
        ports = []
        try:
            import serial.tools.list_ports
            for p in serial.tools.list_ports.comports():
                desc_lower = (p.description or "").lower()
                hwid_lower = (p.hwid or "").lower()
                
                # Filter out standard Windows Bluetooth serial links
                if "bluetooth" in desc_lower or "bthenum" in hwid_lower or "bth\\" in hwid_lower:
                    continue
                    
                # Must have USB provenance, real hardware VID/PID, or physical UART device
                is_usb_telemetry = (
                    p.vid is not None or
                    "usb" in hwid_lower or
                    "usb" in desc_lower or
                    "ftdi" in desc_lower or
                    "cp210" in desc_lower or
                    "ch34" in desc_lower or
                    "prolific" in desc_lower or
                    "stm" in desc_lower or
                    "arduino" in desc_lower or
                    "ardupilot" in desc_lower or
                    "pixhawk" in desc_lower or
                    "cube" in desc_lower or
                    "uart" in desc_lower or
                    "ttyusb" in p.device.lower() or
                    "ttyacm" in p.device.lower()
                )
                
                if is_usb_telemetry:
                    ports.append({
                        "port": p.device,
                        "description": p.description,
                        "hwid": p.hwid
                    })
        except Exception as e:
            logger.warning(f"Error scanning COM ports: {e}")
        return ports

    def configure_serial(self, port: str = "COM3", baud: int = 115200):
        self.connection_type = "USB_SERIAL"
        self.connection_string = port
        self.baud_rate = baud

    def configure_udp(self, ip: str = "0.0.0.0", port: int = 14550):
        self.connection_type = "UDP"
        self.udp_ip = ip
        self.udp_port = port
        self.connection_string = f"udpin:{ip}:{port}"

    def connect(self, connection_string: Optional[str] = None, baud: Optional[int] = None, conn_type: Optional[str] = None) -> bool:
        if connection_string:
            self.connection_string = connection_string
        if baud:
            self.baud_rate = baud
        if conn_type:
            self.connection_type = conn_type
            
        self.disconnect()
        self.connection_status = ConnectionStatus.CONNECTING
        
        try:
            from pymavlink import mavutil
            logger.info(f"Connecting to APM on {self.connection_string} (baud: {self.baud_rate}, type: {self.connection_type})...")
            
            if self.connection_string.startswith("udp") or self.connection_string.startswith("tcp") or self.connection_type == "UDP":
                target = self.connection_string if self.connection_string.startswith("udp") else f"udpin:{self.udp_ip}:{self.udp_port}"
                self.connection = mavutil.mavlink_connection(target)
            else:
                self.connection = mavutil.mavlink_connection(self.connection_string, baud=self.baud_rate)
                
            self.running = True
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            self.connection_status = ConnectionStatus.CONNECTED
            self.last_error = None
            return True
        except Exception as e:
            self.last_error = str(e)
            self.connection_status = ConnectionStatus.ERROR
            logger.warning(f"APM connection failed on {self.connection_string}: {e}")
            return False

    def disconnect(self):
        self.running = False
        if self.connection:
            try:
                self.connection.close()
            except Exception:
                pass
            self.connection = None
        self.connection_status = ConnectionStatus.DISCONNECTED

    def _read_loop(self):
        while self.running and self.connection:
            try:
                msg = self.connection.recv_match(blocking=False)
                if msg:
                    now = time.time()
                    self.last_packet_time = now
                    self.packets_received += 1
                    self._packet_timestamps.append(now)
                    self.connection_status = ConnectionStatus.CONNECTED
                    
                    # Capture Protocol & System Identity
                    header = getattr(msg, "_header", None)
                    if header:
                        msg_src_sys = getattr(header, "srcSystem", None)
                        msg_src_comp = getattr(header, "srcComponent", None)
                        msg_seq = getattr(header, "seq", None)
                        
                        if msg_src_sys is not None:
                            self.system_id = msg_src_sys
                        if msg_src_comp is not None:
                            self.component_id = msg_src_comp
                            
                        # Packet loss estimation based on sequence number jumps
                        if msg_seq is not None:
                            if self.last_seq is not None:
                                expected_seq = (self.last_seq + 1) % 256
                                if msg_seq != expected_seq:
                                    diff = (msg_seq - expected_seq) % 256
                                    if diff < 50:
                                        self.packets_dropped += diff
                            self.last_seq = msg_seq
                            
                    msg_type = msg.get_type()
                    if msg_type == "HEARTBEAT":
                        self.last_heartbeat_time = now
                    
                    parsed = mavlink_parser.parse_message(msg)
                    if parsed:
                        telemetry_mapper.ingest_mavlink_dict(parsed)
                        
                        # Store in diagnostic trace
                        fields = {k: v for k, v in parsed.items() if k != "msg_type"}
                        self.recent_messages.appendleft({
                            "timestamp": round(now, 3),
                            "msg_type": msg_type,
                            "sys_id": self.system_id or 1,
                            "comp_id": self.component_id or 1,
                            "fields": fields
                        })
                else:
                    time.sleep(0.005)
            except Exception as e:
                self.last_error = str(e)
                self.connection_status = ConnectionStatus.ERROR
                time.sleep(0.05)

    def compute_message_rate(self) -> float:
        """Calculates current telemetry message reception rate in Hz."""
        if len(self._packet_timestamps) < 2:
            return 0.0
        time_span = self._packet_timestamps[-1] - self._packet_timestamps[0]
        if time_span <= 0.001:
            return 0.0
        return round((len(self._packet_timestamps) - 1) / time_span, 1)

    def get_status(self) -> Dict[str, Any]:
        now = time.time()
        is_stale = (now - self.last_packet_time > 3.0) if self.last_packet_time > 0 else True
        
        status = self.connection_status
        if self.connection_status == ConnectionStatus.CONNECTED and is_stale:
            status = ConnectionStatus.STALE
        elif not self.running:
            status = ConnectionStatus.DISCONNECTED

        return {
            "is_connected": (status == ConnectionStatus.CONNECTED),
            "status": status.value,
            "connection_type": self.connection_type,
            "connection_string": self.connection_string,
            "baud_rate": self.baud_rate,
            "packets_received": self.packets_received,
            "packets_dropped": self.packets_dropped,
            "message_rate_hz": self.compute_message_rate(),
            "last_packet_age_sec": round(now - self.last_packet_time, 2) if self.last_packet_time > 0 else None,
            "last_error": self.last_error
        }

    def get_detailed_diagnostics(self) -> Dict[str, Any]:
        """Provides full real-time APM telemetry validation telemetry & diagnostic metrics."""
        now = time.time()
        rate_hz = self.compute_message_rate()
        age_ms = round((now - self.last_packet_time) * 1000.0, 1) if self.last_packet_time > 0 else None
        heartbeat_age_sec = round(now - self.last_heartbeat_time, 2) if self.last_heartbeat_time > 0 else None
        heartbeat_received = (heartbeat_age_sec is not None and heartbeat_age_sec < 4.0)
        
        status = self.get_status()["status"]
        
        return {
            "apm_connection": status,
            "heartbeat": "RECEIVED" if heartbeat_received else "NOT RECEIVED",
            "system_id": self.system_id if self.system_id is not None else 1,
            "component_id": self.component_id if self.component_id is not None else 1,
            "mavlink_protocol": self.mavlink_protocol,
            "autopilot_type": self.autopilot_type,
            "connection_type": self.connection_type,
            "connection_string": self.connection_string,
            "baud_rate": self.baud_rate,
            "telemetry_age_ms": age_ms,
            "message_rate_hz": rate_hz,
            "packets_received": self.packets_received,
            "packets_dropped": self.packets_dropped,
            "last_message_timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.last_packet_time)) if self.last_packet_time > 0 else "N/A",
            "last_error": self.last_error,
            "field_provenance": telemetry_mapper.get_field_provenance(),
            "message_discovery": telemetry_mapper.get_message_discovery_table(),
            "field_availability": telemetry_mapper.get_field_availability_matrix(),
            "recent_messages": list(self.recent_messages)[:25]
        }

mavlink_manager = MAVLinkConnectionManager()

