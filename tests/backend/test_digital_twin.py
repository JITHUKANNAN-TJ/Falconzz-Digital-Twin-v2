import pytest
from backend.digital_twin.bldc_physics import bldc_twin
from backend.digital_twin.thermal_model import thermal_model
from backend.digital_twin.vibration_model import vibration_model

def test_bldc_physics_twin():
    out = bldc_twin.compute_expected_state(throttle_pct=70.0, voltage_v=14.8, load_pct=50.0)
    assert out["expected_rpm"] > 4000.0
    assert out["expected_power_elec_w"] > 0.0
    assert out["expected_power_mech_w"] > 0.0
    assert 0.0 < out["expected_efficiency_pct"] < 95.0

def test_thermal_ode_integration():
    thermal_model.last_timestamp = 100.0
    thermal_model.estimated_temp_c = 25.0
    t1 = thermal_model.step(current_a=20.0, rpm=5000.0, ambient_temp_c=25.0, timestamp=101.0)
    assert t1 >= 25.0
    t2 = thermal_model.step(current_a=25.0, rpm=5500.0, ambient_temp_c=25.0, timestamp=102.0)
    assert t2 >= t1

def test_baseline_vibration():
    vib = vibration_model.compute_expected_vibration(rpm=5000.0, load_pct=50.0)
    assert 0.10 <= vib <= 2.0
