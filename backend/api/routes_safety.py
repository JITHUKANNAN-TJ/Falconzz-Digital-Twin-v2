from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.telemetry.schema import ControlMode, SafetyState
from backend.safety.safety_guard import safety_guard
from backend.safety.control_modes import control_manager
from backend.telemetry.buffer_store import buffer_store

router = APIRouter(prefix="/safety", tags=["Safety & Controls"])

class ControlModeRequest(BaseModel):
    mode: ControlMode

class EmergencyStopRequest(BaseModel):
    reason: str = "Operator commanded emergency stop"

@router.get("/status")
def get_safety_status():
    return {
        "safety_state": safety_guard.current_state.value,
        "emergency_stop_latched": safety_guard.emergency_stop_latched,
        "active_violations": safety_guard.active_violations,
        "control_mode": control_manager.get_state()
    }

@router.post("/emergency-stop")
def trigger_emergency_stop(req: EmergencyStopRequest):
    safety_guard.trigger_emergency_stop(req.reason)
    buffer_store.add_event(
        event_type="EMERGENCY_STOP_TRIGGERED",
        severity="EMERGENCY",
        message=f"Emergency shutdown triggered: {req.reason}",
        details={"reason": req.reason}
    )
    return {"status": "EMERGENCY_STOP_ACTIVE", "violations": safety_guard.active_violations}

@router.post("/reset-emergency-stop")
def reset_emergency_stop():
    safety_guard.clear_emergency_stop()
    buffer_store.add_event(
        event_type="EMERGENCY_STOP_CLEARED",
        severity="INFO",
        message="Emergency stop cleared by operator. Resuming normal safety interlocks.",
        details={}
    )
    return {"status": "CLEARED", "safety_state": safety_guard.current_state.value}

@router.post("/control-mode")
def set_control_mode(req: ControlModeRequest):
    control_manager.set_mode(req.mode)
    buffer_store.add_event(
        event_type="CONTROL_MODE_CHANGED",
        severity="INFO",
        message=f"Control mode set to {req.mode.value}",
        details={"mode": req.mode.value}
    )
    return {"status": "SUCCESS", "mode": req.mode.value}
