import time
import os
import json
import csv
import threading
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class RecordingSession(BaseModel):
    session_id: str
    start_time: float
    end_time: Optional[float] = None
    sample_count: int = 0
    is_recording: bool = False
    file_path_json: Optional[str] = None
    file_path_csv: Optional[str] = None

class TelemetryFlightRecorder:
    """
    Real Flight Telemetry Recording Engine.
    Records every incoming valid telemetry frame, raw MAVLink packet types,
    physics residuals, ML inferences, health indicators, and safety states.
    Exports recorded datasets for calibration, model validation, and audit review.
    """
    def __init__(self, storage_dir: str = "data/recordings"):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self.is_recording: bool = False
        self.session: Optional[RecordingSession] = None
        self.buffer: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        
    def start_recording(self, session_name: Optional[str] = None) -> RecordingSession:
        with self._lock:
            if self.is_recording:
                return self.session
                
            now = time.time()
            session_id = session_name or f"flight_rec_{time.strftime('%Y%m%d_%H%M%S')}"
            json_path = os.path.join(self.storage_dir, f"{session_id}.json")
            csv_path = os.path.join(self.storage_dir, f"{session_id}.csv")
            
            self.session = RecordingSession(
                session_id=session_id,
                start_time=now,
                is_recording=True,
                file_path_json=json_path,
                file_path_csv=csv_path
            )
            self.buffer = []
            self.is_recording = True
            return self.session

    def stop_recording(self) -> Optional[RecordingSession]:
        with self._lock:
            if not self.is_recording or not self.session:
                return None
                
            self.session.end_time = time.time()
            self.session.sample_count = len(self.buffer)
            self.session.is_recording = False
            self.is_recording = False
            
            # Flush to disk
            self._save_to_disk()
            return self.session

    def ingest_frame(self, state_dict: Dict[str, Any]):
        if not self.is_recording:
            return
            
        with self._lock:
            # Flatten crucial parameters for compact CSV/JSON logging
            telem = state_dict.get("telemetry", {})
            twin = state_dict.get("digital_twin", {})
            res = state_dict.get("residuals", {})
            intel = state_dict.get("intelligence", {})
            
            frame_record = {
                "timestamp": state_dict.get("timestamp", time.time()),
                "source_type": state_dict.get("data_source", "APM_MAVLINK"),
                "connection_status": state_dict.get("connection_status", "CONNECTED"),
                # Real Measured
                "measured_rpm": telem.get("rpm", 0.0),
                "measured_voltage_v": telem.get("voltage_v", 0.0),
                "measured_current_a": telem.get("current_a", 0.0),
                "measured_temp_c": telem.get("temperature_c", 0.0),
                "measured_vib_g": telem.get("vibration_rms_g", 0.0),
                "commanded_throttle_pct": telem.get("throttle_pct", 0.0),
                # Twin Predictions
                "twin_rpm": twin.get("expected_rpm", 0.0),
                "twin_current_a": twin.get("expected_current_a", 0.0),
                "twin_temp_c": twin.get("expected_temperature_c", 0.0),
                "twin_vib_g": twin.get("expected_vibration_rms_g", 0.0),
                # Physics Residuals
                "residual_rpm": res.get("residual_rpm", 0.0),
                "residual_current_a": res.get("residual_current_a", 0.0),
                "residual_temp_c": res.get("residual_temperature_c", 0.0),
                "residual_vib_g": res.get("residual_vibration_g", 0.0),
                "composite_residual_score": res.get("composite_residual_score", 0.0),
                # AI Inference & Health
                "health_index": intel.get("health_index", 100.0),
                "health_band": intel.get("health_band", "HEALTHY"),
                "is_anomaly": intel.get("is_anomaly", False),
                "predicted_fault": intel.get("predicted_fault", "Normal"),
                "fault_confidence_pct": intel.get("fault_confidence_pct", 95.0),
                "rul_hours": intel.get("rul_hours"),
                "control_mode": state_dict.get("control_mode", "MANUAL"),
                "safety_state": state_dict.get("safety_state", "SAFE")
            }
            self.buffer.append(frame_record)
            if self.session:
                self.session.sample_count = len(self.buffer)

    def _save_to_disk(self):
        if not self.session or not self.buffer:
            return
            
        try:
            # 1. Write JSON
            if self.session.file_path_json:
                with open(self.session.file_path_json, "w") as f:
                    json.dump({
                        "session": self.session.dict(),
                        "samples": self.buffer
                    }, f, indent=2)
                    
            # 2. Write CSV
            if self.session.file_path_csv and len(self.buffer) > 0:
                keys = list(self.buffer[0].keys())
                with open(self.session.file_path_csv, "w", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=keys)
                    writer.writeheader()
                    writer.writerows(self.buffer)
        except Exception as e:
            print(f"Error saving flight recording: {e}")

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "is_recording": self.is_recording,
                "session": self.session.dict() if self.session else None,
                "sample_count": len(self.buffer) if self.is_recording else (self.session.sample_count if self.session else 0)
            }

    def list_recordings(self) -> List[Dict[str, Any]]:
        recordings = []
        try:
            for fname in os.listdir(self.storage_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.storage_dir, fname)
                    stat = os.stat(fpath)
                    recordings.append({
                        "filename": fname,
                        "session_id": fname.replace(".json", ""),
                        "size_bytes": stat.st_size,
                        "created_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
                    })
        except Exception:
            pass
        return sorted(recordings, key=lambda x: x["created_time"], reverse=True)

telemetry_recorder = TelemetryFlightRecorder()
