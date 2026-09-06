import pytest
from backend.telemetry.schema import CanonicalTelemetry, TelemetrySource
from backend.digital_twin.residual_engine import residual_engine
from backend.digital_twin.bldc_physics import bldc_twin

def test_residual_calculation_normal_vs_fault():
    # Healthy nominal frame (60% throttle on 14.8V -> expected ~7200 RPM, ~16.5A)
    twin_calc = bldc_twin.compute_expected_state(60.0, 14.8, 40.0)
    tel_healthy = CanonicalTelemetry(
        timestamp=100.0,
        throttle_pct=60.0,
        rpm=twin_calc["expected_rpm"],
        voltage_v=14.8,
        current_a=twin_calc["expected_current_a"],
        power_elec_w=twin_calc["expected_power_elec_w"],
        torque_nm=twin_calc["expected_torque_nm"],
        power_mech_w=twin_calc["expected_power_mech_w"],
        efficiency_pct=twin_calc["expected_efficiency_pct"],
        temperature_c=28.0,
        vibration_rms_g=0.32,
        load_pct=40.0,
        ambient_temperature_c=25.0
    )
    twin_h, res_h = residual_engine.compute_twin_and_residuals(tel_healthy)
    assert res_h.composite_residual_score < 3.0

    # Fault frame: High vibration & temperature
    tel_fault = CanonicalTelemetry(
        timestamp=101.0,
        throttle_pct=60.0,
        rpm=4800.0,
        voltage_v=14.8,
        current_a=26.0,
        power_elec_w=384.8,
        torque_nm=0.035,
        power_mech_w=175.0,
        efficiency_pct=45.5,
        temperature_c=82.0,
        vibration_rms_g=2.85,
        load_pct=40.0,
        ambient_temperature_c=25.0
    )
    twin_f, res_f = residual_engine.compute_twin_and_residuals(tel_fault)
    assert res_f.residual_temperature_c > 20.0
    assert res_f.residual_vibration_g > 1.5
    assert res_f.composite_residual_score > res_h.composite_residual_score
