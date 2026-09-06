import math
from typing import Tuple
from backend.telemetry.schema import ResidualMetrics

class DynamicHealthIndex:
    """
    Computes real-time dynamic Health Index (0-100%):
    Health = 100 - (Residual Penalty) - (Anomaly Penalty) - (Cumulative Degradation Penalty)
    Health Bands:
    90 - 100 = HEALTHY
    70 - 89  = WARNING
    40 - 69  = DEGRADED
    < 40     = CRITICAL
    """
    def __init__(self):
        # Weights for composite residual penalties
        self.w_rpm = 1.8
        self.w_current = 2.5
        self.w_temp = 3.2
        self.w_vib = 4.0
        self.w_eff = 1.5

    def compute_health(self, 
                       residuals: ResidualMetrics, 
                       is_anomaly: bool, 
                       anomaly_score: float, 
                       wear_fraction: float) -> Tuple[float, str]:
        # 1. Residual penalty from normalized z-scores
        pen_rpm = min(15.0, abs(residuals.norm_residual_rpm) * self.w_rpm)
        pen_curr = min(18.0, abs(residuals.norm_residual_current) * self.w_current)
        pen_temp = min(25.0, max(0.0, residuals.norm_residual_temp) * self.w_temp)
        pen_vib = min(28.0, max(0.0, residuals.norm_residual_vibration) * self.w_vib)
        pen_eff = min(12.0, max(0.0, -residuals.norm_residual_efficiency) * self.w_eff)
        
        total_res_penalty = pen_rpm + pen_curr + pen_temp + pen_vib + pen_eff

        # 2. Anomaly penalty
        anomaly_penalty = (anomaly_score / 100.0) * 25.0 if is_anomaly else (anomaly_score / 100.0) * 8.0

        # 3. Cumulative wear penalty
        wear_penalty = min(25.0, wear_fraction * 30.0)

        # Raw health
        raw_health = 100.0 - total_res_penalty - anomaly_penalty - wear_penalty
        health = max(0.0, min(100.0, raw_health))

        # Health Band
        if health >= 90.0:
            band = "HEALTHY"
        elif health >= 70.0:
            band = "WARNING"
        elif health >= 40.0:
            band = "DEGRADED"
        else:
            band = "CRITICAL"

        return round(health, 1), band

health_calculator = DynamicHealthIndex()
