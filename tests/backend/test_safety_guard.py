import pytest
import time
from backend.safety.safety_guard import safety_guard
from backend.safety.control_modes import control_manager
from backend.telemetry.schema import CanonicalTelemetry, SafetyState, ControlMode

def test_safety_limits_enforcement():
    safety_guard.clear_emergency_stop()
    
    # Normal frame
    tel_safe = CanonicalTelemetry(
        timestamp=time.time(),
        rpm=5000.0,
        current_a=15.0,
        temperature_c=45.0,
        vibration_rms_g=0.3
    )
    st, estop, viol = safety_guard.evaluate(tel_safe)
    assert st == SafetyState.SAFE
    assert estop is False
    assert len(viol) == 0

    # Over-temperature violation (88 > 85 C)
    tel_overtemp = CanonicalTelemetry(
        timestamp=time.time(),
        rpm=5000.0,
        current_a=15.0,
        temperature_c=88.0,
        vibration_rms_g=0.3
    )
    st_ot, estop_ot, viol_ot = safety_guard.evaluate(tel_overtemp)
    assert st_ot == SafetyState.CRITICAL
    assert any("OVER_TEMPERATURE" in v for v in viol_ot)

def test_emergency_stop_latch():
    safety_guard.trigger_emergency_stop("Test emergency")
    assert safety_guard.emergency_stop_latched is True
    
    th_safe = safety_guard.enforce_safe_throttle(80.0, ControlMode.AUTOMATIC)
    assert th_safe == 0.0
    
    safety_guard.clear_emergency_stop()
    assert safety_guard.emergency_stop_latched is False
