import collections
import numpy as np
from typing import Dict, Any, List, Optional
from backend.telemetry.schema import CanonicalTelemetry, ResidualMetrics, DigitalTwinExpected

FEATURE_NAMES = [
    "rpm", "voltage_v", "current_a", "power_elec_w", "temperature_c", "vibration_rms_g",
    "throttle_pct", "load_pct", "efficiency_pct",
    "residual_rpm", "residual_current_a", "residual_temperature_c", "residual_vibration_g",
    "norm_residual_rpm", "norm_residual_current", "norm_residual_temp", "norm_residual_vibration",
    "composite_residual_score",
    "rolling_mean_rpm", "rolling_std_rpm", "rolling_mean_temp", "rolling_std_temp",
    "rolling_mean_vib", "rolling_std_vib", "thermal_slope_c_per_s", "vibration_slope_g_per_s",
    "electrical_loss_ratio"
]

class FeaturePipeline:
    """
    Maintains rolling buffers to compute dynamic temporal features, physics residual features,
    and loss ratios for ML inference.
    """
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.rpm_window = collections.deque(maxlen=window_size)
        self.temp_window = collections.deque(maxlen=window_size)
        self.vib_window = collections.deque(maxlen=window_size)
        self.time_window = collections.deque(maxlen=window_size)
        
    def extract_features(self, 
                         telemetry: CanonicalTelemetry, 
                         twin: DigitalTwinExpected, 
                         residuals: ResidualMetrics) -> Dict[str, float]:
        self.rpm_window.append(telemetry.rpm)
        self.temp_window.append(telemetry.temperature_c)
        self.vib_window.append(telemetry.vibration_rms_g)
        self.time_window.append(telemetry.timestamp)
        
        # Rolling stats
        mean_rpm = float(np.mean(self.rpm_window))
        std_rpm = float(np.std(self.rpm_window)) if len(self.rpm_window) > 1 else 0.0
        
        mean_temp = float(np.mean(self.temp_window))
        std_temp = float(np.std(self.temp_window)) if len(self.temp_window) > 1 else 0.0
        
        mean_vib = float(np.mean(self.vib_window))
        std_vib = float(np.std(self.vib_window)) if len(self.vib_window) > 1 else 0.0
        
        # Slopes
        if len(self.time_window) >= 3:
            dt = self.time_window[-1] - self.time_window[0]
            if dt > 0.1:
                thermal_slope = (self.temp_window[-1] - self.temp_window[0]) / dt
                vib_slope = (self.vib_window[-1] - self.vib_window[0]) / dt
            else:
                thermal_slope = 0.0
                vib_slope = 0.0
        else:
            thermal_slope = 0.0
            vib_slope = 0.0
            
        # Electrical loss ratio: (P_elec - P_mech) / max(1.0, P_elec)
        loss_ratio = max(0.0, (telemetry.power_elec_w - telemetry.power_mech_w) / max(1.0, telemetry.power_elec_w))

        feat_dict = {
            "rpm": telemetry.rpm,
            "voltage_v": telemetry.voltage_v,
            "current_a": telemetry.current_a,
            "power_elec_w": telemetry.power_elec_w,
            "temperature_c": telemetry.temperature_c,
            "vibration_rms_g": telemetry.vibration_rms_g,
            "throttle_pct": telemetry.throttle_pct,
            "load_pct": telemetry.load_pct,
            "efficiency_pct": telemetry.efficiency_pct,
            "residual_rpm": residuals.residual_rpm,
            "residual_current_a": residuals.residual_current_a,
            "residual_temperature_c": residuals.residual_temperature_c,
            "residual_vibration_g": residuals.residual_vibration_g,
            "norm_residual_rpm": residuals.norm_residual_rpm,
            "norm_residual_current": residuals.norm_residual_current,
            "norm_residual_temp": residuals.norm_residual_temp,
            "norm_residual_vibration": residuals.norm_residual_vibration,
            "composite_residual_score": residuals.composite_residual_score,
            "rolling_mean_rpm": round(mean_rpm, 1),
            "rolling_std_rpm": round(std_rpm, 2),
            "rolling_mean_temp": round(mean_temp, 2),
            "rolling_std_temp": round(std_temp, 3),
            "rolling_mean_vib": round(mean_vib, 3),
            "rolling_std_vib": round(std_vib, 4),
            "thermal_slope_c_per_s": round(thermal_slope, 3),
            "vibration_slope_g_per_s": round(vib_slope, 4),
            "electrical_loss_ratio": round(loss_ratio, 3)
        }
        return feat_dict

    def to_feature_vector(self, feat_dict: Dict[str, float]):
        import pandas as pd
        return pd.DataFrame([[feat_dict.get(name, 0.0) for name in FEATURE_NAMES]], columns=FEATURE_NAMES)

feature_pipeline = FeaturePipeline()
