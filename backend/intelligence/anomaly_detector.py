import os
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from backend.config import settings

class AnomalyDetector:
    """
    Isolation Forest Anomaly Detector with temporal hysteresis.
    Hysteresis logic:
    - 3 consecutive anomalous samples -> WARNING
    - 5 consecutive anomalous samples -> DEGRADED / CRITICAL
    - 4 consecutive normal samples required to clear anomaly state.
    """
    def __init__(self, model_path: str = os.path.join(settings.MODEL_DIR, "anomaly_detector.joblib")):
        self.model_path = model_path
        self.model = None
        self.consecutive_anomalies: int = 0
        self.consecutive_normals: int = 0
        self.is_latched_anomaly: bool = False
        self.load_model()
        
    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"Warning: Could not load anomaly detector model: {e}")
                self.model = None

    def predict(self, feature_vector: np.ndarray, composite_residual: float) -> Tuple[bool, float, str, int]:
        """
        Returns (is_anomaly, anomaly_score_0_to_100, severity, hysteresis_count)
        """
        raw_anomaly = False
        score_val = 0.0
        
        if self.model is not None:
            try:
                # decision_function gives negative for anomalies, positive for inliers
                dec_val = float(self.model.decision_function(feature_vector)[0])
                # Convert to 0 - 100 anomaly score
                score_val = max(0.0, min(100.0, (0.15 - dec_val) * 200.0))
                raw_anomaly = (self.model.predict(feature_vector)[0] == -1) or (score_val > 45.0)
            except Exception:
                raw_anomaly = composite_residual > 2.2
                score_val = min(100.0, composite_residual * 25.0)
        else:
            raw_anomaly = composite_residual > 2.2
            score_val = min(100.0, composite_residual * 25.0)
            
        # Temporal Hysteresis Filter
        if raw_anomaly:
            self.consecutive_anomalies += 1
            self.consecutive_normals = 0
        else:
            self.consecutive_normals += 1
            if self.consecutive_normals >= 4:
                self.consecutive_anomalies = max(0, self.consecutive_anomalies - 1)
                
        # Severity bands
        if self.consecutive_anomalies >= 5:
            self.is_latched_anomaly = True
            severity = "CRITICAL"
        elif self.consecutive_anomalies >= 3:
            self.is_latched_anomaly = True
            severity = "WARNING"
        elif self.consecutive_anomalies > 0 and self.is_latched_anomaly:
            severity = "WARNING"
        else:
            self.is_latched_anomaly = False
            severity = "NORMAL"

        return self.is_latched_anomaly, round(score_val, 1), severity, self.consecutive_anomalies

anomaly_detector = AnomalyDetector()
