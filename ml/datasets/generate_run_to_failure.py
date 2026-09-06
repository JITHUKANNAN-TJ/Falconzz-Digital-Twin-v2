import os
import math
import random
import numpy as np
import pandas as pd
from backend.telemetry.schema import ScenarioType, CanonicalTelemetry
from backend.digital_twin.residual_engine import residual_engine
from backend.intelligence.feature_pipeline import FEATURE_NAMES, FeaturePipeline
from simulator.scenarios import SCENARIOS, ScenarioDefinition
from backend.config import settings

def generate_synthetic_dataset(num_trajectories: int = 120, steps_per_trajectory: int = 60, output_csv: str = "ml/datasets/run_to_failure_dataset.csv"):
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    rows = []
    
    fault_classes = [
        ScenarioType.NORMAL,
        ScenarioType.HIGH_LOAD,
        ScenarioType.OVERHEATING,
        ScenarioType.BEARING_DEGRADATION,
        ScenarioType.ELECTRICAL_DEGRADATION,
        ScenarioType.SENSOR_DRIFT,
        ScenarioType.COMBINED_DEGRADATION
    ]
    
    for traj_idx in range(num_trajectories):
        # Choose target fault mode
        fault_type = fault_classes[traj_idx % len(fault_classes)]
        scen_def = SCENARIOS[fault_type]
        
        pipeline = FeaturePipeline()
        base_throttle = random.uniform(40.0, 85.0)
        base_load = random.uniform(25.0, 60.0)
        ambient_t = random.uniform(15.0, 38.0)
        
        curr_temp = ambient_t
        total_life_hours = random.uniform(80.0, 200.0)
        
        for step in range(steps_per_trajectory):
            progress = step / float(steps_per_trajectory - 1)
            # RUL decreases linearly to near zero if degrading
            if fault_type == ScenarioType.NORMAL:
                rul_h = total_life_hours * (1.0 - 0.05 * progress)
                sev = 0.0
            else:
                sev = min(1.0, progress ** 1.5)  # Accelerated degradation curve
                rul_h = max(0.5, total_life_hours * (1.0 - 0.95 * (progress ** 1.2)))
                
            # Throttle jitter
            throttle = min(100.0, max(10.0, base_throttle + random.gauss(0.0, 1.5)))
            effective_load = min(100.0, max(0.0, base_load + scen_def.load_boost_pct * sev))
            
            # Voltage
            v_nom = 14.8 - scen_def.voltage_drop_v * sev + random.gauss(0.0, 0.04)
            v_app = (throttle / 100.0) * v_nom
            
            # RPM & Current
            base_rpm = (v_app * settings.MOTOR_KV) * (1.0 - 0.18 * (effective_load / 100.0))
            rpm_loss = base_rpm * (scen_def.rpm_loss_pct / 100.0) * sev
            rpm = max(0.0, base_rpm - rpm_loss + random.gauss(0.0, 15.0) + scen_def.sensor_drift_rpm * sev)
            
            c_prop = 3.8e-9
            torque_nm = (c_prop * (rpm ** 2)) * (0.4 + 0.6 * (effective_load / 100.0))
            kt = 60.0 / (2.0 * math.pi * settings.MOTOR_KV)
            base_curr = settings.MOTOR_NO_LOAD_CURRENT_A + (torque_nm / kt)
            curr_mult = 1.0 + (scen_def.current_mult - 1.0) * sev
            current = max(0.0, base_curr * curr_mult + random.gauss(0.0, 0.15))
            
            # Temp
            loss_w = (current ** 2) * settings.MOTOR_RESISTANCE_OHMS + 1.2e-4 * (rpm ** 1.5)
            r_th = settings.THERMAL_RESISTANCE_K_PER_W / (1.0 + 0.0003 * rpm)
            target_t = ambient_t + (loss_w * r_th) + (scen_def.temp_offset * sev)
            curr_temp += (target_t - curr_temp) * 0.15
            temp_c = curr_temp + random.gauss(0.0, 0.2)
            
            # Vibration
            vib_base = 0.04 + 0.010 * ((rpm / 1000.0) ** 1.75) + 0.02 * (effective_load / 100.0)
            vib_fault = scen_def.vib_offset_g * sev
            vib_g = max(0.02, vib_base + vib_fault + random.gauss(0.0, 0.03 * scen_def.vib_noise_mult))
            
            # Telemetry packet
            ts = float(step) * 2.0
            p_elec = v_nom * current
            omega = 2.0 * math.pi * rpm / 60.0
            p_mech = torque_nm * omega
            eff = (p_mech / p_elec * 100.0) if p_elec > 2.0 else 0.0
            
            tel = CanonicalTelemetry(
                timestamp=ts,
                throttle_pct=round(throttle, 2),
                rpm=round(rpm, 1),
                voltage_v=round(v_nom, 2),
                current_a=round(current, 2),
                power_elec_w=round(p_elec, 2),
                torque_nm=round(torque_nm, 4),
                power_mech_w=round(p_mech, 2),
                efficiency_pct=round(min(98.0, eff), 2),
                temperature_c=round(temp_c, 2),
                vibration_rms_g=round(vib_g, 3),
                load_pct=round(effective_load, 2),
                ambient_temperature_c=round(ambient_t, 2)
            )
            
            # Physics Twin & Residuals
            twin, res = residual_engine.compute_twin_and_residuals(tel)
            
            # Features
            feats = pipeline.extract_features(tel, twin, res)
            
            row = dict(feats)
            row["fault_class"] = fault_type.value
            row["is_anomaly"] = 0 if (fault_type == ScenarioType.NORMAL or sev < 0.15) else 1
            row["rul_hours"] = round(rul_h, 2)
            row["trajectory_id"] = traj_idx
            row["step"] = step
            row["severity"] = round(sev, 3)
            rows.append(row)
            
    df = pd.DataFrame(rows)
    df.to_csv(output_csv, index=False)
    print(f"Generated {len(df)} samples across {num_trajectories} trajectories -> {output_csv}")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset()
