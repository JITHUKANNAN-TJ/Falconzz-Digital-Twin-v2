import os
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from backend.config import settings

FAULT_CLASS_LABELS = {
    "NORMAL": "Normal Baseline",
    "HIGH_LOAD": "Excessive Aeromechanical Load",
    "OVERHEATING": "Winding / ESC Thermal Overheating",
    "BEARING_DEGRADATION": "Mechanical Bearing Defect",
    "ELECTRICAL_DEGRADATION": "Phase Winding / FET Electrical Fault",
    "SENSOR_DRIFT": "Optical/Hall Sensor Calibration Drift",
    "RAPID_THROTTLE": "High Dynamic Transient Stress",
    "COMBINED_DEGRADATION": "Multi-Factor Compound Degradation"
}

class FaultClassifier:
    """
    Multi-Class Random Forest / Gradient Boosting Fault Classifier.
    Predicts fault mode, confidence probabilities, and severity level.
    """
    def __init__(self, model_path: str = os.path.join(settings.MODEL_DIR, "fault_classifier.joblib")):
        self.model_path = model_path
        self.model = None
        self.load_model()
        
    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"Warning: Could not load fault classifier model: {e}")
                self.model = None

    def predict(self, feature_vector: np.ndarray, composite_residual: float) -> Tuple[str, float, str, Dict[str, float]]:
        """
        Returns (predicted_fault_label, confidence_pct, severity, class_probabilities)
        """
        if self.model is not None:
            try:
                probs = self.model.predict_proba(feature_vector)[0]
                classes = list(self.model.classes_)
                best_idx = int(np.argmax(probs))
                predicted_class = classes[best_idx]
                confidence = float(probs[best_idx]) * 100.0
                
                prob_dict = {cls: round(float(prob) * 100.0, 1) for cls, prob in zip(classes, probs)}
                
                # If predicted is normal but composite residual is high, default to compound anomaly
                if predicted_class == "NORMAL" and composite_residual > 3.0:
                    predicted_class = "COMBINED_DEGRADATION"
                    confidence = 78.0
                    
                display_label = FAULT_CLASS_LABELS.get(predicted_class, predicted_class)
                
                if predicted_class == "NORMAL":
                    severity = "NONE"
                elif predicted_class in ["HIGH_LOAD", "SENSOR_DRIFT", "RAPID_THROTTLE"]:
                    severity = "LOW" if composite_residual < 2.5 else "MEDIUM"
                elif predicted_class in ["OVERHEATING", "BEARING_DEGRADATION", "ELECTRICAL_DEGRADATION"]:
                    severity = "MEDIUM" if composite_residual < 3.5 else "HIGH"
                else:  # COMBINED_DEGRADATION
                    severity = "HIGH" if composite_residual < 4.0 else "CRITICAL"

                return display_label, round(confidence, 1), severity, prob_dict
            except Exception:
                pass

        # Physics-based heuristic fallback if model not loaded
        if composite_residual < 1.5:
            return "Normal Baseline", 95.0, "NONE", {"NORMAL": 95.0}
        else:
            return "Multi-Factor Compound Degradation", 70.0, "MEDIUM", {"COMBINED_DEGRADATION": 70.0}

fault_classifier = FaultClassifier()
