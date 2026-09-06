from typing import Dict, Any, Optional
from backend.telemetry.schema import ControlMode, SafetyState
from backend.safety.safety_guard import safety_guard

class ControlModeManager:
    """
    Manages triple control modes:
    - MANUAL: Operator directly sets throttle/load.
    - ASSISTED: AI/System provides recommendation, operator confirms.
    - AUTOMATIC: Closed-loop safe governor bounds throttle based on health index and thermal state.
    """
    def __init__(self):
        self.active_mode: ControlMode = ControlMode.MANUAL
        self.operator_target_throttle: float = 55.0
        self.ai_suggested_throttle: float = 55.0
        self.active_throttle_output: float = 55.0
        
    def set_mode(self, mode: ControlMode):
        self.active_mode = mode

    def update_control(self, 
                       operator_throttle: float, 
                       health_index: float, 
                       temperature_c: float, 
                       anomaly_detected: bool) -> float:
        self.operator_target_throttle = max(0.0, min(100.0, operator_throttle))
        
        # Calculate AI suggested safe throttle
        if health_index < 40.0 or temperature_c > 80.0:
            suggested = 30.0
        elif health_index < 70.0 or temperature_c > 70.0 or anomaly_detected:
            suggested = min(operator_throttle, 50.0)
        else:
            suggested = operator_throttle
            
        self.ai_suggested_throttle = round(suggested, 1)

        # Apply mode
        if self.active_mode == ControlMode.MANUAL:
            target = self.operator_target_throttle
        elif self.active_mode == ControlMode.ASSISTED:
            # Assisted tracks operator unless in critical state
            target = self.operator_target_throttle if health_index >= 50.0 else self.ai_suggested_throttle
        else:  # AUTOMATIC
            target = self.ai_suggested_throttle

        # Enforce hard safety guard envelope
        self.active_throttle_output = safety_guard.enforce_safe_throttle(target, self.active_mode)
        return self.active_throttle_output

    def get_state(self) -> Dict[str, Any]:
        return {
            "active_mode": self.active_mode.value,
            "operator_target_throttle": self.operator_target_throttle,
            "ai_suggested_throttle": self.ai_suggested_throttle,
            "active_throttle_output": self.active_throttle_output,
            "emergency_stop": safety_guard.emergency_stop_latched,
            "safety_state": safety_guard.current_state.value
        }

control_manager = ControlModeManager()
