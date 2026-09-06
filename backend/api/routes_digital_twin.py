from fastapi import APIRouter, HTTPException
from backend.telemetry.buffer_store import buffer_store

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])

@router.get("/current")
def get_digital_twin_and_residuals():
    latest = buffer_store.get_latest_state()
    if not latest:
        raise HTTPException(status_code=404, detail="No digital twin data available")
    return {
        "telemetry": latest.telemetry,
        "digital_twin": latest.digital_twin,
        "residuals": latest.residuals
    }

@router.get("/residuals-history")
def get_residuals_history(limit: int = 50):
    states = buffer_store.get_recent_states(limit)
    return [{
        "timestamp": s.timestamp,
        "residuals": s.residuals,
        "actual_rpm": s.telemetry.rpm,
        "expected_rpm": s.digital_twin.expected_rpm,
        "actual_temp": s.telemetry.temperature_c,
        "expected_temp": s.digital_twin.expected_temperature_c,
        "actual_vib": s.telemetry.vibration_rms_g,
        "expected_vib": s.digital_twin.expected_vibration_rms_g
    } for s in states]
