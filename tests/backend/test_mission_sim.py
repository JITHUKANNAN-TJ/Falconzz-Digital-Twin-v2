import pytest
from backend.mission.mission_simulator import mission_simulator, MISSION_PROFILES
from backend.mission.mission_replay import mission_replay

def test_mission_profiles_and_simulation():
    for prof_key in MISSION_PROFILES:
        res = mission_simulator.simulate_mission(profile_key=prof_key, duration_hours=6.0, initial_health=95.0)
        assert res["profile_key"] == prof_key
        assert len(res["trajectory"]) > 0
        assert res["final_health"] <= res["initial_health"]
        assert res["final_rul_hours"] <= res["initial_rul_hours"]

def test_mission_replay_engine():
    assert len(mission_replay.frames) > 0
    mission_replay.seek(10)
    frame = mission_replay.get_current_frame()
    assert frame["frame_index"] == 10
    assert "telemetry" in frame
    assert "health" in frame
