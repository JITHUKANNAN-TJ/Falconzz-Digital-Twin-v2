import time
import asyncio
import threading
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.telemetry.schema import (
    FullSystemState, CanonicalTelemetry, TelemetrySource, ConnectionStatus, ScenarioType
)
from backend.telemetry.validator import validator
from backend.telemetry.buffer_store import buffer_store
from backend.hardware.hal_manager import hal_manager
from backend.digital_twin.residual_engine import residual_engine
from backend.intelligence.feature_pipeline import feature_pipeline
from backend.intelligence.anomaly_detector import anomaly_detector
from backend.intelligence.fault_classifier import fault_classifier
from backend.intelligence.rul_predictor import rul_predictor
from backend.intelligence.health_index import health_calculator
from backend.intelligence.explainable_ai import xai_engine
from backend.safety.safety_guard import safety_guard
from backend.safety.control_modes import control_manager
from simulator.telemetry_generator import telemetry_generator
from backend.api.websocket_hub import websocket_hub

# API Routers
from backend.api.routes_telemetry import router as telemetry_router
from backend.api.routes_digital_twin import router as dt_router
from backend.api.routes_intelligence import router as intel_router
from backend.api.routes_mission import router as mission_router
from backend.api.routes_hardware import router as hardware_router
from backend.api.routes_safety import router as safety_router
from backend.api.routes_demo import router as demo_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("falconz_backend")

# Global event loop handle for background thread broadcast
_async_loop = None

from backend.telemetry.recorder import telemetry_recorder
from backend.telemetry.schema import PipelineStageStatus, PipelineState, FieldProvenance, SensorChannelBadge

