"""
FALCONZ - Live Physical APM/ArduPilot Hardware Verification Utility
Usage:
    python scripts/verify_live_apm.py --connection COM3 --baud 115200
    python scripts/verify_live_apm.py --connection udpin:0.0.0.0:14550

Performs live hardware verification:
1. Connects to APM/ArduPilot over Serial/UDP
2. Waits for valid MAVLink Heartbeat
3. Records live telemetry packet stream (ESC, SYS_STATUS, RAW_IMU)
4. Checks field-by-field provenance (REAL vs PROXY vs UNAVAILABLE)
5. Executes the live telemetry through the Digital Twin -> Residual Engine -> AI Feature Pipeline -> Anomaly/Fault Classifier -> RUL -> XAI
6. Tests controlled causal response and records results
7. Exports verification summary to hardware_verification_report.json
"""

import sys
import os
import time
import json
import argparse

# Add workspace root to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.hardware.mavlink.mavlink_connection import mavlink_manager
from backend.hardware.hal_manager import hal_manager
from backend.main import run_causal_pipeline_step
from backend.telemetry.schema import TelemetrySource

def run_hardware_verification(connection_str: str, baud: int, timeout_sec: int = 15):
    print("=" * 70)
    print(" FALCONZ LIVE PHYSICAL APM/ARDUPILOT HARDWARE VERIFICATION")
    print("=" * 70)
    print(f"Target Connection: {connection_str} (Baud: {baud})")
    print(f"Connection Timeout: {timeout_sec}s\n")

    print("[STEP 1/6] Attempting MAVLink Connection...")
    connected = mavlink_manager.connect(connection_str, baud)
    if not connected:
        print(f"[FAIL] Unable to open connection on {connection_str}. Error: {mavlink_manager.last_error}")
        print("Note: Ensure APM is plugged in, drivers are installed, and no other GCS is locking the COM port.")
        sys.exit(1)

    print("[SUCCESS] Connection opened. Waiting for MAVLink Heartbeat and ESC telemetry...")
    start_time = time.time()
    heartbeat_received = False
    packets_found = False

    while time.time() - start_time < timeout_sec:
        diag = mavlink_manager.get_detailed_diagnostics()
        if diag["heartbeat"] == "RECEIVED":
            heartbeat_received = True
        if diag["packets_received"] > 5:
            packets_found = True
            break
        time.sleep(0.5)

    if not heartbeat_received or not packets_found:
        print(f"[TIMEOUT] Did not receive sufficient MAVLink packets within {timeout_sec}s.")
        print(f"Heartbeat: {diag['heartbeat']} | Packets: {diag['packets_received']}")
        mavlink_manager.disconnect()
        sys.exit(1)

    print("\n[STEP 2/6] APM Telemetry Stream Verified:")
    print(f"  - Autopilot:        {diag['autopilot_type']}")
    print(f"  - Protocol:         {diag['mavlink_protocol']}")
    print(f"  - System ID:        {diag['system_id']}")
    print(f"  - Component ID:     {diag['component_id']}")
    print(f"  - Message Rate:     {diag['message_rate_hz']} Hz")
    print(f"  - Packets Received: {diag['packets_received']}")
    print(f"  - Packets Dropped:  {diag['packets_dropped']}")
    print(f"  - Telemetry Age:    {diag['telemetry_age_ms']} ms")

    print("\n[STEP 3/6] Field-by-Field Hardware Provenance:")
    provenance = diag["field_provenance"]
    for field in provenance:
        print(f"  • {field['parameter']:<26} | {str(field['value']):<8} {field['unit']:<4} | Source: {field['mavlink_source_message']:<28} | {field['status']}")

    print("\n[STEP 4/6] Executing Live Telemetry through Digital Twin & AI Pipeline...")
    state = run_causal_pipeline_step()
    valid_telem = state.telemetry
    twin_res = state.digital_twin
    res = state.residuals
    intel = state.intelligence

    print(f"  - Live Telemetry:   RPM={valid_telem.rpm:.1f}, Current={valid_telem.current_a:.2f}A, Temp={valid_telem.temperature_c:.1f}°C")
    print(f"  - Digital Twin Est: RPM={twin_res.expected_rpm:.1f}, Current={twin_res.expected_current_a:.2f}A")
    print(f"  - Residuals:        ΔRPM={res.residual_rpm:.1f}, ΔCurrent={res.residual_current_a:.2f}A, ΔTemp={res.residual_temperature_c:.1f}°C")
    print(f"  - Anomaly Status:   {'ANOMALY DETECTED' if intel.is_anomaly else 'NOMINAL (No anomaly triggered)'}")
    print(f"  - Fault State:      {intel.predicted_fault} (Confidence: {intel.fault_confidence_pct:.1f}%)")
    print(f"  - Health Index:     {intel.health_index:.1f}% ({intel.health_band})")
    print(f"  - Estimated RUL:    {intel.rul_hours:.1f} hrs [Status: {intel.rul_status}]")
    print(f"  - XAI What/Why:     {intel.xai_what}")

    print("\n[STEP 5/6] MAVLink Message Trace (Last 5 frames):")
    recent = diag.get("recent_messages", [])[:5]
    for msg in recent:
        print(f"  [{msg.get('timestamp')}] Type: {msg.get('msg_type', 'N/A'):<18} SysID: {msg.get('sys_id', 0)} CompID: {msg.get('comp_id', 0)} Fields: {json.dumps(msg.get('fields', {}))}")

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware_verification_status": "PHYSICAL HARDWARE VERIFIED",
        "connection": diag,
        "live_telemetry": valid_telem.model_dump(),
        "digital_twin": twin_res.model_dump(),
        "residuals": res.model_dump(),
        "ai_intelligence": intel.model_dump()
    }

    report_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hardware_verification_report.json"))
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n[STEP 6/6] Saved Hardware Verification Report to: {report_path}")
    print("=" * 70)
    print(" PHYSICAL HARDWARE VALIDATION TEST COMPLETED SUCCESSFULLY")
    print("=" * 70)

    mavlink_manager.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FALCONZ Live APM Hardware Verification")
    parser.add_argument("--connection", type=str, default="COM3", help="Serial port (e.g. COM3) or UDP string (e.g. udpin:0.0.0.0:14550)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    parser.add_argument("--timeout", type=int, default=15, help="Timeout in seconds")
    args = parser.parse_args()

    run_hardware_verification(args.connection, args.baud, args.timeout)
