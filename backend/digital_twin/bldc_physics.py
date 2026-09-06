import math
from typing import Dict, Any
from backend.digital_twin.config import calibration_store

class BLDCPhysicsTwin:
    """
    First-principles Physics Engine for BLDC propulsion testbed.
    Dynamically loads motor calibration parameters from CalibrationStore.
    Models:
    - Expected RPM from voltage and throttle
    - Back-EMF: Eb = RPM / Kv
    - Armature resistance voltage drop: V_drop = I * R_m
    - Expected Current from load torque and no-load losses
    - Electrical and Mechanical Power
    - Expected Efficiency curve
    """
    def __init__(self):
        pass

    def compute_expected_state(self, 
                               throttle_pct: float, 
                               voltage_v: float, 
                               load_pct: float) -> Dict[str, float]:
        """
        Computes the physics-expected nominal operating point given throttle, voltage, and load.
        """
        cfg = calibration_store.get_config()
        kv = cfg.kv_rpm_per_v
        rm = cfg.internal_resistance_ohms
        i0 = cfg.no_load_current_a
        kt = cfg.torque_constant_kt or (60.0 / (2.0 * math.pi * max(1.0, kv)))
        c_prop = cfg.prop_drag_coefficient

        throttle = max(0.0, min(100.0, throttle_pct)) / 100.0
        v_applied = max(0.0, voltage_v) * throttle
        
        if v_applied < 0.5 or throttle < 0.02:
            return {
                "expected_rpm": 0.0,
                "expected_voltage_v": voltage_v,
                "expected_current_a": 0.0,
                "expected_power_elec_w": 0.0,
                "expected_power_mech_w": 0.0,
                "expected_efficiency_pct": 0.0,
                "expected_torque_nm": 0.0
            }

        # Nominal maximum RPM at this effective applied voltage
        rpm_no_load = max(0.0, (v_applied - i0 * rm) * kv)
        
        # Load torque model: Aerodynamic / dynamometer drag increases quadratically with RPM + static load
        load_factor = max(0.0, min(100.0, load_pct)) / 100.0
        
        # RPM sag under load
        rpm_loaded = max(0.0, rpm_no_load * (1.0 - 0.18 * load_factor))
        omega = 2.0 * math.pi * rpm_loaded / 60.0
        
        # Expected torque (aerodynamic + frictional load): tau = C_prop * RPM^2 * load_factor
        torque_load = (c_prop * (rpm_loaded ** 2)) * (0.4 + 0.6 * load_factor)
        
        # Expected motor current: I = I0 + (Torque / Kt)
        expected_current = i0 + (torque_load / max(1e-4, kt))
        
        # Electrical and mechanical power
        p_elec = v_applied * expected_current
        p_mech = torque_load * omega
        
        # Efficiency
        if p_elec > 2.0:
            efficiency = min(92.0, max(0.0, (p_mech / p_elec) * 100.0))
        else:
            efficiency = 0.0

        return {
            "expected_rpm": round(rpm_loaded, 1),
            "expected_voltage_v": round(voltage_v, 2),
            "expected_current_a": round(expected_current, 2),
            "expected_power_elec_w": round(p_elec, 2),
            "expected_power_mech_w": round(p_mech, 2),
            "expected_efficiency_pct": round(efficiency, 2),
            "expected_torque_nm": round(torque_load, 4)
        }

bldc_twin = BLDCPhysicsTwin()

