import time
import math
import random
from typing import Dict, Any, Optional
from backend.telemetry.schema import ScenarioType, TelemetrySource
from backend.config import settings
from simulator.scenarios import SCENARIOS, ScenarioDefinition
from simulator.degradation_engine import degradation_engine
from backend.digital_twin.a2212_physics import calculate_a2212_telemetry

class TelemetryGenerator:
    """
    Simulates high-fidelity physical BLDC testbed sensor signals for A2212/15T 930KV:
    - 4 individual physical motor channels with explicit CONNECTED / DISCONNECTED states
    - Hall/Optical RPM sensor (with quantization & jitter)
    - INA219 / ACS712 Voltage & Current sensors
    - DS18B20 / NTC Thermistor winding temperature
    - MPU6050 / ADXL345 3-Axis vibration accelerometer
    - Dynamometer load & Electronic Speed Controller (ESC) PWM throttle
    """
    def __init__(self):
        self.active_scenario: ScenarioType = ScenarioType.NORMAL
        self.scenario_severity: float = 0.5  # 0.0 to 1.0
        self.throttle_pct: float = 55.0
        self.load_pct: float = 40.0
        self.battery_voltage: float = 12.0   # 3S LiPo testbed nominal (11.1V - 12.4V)
        self.ambient_temp_c: float = settings.DEFAULT_AMBIENT_TEMP_C
        self.internal_temp: float = settings.DEFAULT_AMBIENT_TEMP_C
        self.last_step_time: float = time.time()
        self.sim_yaw_deg: float = 0.0
        self.sim_time_origin: float = time.time()
        
        # Connection state for each of the 4 individual motors (synced from persistent mapping_store)
        try:
            from backend.digital_twin.config import mapping_store
            self.motor_connections: Dict[str, bool] = mapping_store.get_motor_connections()
        except Exception:
            self.motor_connections: Dict[str, bool] = {
                "motor_1": True,
                "motor_2": True,
                "motor_3": True,
                "motor_4": False
            }
        
        # Individual motor variations (simulating real-world arm differences)
        self.motor_labels: Dict[str, str] = {
            "motor_1": "Motor 1 - Front Right (CW)",
            "motor_2": "Motor 2 - Rear Left (CW)",
            "motor_3": "Motor 3 - Front Left (CCW)",
            "motor_4": "Motor 4 - Rear Right (CCW)"
        }
        self.motor_offsets = {
            "motor_1": {"rpm_mult": 1.002, "curr_mult": 0.995, "temp_offset": 0.5, "vib_offset": 0.01},
            "motor_2": {"rpm_mult": 0.998, "curr_mult": 1.008, "temp_offset": 1.2, "vib_offset": 0.02},
            "motor_3": {"rpm_mult": 1.005, "curr_mult": 0.992, "temp_offset": -0.4, "vib_offset": -0.01},
            "motor_4": {"rpm_mult": 0.995, "curr_mult": 1.005, "temp_offset": 0.2, "vib_offset": 0.00}
        }
        
    def set_motor_connection(self, motor_id: str, is_connected: bool):
        """Sets connection state of an individual motor."""
        if motor_id in self.motor_connections:
            self.motor_connections[motor_id] = bool(is_connected)
            
    def set_all_motors_connection(self, is_connected: bool):
        """Connects or disconnects all motors simultaneously."""
        for m_id in self.motor_connections:
            self.motor_connections[m_id] = bool(is_connected)
            
    def get_motor_connections(self) -> Dict[str, bool]:
        """Returns the connection status mapping for all motors."""
        return dict(self.motor_connections)
        
    def set_scenario(self, scenario: ScenarioType, severity: float = 0.5):
        self.active_scenario = scenario
        self.scenario_severity = max(0.0, min(1.0, severity))
        
    def set_operating_point(self, throttle_pct: float, load_pct: Optional[float] = None, ambient_temp_c: Optional[float] = None):
        self.throttle_pct = max(0.0, min(100.0, throttle_pct))
        if load_pct is not None:
            self.load_pct = max(0.0, min(100.0, load_pct))
        if ambient_temp_c is not None:
            self.ambient_temp_c = ambient_temp_c

    def generate_packet(self) -> Dict[str, Any]:
        now = time.time()
        dt = max(0.05, min(2.0, now - self.last_step_time))
        self.last_step_time = now
        
        try:
            from backend.digital_twin.config import mapping_store
            self.motor_connections.update(mapping_store.get_motor_connections())
        except Exception:
            pass
            
        scen_def: ScenarioDefinition = SCENARIOS.get(self.active_scenario, SCENARIOS[ScenarioType.NORMAL])
        sev = self.scenario_severity
        
        # 1. Base empirical physics calculation for A2212/15T 930KV with 1045 prop on 3S LiPo
        effective_load = min(100.0, max(0.0, self.load_pct + scen_def.load_boost_pct * sev))
        base_phys = calculate_a2212_telemetry(self.throttle_pct, self.ambient_temp_c)
        
        # 2. Voltage (with empirical load droop & scenario drop)
        v_nominal = base_phys["voltage_v"] - scen_def.voltage_drop_v * sev
        v_noise = random.gauss(0.0, 0.02) if self.throttle_pct > 0 else 0.0
        v_measured = max(0.0, v_nominal + v_noise)
        
        # 3. RPM with scenario modifiers and sensor jitter
        kv = 930.0
        rm = 0.110
        i0 = 0.55
        if self.throttle_pct < 0.5:
            rpm_raw = 0.0
            current_raw = 0.0
            torque_nm = 0.0
        else:
            base_rpm = base_phys["live_rpm"]
            rpm_drop = base_rpm * (scen_def.rpm_loss_pct / 100.0) * sev
            rpm_noise = random.gauss(0.0, 4.0)
            rpm_raw = max(0.0, base_rpm - rpm_drop + rpm_noise + scen_def.sensor_drift_rpm * sev)
            
            current_mult = 1.0 + (scen_def.current_mult - 1.0) * sev
            current_noise = random.gauss(0.0, 0.08)
            current_raw = max(0.0, (base_phys["current_a"] * current_mult) + current_noise)
            torque_nm = base_phys["torque_nm"]
            
        # 4. Temperature Evolution (calibrated base + scenario excess heating)
        ambient_target = base_phys["temperature_c"] + (scen_def.temp_offset * sev)
        approach_rate = (0.05 * scen_def.temp_rate_mult) * dt
        self.internal_temp += (ambient_target - self.internal_temp) * min(1.0, approach_rate)
        temp_measured = max(self.ambient_temp_c, self.internal_temp + (random.gauss(0.0, 0.15) if self.throttle_pct > 0 else 0.0))
        
        # 5. Vibration simulation (calibrated base + scenario faults)
        vib_base = base_phys["vibration_rms_g"]
        vib_fault = scen_def.vib_offset_g * sev
        vib_noise = random.gauss(0.0, 0.015 * scen_def.vib_noise_mult) if self.throttle_pct > 0 else 0.0
        vib_rms = max(0.015, vib_base + vib_fault + vib_noise)
        
        # 6. Cumulative wear step
        deg_info = degradation_engine.step(
            dt_sec=dt,
            rpm=rpm_raw,
            current_a=current_raw,
            temp_c=temp_measured,
            severity=sev if self.active_scenario != ScenarioType.NORMAL else 0.0
        )
        
        # 7. Discrete 4-Motor Telemetry Generation (Exact A2212 930KV Benchmark & Connection State)
        motors_dict = {}
        connected_rpms = []
        connected_currents = []
        connected_powers = []
        connected_thrusts = []
        connected_efficiencies = []
        connected_temps = []
        connected_vibs = []
        
        in_cruise_zone = (50.0 <= self.throttle_pct <= 62.0)
        
        for m_idx, m_id in enumerate(("motor_1", "motor_2", "motor_3", "motor_4")):
            is_conn = self.motor_connections.get(m_id, True)
            m_label = self.motor_labels.get(m_id, f"Motor {m_idx + 1}")
            offsets = self.motor_offsets.get(m_id, {"rpm_mult": 1.0, "curr_mult": 1.0, "temp_offset": 0.0, "vib_offset": 0.0})
            
            if is_conn:
                m_rpm = round(max(0.0, rpm_raw * offsets["rpm_mult"]), 1)
                m_volt = round(v_measured, 2)
                m_curr = round(max(0.0, current_raw * offsets["curr_mult"]), 2)
                m_pwr = round(m_volt * m_curr, 2)
                
                # Thrust calculation for A2212/15T 930KV with 1045 prop
                if m_rpm > 100.0:
                    base_thrust = base_phys["thrust_g"] * (offsets["rpm_mult"] ** 2)
                    thrust_val = round(max(0.0, base_thrust + random.gauss(0.0, 0.6)), 1)
                else:
                    thrust_val = 0.0
                    
                g_w = round(thrust_val / m_pwr, 2) if m_pwr > 0.5 else 0.0
                
                # Mechanical power and electrical efficiency
                omega_m = 2.0 * math.pi * m_rpm / 60.0
                kt_val = 60.0 / (2.0 * math.pi * kv)
                torque_m = max(0.0, m_curr - i0) * kt_val
                p_mech_m = torque_m * omega_m
                eff_pct = round(min(88.0, max(0.0, (p_mech_m / m_pwr) * 100.0)), 1) if m_pwr > 1.0 else 0.0
                
                m_temp = round(temp_measured + offsets["temp_offset"], 1)
                m_vib = round(max(0.015, vib_rms + offsets["vib_offset"]), 3)
                
                connected_rpms.append(m_rpm)
                connected_currents.append(m_curr)
                connected_powers.append(m_pwr)
                connected_thrusts.append(thrust_val)
                connected_efficiencies.append(eff_pct)
                connected_temps.append(m_temp)
                connected_vibs.append(m_vib)
                
                motors_dict[m_id] = {
                    "motor_id": m_id,
                    "label": m_label,
                    "esc_instance": m_idx,
                    "servo_channel": m_idx + 1,
                    "is_connected": True,
                    "connection_status": "CONNECTED",
                    "disconnection_reason": None,
                    "motor_model": "A2212/15T 930KV",
                    "propeller": "1045 (10x4.5)",
                    "kv_rating": kv,
                    "live_rpm": m_rpm,
                    "rated_rpm": 930.0,
                    "voltage_v": m_volt,
                    "current_a": m_curr,
                    "power_w": m_pwr,
                    "thrust_g": thrust_val,
                    "g_per_watt": g_w,
                    "efficiency_pct": eff_pct,
                    "temperature_c": m_temp,
                    "vibration_rms_g": m_vib,
                    "throttle_pct": round(self.throttle_pct, 1),
                    "torque_nm": round(torque_m, 4),
                    "in_cruise_efficiency_zone": in_cruise_zone,
                    "status": "REAL",
                    "source_message": f"SIM_CH_{m_idx + 1}_LIVE"
                }
            else:
                # Explicit DISCONNECTED state - zero physical values, no phantom telemetry
                motors_dict[m_id] = {
                    "motor_id": m_id,
                    "label": m_label,
                    "esc_instance": m_idx,
                    "servo_channel": m_idx + 1,
                    "is_connected": False,
                    "connection_status": "DISCONNECTED",
                    "disconnection_reason": "ESC Cable / Port Disconnected",
                    "motor_model": "A2212/15T 930KV",
                    "propeller": "1045 (10x4.5)",
                    "kv_rating": kv,
                    "live_rpm": 0.0,
                    "rated_rpm": 930.0,
                    "voltage_v": 0.0,
                    "current_a": 0.0,
                    "power_w": 0.0,
                    "thrust_g": 0.0,
                    "g_per_watt": 0.0,
                    "efficiency_pct": 0.0,
                    "temperature_c": round(self.ambient_temp_c, 1),
                    "vibration_rms_g": 0.015,
                    "throttle_pct": 0.0,
                    "torque_nm": 0.0,
                    "in_cruise_efficiency_zone": False,
                    "status": "UNAVAILABLE",
                    "source_message": "DISCONNECTED"
                }
                
        # Propulsion Aggregates
        conn_count = len(connected_rpms)
        tot_curr = round(sum(connected_currents), 2) if conn_count > 0 else 0.0
        tot_pwr = round(sum(connected_powers), 2) if conn_count > 0 else 0.0
        tot_thrust = round(sum(connected_thrusts), 1) if conn_count > 0 else 0.0
        avg_rpm_val = round(sum(connected_rpms) / conn_count, 1) if conn_count > 0 else 0.0
        avg_eff_val = round(sum(connected_efficiencies) / conn_count, 1) if conn_count > 0 else 0.0
        avg_gw_val = round(tot_thrust / tot_pwr, 2) if tot_pwr > 0.5 else 0.0
        
        rpm_imb = round(max(connected_rpms) - min(connected_rpms), 1) if conn_count >= 2 else 0.0
        curr_imb = round(max(connected_currents) - min(connected_currents), 2) if conn_count >= 2 else 0.0
        temp_imb = round(max(connected_temps) - min(connected_temps), 1) if conn_count >= 2 else 0.0
        vib_imb = round(max(connected_vibs) - min(connected_vibs), 3) if conn_count >= 2 else 0.0
        
        # Primary global sensor values reflect active motors if any, or 0.0 if all disconnected
        effective_global_rpm = avg_rpm_val if conn_count > 0 else 0.0
        effective_global_curr = round(tot_curr / conn_count, 2) if conn_count > 0 else 0.0
        effective_global_temp = (sum(connected_temps) / conn_count) if conn_count > 0 else self.ambient_temp_c
        effective_global_vib = (sum(connected_vibs) / conn_count) if conn_count > 0 else 0.015

        # ——— Realistic attitude synthesis for 3D (was missing → add) ———
        t = now - self.sim_time_origin
        # Yaw slow drift + throttle influence
        yaw_rate = 1.2 + (self.throttle_pct / 100.0) * 2.5
        self.sim_yaw_deg = (self.sim_yaw_deg + yaw_rate * dt * (0.3 if conn_count==0 else 1.0)) % 360.0
        # Roll/pitch small oscillations scaled by scenario severity
        sev_att = sev if self.active_scenario != ScenarioType.NORMAL else 0.15
        roll_deg = math.sin(t*0.35) * (1.8 + sev_att*4.5) + math.sin(t*1.7)*0.3*sev_att + random.gauss(0,0.08)
        pitch_deg = math.cos(t*0.42) * (1.2 + sev_att*3.0) + math.sin(t*0.9)*0.25*sev_att + random.gauss(0,0.08)
        # Add imbalance-induced tilt for degraded scenarios
        if conn_count >= 2 and rpm_imb > 20:
            roll_deg += (rpm_imb/60.0) * math.sin(t*0.8)
        # Clamp
        roll_deg = max(-22, min(22, roll_deg))
        pitch_deg = max(-18, min(18, pitch_deg))
        yaw_deg = self.sim_yaw_deg if conn_count>0 else 0.0
        # Flight mode & armed synthetic
        is_armed_sim = conn_count>0 and self.throttle_pct>5.0
        flight_mode_sim = "LOITER" if 48 < self.throttle_pct < 62 else ("STABILIZE" if self.throttle_pct>5 else "STANDBY")
        sats_sim = 12 if conn_count>0 else 0
        
        return {
            "timestamp": now,
            "source_type": TelemetrySource.SIMULATION.value,
            "throttle_pct": self.throttle_pct if conn_count > 0 else 0.0,
            "rpm": effective_global_rpm,
            "voltage_v": round(v_measured, 2) if conn_count > 0 else 12.40,
            "current_a": effective_global_curr,
            "temperature_c": effective_global_temp,
            "vibration_rms_g": effective_global_vib,
            "load_pct": effective_load,
            "ambient_temperature_c": self.ambient_temp_c,
            "torque_nm": torque_nm if conn_count > 0 else 0.0,
            "roll_deg": round(roll_deg,2) if conn_count>0 else 0.0,
            "pitch_deg": round(pitch_deg,2) if conn_count>0 else 0.0,
            "yaw_deg": round(yaw_deg,2) if conn_count>0 else 0.0,
            "rollspeed_deg_s": round(math.cos(t*0.35)*0.7,2),
            "pitchspeed_deg_s": round(-math.sin(t*0.42)*0.5,2),
            "yawspeed_deg_s": round(yaw_rate,2) if conn_count>0 else 0.0,
            "flight_mode": flight_mode_sim,
            "is_armed": is_armed_sim,
            "satellites_visible": sats_sim,
            "heartbeat_received": True if conn_count>0 else False,
            
            # Discrete 4-motor Quadcopter channels
            "motors": motors_dict,
            "connected_motors_count": conn_count,
            "total_motors_count": 4,
            "total_thrust_g": tot_thrust,
            "avg_efficiency_pct": avg_eff_val,
            "avg_g_per_watt": avg_gw_val,
            "total_current_a": tot_curr,
            "total_power_w": tot_pwr,
            "avg_rpm": avg_rpm_val,
            "rpm_imbalance_pct": rpm_imb,
            "current_imbalance_pct": curr_imb,
            "temp_imbalance_c": temp_imb,
            "vibration_imbalance_g": vib_imb
        }

telemetry_generator = TelemetryGenerator()
