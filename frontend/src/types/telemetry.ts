export type TelemetrySource = 'SIMULATION' | 'APM_MAVLINK' | 'ESP32_SERIAL' | 'ESP32_WIFI' | 'ARDUINO_SERIAL';
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'STALE' | 'SIMULATED';
export type ControlMode = 'MANUAL' | 'ASSISTED' | 'AUTOMATIC';
export type SafetyState = 'SAFE' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'EMERGENCY';
export type ScenarioType = 
  | 'NORMAL' 
  | 'HIGH_LOAD' 
  | 'OVERHEATING' 
  | 'BEARING_DEGRADATION' 
  | 'ELECTRICAL_DEGRADATION' 
  | 'SENSOR_DRIFT' 
  | 'RAPID_THROTTLE' 
  | 'COMBINED_DEGRADATION';

export interface FieldProvenance {
  value: any;
  source: string;
  message_type?: string;
  status: 'REAL' | 'SIMULATION' | 'UNAVAILABLE' | 'PROXY';
  timestamp?: number;
}

export interface MAVLinkMessageDiscovery {
  msg_type: string;
  status: 'AVAILABLE' | 'STALE' | 'UNAVAILABLE' | 'ERROR';
  count: number;
  last_received_timestamp?: number | null;
  last_received_age_sec?: number | null;
  sample_fields?: Record<string, any>;
}

export interface MotorChannelMapping {
  motor_id: string;
  label: string;
  esc_instance?: number | null;
  servo_channel?: number | null;
}

export interface MotorTelemetry {
  motor_id: string;
  label: string;
  esc_instance?: number | null;
  servo_channel?: number | null;
  is_connected?: boolean;
  connection_status?: 'CONNECTED' | 'DISCONNECTED';
  disconnection_reason?: string | null;
  motor_model?: string;
  propeller?: string;
  kv_rating?: number;
  live_rpm?: number | null;
  rpm?: number | null;
  rated_rpm: number;
  voltage_v?: number | null;
  current_a?: number | null;
  power_w?: number | null;
  thrust_g?: number | null;
  g_per_watt?: number | null;
  efficiency_pct?: number | null;
  temperature_c?: number | null;
  vibration_rms_g?: number | null;
  throttle_pct?: number | null;
  torque_nm?: number | null;
  in_cruise_efficiency_zone?: boolean;
  status: 'REAL' | 'SIMULATION' | 'UNAVAILABLE' | 'PROXY';
  source_message: string;
}

export interface MotorBenchmarkPoint {
  throttle_pct: number;
  voltage_v: number;
  current_a: number;
  power_w: number;
  rpm: number;
  thrust_g: number;
  g_per_watt: number;
  mechanical_power_w: number;
  electrical_eff_pct: number;
  motor_temp_c: number;
  vibration_g: number;
  in_cruise_efficiency_zone: boolean;
}

export interface MotorBenchmarkProfile {
  key: string;
  name: string;
  battery_cells: number;
  nominal_voltage_v: number;
  propeller: string;
  optimal: boolean;
  points: MotorBenchmarkPoint[];
}

export interface MotorSpec {
  model: string;
  kv_rating: number;
  stator_diameter_mm: number;
  stator_height_mm: number;
  poles: number;
  slots: number;
  internal_resistance_ohm: number;
  no_load_current_a: number;
  max_continuous_current_a: number;
  max_power_w: number;
  weight_g: number;
  shaft_diameter_mm: number;
  recommended_esc_a: number;
  recommended_battery: string;
  recommended_propeller: string;
  peak_efficiency_zone: {
    min_throttle_pct: number;
    max_throttle_pct: number;
    optimal_current_range_a: [number, number];
    optimal_thrust_range_g: [number, number];
    optimal_efficiency_g_per_w: [number, number];
    electrical_efficiency_pct: [number, number];
  };
}

export interface MotorBenchmarkData {
  motor_spec: MotorSpec;
  test_methodology: string;
  profiles: Record<string, MotorBenchmarkProfile>;
}

export interface PipelineStageStatus {
  stage_id: string;
  name: string;
  status: 'RUNNING' | 'WAITING' | 'ERROR' | 'STALE';
  fps_hz: number;
  last_activity_ms_ago: number;
  info: string;
  details?: string;
}

export interface CanonicalTelemetry {
  timestamp: number;
  source_type: TelemetrySource;
  connection_status: ConnectionStatus;
  
  // 4-Motor Quadcopter Channels
  motors?: Record<string, MotorTelemetry>;
  
  // Quadcopter Aggregate Propulsion Channels
  total_current_a?: number | null;
  total_power_w?: number | null;
  total_thrust_g?: number | null;
  avg_efficiency_pct?: number | null;
  avg_g_per_watt?: number | null;
  avg_rpm?: number | null;
  connected_motors_count?: number;
  total_motors_count?: number;
  rpm_imbalance_pct?: number | null;
  current_imbalance_pct?: number | null;
  temp_imbalance_c?: number | null;
  vibration_imbalance_g?: number | null;
  
  // Battery Telemetry
  battery_voltage_v?: number | null;
  battery_current_a?: number | null;
  battery_remaining_pct?: number | null;
  battery_consumed_mah?: number | null;
  battery_temp_c?: number | null;
  cell_voltages?: number[];
  
