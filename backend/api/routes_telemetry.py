from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.telemetry.buffer_store import buffer_store
from backend.telemetry.schema import TelemetrySource, ScenarioType
from backend.hardware.hal_manager import hal_manager
from simulator.telemetry_generator import telemetry_generator

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

class ThrottleRequest(BaseModel):
    throttle_pct: float
    load_pct: Optional[float] = None
    ambient_temp_c: Optional[float] = None

class ScenarioRequest(BaseModel):
    scenario: ScenarioType
    severity: float = 0.5

class SourceRequest(BaseModel):
    source: TelemetrySource

@router.get("/latest")
def get_latest_telemetry():
    latest = buffer_store.get_latest_state()
    if not latest:
        raise HTTPException(status_code=404, detail="No telemetry available yet")
    return latest.telemetry

@router.get("/history")
def get_telemetry_history(limit: int = 100):
    states = buffer_store.get_recent_states(limit)
    return [s.telemetry for s in states]

@router.get("/full-state")
def get_full_system_state():
    latest = buffer_store.get_latest_state()
    if not latest:
        raise HTTPException(status_code=404, detail="System state not initialized")
    return latest

@router.post("/throttle")
def set_throttle(req: ThrottleRequest):
    telemetry_generator.set_operating_point(req.throttle_pct, req.load_pct, req.ambient_temp_c)
    buffer_store.add_event(
        event_type="OPERATOR_THROTTLE_SET",
        severity="INFO",
        message=f"Throttle set to {req.throttle_pct}% (Load: {req.load_pct}%)",
        details=req.model_dump()
    )
    return {"status": "SUCCESS", "throttle_pct": req.throttle_pct, "load_pct": req.load_pct}

@router.post("/scenario")
def set_scenario(req: ScenarioRequest):
    telemetry_generator.set_scenario(req.scenario, req.severity)
    buffer_store.add_event(
        event_type="SCENARIO_CHANGED",
        severity="WARNING" if req.scenario != ScenarioType.NORMAL else "INFO",
        message=f"Scenario changed to {req.scenario.value} with severity {req.severity:.2f}",
        details=req.model_dump()
    )
    return {"status": "SUCCESS", "scenario": req.scenario.value, "severity": req.severity}

@router.post("/source")
def set_telemetry_source(req: SourceRequest):
    hal_manager.set_source(req.source)
    buffer_store.add_event(
        event_type="TELEMETRY_SOURCE_CHANGED",
        severity="INFO",
        message=f"Active telemetry source set to {req.source.value}",
        details={"source": req.source.value}
    )
    return {"status": "SUCCESS", "source": req.source.value}

@router.get("/export-csv")
def export_telemetry_csv():
    csv_stream = buffer_store.export_csv_stream()
    return Response(
        content=csv_stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=falconz_telemetry_export.csv"}
    )

from backend.telemetry.recorder import telemetry_recorder

class RecordStartRequest(BaseModel):
    session_name: Optional[str] = None

@router.post("/record/start")
def start_recording_telemetry(req: RecordStartRequest):
    """Starts recording live physical telemetry samples to disk."""
    session = telemetry_recorder.start_recording(req.session_name)
    return {
        "status": "RECORDING_STARTED",
        "session": session.dict() if session else None
    }

@router.post("/record/stop")
def stop_recording_telemetry():
    """Stops flight recording and flushes CSV/JSON to disk."""
    session = telemetry_recorder.stop_recording()
    return {
        "status": "RECORDING_STOPPED",
        "session": session.dict() if session else None
    }

@router.get("/record/status")
def get_recording_status():
    """Returns active flight recording status."""
    return telemetry_recorder.get_status()

@router.get("/record/list")
def list_flight_recordings():
    """Lists all saved flight recordings on disk."""
    return {
        "recordings": telemetry_recorder.list_recordings()
    }

from fastapi.responses import FileResponse
import os

@router.get("/record/export/{filename}")
def export_flight_recording(filename: str):
    """Downloads a recorded flight CSV or JSON file."""
    filepath = os.path.join(telemetry_recorder.storage_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Recording file not found")
    media_type = "text/csv" if filename.endswith(".csv") else "application/json"
    return FileResponse(filepath, media_type=media_type, filename=filename)

@router.get("/events")
def get_system_events(limit: int = 50):
    return buffer_store.get_events(limit)


