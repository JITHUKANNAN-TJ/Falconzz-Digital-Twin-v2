import time
import math
from typing import List, Dict, Any, Optional
from backend.telemetry.schema import ScenarioType, CanonicalTelemetry, TelemetrySource
from backend.digital_twin.residual_engine import residual_engine
from backend.intelligence.feature_pipeline import FeaturePipeline
from backend.intelligence.anomaly_detector import anomaly_detector
from backend.intelligence.fault_classifier import fault_classifier
from backend.intelligence.rul_predictor import rul_predictor
from backend.intelligence.health_index import health_calculator
from backend.intelligence.explainable_ai import xai_engine

class MissionReplayEngine:
    """
    100% Deterministic Mission Replay Engine.
    Generates a synchronized sequence of flight phases (Takeoff, Climb, Cruise, Ingress, Evasive/Degradation, Return, Landing),
    supporting play, pause, speed control (0.5x to 4x), seeking, and frame-by-frame scrubbing.
    """
    def __init__(self):
        self.is_playing: bool = False
        self.current_frame_idx: int = 0
        self.playback_speed: float = 1.0
        self.frames: List[Dict[str, Any]] = []
        self.generate_default_mission_frames()
        
    def generate_default_mission_frames(self, total_frames: int = 120):
        self.frames.clear()
        pipeline = FeaturePipeline()
        
        phases = [
            (0, 15, "TAKEOFF & INITIAL CLIMB", 85.0, ScenarioType.NORMAL, 0.0),
            (16, 40, "HIGH ALTITUDE CRUISE", 58.0, ScenarioType.NORMAL, 0.0),
            (41, 65, "TACTICAL LOITER - HIGH WIND", 70.0, ScenarioType.HIGH_LOAD, 0.4),
            (66, 90, "BEARING WEAR INCEPTION", 65.0, ScenarioType.BEARING_DEGRADATION, 0.7),
            (91, 105, "THERMAL ELEVATION & FAULT", 55.0, ScenarioType.COMBINED_DEGRADATION, 0.9),
            (106, 120, "EMERGENCY DESCENT & RTB", 40.0, ScenarioType.COMBINED_DEGRADATION, 0.8)
        ]
        
        for frame_idx in range(total_frames):
            # Find phase
            curr_phase = "CRUISE"
            curr_throttle = 55.0
            curr_scen = ScenarioType.NORMAL
            curr_sev = 0.0
            for start_f, end_f, name, th, sc, sev in phases:
                if start_f <= frame_idx <= end_f:
                    curr_phase = name
                    curr_throttle = th
                    curr_scen = sc
                    curr_sev = sev
                    break
                    
            t_sec = frame_idx * 2.0
            
            # Synthetic physical readings
            rpm = (curr_throttle / 100.0 * 14.8 * 880.0) * (1.0 - 0.08 * curr_sev) + math.sin(frame_idx * 0.3) * 20.0
            voltage = 14.8 - (curr_sev * 0.8)
            current = 3.5 + (curr_throttle / 100.0) * 22.0 * (1.0 + 0.45 * curr_sev)
            temp = 25.0 + (current * 1.8) + (curr_sev * 35.0)
            vib = 0.08 + (rpm / 5000.0) * 0.15 + (curr_sev * 0.65)
            
            p_elec = voltage * current
            torque = (current - 0.65) / (880.0 * 2.0 * math.pi / 60.0)
            p_mech = torque * (2.0 * math.pi * rpm / 60.0)
            eff = min(95.0, max(0.0, (p_mech / p_elec) * 100.0)) if p_elec > 2.0 else 0.0
            
            tel = CanonicalTelemetry(
                timestamp=t_sec,
                source_type=TelemetrySource.SIMULATION,
                throttle_pct=round(curr_throttle, 1),
                rpm=round(rpm, 1),
                voltage_v=round(voltage, 2),
                current_a=round(current, 2),
                power_elec_w=round(p_elec, 2),
                torque_nm=round(torque, 4),
                power_mech_w=round(p_mech, 2),
                efficiency_pct=round(eff, 1),
                temperature_c=round(temp, 1),
                vibration_rms_g=round(vib, 3),
                load_pct=round(40.0 + curr_sev * 30.0, 1),
                ambient_temperature_c=25.0
            )
            
            twin, res = residual_engine.compute_twin_and_residuals(tel)
            feat_dict = pipeline.extract_features(tel, twin, res)
            fvec = pipeline.to_feature_vector(feat_dict)
            
            is_ano, ano_score, ano_sev, hyst = anomaly_detector.predict(fvec, res.composite_residual_score)
            p_fault, f_conf, f_sev, f_probs = fault_classifier.predict(fvec, res.composite_residual_score)
            health, band = health_calculator.compute_health(res, is_ano, ano_score, curr_sev * 0.5)
            rul_res = rul_predictor.predict(fvec, health, curr_sev * 0.5)
            rul_h = rul_res.get("rul_hours") or 0.0
            r_low = rul_res["confidence_interval_90"].get("lower_bound") or 0.0
            r_up = rul_res["confidence_interval_90"].get("upper_bound") or 0.0
            r_rate = rul_res.get("degradation_rate_pct_per_hr", 0.0)
            xai = xai_engine.generate_explanation_and_advisory(tel, twin, res, health, p_fault, f_sev, is_ano)
            
            self.frames.append({
                "frame_index": frame_idx,
                "flight_phase": curr_phase,
                "mission_time_sec": t_sec,
                "telemetry": tel.model_dump(),
                "digital_twin": twin.model_dump(),
                "residuals": res.model_dump(),
                "health": {
                    "health_index": health,
                    "health_band": band,
                    "anomaly_score": ano_score,
                    "is_anomaly": is_ano,
                    "predicted_fault": p_fault,
                    "fault_confidence_pct": f_conf,
                    "rul_hours": rul_h,
                    "rul_uncertainty_lower": r_low,
                    "rul_uncertainty_upper": r_up,
                    "xai_what": xai["xai_what"],
                    "xai_why": xai["xai_why"],
                    "xai_severity": xai["xai_severity"],
                    "xai_recommendation": xai["xai_recommendation"],
                    "maintenance_action": xai["maintenance_action"],
                    "maintenance_urgency": xai["maintenance_urgency"],
                    "affected_subsystem": xai["affected_subsystem"]
                }
            })

    def play(self):
        self.is_playing = True
        
    def pause(self):
        self.is_playing = False
        
    def seek(self, frame_idx: int):
        self.current_frame_idx = max(0, min(len(self.frames) - 1, frame_idx))
        
    def set_speed(self, speed: float):
        self.playback_speed = max(0.25, min(5.0, speed))
        
    def get_current_frame(self) -> Dict[str, Any]:
        if not self.frames:
            return {}
        return self.frames[self.current_frame_idx]

    def step_forward(self) -> Dict[str, Any]:
        if not self.frames:
            return {}
        if self.is_playing:
            self.current_frame_idx = (self.current_frame_idx + 1) % len(self.frames)
        return self.frames[self.current_frame_idx]

mission_replay = MissionReplayEngine()
