import collections
import io
import csv
from typing import List, Optional
from backend.telemetry.schema import FullSystemState, CanonicalTelemetry
from backend.config import settings

class BufferStore:
    def __init__(self, max_size: int = settings.TELEMETRY_BUFFER_SIZE):
        self.max_size = max_size
        self.state_buffer: collections.deque[FullSystemState] = collections.deque(maxlen=max_size)
        self.telemetry_buffer: collections.deque[CanonicalTelemetry] = collections.deque(maxlen=max_size)
        self.events_log: collections.deque[dict] = collections.deque(maxlen=500)
        
    def add_state(self, state: FullSystemState):
        self.state_buffer.append(state)
        self.telemetry_buffer.append(state.telemetry)
        
    def add_event(self, event_type: str, severity: str, message: str, details: Optional[dict] = None):
        import time
        event = {
            "timestamp": time.time(),
            "event_type": event_type,
            "severity": severity,
            "message": message,
            "details": details or {}
        }
        self.events_log.append(event)
        
    def get_recent_states(self, count: int = 50) -> List[FullSystemState]:
        return list(self.state_buffer)[-count:]
        
    def get_latest_state(self) -> Optional[FullSystemState]:
        return self.state_buffer[-1] if len(self.state_buffer) > 0 else None
        
    def get_recent_telemetry(self, count: int = 50) -> List[CanonicalTelemetry]:
        return list(self.telemetry_buffer)[-count:]
        
    def get_events(self, count: int = 50) -> List[dict]:
        return list(self.events_log)[-count:]
        
    def export_csv_stream(self) -> io.StringIO:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow([
            "timestamp", "source_type", "throttle_pct", "rpm", "voltage_v", "current_a",
            "power_elec_w", "torque_nm", "power_mech_w", "efficiency_pct", "temperature_c",
            "vibration_rms_g", "load_pct", "ambient_temp_c",
            "expected_rpm", "expected_current", "expected_temp", "expected_vibration",
            "residual_rpm", "residual_temp", "residual_vib",
            "health_index", "health_band", "anomaly_score", "predicted_fault", "rul_hours",
            "xai_what", "scenario", "safety_state"
        ])
        
        for state in list(self.state_buffer):
            t = state.telemetry
            dt = state.digital_twin
            r = state.residuals
            intel = state.intelligence
            writer.writerow([
                t.timestamp, t.source_type.value, t.throttle_pct, t.rpm, t.voltage_v, t.current_a,
                t.power_elec_w, t.torque_nm, t.power_mech_w, t.efficiency_pct, t.temperature_c,
                t.vibration_rms_g, t.load_pct, t.ambient_temperature_c,
                dt.expected_rpm, dt.expected_current_a, dt.expected_temperature_c, dt.expected_vibration_rms_g,
                r.residual_rpm, r.residual_temperature_c, r.residual_vibration_g,
                intel.health_index, intel.health_band, intel.anomaly_score, intel.predicted_fault, intel.rul_hours,
                intel.xai_what, state.scenario.value, state.safety_state.value
            ])
            
        output.seek(0)
        return output

buffer_store = BufferStore()
