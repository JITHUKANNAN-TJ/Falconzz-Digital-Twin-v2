import os
import json
from fastapi import APIRouter, HTTPException
from backend.telemetry.buffer_store import buffer_store

router = APIRouter(prefix="/intelligence", tags=["AI & Intelligence"])

@router.get("/health")
def get_health_intelligence():
    latest = buffer_store.get_latest_state()
    if not latest:
        raise HTTPException(status_code=404, detail="Intelligence state not initialized")
    return latest.intelligence

@router.get("/health-history")
def get_health_history(limit: int = 50):
    states = buffer_store.get_recent_states(limit)
    return [{
        "timestamp": s.timestamp,
        "health_index": s.intelligence.health_index,
        "anomaly_score": s.intelligence.anomaly_score,
        "rul_hours": s.intelligence.rul_hours,
        "predicted_fault": s.intelligence.predicted_fault
    } for s in states]

@router.get("/model-evaluation")
def get_model_evaluation_metrics():
    metrics_path = "ml/evaluation/metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {
        "status": "NOT_EVALUATED",
        "message": "Evaluation metrics not found. Run model training first."
    }
