from typing import Dict, Any
from backend.telemetry.schema import ScenarioType

class ScenarioDefinition:
    def __init__(self, 
                 name: ScenarioType,
                 description: str,
                 temp_offset: float = 0.0,
                 temp_rate_mult: float = 1.0,
                 vib_offset_g: float = 0.0,
                 vib_noise_mult: float = 1.0,
                 current_mult: float = 1.0,
                 voltage_drop_v: float = 0.0,
                 rpm_loss_pct: float = 0.0,
                 load_boost_pct: float = 0.0,
                 sensor_drift_rpm: float = 0.0):
        self.name = name
        self.description = description
        self.temp_offset = temp_offset
        self.temp_rate_mult = temp_rate_mult
        self.vib_offset_g = vib_offset_g
        self.vib_noise_mult = vib_noise_mult
        self.current_mult = current_mult
        self.voltage_drop_v = voltage_drop_v
        self.rpm_loss_pct = rpm_loss_pct
        self.load_boost_pct = load_boost_pct
        self.sensor_drift_rpm = sensor_drift_rpm

SCENARIOS: Dict[ScenarioType, ScenarioDefinition] = {
    ScenarioType.NORMAL: ScenarioDefinition(
        name=ScenarioType.NORMAL,
        description="Nominal BLDC propulsion baseline. Physics parameters align within normal sensor noise."
    ),
    ScenarioType.HIGH_LOAD: ScenarioDefinition(
        name=ScenarioType.HIGH_LOAD,
        description="Heavy aeromechanical load / high headwind. Current surges, moderate temperature rise.",
        load_boost_pct=35.0,
        current_mult=1.35,
        temp_offset=12.0
    ),
    ScenarioType.OVERHEATING: ScenarioDefinition(
        name=ScenarioType.OVERHEATING,
        description="Cooling airflow restriction / thermal path breakdown. Rapid winding temperature escalation.",
        temp_offset=38.0,
        temp_rate_mult=2.8,
        current_mult=1.12
    ),
    ScenarioType.BEARING_DEGRADATION: ScenarioDefinition(
        name=ScenarioType.BEARING_DEGRADATION,
        description="Mechanical bearing raceway wear. High vibration spikes (1X & harmonics), elevated friction drag.",
        vib_offset_g=0.65,
        vib_noise_mult=3.2,
        current_mult=1.18,
        temp_offset=8.0,
        rpm_loss_pct=4.0
    ),
    ScenarioType.ELECTRICAL_DEGRADATION: ScenarioDefinition(
        name=ScenarioType.ELECTRICAL_DEGRADATION,
        description="Partial phase winding short / ESC FET degradation. High copper loss, current imbalance.",
        current_mult=1.55,
        temp_offset=26.0,
        voltage_drop_v=1.2,
        rpm_loss_pct=6.5
    ),
    ScenarioType.SENSOR_DRIFT: ScenarioDefinition(
        name=ScenarioType.SENSOR_DRIFT,
        description="Optical/Hall sensor calibration drift. Measured RPM deviates without physical power change.",
        sensor_drift_rpm=650.0
    ),
    ScenarioType.RAPID_THROTTLE: ScenarioDefinition(
        name=ScenarioType.RAPID_THROTTLE,
        description="High dynamic throttle cycling. Transient thermal & electrical surges.",
        current_mult=1.25,
        vib_offset_g=0.18,
        temp_offset=14.0
    ),
    ScenarioType.COMBINED_DEGRADATION: ScenarioDefinition(
        name=ScenarioType.COMBINED_DEGRADATION,
        description="Multi-factor compound failure: Severe bearing spalling + winding thermal stress + high load.",
        vib_offset_g=0.85,
        vib_noise_mult=4.0,
        current_mult=1.65,
        temp_offset=42.0,
        temp_rate_mult=2.5,
        voltage_drop_v=1.5,
        rpm_loss_pct=8.0,
        load_boost_pct=30.0
    )
}
