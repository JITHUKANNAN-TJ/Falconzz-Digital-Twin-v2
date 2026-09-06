import logging
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
        
    def get_active_telemetry(self, simulated_packet: Optional[dict] = None) -> CanonicalTelemetry:
        """
        Polls the active hardware source. If valid live data is present, validates and returns it.
        Otherwise, seamlessly falls back to the simulated packet while transparently marking the source state.
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
            if raw:
                return validator.validate_and_enrich(raw, TelemetrySource.ESP32_SERIAL)
            if simulated_packet:
                return validator.validate_and_enrich(simulated_packet, TelemetrySource.SIMULATION)

        # 3. ESP32 Wi-Fi
        elif self.active_source == TelemetrySource.ESP32_WIFI:
            raw = esp32_wifi_driver.get_latest_packet()
            if raw:
                return validator.validate_and_enrich(raw, TelemetrySource.ESP32_WIFI)
            if simulated_packet:
                return validator.validate_and_enrich(simulated_packet, TelemetrySource.SIMULATION)

        # 4. Arduino Serial
        elif self.active_source == TelemetrySource.ARDUINO_SERIAL:
            raw = arduino_serial_driver.get_latest_packet()
            if raw:
                return validator.validate_and_enrich(raw, TelemetrySource.ARDUINO_SERIAL)
            if simulated_packet:
                return validator.validate_and_enrich(simulated_packet, TelemetrySource.SIMULATION)

        # 5. Simulation Default
        if simulated_packet:
            return validator.validate_and_enrich(simulated_packet, TelemetrySource.SIMULATION)
            
        # Fallback dummy
        import time
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

import time
hal_manager = HardwareAbstractionLayer()
