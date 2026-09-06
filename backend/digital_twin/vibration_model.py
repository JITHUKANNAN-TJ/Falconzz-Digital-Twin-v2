import math

class BaselineVibrationModel:
    """
    Computes baseline expected rotational vibration for a healthy balanced BLDC motor & prop rig.
    Model:
    Vib_baseline = V0 + k_rpm * (RPM / 1000)^1.75 + k_load * (Load / 100)
    """
    def __init__(self, v0: float = 0.04, k_rpm: float = 0.010, k_load: float = 0.02):
        self.v0 = v0          # Sensor noise floor in G RMS
        self.k_rpm = k_rpm    # Rotational unbalance scaling constant
        self.k_load = k_load  # Aerodynamic turbulence scaling constant

    def compute_expected_vibration(self, rpm: float, load_pct: float) -> float:
        if rpm < 100.0:
            return round(self.v0, 3)
            
        rpm_k = rpm / 1000.0
        load_factor = max(0.0, min(100.0, load_pct)) / 100.0
        
        # Rotational 1X fundamental + ISO aerodynamic turbulence baseline
        vib = self.v0 + self.k_rpm * (rpm_k ** 1.75) + self.k_load * load_factor
        
        return round(max(0.01, min(5.0, vib)), 3)

vibration_model = BaselineVibrationModel()