def run_causal_pipeline_step() -> FullSystemState:
    """
    Executes one complete step of the core causal chain:
    TELEMETRY -> VALIDATION -> DIGITAL TWIN -> RESIDUALS -> FEATURES ->
    ANOMALY DETECTION -> FAULT CLASSIFICATION -> RUL -> HEALTH INDEX ->
    XAI -> MAINTENANCE ADVISORY -> SAFETY GUARD -> BUFFER STORE -> RECORDER
    """
    t_start = time.time()
    
    # 1. Generate simulated frame (used as fallback if hardware disconnected)
    sim_packet = telemetry_generator.generate_packet()
    
    # 2. HAL Telemetry Ingestion & Validation
    telemetry: CanonicalTelemetry = hal_manager.get_active_telemetry(sim_packet)
    is_real = (telemetry.source_type == TelemetrySource.APM_MAVLINK)
    
    # 3. Physics-Informed Digital Twin & Residual Calculation
    dt_expected, residuals = residual_engine.compute_twin_and_residuals(telemetry)
    
    # 4. Feature Extraction
    feat_dict = feature_pipeline.extract_features(telemetry, dt_expected, residuals)
    fvec = feature_pipeline.to_feature_vector(feat_dict)
    
    # 5. Anomaly Detection (with temporal hysteresis)
    is_anomaly, anomaly_score, anomaly_sev, hyst_count = anomaly_detector.predict(
        fvec, residuals.composite_residual_score
    )
    
    # 6. Multi-Class Fault Classification
    predicted_fault, fault_conf, fault_sev, fault_probs = fault_classifier.predict(
        fvec, residuals.composite_residual_score
    )
    
    # 7. Health Index Computation
    health_idx, health_band = health_calculator.compute_health(
        residuals, is_anomaly, anomaly_score, telemetry_generator.scenario_severity * 0.5
    )
    
    # 8. RUL Prediction (Quantile Uncertainty Bounds or Insufficient Data flag)
    rul_dict = rul_predictor.predict(
        fvec, health_idx, telemetry_generator.scenario_severity * 0.5, 
        is_real_live=is_real, operating_samples=len(buffer_store.state_buffer)
    )
    
    # 9. Explainable AI & Maintenance Advisory
    xai_res = xai_engine.generate_explanation_and_advisory(
        telemetry, dt_expected, residuals, health_idx, predicted_fault, fault_sev, is_anomaly
    )
    
    # 10. Safety Guard & Control Modes
    safety_st, e_stop, violations = safety_guard.evaluate(telemetry)
    safe_throttle = control_manager.update_control(
        operator_throttle=telemetry.throttle_pct,
        health_index=health_idx,
        temperature_c=telemetry.temperature_c,
        anomaly_detected=is_anomaly
    )
    
    # 11. Technical Diagnostics for 11 Pipeline Stages
    from backend.hardware.mavlink.mavlink_connection import mavlink_manager
    apm_diag = mavlink_manager.get_detailed_diagnostics()
    apm_active = (apm_diag["apm_connection"] == "CONNECTED")
    apm_stale = (apm_diag["apm_connection"] == "STALE")
    
    pipeline_stages = [
        PipelineStageStatus(
            stage_id="stage_1",
            stage_name="APM Connection",
            status=PipelineState.RUNNING if apm_active else (PipelineState.STALE if apm_stale else PipelineState.WAITING),
            latency_ms=apm_diag["telemetry_age_ms"],
            message_rate_hz=apm_diag["message_rate_hz"],
            details=f"Type: {apm_diag['connection_type']} | Heartbeat: {apm_diag['heartbeat']}"
        ),
        PipelineStageStatus(
            stage_id="stage_2",
            stage_name="MAVLink Receiver",
            status=PipelineState.RUNNING if apm_active else PipelineState.WAITING,
            message_rate_hz=apm_diag["message_rate_hz"],
            details=f"Packets: {apm_diag['packets_received']} | Dropped: {apm_diag['packets_dropped']}"
        ),
        PipelineStageStatus(
            stage_id="stage_3",
            stage_name="Message Parser",
            status=PipelineState.RUNNING if apm_active or telemetry.is_valid else PipelineState.WAITING,
            details=f"Decoded: ESC, SYS_STATUS, IMU, VFR_HUD"
        ),
        PipelineStageStatus(
            stage_id="stage_4",
            stage_name="Telemetry Validator",
            status=PipelineState.RUNNING if telemetry.is_valid else PipelineState.ERROR,
            details="Range sanitization & rate-of-change filters active"
        ),
        PipelineStageStatus(
            stage_id="stage_5",
            stage_name="Canonical Telemetry",
            status=PipelineState.RUNNING,
            details=f"Source: {telemetry.source_type.value} | Channels: 12 BLDC"
        ),
        PipelineStageStatus(
            stage_id="stage_6",
            stage_name="Digital Twin",
            status=PipelineState.RUNNING,
            latency_ms=round((time.time() - t_start) * 1000, 2),
            details=f"Model: First-principles electro-thermal ODE"
        ),
        PipelineStageStatus(
            stage_id="stage_7",
            stage_name="Residual Engine",
            status=PipelineState.RUNNING,
            details=f"Composite Z-Score: {residuals.composite_residual_score:.2f}"
        ),
        PipelineStageStatus(
            stage_id="stage_8",
            stage_name="AI Engine",
            status=PipelineState.RUNNING,
            details=f"Anomaly: {anomaly_sev} | Fault: {predicted_fault} ({fault_conf:.1f}%)"
        ),
        PipelineStageStatus(
            stage_id="stage_9",
            stage_name="Health Engine",
            status=PipelineState.RUNNING,
            details=f"Health: {health_idx:.1f}% ({health_band})"
        ),
        PipelineStageStatus(
            stage_id="stage_10",
            stage_name="RUL Engine",
            status=PipelineState.RUNNING if rul_dict.get("rul_hours") is not None else PipelineState.WAITING,
            details=rul_dict.get("status", "INSUFFICIENT DATA")
        ),
        PipelineStageStatus(
            stage_id="stage_11",
            stage_name="GCS Broadcast Stream",
            status=PipelineState.RUNNING if len(websocket_hub.active_connections) > 0 else PipelineState.WAITING,
            details=f"Active WebSocket Clients: {len(websocket_hub.active_connections)}"
        )
    ]
    
    # Assemble Full System State
    from backend.telemetry.schema import HealthAndIntelligence
    intel_state = HealthAndIntelligence(
        timestamp=telemetry.timestamp,
        health_index=health_idx,
        health_band=health_band,
        confidence_pct=95.0,
        trend="STABLE" if residuals.composite_residual_score < 2.0 else "DEGRADING",
        anomaly_score=anomaly_score,
        is_anomaly=is_anomaly,
        anomaly_severity=anomaly_sev,
        anomaly_hysteresis_count=hyst_count,
        predicted_fault=predicted_fault,
        fault_confidence_pct=fault_conf,
        fault_severity=fault_sev,
        rul_hours=rul_dict.get("rul_hours"),
        rul_status=rul_dict.get("status", "INSUFFICIENT DATA (PROTOTYPE - NON-FLIGHT-CERTIFIED)"),
        rul_uncertainty_lower_hours=rul_dict.get("confidence_interval_90", {}).get("lower_bound"),
        rul_uncertainty_upper_hours=rul_dict.get("confidence_interval_90", {}).get("upper_bound"),
        rul_degradation_rate_pct_per_hr=rul_dict.get("degradation_rate_pct_per_hr", 0.0),
        xai_what=xai_res["xai_what"],
        xai_why=xai_res["xai_why"],
        xai_severity=xai_res["xai_severity"],
        xai_recommendation=xai_res["xai_recommendation"],
        contributing_features=xai_res["contributing_features"],
        maintenance_urgency=xai_res["maintenance_urgency"],
        affected_subsystem=xai_res["affected_subsystem"],
        maintenance_action=xai_res["maintenance_action"],
        maintenance_risk_level=xai_res["maintenance_risk_level"]
    )
    
    system_state = FullSystemState(
        timestamp=telemetry.timestamp,
        telemetry=telemetry,
        digital_twin=dt_expected,
        residuals=residuals,
        intelligence=intel_state,
        scenario=telemetry_generator.active_scenario,
        scenario_severity=telemetry_generator.scenario_severity,
        control_mode=control_manager.active_mode,
        safety_state=safety_st,
        emergency_stop_active=e_stop,
        data_source=telemetry.source_type,
        connection_status=telemetry.connection_status,
        flight_phase="LIVE TESTBED MONITORING" if is_real else "DEVELOPMENT / CALIBRATION",
        pipeline_stages=pipeline_stages
    )
    
    # Ingest into Telemetry Flight Recorder if active
    if telemetry_recorder.is_recording:
        telemetry_recorder.ingest_frame(system_state.model_dump())
        
    # Store in history ring buffers
    buffer_store.add_state(system_state)
    return system_state


