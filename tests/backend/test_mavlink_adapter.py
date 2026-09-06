import pytest
from backend.hardware.mavlink.mavlink_parser import mavlink_parser
from backend.hardware.mavlink.telemetry_mapper import telemetry_mapper
from backend.telemetry.validator import validator
from backend.telemetry.schema import TelemetrySource

class MockMAVLinkMessage:
    def __init__(self, msg_type: str, **kwargs):
        self._type = msg_type
        for k, v in kwargs.items():
            setattr(self, k, v)
    def get_type(self):
        return self._type

def test_mavlink_parser_and_mapper():
    # 1. Simulate ESC_TELEMETRY packet
    esc_msg = MockMAVLinkMessage(
        "ESC_TELEMETRY",
        rpm=[4850],
        voltage=[1480],  # 14.8V in cV
        current=[1620],  # 16.2A in cA
        temperature=[42],
        count=1
    )
    parsed_esc = mavlink_parser.parse_message(esc_msg)
    assert parsed_esc is not None
    assert parsed_esc["rpm"] == 4850.0
    assert parsed_esc["voltage_v"] == 14.8
    assert parsed_esc["current_a"] == 16.2
    assert parsed_esc["temperature_c"] == 42.0

    # 2. Simulate VFR_HUD packet
    hud_msg = MockMAVLinkMessage("VFR_HUD", throttle=65, alt=350.0, groundspeed=22.5)
    parsed_hud = mavlink_parser.parse_message(hud_msg)
    assert parsed_hud["throttle_pct"] == 65.0

    # 3. Simulate RAW_IMU vibration packet
    imu_msg = MockMAVLinkMessage("RAW_IMU", xacc=150, yacc=120, zacc=1350)
    parsed_imu = mavlink_parser.parse_message(imu_msg)
    assert parsed_imu["vibration_rms_g"] > 0.0

    # 4. Ingest into mapper
    telemetry_mapper.ingest_mavlink_dict(parsed_esc)
    telemetry_mapper.ingest_mavlink_dict(parsed_hud)
    telemetry_mapper.ingest_mavlink_dict(parsed_imu)

    # 5. Extract canonical dict & validate
    can_dict = telemetry_mapper.to_canonical_dict()
    assert can_dict["source_type"] == TelemetrySource.APM_MAVLINK.value
    assert can_dict["rpm"] == 4850.0
    assert can_dict["voltage_v"] == 14.8

    # 6. Validate via canonical validator
    tel = validator.validate_and_enrich(can_dict, TelemetrySource.APM_MAVLINK)
    assert tel.is_valid is True
    assert tel.source_type == TelemetrySource.APM_MAVLINK
    assert tel.rpm == 4850.0
    # Confirm future aero-piston parameters remain unpopulated (not fabricated)
    assert tel.cht_c is None
    assert tel.oil_pressure_psi is None

def test_mavlink_field_provenance_and_diagnostics():
    from backend.hardware.mavlink.mavlink_connection import mavlink_manager

    # Check field provenance records
    prov = telemetry_mapper.get_field_provenance()
    assert len(prov) >= 10
    
    rpm_field = next(f for f in prov if f["key"] == "rpm")
    assert rpm_field["mavlink_source_message"] == "ESC_TELEMETRY"
    assert "REAL" in rpm_field["status"]

    cht_field = next(f for f in prov if f["key"] == "cht_c")
    assert cht_field["status"] == "FUTURE MALE-UAV"
    assert cht_field["value"] == "N/A"

    # Check connection manager diagnostics format
    diag = mavlink_manager.get_detailed_diagnostics()
    assert "apm_connection" in diag
    assert "heartbeat" in diag
    assert "system_id" in diag
    assert "component_id" in diag
    assert "mavlink_protocol" in diag
    assert "message_rate_hz" in diag
    assert "field_provenance" in diag

