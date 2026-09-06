import pytest
from backend.telemetry.validator import validator
from backend.telemetry.schema import TelemetrySource, ConnectionStatus

def test_telemetry_validation_nominal():
    raw = {
        "timestamp": 1700000000.0,
        "throttle_pct": 60.0,
        "rpm": 4500.0,
        "voltage_v": 14.8,
        "current_a": 15.0,
        "temperature_c": 45.0,
        "vibration_rms_g": 0.25,
        "load_pct": 50.0,
        "ambient_temperature_c": 25.0
    }
    res = validator.validate_and_enrich(raw, TelemetrySource.SIMULATION)
    assert res.is_valid is True
    assert res.rpm == 4500.0
    assert res.power_elec_w == pytest.approx(14.8 * 0.60 * 15.0, 0.1)
    assert res.power_mech_w > 0.0
    assert res.efficiency_pct > 0.0
    assert res.efficiency_pct <= 98.0

def test_telemetry_validation_outliers_and_spikes():
    raw_corrupt = {
        "timestamp": -5.0,
        "throttle_pct": 150.0,  # Out of range
        "rpm": -500.0,          # Impossible
        "voltage_v": 100.0,     # Out of range
        "current_a": 500.0,     # Impossible
        "temperature_c": 300.0, # Corrupt
        "vibration_rms_g": 99.0 # Spike
    }
    res = validator.validate_and_enrich(raw_corrupt, TelemetrySource.ESP32_SERIAL)
    assert res.is_valid is False
    assert len(res.validation_flags) > 0
    assert res.throttle_pct == 100.0  # Clamped
