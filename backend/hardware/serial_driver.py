import time
import json
import re
import threading
import logging
from typing import Optional, Dict, Any
from backend.telemetry.schema import ConnectionStatus, TelemetrySource

logger = logging.getLogger(__name__)

class SerialHardwareDriver:
    """
    Intelligent Serial driver for ESP32 and Arduino microcontrollers.
    Supports JSON, CSV, and Key-Value telemetry formats with automatic format detection.
    
    Supported Ingress Formats:
    1. JSON: {"rpm": 4200, "voltage_v": 14.8, "current_a": 12.4, "temp_c": 44.5, "vib_g": 0.32, "throttle": 55}
    2. CSV: 4200,14.8,12.4,44.5,0.32,55 (rpm, voltage, current, temp, vibration, throttle)
    3. Key-Value: RPM:4200, V:14.8, I:12.4, T:44.5, VIB:0.32, THR:55
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
        self.packets_received: int = 0
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
            logger.info(f"Connected {self.source_name.value} on {self.port} @ {self.baud} baud")
            return True
        except Exception as e:
            err_str = str(e)
            if "PermissionError" in err_str or "Access is denied" in err_str:
                self.last_error = f"Port {self.port} is in use by another application. Please close Mission Planner, QGC, or Arduino Serial Monitor."
            elif "FileNotFoundError" in err_str or "could not open port" in err_str:
                self.last_error = f"Port {self.port} not found or device unplugged."
            else:
                self.last_error = f"Could not connect to {self.port}: {err_str}"
            self.is_connected = False
            logger.warning(f"{self.source_name.value} connection failed on {self.port}: {self.last_error}")
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

    def _parse_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parses a serial line into canonical sensor dict."""
        if not line:
            return None
            
        # 1. Try JSON
        if line.startswith("{") and line.endswith("}"):
            try:
                return json.loads(line)
            except Exception:
                pass

        # 2. Try Key-Value: e.g. "RPM:4200, V:14.8, I:12.4, TEMP:44.5, VIB:0.32, THR:55"
        if ":" in line or "=" in line:
            result = {}
            parts = re.split(r'[,;\s]+', line)
            for part in parts:
                if ":" in part:
                    k, v = part.split(":", 1)
                elif "=" in part:
                    k, v = part.split("=", 1)
                else:
                    continue
                k = k.strip().lower()
                try:
                    num_val = float(v.strip())
                    if "rpm" in k:
                        result["rpm"] = num_val
                    elif "volt" in k or k == "v":
                        result["voltage_v"] = num_val
                    elif "curr" in k or "amp" in k or k == "i" or k == "a":
                        result["current_a"] = num_val
                    elif "temp" in k or k == "t" or k == "c":
                        result["temperature_c"] = num_val
                    elif "vib" in k or k == "g" or "acc" in k:
                        result["vibration_rms_g"] = num_val
                    elif "thr" in k or "pwm" in k or "load" in k:
                        result["throttle_pct"] = num_val
                except ValueError:
                    continue
            if len(result) >= 2:
                return result

        # 3. Try CSV numbers: e.g. "4200, 14.8, 12.4, 44.5, 0.32, 55"
        if "," in line:
            tokens = [t.strip() for t in line.split(",") if t.strip()]
            nums = []
            for t in tokens:
                try:
                    nums.append(float(t))
                except ValueError:
                    break
            if len(nums) >= 3:
                # Expected order: RPM, Voltage, Current, [Temp], [Vib], [Throttle]
                parsed = {
                    "rpm": nums[0],
                    "voltage_v": nums[1] if len(nums) > 1 else 12.0,
                    "current_a": nums[2] if len(nums) > 2 else 0.0,
                    "temperature_c": nums[3] if len(nums) > 3 else 25.0,
                    "vibration_rms_g": nums[4] if len(nums) > 4 else 0.05,
                    "throttle_pct": nums[5] if len(nums) > 5 else 0.0
                }
                return parsed

        return None

    def _read_loop(self):
        while self.running and self.serial_obj:
            try:
                raw_bytes = self.serial_obj.readline()
                if raw_bytes:
                    line = raw_bytes.decode('utf-8', errors='ignore').strip()
                    parsed = self._parse_line(line)
                    if parsed:
                        self.last_packet = parsed
                        self.last_packet_time = time.time()
                        self.packets_received += 1
                        self.last_error = None
                else:
                    time.sleep(0.01)
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
            ConnectionStatus.STALE if self.is_connected else (
                ConnectionStatus.ERROR if self.last_error else ConnectionStatus.DISCONNECTED
            )
        )
        return {
            "source": self.source_name.value,
            "port": self.port,
            "baud": self.baud,
            "is_connected": self.is_connected,
            "status": status.value,
            "packets_received": self.packets_received,
            "last_packet_age_sec": round(now - self.last_packet_time, 2) if self.last_packet_time > 0 else None,
            "last_error": self.last_error
        }

esp32_serial_driver = SerialHardwareDriver(TelemetrySource.ESP32_SERIAL)
arduino_serial_driver = SerialHardwareDriver(TelemetrySource.ARDUINO_SERIAL)
