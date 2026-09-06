from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.mission.mission_simulator import mission_simulator, MISSION_PROFILES
from backend.mission.mission_replay import mission_replay

router = APIRouter(prefix="/mission", tags=["Mission Simulation & Replay"])

class MissionSimulateRequest(BaseModel):
    profile_key: str = "HIGH_ALTITUDE"
    duration_hours: float = 12.0
    initial_health: float = 95.0
    initial_rul_hours: float = 120.0

class ReplayControlRequest(BaseModel):
    action: str  # "play", "pause", "seek", "speed", "reset"
    frame_idx: Optional[int] = None
    speed: Optional[float] = None

@router.get("/profiles")
def get_mission_profiles():
    return MISSION_PROFILES

@router.post("/simulate")
def run_mission_simulation(req: MissionSimulateRequest):
    return mission_simulator.simulate_mission(
        profile_key=req.profile_key,
        duration_hours=req.duration_hours,
        initial_health=req.initial_health,
        initial_rul_hours=req.initial_rul_hours
    )

@router.get("/replay/frame")
def get_replay_current_frame():
    return mission_replay.step_forward()

@router.get("/replay/all-frames")
def get_all_replay_frames():
    return {
        "total_frames": len(mission_replay.frames),
        "playback_speed": mission_replay.playback_speed,
        "is_playing": mission_replay.is_playing,
        "current_frame_idx": mission_replay.current_frame_idx,
        "frames": mission_replay.frames
    }

@router.post("/replay/control")
def control_replay(req: ReplayControlRequest):
    if req.action == "play":
        mission_replay.play()
    elif req.action == "pause":
        mission_replay.pause()
    elif req.action == "seek" and req.frame_idx is not None:
        mission_replay.seek(req.frame_idx)
    elif req.action == "speed" and req.speed is not None:
        mission_replay.set_speed(req.speed)
    elif req.action == "reset":
        mission_replay.seek(0)
        mission_replay.pause()
    else:
        raise HTTPException(status_code=400, detail="Invalid action or missing parameters")
        
    return {
        "status": "SUCCESS",
        "is_playing": mission_replay.is_playing,
        "current_frame_idx": mission_replay.current_frame_idx,
        "playback_speed": mission_replay.playback_speed
    }
