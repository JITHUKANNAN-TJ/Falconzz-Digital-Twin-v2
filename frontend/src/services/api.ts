import { ScenarioType, TelemetrySource, ControlMode, MotorBenchmarkData } from '../types/telemetry';

const API_BASE = '/api';

export const api = {
  async getMotorBenchmark(): Promise<MotorBenchmarkData> {
    const res = await fetch(`${API_BASE}/hardware/motor-benchmark`);
    return res.json();
  },

  async getMotorConnections(): Promise<{ connections: Record<string, boolean> }> {
    const res = await fetch(`${API_BASE}/hardware/motor-connections`);
    return res.json();
  },

  async setMotorConnection(motor_id: string, is_connected: boolean) {
    const res = await fetch(`${API_BASE}/hardware/motor-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motor_id, is_connected })
    });
    return res.json();
  },

  async setAllMotorsConnection(is_connected: boolean) {
    const res = await fetch(`${API_BASE}/hardware/motor-connection-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_connected })
    });
    return res.json();
  },

  async getLatestTelemetry() {
    const res = await fetch(`${API_BASE}/telemetry/latest`);
    return res.json();
  },

  async getMotorsTelemetry() {
    const res = await fetch(`${API_BASE}/telemetry/motors`);
    return res.json();
  },

  async getTelemetryHistory(limit = 60) {
    const res = await fetch(`${API_BASE}/telemetry/history?limit=${limit}`);
    return res.json();
  },

  async getFullSystemState() {
    const res = await fetch(`${API_BASE}/telemetry/full-state`);
    return res.json();
  },

  async setThrottle(throttle_pct: number, load_pct?: number, ambient_temp_c?: number) {
    const res = await fetch(`${API_BASE}/telemetry/throttle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ throttle_pct, load_pct, ambient_temp_c })
    });
    return res.json();
  },

  async setScenario(scenario: ScenarioType, severity = 0.5) {
    const res = await fetch(`${API_BASE}/telemetry/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, severity })
    });
    return res.json();
  },

  async setTelemetrySource(source: TelemetrySource) {
    const res = await fetch(`${API_BASE}/telemetry/source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    });
    return res.json();
  },

  async getHealthHistory(limit = 60) {
    const res = await fetch(`${API_BASE}/intelligence/health-history?limit=${limit}`);
    return res.json();
  },

  async getModelEvaluation() {
    const res = await fetch(`${API_BASE}/intelligence/model-evaluation`);
    return res.json();
  },

  async getHardwareStatus() {
    const res = await fetch(`${API_BASE}/hardware/status`);
    return res.json();
  },

  async getSerialPorts() {
    const res = await fetch(`${API_BASE}/hardware/serial/ports`);
    return res.json();
  },

  async getMotorMapping() {
    const res = await fetch(`${API_BASE}/hardware/mapping`);
    return res.json();
  },

  async updateMotorMapping(mappings: any) {
    const res = await fetch(`${API_BASE}/hardware/mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    return res.json();
  },

  async getMavlinkDiscovery() {
    const res = await fetch(`${API_BASE}/hardware/discovery`);
    return res.json();
  },

  async getMotorCalibration() {
    const res = await fetch(`${API_BASE}/hardware/calibration`);
    return res.json();
  },

  async updateMotorCalibration(config: any) {
    const res = await fetch(`${API_BASE}/hardware/calibration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  async getAPMDiagnostics() {
    const res = await fetch(`${API_BASE}/hardware/apm/diagnostics`);
    return res.json();
  },

  async getAPMMessageTrace() {
    const res = await fetch(`${API_BASE}/hardware/apm/message-trace`);
    return res.json();
  },

  async getVerificationStatus() {
    const res = await fetch(`${API_BASE}/hardware/verification-status`);
    return res.json();
  },

  async startRecording(session_name?: string) {
    const res = await fetch(`${API_BASE}/telemetry/record/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_name })
    });
    return res.json();
  },

  async stopRecording() {
    const res = await fetch(`${API_BASE}/telemetry/record/stop`, { method: 'POST' });
    return res.json();
  },

  async getRecordingStatus() {
    const res = await fetch(`${API_BASE}/telemetry/record/status`);
    return res.json();
  },

  async listRecordings() {
    const res = await fetch(`${API_BASE}/telemetry/record/list`);
    return res.json();
  },

  async connectMAVLink(connection_string: string, baud_rate = 115200, connection_type = 'USB_SERIAL') {
    const res = await fetch(`${API_BASE}/hardware/mavlink/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connection_string, baud_rate, connection_type })
    });
    return res.json();
  },

  async disconnectMAVLink() {
    const res = await fetch(`${API_BASE}/hardware/mavlink/disconnect`, { method: 'POST' });
    return res.json();
  },

  async connectSerialDevice(port: string, baud_rate = 115200, device_type = 'ESP32') {
    const res = await fetch(`${API_BASE}/hardware/serial/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port, baud_rate, device_type })
    });
    return res.json();
  },

  async connectSerial(port: string, baud_rate = 115200, device_type = 'ESP32') {
    return this.connectSerialDevice(port, baud_rate, device_type);
  },

  async disconnectSerialDevice(device_type = 'ESP32') {
    const res = await fetch(`${API_BASE}/hardware/serial/disconnect?device_type=${device_type}`, { method: 'POST' });
    return res.json();
  },

  async disconnectSerial(device_type = 'ESP32') {
    return this.disconnectSerialDevice(device_type);
  },

  async getSafetyStatus() {
    const res = await fetch(`${API_BASE}/safety/status`);
    return res.json();
  },

  async triggerEmergencyStop(reason = 'Operator Manual Stop') {
    const res = await fetch(`${API_BASE}/safety/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async resetEmergencyStop() {
    const res = await fetch(`${API_BASE}/safety/reset-emergency-stop`, { method: 'POST' });
    return res.json();
  },

  async setControlMode(mode: ControlMode) {
    const res = await fetch(`${API_BASE}/safety/control-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    return res.json();
  },

  async simulateMission(profile_key = 'HIGH_ALTITUDE', duration_hours = 12.0) {
    const res = await fetch(`${API_BASE}/mission/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_key, duration_hours })
    });
    return res.json();
  },

  async getMissionProfiles() {
    const res = await fetch(`${API_BASE}/mission/profiles`);
    return res.json();
  },

  async getAllReplayFrames() {
    const res = await fetch(`${API_BASE}/mission/replay/all-frames`);
    return res.json();
  },

  async controlReplay(action: string, frame_idx?: number, speed?: number) {
    const res = await fetch(`${API_BASE}/mission/replay/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, frame_idx, speed })
    });
    return res.json();
  },

  async getDemoState() {
    const res = await fetch(`${API_BASE}/demo/state`);
    return res.json();
  },

  async startDemo(auto_advance = true) {
    const res = await fetch(`${API_BASE}/demo/start?auto_advance=${auto_advance}`, { method: 'POST' });
    return res.json();
  },

  async stopDemo() {
    const res = await fetch(`${API_BASE}/demo/stop`, { method: 'POST' });
    return res.json();
  },

  async jumpToDemoPhase(phase_idx: number) {
    const res = await fetch(`${API_BASE}/demo/phase/${phase_idx}`, { method: 'POST' });
    return res.json();
  },

  async nextDemoPhase() {
    const res = await fetch(`${API_BASE}/demo/next`, { method: 'POST' });
    return res.json();
  },

  async prevDemoPhase() {
    const res = await fetch(`${API_BASE}/demo/prev`, { method: 'POST' });
    return res.json();
  },

  async getSystemEvents() {
    const res = await fetch(`${API_BASE}/telemetry/events?limit=40`);
    return res.json();
  }
};
