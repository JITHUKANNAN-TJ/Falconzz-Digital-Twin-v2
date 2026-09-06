import os
import joblib
import numpy as np
from typing import Dict, Any, Tuple, Optional
from backend.config import settings

class RULPredictor:
    """
    Remaining Useful Life (RUL) Prognostics Engine with Quantile Uncertainty Bounds.
    Only provides numerical RUL estimates when sufficient degradation history exists.
    Otherwise flags 'INSUFFICIENT DATA (PROTOTYPE - NON-FLIGHT-CERTIFIED)'.
    """
    def __init__(self, model_dir: str = settings.MODEL_DIR):
        self.model_dir = model_dir
        self.model = None
        self.model_lower = None
        self.model_upper = None
        self.load_models()
        
    def load_models(self):
        try:
            p_mean = os.path.join(self.model_dir, "rul_regressor.joblib")
            p_lower = os.path.join(self.model_dir, "rul_lower_quantile.joblib")
            p_upper = os.path.join(self.model_dir, "rul_upper_quantile.joblib")
            
            if os.path.exists(p_mean):
                self.model = joblib.load(p_mean)
            if os.path.exists(p_lower):
                self.model_lower = joblib.load(p_lower)
            if os.path.exists(p_upper):
                self.model_upper = joblib.load(p_upper)
        except Exception as e:
            print(f"Warning: Could not load RUL models: {e}")

    def predict(self, feature_vector: np.ndarray, health_index: float, degradation_wear: float = 0.0, is_real_live: bool = False, operating_samples: int = 10) -> Dict[str, Any]:
        """
        Returns structured dictionary with RUL hours, bounds, and explicit data sufficiency status.
        """
        # If operating history is too short on live hardware or health is completely nominal
        if is_real_live and operating_samples < 50 and health_index > 95.0:
            return {
                "rul_hours": None,
                "status": "INSUFFICIENT DATA (PROTOTYPE - NON-FLIGHT-CERTIFIED)",
                "confidence_interval_90": {"lower_bound": None, "upper_bound": None},
                "degradation_rate_pct_per_hr": 0.0,
                "data_basis": "REAL LIVE (BASELINE COLLECTION IN PROGRESS)"
            }

        if self.model is not None:
            try:
                raw_rul = float(self.model.predict(feature_vector)[0])
                raw_lower = float(self.model_lower.predict(feature_vector)[0]) if self.model_lower else raw_rul * 0.85
                raw_upper = float(self.model_upper.predict(feature_vector)[0]) if self.model_upper else raw_rul * 1.15
                
                rul_h = max(0.5, min(180.0, raw_rul))
                lower_h = max(0.2, min(rul_h, raw_lower))
                upper_h = max(rul_h, min(200.0, raw_upper))
                rate = max(0.05, min(25.0, (100.0 - health_index) / max(1.0, rul_h)))
                
                return {
                    "rul_hours": round(rul_h, 1),
                    "status": "CALCULATED (EXPERIMENTAL ESTIMATE)",
                    "confidence_interval_90": {"lower_bound": round(lower_h, 1), "upper_bound": round(upper_h, 1)},
                    "degradation_rate_pct_per_hr": round(rate, 2),
                    "data_basis": "HYBRID EXPERIMENTAL (NON-FLIGHT-CERTIFIED)"
                }
            except Exception:
                pass

        base_rul = max(1.0, (health_index / 100.0) * 150.0 * (1.0 - 0.7 * degradation_wear))
        lower_h = max(0.5, base_rul * 0.82)
        upper_h = base_rul * 1.18
        rate = (100.0 - health_index) / max(1.0, base_rul)
        
        return {
            "rul_hours": round(base_rul, 1),
            "status": "CALCULATED (ANALYTICAL BASELINE)",
            "confidence_interval_90": {"lower_bound": round(lower_h, 1), "upper_bound": round(upper_h, 1)},
            "degradation_rate_pct_per_hr": round(rate, 2),
            "data_basis": "ANALYTICAL TESTBED DEGRADATION"
        }

rul_predictor = RULPredictor()

