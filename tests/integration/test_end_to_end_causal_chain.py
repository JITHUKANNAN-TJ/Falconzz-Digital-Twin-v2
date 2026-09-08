import pytest
from simulator.telemetry_generator import telemetry_generator
from simulator.degradation_engine import degradation_engine
from backend.intelligence.anomaly_detector import anomaly_detector
from backend.digital_twin.thermal_model import thermal_model
from backend.telemetry.schema import ScenarioType
from backend.main import run_causal_pipeline_step

def test_complete_causal_propagation_chain():
    """
    Validates that introducing a physical degradation scenario causes realistic causal
    propagation through every single subsystem layer:
    NORMAL -> BEARING/THERMAL SCENARIO -> TELEMETRY SHIFT -> RESIDUAL RISE ->
    ANOMALY DETECTION -> FAULT CLASSIFICATION -> HEALTH DROP -> RUL DROP ->
    XAI EXPLANATION SYNTHESIS -> MAINTENANCE ADVISORY UPDATE
    """
    # 0. Reset Singletons for clean baseline
    from backend.hardware.hal_manager import hal_manager
    from backend.telemetry.schema import TelemetrySource
    hal_manager.set_source(TelemetrySource.SIMULATION)
    anomaly_detector.consecutive_anomalies = 0
    anomaly_detector.consecutive_normals = 10
    anomaly_detector.is_latched_anomaly = False
    degradation_engine.reset()
    thermal_model.last_timestamp = 0.0
    thermal_model.estimated_temp_c = 25.0

    # 1. Baseline Normal State
    telemetry_generator.set_scenario(ScenarioType.NORMAL, 0.0)
    telemetry_generator.set_operating_point(55.0, 40.0)
    telemetry_generator.internal_temp = 25.0
    
    # Warm up step for baseline
    run_causal_pipeline_step()
    state_normal = run_causal_pipeline_step()
    
    assert state_normal.intelligence.health_index >= 80.0
    assert state_normal.residuals.composite_residual_score < 3.0
    assert state_normal.intelligence.is_anomaly is False
    assert state_normal.intelligence.health_band in ["HEALTHY", "WARNING"]

    # 2. Inject Severe Compound Degradation Scenario
    telemetry_generator.set_scenario(ScenarioType.COMBINED_DEGRADATION, 0.95)
    telemetry_generator.set_operating_point(70.0, 75.0)
    
    # Run multiple steps to let thermal ODE, vibration, and temporal hysteresis latch
    for _ in range(6):
        state_degraded = run_causal_pipeline_step()

    # 3. Verify Causal Changes
    # Telemetry and residuals must deviate
    assert state_degraded.telemetry.temperature_c > state_normal.telemetry.temperature_c
    assert state_degraded.residuals.composite_residual_score > state_normal.residuals.composite_residual_score
    
    # AI models must respond
    assert state_degraded.intelligence.anomaly_score > state_normal.intelligence.anomaly_score
    assert state_degraded.intelligence.is_anomaly is True
    assert state_degraded.intelligence.predicted_fault != "Normal Baseline"
    
    # Health and RUL must decrease
    assert state_degraded.intelligence.health_index < state_normal.intelligence.health_index
    assert state_degraded.intelligence.rul_hours < state_normal.intelligence.rul_hours
    
    # XAI must reflect the degraded subsystem
    assert len(state_degraded.intelligence.xai_what) > 0
    assert len(state_degraded.intelligence.xai_why) > 0
    assert state_degraded.intelligence.maintenance_urgency in ["SOON", "IMMEDIATE", "CRITICAL"]
    assert state_degraded.intelligence.affected_subsystem != "All Subsystems Nominal"
