import time
import threading
from typing import Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel
from backend.telemetry.schema import ScenarioType
from simulator.telemetry_generator import telemetry_generator
from backend.telemetry.buffer_store import buffer_store

router = APIRouter(prefix="/demo", tags=["SIH Live Demo Controller"])

DEMO_PHASES = [
    {
        "phase_number": 1,
        "title": "Phase 1: Normal Baseline Operating Point",
        "description": "BLDC propulsion operates at cruise baseline (55% throttle, 40% load). All sensor residuals are balanced.",
        "scenario": ScenarioType.NORMAL,
        "severity": 0.0,
        "throttle": 55.0,
        "load": 40.0,
        "duration_sec": 8
    },
    {
        "phase_number": 2,
        "title": "Phase 2: High Aeromechanical Load Inception",
        "description": "Propulsion load surges to 75%. Current draw increases, motor RPM drops slightly under dynamometer torque.",
        "scenario": ScenarioType.HIGH_LOAD,
        "severity": 0.5,
        "throttle": 68.0,
        "load": 75.0,
        "duration_sec": 8
    },
    {
        "phase_number": 3,
        "title": "Phase 3: Bearing Degradation Inception",
        "description": "Mechanical bearing raceway pitting introduces 1X rotational harmonics and elevated vibration RMS.",
        "scenario": ScenarioType.BEARING_DEGRADATION,
        "severity": 0.7,
        "throttle": 65.0,
        "load": 60.0,
        "duration_sec": 8
    },
    {
        "phase_number": 4,
        "title": "Phase 4: Thermal Winding Elevation",
        "description": "Winding temperature increases beyond physics expectation (+28°C residual).",
        "scenario": ScenarioType.OVERHEATING,
        "severity": 0.85,
        "throttle": 65.0,
        "load": 65.0,
        "duration_sec": 8
    },
    {
        "phase_number": 5,
        "title": "Phase 5: Isolation Forest Anomaly Detection",
        "description": "Temporal hysteresis confirms anomaly state (3+ anomalous frames). System shifts to WARNING / DEGRADED.",
        "scenario": ScenarioType.COMBINED_DEGRADATION,
        "severity": 0.75,
        "throttle": 60.0,
        "load": 65.0,
        "duration_sec": 8
    },
    {
        "phase_number": 6,
        "title": "Phase 6: Multi-Class Fault Classification & RUL Impact",
        "description": "AI classifies Multi-Factor Compound Fault. RUL forecast drops with 90% confidence uncertainty interval.",
        "scenario": ScenarioType.COMBINED_DEGRADATION,
        "severity": 0.9,
        "throttle": 55.0,
        "load": 65.0,
        "duration_sec": 8
    },
    {
        "phase_number": 7,
        "title": "Phase 7: Explainable AI & Maintenance Advisory",
        "description": "XAI synthesizes What, Why, Severity, and Recommended Action. Operator can trigger assisted safe throttle derate.",
        "scenario": ScenarioType.COMBINED_DEGRADATION,
        "severity": 0.95,
        "throttle": 45.0,
        "load": 60.0,
        "duration_sec": 10
    }
]

class DemoController:
    def __init__(self):
        self.is_running: bool = False
        self.current_phase_idx: int = 0
        self.auto_advance: bool = False
        self.phase_start_time: float = 0.0
        self.thread = None

    def start_demo(self, auto_advance: bool = True):
        self.is_running = True
        self.auto_advance = auto_advance
        self.current_phase_idx = 0
        self.apply_phase(0)
        
        if auto_advance and (self.thread is None or not self.thread.is_alive()):
            self.thread = threading.Thread(target=self._auto_advance_loop, daemon=True)
            self.thread.start()

    def set_phase(self, phase_index: int):
        self.current_phase_idx = max(0, min(len(DEMO_PHASES) - 1, phase_index))
        self.is_running = True
        self.apply_phase(self.current_phase_idx)

    def apply_phase(self, idx: int):
        phase = DEMO_PHASES[idx]
        self.phase_start_time = time.time()
        telemetry_generator.set_scenario(phase["scenario"], phase["severity"])
        telemetry_generator.set_operating_point(phase["throttle"], phase["load"])
        buffer_store.add_event(
            event_type="DEMO_PHASE_CHANGED",
            severity="INFO",
            message=f"SIH Demo: Advanced to {phase['title']}",
            details=phase
        )

    def next_phase(self):
        next_idx = (self.current_phase_idx + 1) % len(DEMO_PHASES)
        self.set_phase(next_idx)

    def previous_phase(self):
        prev_idx = max(0, self.current_phase_idx - 1)
        self.set_phase(prev_idx)

    def stop_demo(self):
        self.is_running = False
        self.auto_advance = False
        telemetry_generator.set_scenario(ScenarioType.NORMAL, 0.0)
        telemetry_generator.set_operating_point(55.0, 40.0)

    def _auto_advance_loop(self):
        while self.is_running and self.auto_advance:
            phase = DEMO_PHASES[self.current_phase_idx]
            elapsed = time.time() - self.phase_start_time
            if elapsed >= phase["duration_sec"]:
                if self.current_phase_idx < len(DEMO_PHASES) - 1:
                    self.current_phase_idx += 1
                    self.apply_phase(self.current_phase_idx)
                else:
                    self.auto_advance = False
                    break
            time.sleep(0.5)

    def get_state(self) -> Dict[str, Any]:
        curr_phase = DEMO_PHASES[self.current_phase_idx]
        elapsed = time.time() - self.phase_start_time if self.phase_start_time > 0 else 0.0
        return {
            "is_running": self.is_running,
            "auto_advance": self.auto_advance,
            "current_phase_index": self.current_phase_idx,
            "current_phase": curr_phase,
            "phase_elapsed_sec": round(elapsed, 1),
            "total_phases": len(DEMO_PHASES),
            "all_phases": DEMO_PHASES
        }

demo_controller = DemoController()

@router.get("/state")
def get_demo_state():
    return demo_controller.get_state()

@router.post("/start")
def start_demo(auto_advance: bool = True):
    demo_controller.start_demo(auto_advance)
    return demo_controller.get_state()

@router.post("/stop")
def stop_demo():
    demo_controller.stop_demo()
    return demo_controller.get_state()

@router.post("/phase/{phase_idx}")
def jump_to_phase(phase_idx: int):
    demo_controller.set_phase(phase_idx)
    return demo_controller.get_state()

@router.post("/next")
def advance_next_phase():
    demo_controller.next_phase()
    return demo_controller.get_state()

@router.post("/prev")
def advance_prev_phase():
    demo_controller.previous_phase()
    return demo_controller.get_state()
