import math
from backend.config import settings

class LumpedThermalModel:
    """
    Lumped-parameter thermal model for stator & windings.
    ODE: C_th * (dT/dt) = P_loss - (T - T_amb) / R_th
    where:
    - C_th: Thermal capacitance (J/K)
    - R_th: Thermal resistance to ambient (K/W)
    - P_loss = I^2 * Rm + P_core (W)
    """
    def __init__(self, 
                 c_th: float = settings.THERMAL_CAPACITANCE_J_PER_K, 
                 r_th: float = settings.THERMAL_RESISTANCE_K_PER_W,
                 rm: float = settings.MOTOR_RESISTANCE_OHMS):
        self.c_th = c_th
        self.r_th = r_th
        self.rm = rm
        self.estimated_temp_c: float = settings.DEFAULT_AMBIENT_TEMP_C
        self.last_timestamp: float = 0.0

    def step(self, 
             current_a: float, 
             rpm: float, 
             ambient_temp_c: float, 
             timestamp: float) -> float:
        """
        Advances the lumped thermal ODE one time step.
        """
        if self.last_timestamp <= 0.0:
            self.last_timestamp = timestamp
            self.estimated_temp_c = ambient_temp_c
            return round(self.estimated_temp_c, 2)

        dt = max(0.01, min(2.0, timestamp - self.last_timestamp))
        self.last_timestamp = timestamp

        # Ohmic copper losses (I^2 * R)
        p_cu = (current_a ** 2) * self.rm
        
        # Iron/core eddy & hysteresis losses (proportional to rpm^1.5 approx)
        p_iron = 1.2e-4 * (rpm ** 1.5)
        
        total_loss_w = p_cu + p_iron

        # Dynamic cooling enhancement with propeller airflow: R_th decreases with RPM
        r_th_eff = self.r_th / (1.0 + 0.0003 * rpm)

        # dT/dt = (P_loss - (T - T_amb)/R_th) / C_th
        heat_dissipated = (self.estimated_temp_c - ambient_temp_c) / max(0.1, r_th_eff)
        dt_temp = ((total_loss_w - heat_dissipated) / max(1.0, self.c_th)) * dt
        
        self.estimated_temp_c += dt_temp
        # Bound physically
        self.estimated_temp_c = max(ambient_temp_c, min(140.0, self.estimated_temp_c))
        
        return round(self.estimated_temp_c, 2)

    def compute_steady_state_temp(self, current_a: float, rpm: float, ambient_temp_c: float) -> float:
        p_cu = (current_a ** 2) * self.rm
        p_iron = 1.2e-4 * (rpm ** 1.5)
        total_loss_w = p_cu + p_iron
        r_th_eff = self.r_th / (1.0 + 0.0003 * rpm)
        return round(ambient_temp_c + total_loss_w * r_th_eff, 2)

thermal_model = LumpedThermalModel()
