import pytest
import numpy as np
from backend.intelligence.feature_pipeline import feature_pipeline, FEATURE_NAMES
from backend.intelligence.anomaly_detector import anomaly_detector
from backend.intelligence.fault_classifier import fault_classifier
from backend.intelligence.rul_predictor import rul_predictor
from backend.telemetry.schema import CanonicalTelemetry, TelemetrySource
from backend.digital_twin.residual_engine import residual_engine

def test_feature_extraction_and_inference():
    tel = CanonicalTelemetry(
        timestamp=100.0,
        throttle_pct=70.0,
        rpm=5200.0,
        voltage_v=14.8,
        current_a=18.0,
        power_elec_w=266.4,
        torque_nm=0.04,
        power_mech_w=217.0,
        efficiency_pct=81.5,
        temperature_c=42.0,
        vibration_rms_g=0.32,
        load_pct=50.0,
        ambient_temperature_c=25.0
    )
    twin, res = residual_engine.compute_twin_and_residuals(tel)
    feats = feature_pipeline.extract_features(tel, twin, res)
    assert len(feats) == len(FEATURE_NAMES)
    
    fvec = feature_pipeline.to_feature_vector(feats)
    assert fvec.shape == (1, len(FEATURE_NAMES))
    
    # Anomaly detector
    is_ano, ano_score, ano_sev, hyst = anomaly_detector.predict(fvec, res.composite_residual_score)
    assert 0.0 <= ano_score <= 100.0
    
    # Fault classifier
    fault_label, conf, f_sev, probs = fault_classifier.predict(fvec, res.composite_residual_score)
    assert len(fault_label) > 0
    assert 0.0 <= conf <= 100.0
    
    # RUL Predictor
    rul_res = rul_predictor.predict(fvec, 95.0, 0.1)
    rul_h = rul_res["rul_hours"]
    lower_h = rul_res["confidence_interval_90"]["lower_bound"]
    upper_h = rul_res["confidence_interval_90"]["upper_bound"]
    assert lower_h <= rul_h <= upper_h
    assert rul_h > 0.0
    assert "status" in rul_res