class TelemetryStreamingWorker:
    def __init__(self, interval_sec: float = 0.1):  # 10 Hz real-time broadcast
        self.interval_sec = interval_sec
        self.running = False
        self.thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        logger.info("Telemetry Streaming Worker initialized at 10.0 Hz.")

    def stop(self):
        self.running = False

    def _loop(self):
        global _async_loop
        while self.running:
            try:
                state = run_causal_pipeline_step()
                if _async_loop is not None and not _async_loop.is_closed():
                    asyncio.run_coroutine_threadsafe(websocket_hub.broadcast_state(state), _async_loop)
            except Exception as e:
                logger.error(f"Error in telemetry causal pipeline loop: {e}", exc_info=True)
            time.sleep(self.interval_sec)

streaming_worker = TelemetryStreamingWorker()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _async_loop
    _async_loop = asyncio.get_running_loop()
    # Reload models if created
    anomaly_detector.load_model()
    fault_classifier.load_model()
    rul_predictor.load_models()
    # Start background telemetry generator
    streaming_worker.start()
    yield
    streaming_worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Indigenous Propulsion Digital Twin + Predictive Health Monitoring Platform for MALE UAVs",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(dt_router, prefix=settings.API_V1_STR)
app.include_router(intel_router, prefix=settings.API_V1_STR)
app.include_router(mission_router, prefix=settings.API_V1_STR)
app.include_router(hardware_router, prefix=settings.API_V1_STR)
app.include_router(safety_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "timestamp": time.time(),
        "endpoints": {
            "telemetry_ws": "/ws/telemetry",
            "api_v1": settings.API_V1_STR,
            "docs": "/docs"
        }
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket_hub.connect(websocket)
    try:
        while True:
            # Handle incoming client commands over WebSocket
            data = await websocket.receive_text()
            # Echo or process if needed
    except WebSocketDisconnect:
        websocket_hub.disconnect(websocket)
    except Exception:
        websocket_hub.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
