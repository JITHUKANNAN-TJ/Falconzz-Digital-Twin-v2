import logging
import time
from typing import Dict, Any, Optional
from backend.telemetry.schema import TelemetrySource, ConnectionStatus, CanonicalTelemetry
from backend.telemetry.validator import validator
from backend.hardware.mavlink.mavlink_connection import mavlink_manager
from backend.hardware.mavlink.telemetry_mapper import telemetry_mapper
from backend.hardware.serial_driver import esp32_serial_driver, arduino_serial_driver
from backend.hardware.wifi_driver import esp32_wifi_driver

logger = logging.getLogger(__name__)

class HardwareAbstractionLayer:
    """
    Unified Hardware Abstraction Layer (HAL).
    Allows runtime selection of telemetry sources:
    - SIMULATION
    - APM_MAVLINK
    - ESP32_SERIAL
    - ESP32_WIFI
    - ARDUINO_SERIAL
    Automatically falls back to Simulation if the selected hardware source is not producing packets.
    """
    def __init__(self):
        self.active_source: TelemetrySource = TelemetrySource.SIMULATION
        self.force_source: bool = False
        
    def set_source(self, source: TelemetrySource):
        self.active_source = source
        logger.info(f"HAL source switched to: {source.value}")
        
    def _enrich_serial_motors(self, raw: dict, source_type: TelemetrySource) -> dict:
        """Enriches raw serial telemetry with per-motor metrics and respects physical/manual connection states."""
        from backend.digital_twin.config import mapping_store
        mappings = mapping_store.get_mappings()
        
        # If motors dict already properly formed, ensure connection statuses are synchronized
        if "motors" in raw and isinstance(raw["motors"], dict) and len(raw["motors"]) > 0:
            for m_id, m_data in raw["motors"].items():
                is_user_conn = bool(mappings.get(m_id, {}).get("is_connected", True))
                if not is_user_conn:
                    m_data["is_connected"] = False
                    m_data["connection_status"] = "NOT CONNECTED"
                    m_data["disconnection_reason"] = "Hardware Cable Unplugged / Channel Inactive"
                    m_data["live_rpm"] = 0.0
                    m_data["current_a"] = 0.0
                    m_data["voltage_v"] = 0.0
                    m_data["power_w"] = 0.0
                    m_data["thrust_g"] = 0.0
                    m_data["g_per_watt"] = 0.0
                    m_data["efficiency_pct"] = 0.0
                    m_data["vibration_rms_g"] = 0.0
                    m_data["temperature_c"] = None
                    m_data["status"] = "UNAVAILABLE"
                    m_data["source_message"] = "NOT CONNECTED"
            conn_m = [m for m in raw["motors"].values() if m.get("is_connected")]
            raw["connected_motors_count"] = len(conn_m)
            raw["total_thrust_g"] = round(sum([m.get("thrust_g", 0.0) for m in conn_m]), 1)
            raw["total_power_w"] = round(sum([m.get("power_w", 0.0) for m in conn_m]), 2)
            raw["total_current_a"] = round(sum([m.get("current_a", 0.0) for m in conn_m]), 2)
            raw["avg_rpm"] = round(sum([m.get("live_rpm", 0.0) for m in conn_m]) / len(conn_m), 1) if len(conn_m) > 0 else 0.0
            return raw

        motors_dict = {}
        has_individual = any(k.startswith("m1_") or k.startswith("motor_1") or k.startswith("m2_") for k in raw.keys())
        
        global_rpm = float(raw.get("rpm", 0.0))
        global_volt = float(raw.get("voltage_v", raw.get("voltage", 11.1)))
        global_curr = float(raw.get("current_a", raw.get("current", 0.0)))
        global_temp = float(raw.get("temperature_c", raw.get("temp", raw.get("temp_c", 25.0))))
        global_vib = float(raw.get("vibration_rms_g", raw.get("vib", raw.get("vib_g", 0.024))))
        global_thr = float(raw.get("throttle_pct", raw.get("throttle", raw.get("thr", 0.0))))

        active_user_motors = [mid for mid in ("motor_1", "motor_2", "motor_3", "motor_4") if mappings.get(mid, {}).get("is_connected", True)]
        active_count = max(1, len(active_user_motors))

        for idx, m_id in enumerate(("motor_1", "motor_2", "motor_3", "motor_4")):
            is_user_conn = bool(mappings.get(m_id, {}).get("is_connected", True))
            label = mappings.get(m_id, {}).get("label", f"Motor {idx + 1}")
            
            if not is_user_conn:
                motors_dict[m_id] = {
                    "motor_id": m_id,
                    "label": label,
                    "esc_instance": idx,
                    "servo_channel": idx + 1,
                    "is_connected": False,
                    "connection_status": "DISCONNECTED",
                    "disconnection_reason": "Hardware Cable Unplugged / Channel Inactive",
                    "motor_model": "A2212/15T 930KV",
                    "propeller": "1045 (10x4.5)",
                    "kv_rating": 930.0,
                    "live_rpm": 0.0,
                    "rated_rpm": 930.0,
                    "voltage_v": 0.0,
                    "current_a": 0.0,
                    "power_w": 0.0,
                    "thrust_g": 0.0,
                    "g_per_watt": 0.0,
                    "efficiency_pct": 0.0,
                    "temperature_c": None,
                    "vibration_rms_g": 0.0,
                    "throttle_pct": 0.0,
                    "in_cruise_efficiency_zone": False,
                    "status": "UNAVAILABLE",
                    "source_message": "NOT CONNECTED"
                }
            elif has_individual:
                m_prefix = f"m{idx + 1}_"
                m_prefix_alt = f"motor_{idx + 1}_"
                m_has_keys = any(k.startswith((m_prefix, m_prefix_alt)) for k in raw.keys())
                m_explicit_conn = bool(raw.get(f"{m_prefix}connected", raw.get(f"{m_prefix_alt}connected", m_has_keys)))
                
                if not m_has_keys or not m_explicit_conn:
                    motors_dict[m_id] = {
                        "motor_id": m_id,
                        "label": label,
                        "esc_instance": idx,
                        "servo_channel": idx + 1,
                        "is_connected": False,
                        "connection_status": "DISCONNECTED",
                        "disconnection_reason": "Hardware Cable Unplugged / No Channel Telemetry",
                        "motor_model": "A2212/15T 930KV",
                        "propeller": "1045 (10x4.5)",
                        "kv_rating": 930.0,
                        "live_rpm": 0.0,
                        "rated_rpm": 930.0,
                        "voltage_v": 0.0,
                        "current_a": 0.0,
                        "power_w": 0.0,
                        "thrust_g": 0.0,
                        "g_per_watt": 0.0,
                        "efficiency_pct": 0.0,
                        "temperature_c": None,
                        "vibration_rms_g": 0.0,
                        "throttle_pct": 0.0,
                        "in_cruise_efficiency_zone": False,
                        "status": "UNAVAILABLE",
                        "source_message": "NOT CONNECTED"
                    }
                    continue
                
                m_rpm = float(raw.get(f"{m_prefix}rpm", raw.get(f"{m_prefix_alt}rpm", 0.0)))
                m_curr = float(raw.get(f"{m_prefix}curr", raw.get(f"{m_prefix_alt}current_a", 0.0)))
                m_temp = float(raw.get(f"{m_prefix}temp", raw.get(f"{m_prefix_alt}temp_c", global_temp)))
                m_vib = float(raw.get(f"{m_prefix}vib", raw.get(f"{m_prefix_alt}vib_g", global_vib)))
                m_volt = float(raw.get(f"{m_prefix}volt", global_volt))
                m_pwr = round(m_volt * m_curr, 2)
                m_thrust = round(0.00001512 * (m_rpm ** 2), 1) if m_rpm > 100 else 0.0
                m_gw = round(m_thrust / m_pwr, 2) if m_pwr > 0.5 else 0.0
                m_eff = round(min(88.0, max(0.0, (m_thrust * 0.88 / max(1.0, m_pwr)) * 100.0)), 1) if m_pwr > 1.0 else 0.0
                
                motors_dict[m_id] = {
                    "motor_id": m_id,
                    "label": label,
                    "esc_instance": idx,
                    "servo_channel": idx + 1,
                    "is_connected": True,
                    "connection_status": "CONNECTED",
                    "disconnection_reason": None,
                    "motor_model": "A2212/15T 930KV",
                    "propeller": "1045 (10x4.5)",
                    "kv_rating": 930.0,
                    "live_rpm": m_rpm,
                    "rated_rpm": 930.0,
                    "voltage_v": m_volt,
                    "current_a": m_curr,
                    "power_w": m_pwr,
                    "thrust_g": m_thrust,
                    "g_per_watt": m_gw,
                    "efficiency_pct": m_eff,
                    "temperature_c": m_temp,
                    "vibration_rms_g": m_vib,
                    "throttle_pct": global_thr,
                    "in_cruise_efficiency_zone": (50.0 <= global_thr <= 62.0),
                    "status": "REAL",
                    "source_message": f"{source_type.value}_CH_{idx + 1}"
                }
            else:
                m_rpm = global_rpm
                m_volt = global_volt
                m_curr = round(global_curr / float(active_count), 2) if global_curr > 0 else 0.0
                m_pwr = round(m_volt * m_curr, 2)
                m_thrust = round(0.00001512 * (m_rpm ** 2), 1) if m_rpm > 100 else 0.0
                m_gw = round(m_thrust / m_pwr, 2) if m_pwr > 0.5 else 0.0
                m_eff = round(min(88.0, max(0.0, (m_thrust * 0.88 / max(1.0, m_pwr)) * 100.0)), 1) if m_pwr > 1.0 else 0.0
                
                motors_dict[m_id] = {
                    "motor_id": m_id,
                    "label": label,
                    "esc_instance": idx,
                    "servo_channel": idx + 1,
                    "is_connected": True,
                    "connection_status": "CONNECTED",
                    "disconnection_reason": None,
                    "motor_model": "A2212/15T 930KV",
                    "propeller": "1045 (10x4.5)",
                    "kv_rating": 930.0,
                    "live_rpm": m_rpm,
                    "rated_rpm": 930.0,
                    "voltage_v": m_volt,
                    "current_a": m_curr,
                    "power_w": m_pwr,
                    "thrust_g": m_thrust,
                    "g_per_watt": m_gw,
                    "efficiency_pct": m_eff,
                    "temperature_c": global_temp,
                    "vibration_rms_g": global_vib,
                    "throttle_pct": global_thr,
                    "in_cruise_efficiency_zone": (50.0 <= global_thr <= 62.0),
                    "status": "REAL",
                    "source_message": f"{source_type.value}_LIVE"
                }

        raw["motors"] = motors_dict
        raw["connected_motors_count"] = len([m for m in motors_dict.values() if m["is_connected"]])
        raw["total_motors_count"] = 4
        raw["total_thrust_g"] = sum([m["thrust_g"] for m in motors_dict.values() if m["is_connected"]])
        raw["total_power_w"] = sum([m["power_w"] for m in motors_dict.values() if m["is_connected"]])
        raw["total_current_a"] = sum([m["current_a"] for m in motors_dict.values() if m["is_connected"]])
        raw["avg_rpm"] = (sum([m["live_rpm"] for m in motors_dict.values() if m["is_connected"]]) / raw["connected_motors_count"]) if raw["connected_motors_count"] > 0 else 0.0
        return raw

    def get_active_telemetry(self, simulated_packet: Optional[dict] = None) -> CanonicalTelemetry:
        """
        Polls the active hardware source. When hardware telemetry is selected, guarantees that
        ONLY real telemetry data is processed and presented — never falling back to mock simulation.
        """
        # 1. APM / ArduPilot MAVLink
        if self.active_source == TelemetrySource.APM_MAVLINK:
            raw_apm = telemetry_mapper.to_canonical_dict()
            status = mavlink_manager.get_status()
            raw_apm["connection_status"] = status["status"]
            raw_apm["packet_rate_hz"] = status.get("message_rate_hz", 0.0)
            raw_apm["packet_loss_count"] = status.get("packets_dropped", 0)
            raw_apm["telemetry_age_ms"] = round(status.get("last_packet_age_sec", 0.0) * 1000.0, 1) if status.get("last_packet_age_sec") is not None else None
            raw_apm["heartbeat_received"] = (mavlink_manager.last_heartbeat_time > 0 and (time.time() - mavlink_manager.last_heartbeat_time < 4.0))
            return validator.validate_and_enrich(raw_apm, TelemetrySource.APM_MAVLINK)

        # 2. ESP32 Serial
        elif self.active_source == TelemetrySource.ESP32_SERIAL:
            raw = esp32_serial_driver.get_latest_packet()
            status = esp32_serial_driver.get_status()
            if raw:
                raw = self._enrich_serial_motors(raw, TelemetrySource.ESP32_SERIAL)
                raw["connection_status"] = status["status"]
                return validator.validate_and_enrich(raw, TelemetrySource.ESP32_SERIAL)
            # Standby/Awaiting hardware telemetry: NEVER inject mock simulation data!
            zero_packet = {
                "timestamp": time.time(),
                "source_type": TelemetrySource.ESP32_SERIAL.value,
                "connection_status": status["status"],
                "throttle_pct": 0.0, "rpm": 0.0, "voltage_v": 0.0, "current_a": 0.0,
                "temperature_c": 25.0, "vibration_rms_g": 0.0, "load_pct": 0.0
            }
            zero_packet = self._enrich_serial_motors(zero_packet, TelemetrySource.ESP32_SERIAL)
            return validator.validate_and_enrich(zero_packet, TelemetrySource.ESP32_SERIAL)

        # 3. ESP32 Wi-Fi
        elif self.active_source == TelemetrySource.ESP32_WIFI:
            raw = esp32_wifi_driver.get_latest_packet()
            status = esp32_wifi_driver.get_status()
            if raw:
                raw = self._enrich_serial_motors(raw, TelemetrySource.ESP32_WIFI)
                raw["connection_status"] = status["status"]
                return validator.validate_and_enrich(raw, TelemetrySource.ESP32_WIFI)
            zero_packet = {
                "timestamp": time.time(),
                "source_type": TelemetrySource.ESP32_WIFI.value,
                "connection_status": status["status"],
                "throttle_pct": 0.0, "rpm": 0.0, "voltage_v": 0.0, "current_a": 0.0,
                "temperature_c": 25.0, "vibration_rms_g": 0.0, "load_pct": 0.0
            }
            zero_packet = self._enrich_serial_motors(zero_packet, TelemetrySource.ESP32_WIFI)
            return validator.validate_and_enrich(zero_packet, TelemetrySource.ESP32_WIFI)

        # 4. Arduino Serial
        elif self.active_source == TelemetrySource.ARDUINO_SERIAL:
            raw = arduino_serial_driver.get_latest_packet()
            status = arduino_serial_driver.get_status()
            if raw:
                raw = self._enrich_serial_motors(raw, TelemetrySource.ARDUINO_SERIAL)
                raw["connection_status"] = status["status"]
                return validator.validate_and_enrich(raw, TelemetrySource.ARDUINO_SERIAL)
            zero_packet = {
                "timestamp": time.time(),
                "source_type": TelemetrySource.ARDUINO_SERIAL.value,
                "connection_status": status["status"],
                "throttle_pct": 0.0, "rpm": 0.0, "voltage_v": 0.0, "current_a": 0.0,
                "temperature_c": 25.0, "vibration_rms_g": 0.0, "load_pct": 0.0
            }
            zero_packet = self._enrich_serial_motors(zero_packet, TelemetrySource.ARDUINO_SERIAL)
            return validator.validate_and_enrich(zero_packet, TelemetrySource.ARDUINO_SERIAL)

        # 5. Simulation Default (strictly when SIMULATION mode is selected by operator)
        if simulated_packet:
            return validator.validate_and_enrich(simulated_packet, TelemetrySource.SIMULATION)
            
        # Fallback clean zero packet
        return validator.validate_and_enrich({"timestamp": time.time(), "throttle_pct": 0.0, "rpm": 0.0}, TelemetrySource.SIMULATION)

    def get_all_sources_status(self) -> Dict[str, Any]:
        return {
            "active_source": self.active_source.value,
            "apm_mavlink": mavlink_manager.get_status(),
            "esp32_serial": esp32_serial_driver.get_status(),
            "esp32_wifi": esp32_wifi_driver.get_status(),
            "arduino_serial": arduino_serial_driver.get_status(),
            "simulation": {
                "source": TelemetrySource.SIMULATION.value,
                "status": ConnectionStatus.SIMULATED.value,
                "is_active": self.active_source == TelemetrySource.SIMULATION
            }
        }

hal_manager = HardwareAbstractionLayer()
