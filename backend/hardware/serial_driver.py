import time
import json
import threading
import logging
from typing import Optional, Dict, Any
from backend.telemetry.schema import ConnectionStatus, TelemetrySource

logger = logging.getLogger(__name__)

class SerialHardwareDriver:
    """
    Serial driver for ESP32 and Arduino microcontrollers sending JSON sensor packets over USB.
    Format: {"rpm": 4200, "voltage_v": 14.8, "current_a": 12.4, "temp_c": 44.5, "vib_g": 0.32, "throttle": 55}
    """
    def __init__(self, source_name: TelemetrySource = TelemetrySource.ESP32_SERIAL):
        self.source_name = source_name
        self.port: str = "COM4"
        self.baud: int = 115200
        self.serial_obj = None
        self.is_connected: bool = False
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.last_packet: Dict[str, Any] = {}
        self.last_packet_time: float = 0.0
        self.last_error: Optional[str] = None
        
    def connect(self, port: str = "COM4", baud: int = 115200) -> bool:
        self.port = port
        self.baud = baud
        self.disconnect()
        
        try:
            import serial
            self.serial_obj = serial.Serial(self.port, self.baud, timeout=1.0)
            self.running = True
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            self.is_connected = True
            self.last_error = None
            return True
        except Exception as e:
            self.last_error = str(e)
            self.is_connected = False
            return False

    def disconnect(self):
        self.running = False
        if self.serial_obj:
            try:
                self.serial_obj.close()
            except Exception:
                pass
            self.serial_obj = None
        self.is_connected = False

    def _read_loop(self):
        while self.running and self.serial_obj:
            try:
                line = self.serial_obj.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("{") and line.endswith("}"):
                    data = json.loads(line)
                    self.last_packet = data
                    self.last_packet_time = time.time()
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
            "source": self.source_name.value,
            "port": self.port,
            "baud": self.baud,
            "is_connected": self.is_connected,
            "status": status.value,
            "last_packet_age_sec": round(now - self.last_packet_time, 2) if self.last_packet_time > 0 else None,
            "last_error": self.last_error
        }

esp32_serial_driver = SerialHardwareDriver(TelemetrySource.ESP32_SERIAL)
arduino_serial_driver = SerialHardwareDriver(TelemetrySource.ARDUINO_SERIAL)
