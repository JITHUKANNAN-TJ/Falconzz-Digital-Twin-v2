import math
from typing import Dict, Any, List

MISSION_PROFILES = {
    "HIGH_ALTITUDE": {
        "name": "High Altitude Surveillance",
        "description": "Cruising at 8,000m - 10,000m altitude. Thin air reduces prop drag but drastically reduces convective cooling.",
        "altitude_m": 9000,
        "ambient_temp_c": -15.0,
        "throttle_pct": 72.0,
        "cooling_factor": 0.65,
        "load_factor": 1.15
    },
    "ENDURANCE_CRUISE": {
        "name": "Long-Endurance MALE Reconnaissance",
        "description": "24-hour loiter at optimal efficiency cruise operating point (55% throttle, 4,500m).",
        "altitude_m": 4500,
        "ambient_temp_c": 5.0,
        "throttle_pct": 52.0,
        "cooling_factor": 1.0,
        "load_factor": 0.95
    },
    "HOT_WEATHER": {
        "name": "Hot-and-High Tactical Mission",
        "description": "High ambient temperature (48°C) ground loiter and low-altitude climb out.",
        "altitude_m": 1200,
        "ambient_temp_c": 48.0,
        "throttle_pct": 82.0,
        "cooling_factor": 0.85,
        "load_factor": 1.25
    },
    "RAPID_THROTTLE": {
        "name": "Dynamic Low-Level Evasive Dash",
        "description": "Frequent full-throttle bursts, severe thermal cycling and mechanical vibration surges.",
        "altitude_m": 800,
        "ambient_temp_c": 32.0,
        "throttle_pct": 90.0,
        "cooling_factor": 1.1,
        "load_factor": 1.4
    }
}

class MissionSimulator:
    """
    Simulates multi-hour MALE UAV flight mission trajectories and projects:
    - Health decay trajectory
    - RUL consumption (equivalent operating life factor)
    - Thermal stress and peak winding temperatures
    - Subsystem wear (mechanical, thermal, electrical)
    - Mission risk level & abort recommendations
    """
    def simulate_mission(self, 
                         profile_key: str = "HIGH_ALTITUDE", 
                         duration_hours: float = 12.0, 
                         initial_health: float = 95.0,
                         initial_rul_hours: float = 120.0) -> Dict[str, Any]:
        profile = MISSION_PROFILES.get(profile_key, MISSION_PROFILES["HIGH_ALTITUDE"])
        
        duration_h = max(1.0, min(48.0, duration_hours))
        steps = 40
        dt_h = duration_h / float(steps)
        
        trajectory: List[Dict[str, Any]] = []
        
        curr_health = initial_health
        curr_rul = initial_rul_hours
        
        # Flight environmental parameters
        throttle = profile["throttle_pct"]
        amb_temp = profile["ambient_temp_c"]
        cooling_mult = profile["cooling_factor"]
        load_mult = profile["load_mult" if "load_mult" in profile else "load_factor"]
        
        # Calculate steady state winding temperature under mission conditions
        motor_power_w = 420.0 * ((throttle / 100.0) ** 1.8) * load_mult
        heat_gen_w = motor_power_w * 0.18  # 18% thermal loss
        r_th_effective = (1.45 / cooling_mult)
        steady_temp_c = amb_temp + heat_gen_w * r_th_effective
        
        # Equivalent wear multiplier relative to standard 25°C cruise
        thermal_severity = max(0.5, (steady_temp_c - 40.0) / 25.0)
        equiv_damage_factor = (throttle / 50.0) ** 2.0 * thermal_severity
        
        for step_i in range(steps + 1):
            t_h = step_i * dt_h
            # Non-linear degradation progression
            progress = t_h / duration_h
            health_drop = (0.25 * t_h * equiv_damage_factor) + (1.2 * (progress ** 2.0) * equiv_damage_factor)
            step_health = max(0.0, initial_health - health_drop)
            
            rul_consumption = t_h * equiv_damage_factor * 1.15
            step_rul = max(0.0, initial_rul_hours - rul_consumption)
            
            # Simulated vibration at this phase
            phase_vib = 0.22 + 0.15 * (throttle / 100.0) + (0.1 * progress * equiv_damage_factor)
            
            trajectory.append({
                "time_hours": round(t_h, 2),
                "health_index": round(step_health, 1),
                "rul_hours": round(step_rul, 1),
                "winding_temp_c": round(steady_temp_c + math.sin(step_i * 0.2) * 2.0, 1),
                "vibration_g": round(phase_vib, 3),
                "equivalent_hours_consumed": round(rul_consumption, 2)
            })

        final_health = trajectory[-1]["health_index"]
        final_rul = trajectory[-1]["rul_hours"]
        total_equiv_hours = trajectory[-1]["equivalent_hours_consumed"]

        risk_level = "LOW" if final_health > 75.0 else ("MODERATE" if final_health > 50.0 else "HIGH")
        feasible = final_health > 40.0 and final_rul > 5.0

        return {
            "profile_name": profile["name"],
            "profile_key": profile_key,
            "description": profile["description"],
            "duration_hours": duration_h,
            "altitude_m": profile["altitude_m"],
            "ambient_temp_c": amb_temp,
            "throttle_pct": throttle,
            "initial_health": initial_health,
            "final_health": final_health,
            "initial_rul_hours": initial_rul_hours,
            "final_rul_hours": final_rul,
            "equivalent_operating_hours": total_equiv_hours,
            "damage_acceleration_ratio": round(equiv_damage_factor, 2),
            "peak_winding_temp_c": round(steady_temp_c, 1),
            "mission_risk": risk_level,
            "is_mission_feasible": feasible,
            "recommendation": "Mission profile within safe degradation limits." if feasible else "High failure risk: Reduce loiter duration or throttle setting.",
            "trajectory": trajectory
        }

mission_simulator = MissionSimulator()
