import pytest
from fastapi.testclient import TestClient
from backend.main import app, run_causal_pipeline_step

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "FALCONZ" in data["project"]

def test_telemetry_pipeline_and_endpoints():
    # Execute a causal pipeline step to populate buffer
    run_causal_pipeline_step()
    
    # 1. Latest telemetry
    resp = client.get("/api/telemetry/latest")
    assert resp.status_code == 200
    assert "rpm" in resp.json()
    
    # 2. Digital Twin
    resp_dt = client.get("/api/digital-twin/current")
    assert resp_dt.status_code == 200
    assert "residuals" in resp_dt.json()
    
    # 3. Health Intelligence
    resp_hi = client.get("/api/intelligence/health")
    assert resp_hi.status_code == 200
    assert "health_index" in resp_hi.json()
    
    # 4. Hardware status
    resp_hw = client.get("/api/hardware/status")
    assert resp_hw.status_code == 200
    assert "apm_mavlink" in resp_hw.json()
    
    # 5. Demo state
    resp_demo = client.get("/api/demo/state")
    assert resp_demo.status_code == 200
    assert "current_phase" in resp_demo.json()

def test_scenario_switching_endpoint():
    resp = client.post("/api/telemetry/scenario", json={"scenario": "OVERHEATING", "severity": 0.8})
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUCCESS"
