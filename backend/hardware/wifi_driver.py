import time
import json
import socket
import threading
import logging
from typing import Optional, Dict, Any
from backend.telemetry.schema import ConnectionStatus, TelemetrySource

logger = logging.getLogger(__name__)

class WifiHardwareDriver:
    """
    UDP listener for ESP32 microcontroller broadcasting sensor frames over Wi-Fi.
    """
    def __init__(self):
        self.bind_ip: str = "0.0.0.0"
        self.port: int = 8888
        self.socket_obj: Optional[socket.socket] = None
        self.is_connected: bool = False
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.last_packet: Dict[str, Any] = {}
        self.last_packet_time: float = 0.0
        self.last_error: Optional[str] = None
        
    def start_server(self, port: int = 8888) -> bool:
        self.port = port
        self.stop_server()
        try:
            self.socket_obj = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.socket_obj.bind((self.bind_ip, self.port))
            self.socket_obj.settimeout(1.0)
            self.running = True
            self.thread = threading.Thread(target=self._listen_loop, daemon=True)
            self.thread.start()
            self.is_connected = True
            self.last_error = None
            return True
        except Exception as e:
            self.last_error = str(e)
            self.is_connected = False
            return False

    def stop_server(self):
        self.running = False
        if self.socket_obj:
            try:
                self.socket_obj.close()
            except Exception:
                pass
            self.socket_obj = None
        self.is_connected = False

    def _listen_loop(self):
        while self.running and self.socket_obj:
            try:
                data, addr = self.socket_obj.recvfrom(2048)
                text = data.decode('utf-8', errors='ignore').strip()
                if text.startswith("{") and text.endswith("}"):
                    self.last_packet = json.loads(text)
                    self.last_packet_time = time.time()
            except socket.timeout:
                continue
            except Exception as e:
                self.last_error = str(e)
                time.sleep(0.05)

    def get_latest_packet(self) -> Optional[Dict[str, Any]]:
        now = time.time()
        if now - self.last_packet_time < 3.0 and self.last_packet:
            return self.last_packet
        return None

    def get_status(self) -> Dict[str, Any]:
        now = time.time()
        is_stale = (now - self.last_packet_time > 3.0) if self.last_packet_time > 0 else True
        status = ConnectionStatus.CONNECTED if (self.is_connected and not is_stale) else (
            ConnectionStatus.STALE if self.is_connected else ConnectionStatus.DISCONNECTED
        )
        return {
            "source": TelemetrySource.ESP32_WIFI.value,
            "port": self.port,
            "is_connected": self.is_connected,
            "status": status.value,
            "last_packet_age_sec": round(now - self.last_packet_time, 2) if self.last_packet_time > 0 else None,
            "last_error": self.last_error
        }

esp32_wifi_driver = WifiHardwareDriver()
