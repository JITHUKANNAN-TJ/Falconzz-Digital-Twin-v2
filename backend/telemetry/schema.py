from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import time

class TelemetrySource(str, Enum):
    SIMULATION = "SIMULATION"
    APM_MAVLINK = "APM_MAVLINK"
    ESP32_SERIAL = "ESP32_SERIAL"
    ESP32_WIFI = "ESP32_WIFI"
    ARDUINO_SERIAL = "ARDUINO_SERIAL"

class ConnectionStatus(str, Enum):
    CONNECTED = "CONNECTED"
    CONNECTING = "CONNECTING"
    DISCONNECTED = "DISCONNECTED"
    STALE = "STALE"
    ERROR = "ERROR"
    SIMULATED = "SIMULATED"

class PipelineState(str, Enum):
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    STALE = "STALE"
    ERROR = "ERROR"

class ControlMode(str, Enum):
    MANUAL = "MANUAL"
    ASSISTED = "ASSISTED"
    AUTOMATIC = "AUTOMATIC"

class SafetyState(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"

class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    HIGH_LOAD = "HIGH_LOAD"
    OVERHEATING = "OVERHEATING"
    BEARING_DEGRADATION = "BEARING_DEGRADATION"
    ELECTRICAL_DEGRADATION = "ELECTRICAL_DEGRADATION"
    SENSOR_DRIFT = "SENSOR_DRIFT"
    RAPID_THROTTLE = "RAPID_THROTTLE"
    COMBINED_DEGRADATION = "COMBINED_DEGRADATION"

class SensorChannelBadge(str, Enum):
    REAL = "REAL"
    SIMULATION = "SIMULATION"
    UNAVAILABLE = "UNAVAILABLE"
    PROXY = "PROXY"

class FieldProvenance(BaseModel):
    value: Optional[Any] = None
    unit: str = ""
    source: str = "APM_MAVLINK"
    message: str = "ESC_TELEMETRY"
    field: str = "rpm"
    status: SensorChannelBadge = SensorChannelBadge.REAL

class MAVLinkMessageDiscovery(BaseModel):
    msg_type: str
    status: str = "UNAVAILABLE"  # AVAILABLE, STALE, UNAVAILABLE, ERROR
    count: int = 0
    last_received_timestamp: Optional[float] = None
    last_received_age_sec: Optional[float] = None
    sample_fields: Dict[str, Any] = Field(default_factory=dict)

class MotorChannelMapping(BaseModel):
    motor_id: str  # "motor_1", "motor_2", "motor_3", "motor_4"
    label: str = ""  # e.g., "Motor 1 - Front Right (CW)"
    esc_instance: Optional[int] = None  # ESC telemetry instance index (0..15) or None
    servo_channel: Optional[int] = None  # ArduPilot servo output channel (1..16) or None

class MotorTelemetry(BaseModel):
    motor_id: str  # "motor_1", "motor_2", "motor_3", "motor_4"
    label: str = ""
    esc_instance: Optional[int] = None
    servo_channel: Optional[int] = None
    live_rpm: Optional[float] = None  # Strictly real measured RPM or None
    rated_rpm: float = 100.0  # Configured rated parameter (not fabricated live telemetry)
    voltage_v: Optional[float] = None
    current_a: Optional[float] = None
    power_w: Optional[float] = None
    temperature_c: Optional[float] = None
    vibration_rms_g: Optional[float] = None
    throttle_pct: Optional[float] = None
    torque_nm: Optional[float] = None
    status: SensorChannelBadge = SensorChannelBadge.UNAVAILABLE
    source_message: str = "UNAVAILABLE"

class PipelineStageStatus(BaseModel):
    stage_id: str
    stage_name: str
    status: PipelineState = PipelineState.WAITING
    latency_ms: Optional[float] = None
    message_rate_hz: Optional[float] = None
    details: str = ""

class CanonicalTelemetry(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    source_type: TelemetrySource = TelemetrySource.APM_MAVLINK
    connection_status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    connection_id: str = "USB_SERIAL"
    
    # 4-Motor Quadcopter Channels (Independent Physical Channels)
    motors: Dict[str, MotorTelemetry] = Field(default_factory=dict)
    
    # Quadcopter Propulsion Aggregate Metrics (Derived only from available valid telemetry)
    total_current_a: Optional[float] = None
    total_power_w: Optional[float] = None
    avg_rpm: Optional[float] = None
    rpm_imbalance_pct: Optional[float] = None
    current_imbalance_pct: Optional[float] = None
    temp_imbalance_c: Optional[float] = None
    vibration_imbalance_g: Optional[float] = None
    
    # Global / Primary Sensor Channels
    throttle_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    rpm: float = Field(default=0.0, ge=0.0)
    voltage_v: float = Field(default=0.0, ge=0.0)
    current_a: float = Field(default=0.0, ge=0.0)
    power_elec_w: float = Field(default=0.0, ge=0.0)
    torque_nm: float = Field(default=0.0, ge=0.0)
    power_mech_w: float = Field(default=0.0, ge=0.0)
    efficiency_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    temperature_c: float = Field(default=25.0)
    vibration_rms_g: float = Field(default=0.0, ge=0.0)
    load_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    ambient_temperature_c: float = Field(default=25.0)
    altitude_m: float = Field(default=0.0)
    airspeed_mps: float = Field(default=0.0)
    
    # Battery Telemetry (from SYS_STATUS / BATTERY_STATUS)
    battery_voltage_v: Optional[float] = None
    battery_current_a: Optional[float] = None
    battery_remaining_pct: Optional[float] = None
    
    # Heartbeat & Telemetry Metadata
    telemetry_age_ms: Optional[float] = None
    packet_rate_hz: float = 0.0
    packet_loss_count: int = 0
    heartbeat_received: bool = False
    
    # Future MALE-UAV Aero-Piston Channels (Explicitly tagged as UNAVAILABLE/FUTURE)
    cht_c: Optional[float] = Field(default=None, description="Cylinder Head Temperature - Unavailable on BLDC rig")
    egt_c: Optional[float] = Field(default=None, description="Exhaust Gas Temperature - Unavailable on BLDC rig")
    oil_pressure_psi: Optional[float] = Field(default=None, description="Oil Pressure - Unavailable on BLDC rig")
    oil_temperature_c: Optional[float] = Field(default=None, description="Oil Temperature - Unavailable on BLDC rig")
    fuel_flow_gph: Optional[float] = Field(default=None, description="Fuel Flow - Unavailable on BLDC rig")
    alternator_current_a: Optional[float] = Field(default=None, description="Alternator Current - Unavailable on BLDC rig")
    manifold_pressure_inhg: Optional[float] = Field(default=None, description="Manifold Pressure - Unavailable on BLDC rig")
    
    # Field-Level Explicit Provenance Map
    field_provenance: Dict[str, FieldProvenance] = Field(default_factory=dict)
    
    # MAVLink Message Discovery Snapshot
    message_discovery: Dict[str, MAVLinkMessageDiscovery] = Field(default_factory=dict)
    
    # Channel Validity and Data Quality
    is_valid: bool = True
    validation_flags: List[str] = Field(default_factory=list)
    raw_packet: Optional[Dict[str, Any]] = None

class DigitalTwinExpected(BaseModel):
    timestamp: float
    expected_rpm: float
    expected_voltage_v: float
    expected_current_a: float
    expected_power_elec_w: float
    expected_power_mech_w: float
    expected_efficiency_pct: float
    expected_temperature_c: float
    expected_vibration_rms_g: float

class ResidualMetrics(BaseModel):
    timestamp: float
    residual_rpm: float
    residual_current_a: float
    residual_voltage_v: float
    residual_power_w: float
    residual_temperature_c: float
    residual_vibration_g: float
    residual_efficiency_pct: float
    
    # Normalized Z-score / relative deviations
    norm_residual_rpm: float
    norm_residual_current: float
    norm_residual_temp: float
    norm_residual_vibration: float
    norm_residual_efficiency: float
    composite_residual_score: float

class HealthAndIntelligence(BaseModel):
    timestamp: float
    health_index: float = Field(default=100.0, ge=0.0, le=100.0)
    health_band: str = "HEALTHY"  # HEALTHY, WARNING, DEGRADED, CRITICAL
    confidence_pct: float = Field(default=95.0, ge=0.0, le=100.0)
    trend: str = "STABLE"  # IMPROVING, STABLE, DEGRADING, RAPID_DROP
    
    anomaly_score: float = 0.0
    is_anomaly: bool = False
    anomaly_severity: str = "NORMAL"
    anomaly_hysteresis_count: int = 0
    
    predicted_fault: str = "Normal"
    fault_confidence_pct: float = 98.5
    fault_severity: str = "NONE"
    
    rul_hours: Optional[float] = None
    rul_status: str = "INSUFFICIENT DATA (PROTOTYPE - NON-FLIGHT-CERTIFIED)"
    rul_uncertainty_lower_hours: Optional[float] = None
    rul_uncertainty_upper_hours: Optional[float] = None
    rul_degradation_rate_pct_per_hr: float = 0.0
    
    # Explainable AI
    xai_what: str = "System operating normally within physics baseline."
    xai_why: str = "All residual signals are within ±1.5 sigma of Digital Twin predictions."
    xai_severity: str = "Nominal"
    xai_recommendation: str = "Maintain current operating profile. No intervention required."
    contributing_features: Dict[str, float] = Field(default_factory=dict)
    
    # Maintenance Advisory
    maintenance_urgency: str = "NONE"  # NONE, ROUTINE, SOON, IMMEDIATE, CRITICAL
    affected_subsystem: str = "All Subsystems Nominal"
    maintenance_action: str = "Routine pre-flight inspection checklist."
    maintenance_risk_level: str = "Low"

class FullSystemState(BaseModel):
    timestamp: float
    telemetry: CanonicalTelemetry
    digital_twin: DigitalTwinExpected
    residuals: ResidualMetrics
    intelligence: HealthAndIntelligence
    scenario: ScenarioType = ScenarioType.NORMAL
    scenario_severity: float = 0.0  # 0.0 to 1.0
    control_mode: ControlMode = ControlMode.MANUAL
    safety_state: SafetyState = SafetyState.SAFE
    emergency_stop_active: bool = False
    data_source: TelemetrySource = TelemetrySource.APM_MAVLINK
    connection_status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    flight_phase: str = "STANDBY"
    pipeline_stages: List[PipelineStageStatus] = Field(default_factory=list)

