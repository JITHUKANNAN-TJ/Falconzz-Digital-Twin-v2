import json
import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class MotorCalibrationConfig(BaseModel):
    motor_name: str = "A2212/15T 930KV BLDC (Quadcopter Testbed)"
    motor_type: str = "BLDC"
    motor_count: int = 4
    target_rated_rpm: float = Field(default=100.0, description="Configured user operating rated RPM (not fabricated live telemetry)")
    calibration_status: str = Field(default="CALIBRATED - A2212/15T 930KV BENCH PROFILE", description="Status of physical motor calibration")
    
    # Motor Electrical Parameters (A2212 / 15T 930KV Specs)
    kv_rpm_per_v: float = Field(default=930.0, description="Velocity constant (RPM/V)")
    internal_resistance_ohms: float = Field(default=0.110, description="Phase-to-phase terminal resistance Rm (Ohms)")
    no_load_current_a: float = Field(default=0.55, description="No-load current I0 (A)")
    nominal_voltage_v: float = Field(default=11.1, description="Nominal battery pack voltage (V)")
    torque_constant_kt: float = Field(default=0.01026, description="Torque constant Kt (N*m/A)")
    
    # Propeller & ESC Specifications
    prop_specification: str = "10x4.5 Quadcopter Propeller"
    esc_specification: str = "30A BLHeli / DShot ESC"
    prop_diameter_inches: float = Field(default=10.0)
    prop_pitch_inches: float = Field(default=4.5)
    prop_drag_coefficient: float = Field(default=3.8e-9, description="C_prop constant in N*m/RPM^2")
    
    # Thermal ODE Parameters
    thermal_capacitance_j_per_k: float = Field(default=150.0, description="C_th (J/K)")
    thermal_resistance_k_per_w: float = Field(default=0.85, description="R_th static (K/W)")
    cooling_airflow_factor: float = Field(default=0.0003, description="Forced convection RPM scaling")
    
    # Structural Vibration Baseline
    vibration_floor_g: float = Field(default=0.05, description="Zero-RPM noise floor (g)")
    vibration_rpm_scaling: float = Field(default=0.00015, description="RPM harmonic multiplier")
    vibration_exponent: float = Field(default=1.10, description="Harmonic power factor")
    
    # Hard Operational Limits for Real Hardware Safety
    max_safe_rpm: float = Field(default=7500.0)
    max_safe_current_a: float = Field(default=15.0)
    max_safe_temp_c: float = Field(default=80.0)
    max_safe_vib_g: float = Field(default=2.5)
    
    # Per-Motor Overrides
    motor_overrides: Dict[str, Dict[str, Any]] = Field(default_factory=dict)

class CalibrationStore:
    """Manages persistent motor-specific calibration constants on disk."""
    def __init__(self, config_file: str = "data/quadcopter_motor_calibration.json"):
        self.config_file = config_file
        self.config = self._load()

    def _load(self) -> MotorCalibrationConfig:
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r") as f:
                    data = json.load(f)
                    return MotorCalibrationConfig(**data)
            except Exception:
                pass
        return MotorCalibrationConfig()

    def save(self, new_config: MotorCalibrationConfig):
        self.config = new_config
        os.makedirs(os.path.dirname(self.config_file) or ".", exist_ok=True)
        with open(self.config_file, "w") as f:
            json.dump(self.config.dict(), f, indent=2)

    def get_config(self) -> MotorCalibrationConfig:
        return self.config

calibration_store = CalibrationStore()

class MotorChannelMappingStore:
    """Manages persistent physical motor <-> ESC telemetry instance <-> ArduPilot servo output mapping."""
    def __init__(self, config_file: str = "data/motor_channel_mapping.json"):
        self.config_file = config_file
        self.mappings: Dict[str, Dict[str, Any]] = self._load()

    def _default_mapping(self) -> Dict[str, Dict[str, Any]]:
        return {
            "motor_1": {
                "motor_id": "motor_1",
                "label": "Motor 1 - Front Right (CW)",
                "esc_instance": 0,
                "servo_channel": 1,
                "is_connected": True
            },
            "motor_2": {
                "motor_id": "motor_2",
                "label": "Motor 2 - Rear Left (CW)",
                "esc_instance": 1,
                "servo_channel": 2,
                "is_connected": True
            },
            "motor_3": {
                "motor_id": "motor_3",
                "label": "Motor 3 - Front Left (CCW)",
                "esc_instance": 2,
                "servo_channel": 3,
                "is_connected": True
            },
            "motor_4": {
                "motor_id": "motor_4",
                "label": "Motor 4 - Rear Right (CCW)",
                "esc_instance": 3,
                "servo_channel": 4,
                "is_connected": True
            }
        }

    def _load(self) -> Dict[str, Dict[str, Any]]:
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r") as f:
                    data = json.load(f)
                    # Ensure is_connected is present for each motor
                    for m_id, m_dict in data.items():
                        if "is_connected" not in m_dict:
                            m_dict["is_connected"] = True
                    return data
            except Exception:
                pass
        return self._default_mapping()

    def save(self, new_mappings: Dict[str, Dict[str, Any]]):
        self.mappings = new_mappings
        os.makedirs(os.path.dirname(self.config_file) or ".", exist_ok=True)
        with open(self.config_file, "w") as f:
            json.dump(self.mappings, f, indent=2)

    def get_mappings(self) -> Dict[str, Dict[str, Any]]:
        return self.mappings

    def get_motor_connections(self) -> Dict[str, bool]:
        """Returns connection boolean for all 4 motors."""
        return {
            m_id: bool(self.mappings.get(m_id, {}).get("is_connected", True))
            for m_id in ("motor_1", "motor_2", "motor_3", "motor_4")
        }

    def set_motor_connection(self, motor_id: str, is_connected: bool):
        """Sets connection state of an individual motor and persists mapping."""
        if motor_id in self.mappings:
            self.mappings[motor_id]["is_connected"] = bool(is_connected)
            self.save(self.mappings)

    def set_all_motors_connection(self, is_connected: bool):
        """Connects or disconnects all motors simultaneously."""
        for m_id in ("motor_1", "motor_2", "motor_3", "motor_4"):
            if m_id in self.mappings:
                self.mappings[m_id]["is_connected"] = bool(is_connected)
        self.save(self.mappings)

mapping_store = MotorChannelMappingStore()


