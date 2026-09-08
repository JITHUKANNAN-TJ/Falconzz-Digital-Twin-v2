import time
import json
import threading
import logging
import collections
from typing import Optional, Dict, Any, List, Deque, Tuple
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
        self.last_flight_telemetry_time: float = 0.0
        self.packets_received: int = 0
        self.packets_dropped: int = 0
        self.last_seq: Optional[int] = None
        self.last_seq_by_source: Dict[Tuple[int, int], int] = {}
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
        
        # 3DR / SiK Telemetry Radio Status
        self.radio_rssi: Optional[float] = None
        self.radio_remrssi: Optional[float] = None
        self.radio_noise: Optional[float] = None
        self.radio_remnoise: Optional[float] = None
        self.radio_txbuf: Optional[float] = None
        self.last_radio_time: float = 0.0


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
            self.heartbeat_thread = threading.Thread(target=self._heartbeat_and_stream_loop, daemon=True)
            self.heartbeat_thread.start()
            self.connection_status = ConnectionStatus.CONNECTED
            self.last_error = None
            return True
        except Exception as e:
            err_str = str(e)
            if "PermissionError" in err_str or "Access is denied" in err_str or "13" in err_str:
                conflicts = []
                try:
                    import psutil
                    for p in psutil.process_iter(['name']):
                        n = (p.info.get('name') or '').lower()
                        if 'missionplanner' in n:
                            conflicts.append("Mission Planner")
                        elif 'qgroundcontrol' in n:
                            conflicts.append("QGroundControl")
                        elif 'arduino' in n:
                            conflicts.append("Arduino IDE")
                except Exception:
                    pass
                if conflicts:
                    self.last_error = f"Port {self.connection_string} is in use by {', '.join(set(conflicts))}. Please disconnect in that app or close it."
                else:
                    self.last_error = f"Port {self.connection_string} is in use by another application. Please close Mission Planner, QGC, or Arduino Serial Monitor."
            elif "FileNotFoundError" in err_str or "could not open port" in err_str:
                self.last_error = f"Port {self.connection_string} not found or device disconnected."
            else:
                self.last_error = f"Could not connect to {self.connection_string}: {err_str}"
            self.connection_status = ConnectionStatus.ERROR
            logger.warning(f"APM connection failed on {self.connection_string}: {self.last_error}")
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

    def _heartbeat_and_stream_loop(self):
        """
        Sends periodic GCS Heartbeats (1 Hz) and requests MAVLink telemetry streams from the Flight Controller.
        Rates are optimized for 57600 baud telemetry radio bandwidth (2-4 Hz) to prevent air buffer saturation.
        """
        from pymavlink import mavutil
        last_req = 0.0
        while self.running and self.connection:
            try:
                now = time.time()
                # 1. GCS Heartbeat (required for APM to stream data back)
                self.connection.mav.heartbeat_send(
                    mavutil.mavlink.MAV_TYPE_GCS,
                    mavutil.mavlink.MAV_AUTOPILOT_INVALID,
                    0, 0, 0
                )
                # 2. Request data streams every 5.0s
                if now - last_req >= 5.0:
                    fc_sys = self.system_id if (self.system_id and self.system_id != 51) else 1
                    target_comp = 0
                    
                    # Bandwidth-safe stream rates for 57600 SiK Telemetry Radio
                    streams = [
                        (mavutil.mavlink.MAV_DATA_STREAM_EXTRA1, 4),        # Attitude & dynamics
                        (mavutil.mavlink.MAV_DATA_STREAM_EXTRA2, 4),        # VFR_HUD (throttle, airspeed, heading)
                        (mavutil.mavlink.MAV_DATA_STREAM_RAW_CONTROLLER, 4),# SERVO_OUTPUT_RAW
                        (mavutil.mavlink.MAV_DATA_STREAM_RAW_SENSORS, 2),   # IMU, Scaled Pressure
                        (mavutil.mavlink.MAV_DATA_STREAM_EXTENDED_STATUS, 2),# SYS_STATUS, Battery
                        (mavutil.mavlink.MAV_DATA_STREAM_RC_CHANNELS, 2),   # Pilot sticks
                        (mavutil.mavlink.MAV_DATA_STREAM_POSITION, 2),      # GPS & Altitudes
                        (mavutil.mavlink.MAV_DATA_STREAM_EXTRA3, 2),
                    ]
                    for stream_id, rate in streams:
                        try:
                            self.connection.mav.request_data_stream_send(
                                fc_sys, target_comp, stream_id, rate, 1
                            )
                        except Exception:
                            pass
                                
                    # MAVLink 2 message intervals (4 Hz = 250,000 microseconds)
                    for msg_id in (30, 36, 74, 1, 147, 241):  # ATTITUDE, SERVO_OUTPUT_RAW, VFR_HUD, SYS_STATUS, BATTERY_STATUS, VIBRATION
                        try:
                            self.connection.mav.command_long_send(
                                fc_sys, 0,
                                mavutil.mavlink.MAV_CMD_SET_MESSAGE_INTERVAL,
                                0,
                                msg_id,
                                250000,
                                0, 0, 0, 0, 0
                            )
                        except Exception:
                            pass
                                
                    last_req = now
            except Exception as e:
                logger.debug(f"Stream request error: {e}")
            time.sleep(1.0)

    def _read_loop(self):
        """
        Ingests MAVLink packets directly from PyMAVLink without stealing or corrupting serial bytes.
        Maintains independent sequence numbering per transmitter source (sys, comp).
        """
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
                    msg_src_sys = getattr(header, "srcSystem", None) if header else None
                    msg_src_comp = getattr(header, "srcComponent", None) if header else None
                    msg_seq = getattr(header, "seq", None) if header else None
                    
                    # Per-source sequence loss tracking (separates radio dongle seq from autopilot seq)
                    if msg_src_sys is not None and msg_seq is not None:
                        src_key = (msg_src_sys, msg_src_comp or 0)
                        if src_key in self.last_seq_by_source:
                            expected_seq = (self.last_seq_by_source[src_key] + 1) % 256
                            if msg_seq != expected_seq:
                                diff = (msg_seq - expected_seq) % 256
                                if diff < 50:
                                    self.packets_dropped += diff
                        self.last_seq_by_source[src_key] = msg_seq
                            
                    msg_type = msg.get_type()
                    if msg_type == "HEARTBEAT":
                        if msg_src_sys not in (0, 51):
                            self.last_heartbeat_time = now
                            self.last_flight_telemetry_time = now
                            if msg_src_sys is not None:
                                self.system_id = msg_src_sys
                            if msg_src_comp is not None:
                                self.component_id = msg_src_comp
                    elif msg_type in ("RADIO", "RADIO_STATUS"):
                        self.last_radio_time = now
                        self.radio_rssi = float(getattr(msg, "rssi", 0))
                        self.radio_remrssi = float(getattr(msg, "remrssi", 0))
                        self.radio_noise = float(getattr(msg, "noise", 0))
                        self.radio_remnoise = float(getattr(msg, "remnoise", 0))
                        self.radio_txbuf = float(getattr(msg, "txbuf", 100))
                    else:
                        # Flight controller message
                        if msg_src_sys not in (0, 51):
                            self.last_flight_telemetry_time = now
                            if msg_src_sys is not None:
                                self.system_id = msg_src_sys
                            if msg_src_comp is not None:
                                self.component_id = msg_src_comp
                    
                    parsed = mavlink_parser.parse_message(msg)
                    if parsed:
                        telemetry_mapper.ingest_mavlink_dict(parsed)
                        
                        # Store in diagnostic trace
                        fields = {k: v for k, v in parsed.items() if k != "msg_type"}
                        self.recent_messages.appendleft({
                            "timestamp": round(now, 3),
                            "msg_type": msg_type,
                            "sys_id": msg_src_sys or self.system_id or 1,
                            "comp_id": msg_src_comp or self.component_id or 1,
                            "fields": fields
                        })
                else:
                    # Buffer is temporarily empty; yield briefly to avoid busy wait
                    time.sleep(0.002)
            except Exception as e:
                self.last_error = str(e)
                time.sleep(0.02)


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
            "radio_link": {
                "active": ((now - self.last_radio_time) < 4.0) if self.last_radio_time > 0 else False,
                "rssi": self.radio_rssi,
                "remrssi": self.radio_remrssi,
                "txbuf": self.radio_txbuf
            },
            "field_provenance": telemetry_mapper.get_field_provenance(),
            "message_discovery": telemetry_mapper.get_message_discovery_table(),
            "field_availability": telemetry_mapper.get_field_availability_matrix(),
            "recent_messages": list(self.recent_messages)[:25]
        }


mavlink_manager = MAVLinkConnectionManager()

