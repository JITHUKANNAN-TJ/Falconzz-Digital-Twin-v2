import pytest
from backend.telemetry.schema import ResidualMetrics, CanonicalTelemetry
from backend.intelligence.health_index import health_calculator
from backend.intelligence.explainable_ai import xai_engine
from backend.digital_twin.residual_engine import residual_engine

def test_dynamic_health_index():
    # Nominal residuals
    res_nom = ResidualMetrics(
        timestamp=100.0,
        residual_rpm=10.0,
        residual_current_a=0.2,
        residual_voltage_v=0.05,
        residual_power_w=3.0,
        residual_temperature_c=1.2,
        residual_vibration_g=0.03,
        residual_efficiency_pct=0.5,
        norm_residual_rpm=0.08,
        norm_residual_current=0.25,
        norm_residual_temp=0.48,
        norm_residual_vibration=0.37,
        norm_residual_efficiency=0.12,
        composite_residual_score=0.35
    )
    health_nom, band_nom = health_calculator.compute_health(res_nom, False, 5.0, 0.0)
    assert health_nom >= 90.0
    assert band_nom == "HEALTHY"

    # Severe fault residuals
    res_fault = ResidualMetrics(
        timestamp=100.0,
        residual_rpm=-450.0,
        residual_current_a=12.0,
        residual_voltage_v=-1.2,
        residual_power_w=150.0,
        residual_temperature_c=35.0,
        residual_vibration_g=2.5,
        residual_efficiency_pct=-35.0,
        norm_residual_rpm=-3.75,
        norm_residual_current=15.0,
        norm_residual_temp=14.0,
        norm_residual_vibration=31.25,
        norm_residual_efficiency=-8.75,
        composite_residual_score=18.5
    )
    health_fault, band_fault = health_calculator.compute_health(res_fault, True, 95.0, 0.6)
    assert health_fault < 40.0
    assert band_fault == "CRITICAL"

def test_explainable_ai_synthesis():
    tel = CanonicalTelemetry(
        timestamp=100.0,
        throttle_pct=70.0,
        rpm=4800.0,
        voltage_v=14.8,
        current_a=24.0,
        power_elec_w=355.2,
        torque_nm=0.038,
        power_mech_w=191.0,
        efficiency_pct=53.7,
        temperature_c=84.0,
        vibration_rms_g=1.8,
        load_pct=60.0,
        ambient_temperature_c=25.0
    )
    twin, res = residual_engine.compute_twin_and_residuals(tel)
    xai = xai_engine.generate_explanation_and_advisory(
        tel, twin, res, 45.0, "Winding / ESC Thermal Overheating", "HIGH", True
    )
    assert "what" in xai["xai_what"].lower() or len(xai["xai_what"]) > 10
    assert "why" in xai["xai_why"].lower() or len(xai["xai_why"]) > 10
    assert len(xai["maintenance_action"]) > 0
    assert len(xai["contributing_features"]) > 0
