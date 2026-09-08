import pytest
from fastapi.testclient import TestClient
from backend.main import app
from simulator.telemetry_generator import telemetry_generator

client = TestClient(app)

def test_motor_benchmark_endpoint():
    res = client.get("/api/hardware/motor-benchmark")
    assert res.status_code == 200
    data = res.json()
    assert "motor_spec" in data
    assert data["motor_spec"]["model"] == "A2212/15T"
    assert data["motor_spec"]["kv_rating"] == 930.0
    assert "profiles" in data
    assert "3S_1045_optimal" in data["profiles"]
    prof = data["profiles"]["3S_1045_optimal"]
    assert len(prof["points"]) > 10
    # Verify optimal cruise zone exists (50-62%)
    cruise_pts = [p for p in prof["points"] if p["in_cruise_efficiency_zone"]]
    assert len(cruise_pts) >= 3
    # Check thrust & efficiency in cruise zone
    for pt in cruise_pts:
        assert pt["g_per_watt"] >= 7.0

def test_motor_connection_toggle():
    # 1. Get initial connections
    res = client.get("/api/hardware/motor-connections")
    assert res.status_code == 200
    conns = res.json()["connections"]
    assert "motor_1" in conns
    
    # 2. Disconnect motor_2
    res2 = client.post("/api/hardware/motor-connection", json={"motor_id": "motor_2", "is_connected": False})
    assert res2.status_code == 200
    assert res2.json()["connections"]["motor_2"] is False
    
    # Run pipeline step to generate telemetry frame and populate buffer
    from backend.main import run_causal_pipeline_step
    run_causal_pipeline_step()
    
    # 3. Check telemetry output reflecting disconnected motor_2
    res_tel = client.get("/api/telemetry/latest")
    assert res_tel.status_code == 200
    tel = res_tel.json()
    assert "motors" in tel
    m2 = tel["motors"]["motor_2"]
    assert m2["is_connected"] is False
    assert m2["connection_status"] == "DISCONNECTED"
    assert m2["live_rpm"] == 0.0
    assert m2["current_a"] == 0.0
    assert m2["thrust_g"] == 0.0
    assert m2["disconnection_reason"] is not None
    
    # Check connected motor_1
    m1 = tel["motors"]["motor_1"]
    assert m1["is_connected"] is True
    assert m1["connection_status"] == "CONNECTED"
    assert m1["live_rpm"] > 0.0
    assert m1["thrust_g"] > 0.0
    
    # 4. Reconnect motor_2
    res3 = client.post("/api/hardware/motor-connection", json={"motor_id": "motor_2", "is_connected": True})
    assert res3.status_code == 200
    assert res3.json()["connections"]["motor_2"] is True

def test_dedicated_motors_telemetry_endpoint():
    from backend.main import run_causal_pipeline_step
    
    # Ensure baseline clean state with all motors connected
    client.post("/api/hardware/motor-connection-all", json={"is_connected": True})
    
    # Disconnect motor_2
    client.post("/api/hardware/motor-connection", json={"motor_id": "motor_2", "is_connected": False})
    run_causal_pipeline_step()
    
    # 1. Test /api/telemetry/motors
    res = client.get("/api/telemetry/motors")
    assert res.status_code == 200
    data = res.json()
    assert data["connected_count"] == 3
    assert data["total_count"] == 4
    
    m2 = data["motors"]["motor_2"]
    assert m2["is_connected"] is False
    assert m2["connection_status"] == "NOT CONNECTED"
    assert m2["telemetry_updated"] is False
    assert m2["live_rpm"] == 0.0
    assert m2["thrust_g"] == 0.0
    assert m2["power_w"] == 0.0
    assert m2["status"] == "OFFLINE"
    
    m1 = data["motors"]["motor_1"]
    assert m1["is_connected"] is True
    assert m1["connection_status"] == "CONNECTED"
    assert m1["telemetry_updated"] is True
    assert m1["live_rpm"] > 0.0
    assert m1["thrust_g"] > 0.0
    
    # 2. Test /api/telemetry/motors/motor_2
    res_single = client.get("/api/telemetry/motors/motor_2")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["connection_status"] == "NOT CONNECTED"
    assert single_data["live_rpm"] == 0.0
    
    # 3. Reconnect motor_2 and verify automatic restoration
    client.post("/api/hardware/motor-connection", json={"motor_id": "motor_2", "is_connected": True})
    run_causal_pipeline_step()
    
    res_restored = client.get("/api/telemetry/motors/motor_2")
    assert res_restored.status_code == 200
    restored_data = res_restored.json()
    assert restored_data["connection_status"] == "CONNECTED"
    assert restored_data["telemetry_updated"] is True
    assert restored_data["live_rpm"] > 0.0
    assert restored_data["thrust_g"] > 0.0
    
    # Restore physical bench rig default (3 motors active, motor 4 disconnected)
    client.post("/api/hardware/motor-connection", json={"motor_id": "motor_4", "is_connected": False})

