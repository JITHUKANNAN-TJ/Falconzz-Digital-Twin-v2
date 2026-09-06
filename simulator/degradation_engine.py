import math

class DegradationEngine:
    """
    Simulates continuous cumulative wear and gradual degradation over time
    (exponential Paris-Erdogan law analog for mechanical wear, Arrhenius thermal degradation analog).
    """
    def __init__(self):
        self.cumulative_run_seconds: float = 0.0
        self.mechanical_wear: float = 0.0  # 0.0 to 1.0
        self.thermal_wear: float = 0.0     # 0.0 to 1.0
        self.electrical_wear: float = 0.0  # 0.0 to 1.0
        
    def reset(self):
        self.cumulative_run_seconds = 0.0
        self.mechanical_wear = 0.0
        self.thermal_wear = 0.0
        self.electrical_wear = 0.0

    def step(self, 
             dt_sec: float, 
             rpm: float, 
             current_a: float, 
             temp_c: float, 
             severity: float) -> dict:
        self.cumulative_run_seconds += dt_sec
        
        # Stress factors
        rpm_stress = max(0.0, (rpm - 4000.0) / 3000.0)
        thermal_stress = max(0.0, (temp_c - 55.0) / 30.0)
        current_stress = max(0.0, (current_a - 18.0) / 15.0)
        
        # Rate of degradation (accelerated by severity multiplier)
        rate_mult = 1.0 + 5.0 * max(0.0, severity)
        
        # Increment wear
        self.mechanical_wear += (0.00002 * (1.0 + 2.0 * rpm_stress)) * rate_mult * dt_sec
        self.thermal_wear += (0.00003 * (1.0 + 3.0 * thermal_stress)) * rate_mult * dt_sec
        self.electrical_wear += (0.000015 * (1.0 + 2.5 * current_stress)) * rate_mult * dt_sec
        
        # Clamp
        self.mechanical_wear = min(1.0, self.mechanical_wear)
        self.thermal_wear = min(1.0, self.thermal_wear)
        self.electrical_wear = min(1.0, self.electrical_wear)
        
        total_wear = min(1.0, 0.4 * self.mechanical_wear + 0.35 * self.thermal_wear + 0.25 * self.electrical_wear)
        
        return {
            "total_wear": round(total_wear, 4),
            "mechanical_wear": round(self.mechanical_wear, 4),
            "thermal_wear": round(self.thermal_wear, 4),
            "electrical_wear": round(self.electrical_wear, 4),
            "cumulative_run_hours": round(self.cumulative_run_seconds / 3600.0, 3)
        }

degradation_engine = DegradationEngine()