  // 3D Flight Attitude & Dynamics
  roll_deg?: number;
  pitch_deg?: number;
  yaw_deg?: number;
  rollspeed_deg_s?: number;
  pitchspeed_deg_s?: number;
  yawspeed_deg_s?: number;
  
  // IMU & Vibration Spectrum
  vibration_x_g?: number;
  vibration_y_g?: number;
  vibration_z_g?: number;
  clipping_0?: number;
  clipping_1?: number;
  clipping_2?: number;
  
  // Global Position & Navigation
  latitude?: number | null;
  longitude?: number | null;
  relative_altitude_m?: number;
  climb_rate_mps?: number;
  heading_deg?: number;
  satellites_visible?: number;
  gps_fix_type?: number;
  
  // Flight Controller Status & Radio RC Inputs
  flight_mode?: string;
  is_armed?: boolean;
  rc_throttle?: number;
  rc_roll?: number;
  rc_pitch?: number;
  rc_yaw?: number;
  rc_rssi?: number;
  rc_channels?: Record<string, number>;
  statustext_log?: Array<{ timestamp: number; severity: number; text: string }>;
  
  // Heartbeat & Telemetry Liveness
  heartbeat_received?: boolean;
  packet_rate_hz?: number;
  packet_loss_count?: number;
  telemetry_age_ms?: number | null;
  
  // Telemetry Radio Link Metrics
  radio_rssi?: number | null;
  radio_remrssi?: number | null;
  radio_noise?: number | null;
  radio_remnoise?: number | null;
  radio_txbuf?: number | null;
  
  // Primary Channels
  throttle_pct: number;
  rpm: number;
  voltage_v: number;
  current_a: number;
  power_elec_w: number;
  torque_nm: number;
  power_mech_w: number;
  efficiency_pct: number;
  temperature_c: number;
  vibration_rms_g: number;
  load_pct: number;
  ambient_temperature_c: number;
  altitude_m?: number;
  airspeed_mps?: number;
  
  // Future Aero-Piston Channels
  cht_c?: number | null;
  egt_c?: number | null;
  oil_pressure_psi?: number | null;
  oil_temperature_c?: number | null;
  fuel_flow_gph?: number | null;
  alternator_current_a?: number | null;
  manifold_pressure_inhg?: number | null;
  
  is_valid: boolean;
  validation_flags: string[];
  field_provenance?: Record<string, FieldProvenance>;
  message_discovery?: Record<string, MAVLinkMessageDiscovery>;
}

export interface DigitalTwinExpected {
  timestamp: number;
  expected_rpm: number;
  expected_voltage_v: number;
  expected_current_a: number;
  expected_power_elec_w: number;
  expected_power_mech_w: number;
  expected_efficiency_pct: number;
  expected_temperature_c: number;
  expected_vibration_rms_g: number;
}

export interface ResidualMetrics {
  timestamp: number;
  residual_rpm: number;
  residual_current_a: number;
  residual_voltage_v: number;
  residual_power_w: number;
  residual_temperature_c: number;
  residual_vibration_g: number;
  residual_efficiency_pct: number;
  norm_residual_rpm: number;
  norm_residual_current: number;
  norm_residual_temp: number;
  norm_residual_vibration: number;
  norm_residual_efficiency: number;
  composite_residual_score: number;
}

export interface HealthAndIntelligence {
  timestamp: number;
  health_index: number;
  health_band: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL';
  trend?: string;
  confidence_pct?: number;
  anomaly_score: number;
  is_anomaly: boolean;
  anomaly_severity: string;
  anomaly_hysteresis_count: number;
  predicted_fault: string;
  fault_confidence_pct: number;
  fault_severity: string;
  rul_hours: number;
  rul_uncertainty_lower_hours: number;
  rul_uncertainty_upper_hours: number;
  rul_degradation_rate_pct_per_hr: number;
  rul_validation_badge: string;
  xai_what: string;
  xai_why: string;
  xai_severity: string;
  xai_recommendation: string;
  contributing_features: Record<string, number>;
  maintenance_urgency: string;
  affected_subsystem: string;
  maintenance_action: string;
  maintenance_risk_level: string;
}

export interface FullSystemState {
  timestamp: number;
  telemetry: CanonicalTelemetry;
  digital_twin: DigitalTwinExpected;
  residuals: ResidualMetrics;
  intelligence: HealthAndIntelligence;
  scenario: ScenarioType;
  scenario_severity: number;
  control_mode: ControlMode;
  safety_state: SafetyState;
  emergency_stop_active: boolean;
  data_source: TelemetrySource;
  connection_status: ConnectionStatus;
  flight_phase: string;
  pipeline_stages?: PipelineStageStatus[];
}

export interface DemoPhase {
  phase_number: number;
  title: string;
  description: string;
  scenario: ScenarioType;
  severity: number;
  throttle: number;
  load: number;
  duration_sec: number;
}

export interface DemoState {
  is_running: boolean;
  auto_advance: boolean;
  current_phase_index: number;
  current_phase: DemoPhase;
  phase_elapsed_sec: number;
  total_phases: number;
  all_phases: DemoPhase[];
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SystemAlert {
  id: string;
  timestamp: number;
  level: AlertSeverity;
  target: string;
  event: string;
  evidence: string;
  action: string;
  measured?: string;
  limit?: string;
  parameter?: string;
}

