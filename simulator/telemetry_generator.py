import time
import math
import random
from typing import Dict, Any, Optional
from backend.telemetry.schema import ScenarioType, TelemetrySource
from backend.config import settings
from simulator.scenarios import SCENARIOS, ScenarioDefinition
from simulator.degradation_engine import degradation_engine

class TelemetryGenerator:
    """
    Simulates high-fidelity physical BLDC testbed sensor signals:
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
        self.battery_voltage: float = 14.8   # 4S LiPo nominal
        self.ambient_temp_c: float = settings.DEFAULT_AMBIENT_TEMP_C
        self.internal_temp: float = settings.DEFAULT_AMBIENT_TEMP_C
        self.last_step_time: float = time.time()
        
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
        
        scen_def: ScenarioDefinition = SCENARIOS.get(self.active_scenario, SCENARIOS[ScenarioType.NORMAL])
        sev = self.scenario_severity
        
        # 1. Throttle & Load calculation with scenario modifiers
        effective_load = min(100.0, max(0.0, self.load_pct + scen_def.load_boost_pct * sev))
        throttle = self.throttle_pct / 100.0
        
        # 2. Voltage (with internal resistance droop & scenario drop)
        v_nominal = self.battery_voltage - scen_def.voltage_drop_v * sev
        v_noise = random.gauss(0.0, 0.03)
        v_applied = max(0.0, (v_nominal + v_noise) * throttle)
        
        # 3. Baseline physical RPM
        if throttle < 0.03:
            rpm_raw = 0.0
            current_raw = 0.0
            torque_nm = 0.0
        else:
            v_eff = max(0.0, v_applied - settings.MOTOR_NO_LOAD_CURRENT_A * settings.MOTOR_RESISTANCE_OHMS)
            base_rpm = (v_eff * settings.MOTOR_KV) * (1.0 - 0.18 * (effective_load / 100.0))
            rpm_drop = base_rpm * (scen_def.rpm_loss_pct / 100.0) * sev
            rpm_noise = random.gauss(0.0, 5.0)
            rpm_raw = max(0.0, base_rpm - rpm_drop + rpm_noise + scen_def.sensor_drift_rpm * sev)
            
            # Torque & Current
            c_prop = 3.8e-9
            torque_nm = (c_prop * (rpm_raw ** 2)) * (0.4 + 0.6 * (effective_load / 100.0))
            kt = 60.0 / (2.0 * math.pi * settings.MOTOR_KV)
            base_current = settings.MOTOR_NO_LOAD_CURRENT_A + (torque_nm / kt)
            
            current_mult = 1.0 + (scen_def.current_mult - 1.0) * sev
            current_noise = random.gauss(0.0, 0.15)
            current_raw = max(0.0, (base_current * current_mult) + current_noise)
            
        # 4. Temperature Evolution (integrating thermal loss & scenario overheating)
        p_copper = (current_raw ** 2) * settings.MOTOR_RESISTANCE_OHMS
        p_iron = 1.2e-4 * (rpm_raw ** 1.5)
        loss_w = p_copper + p_iron
        
        r_th = settings.THERMAL_RESISTANCE_K_PER_W / (1.0 + 0.0003 * rpm_raw)
        ambient_target = self.ambient_temp_c + (loss_w * r_th) + (scen_def.temp_offset * sev)
        
        # Rate of approach
        approach_rate = (0.05 * scen_def.temp_rate_mult) * dt
        self.internal_temp += (ambient_target - self.internal_temp) * min(1.0, approach_rate)
        temp_noise = random.gauss(0.0, 0.2)
        temp_measured = max(self.ambient_temp_c - 5.0, self.internal_temp + temp_noise)
        
        # 5. Vibration Simulation (fundamental 1X + harmonics + bearing defect impacts)
        if rpm_raw < 100.0:
            vib_rms = 0.04 + random.uniform(0.0, 0.02)
        else:
            vib_base = 0.04 + 0.010 * ((rpm_raw / 1000.0) ** 1.75) + 0.02 * (effective_load / 100.0)
            vib_fault = scen_def.vib_offset_g * sev
            vib_noise = random.gauss(0.0, 0.03 * scen_def.vib_noise_mult)
            vib_rms = max(0.02, vib_base + vib_fault + vib_noise)
            
        # 6. Cumulative wear step
        deg_info = degradation_engine.step(
            dt_sec=dt,
            rpm=rpm_raw,
            current_a=current_raw,
            temp_c=temp_measured,
            severity=sev if self.active_scenario != ScenarioType.NORMAL else 0.0
        )
        
        return {
            "timestamp": now,
            "source_type": TelemetrySource.SIMULATION.value,
            "throttle_pct": self.throttle_pct,
            "rpm": rpm_raw,
            "voltage_v": max(0.0, v_nominal - current_raw * 0.03 + v_noise),
            "current_a": current_raw,
            "temperature_c": temp_measured,
            "vibration_rms_g": vib_rms,
            "load_pct": effective_load,
            "ambient_temperature_c": self.ambient_temp_c,
            "torque_nm": torque_nm
        }

telemetry_generator = TelemetryGenerator()
