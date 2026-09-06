import time
from typing import Tuple, List, Dict, Any
from backend.telemetry.schema import CanonicalTelemetry, SafetyState, ControlMode
from backend.config import settings

class SafetyGuard:
    """
    Independent software safety guard and watchdog.
    Enforces hard hardware boundaries:
    - Max RPM: 7500 RPM
    - Max Current: 38.0 A
    - Max Temperature: 85.0 °C
    - Max Vibration RMS: 12.0 g
    - Stale Data Watchdog: 2.0 sec timeout
    Maintains Safety State: SAFE -> WARNING -> DEGRADED -> CRITICAL -> EMERGENCY
    """
    def __init__(self):
        self.emergency_stop_latched: bool = False
        self.current_state: SafetyState = SafetyState.SAFE
        self.active_violations: List[str] = []
        self.last_healthy_timestamp: float = time.time()
        self.override_active: bool = False

    def trigger_emergency_stop(self, reason: str = "Operator manual emergency stop commanded"):
        self.emergency_stop_latched = True
        self.current_state = SafetyState.EMERGENCY
        if reason not in self.active_violations:
            self.active_violations.append(f"EMERGENCY_STOP: {reason}")

    def clear_emergency_stop(self):
        self.emergency_stop_latched = False
        self.active_violations.clear()
        self.current_state = SafetyState.SAFE

    def evaluate(self, telemetry: CanonicalTelemetry) -> Tuple[SafetyState, bool, List[str]]:
        now = time.time()
        violations: List[str] = []
        
        if self.emergency_stop_latched:
            return SafetyState.EMERGENCY, True, ["MANUAL_EMERGENCY_STOP_LATCHED"]
            
        # 1. Stale Data Watchdog Check
        packet_age = now - telemetry.timestamp
        if packet_age > settings.WATCHDOG_TIMEOUT_SEC:
            violations.append(f"WATCHDOG_STALE_DATA ({packet_age:.1f}s > {settings.WATCHDOG_TIMEOUT_SEC}s)")

        # 2. Hard Limits
        if telemetry.rpm > settings.MAX_RPM:
            violations.append(f"OVER_RPM ({telemetry.rpm:.0f} > {settings.MAX_RPM:.0f})")
            
        if telemetry.current_a > settings.MAX_CURRENT_A:
            violations.append(f"OVER_CURRENT ({telemetry.current_a:.1f}A > {settings.MAX_CURRENT_A:.1f}A)")
            
        if telemetry.temperature_c > settings.MAX_TEMP_C:
            violations.append(f"OVER_TEMPERATURE ({telemetry.temperature_c:.1f}°C > {settings.MAX_TEMP_C:.1f}°C)")
            
        if telemetry.vibration_rms_g > settings.MAX_VIBRATION_RMS:
            violations.append(f"OVER_VIBRATION ({telemetry.vibration_rms_g:.2f}g > {settings.MAX_VIBRATION_RMS:.1f}g)")

        # State determination
        if any("OVER_RPM" in v or "OVER_CURRENT" in v or "OVER_TEMPERATURE" in v for v in violations):
            self.current_state = SafetyState.CRITICAL
        elif len(violations) > 0:
            self.current_state = SafetyState.WARNING
        elif telemetry.temperature_c > 75.0 or telemetry.vibration_rms_g > 3.0:
            self.current_state = SafetyState.DEGRADED
        else:
            self.current_state = SafetyState.SAFE
            
        self.active_violations = violations
        return self.current_state, self.emergency_stop_latched, violations

    def enforce_safe_throttle(self, commanded_throttle: float, mode: ControlMode) -> float:
        """
        Interlocks automatic or assisted throttle commands with hard safety envelope.
        """
        if self.emergency_stop_latched or self.current_state == SafetyState.EMERGENCY:
            return 0.0
            
        if self.current_state == SafetyState.CRITICAL:
            return min(commanded_throttle, 25.0)
            
        if self.current_state == SafetyState.DEGRADED:
            return min(commanded_throttle, 65.0)
            
        return max(0.0, min(100.0, commanded_throttle))

safety_guard = SafetyGuard()
