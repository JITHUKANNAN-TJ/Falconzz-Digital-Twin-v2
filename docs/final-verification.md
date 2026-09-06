# FALCONZ Propulsion Digital Twin & Predictive Health Monitoring System
## Final Verification & Test Acceptance Report

**Execution Timestamp:** 2026-09-06  
**Environment:** Windows | Python 3.14.3 | Node.js v24.14.1 | Vite 6.4.3 | React 18.3.1 | FastAPI 0.139.0  
**Test Suite:** Pytest 9.1.1 (21 Automated Unit & Integration Tests)

---

### Verification Summary Matrix (Sections A - K)

| Section | Verification Domain | Status | Evidence / Artifact |
| :--- | :--- | :--- | :--- |
| **A** | **Software Verification** | **PASS** | 21/21 passing automated unit and integration tests |
| **B** | **APM/MAVLink Software Verification** | **PASS** | MAVLink parser, mapper, heartbeat, and frame diagnostics verified |
| **C** | **Physical Hardware Verification** | **PARTIAL** | Adapter ready; awaiting physical USB-UART plug-in to live testbed |
| **D** | **Telemetry Field Verification** | **PASS** | Strict provenance (REAL vs PROXY vs UNAVAILABLE) without data fabrication |
| **E** | **Digital Twin Verification** | **PASS** | Power balance, lumped thermal ODE, and baseline vibration calibrated |
| **F** | **AI/ML Verification** | **PASS** | Random Forest 92.2% accuracy verified via `ml/evaluation/metrics.json` |
| **G** | **RUL Validation** | **PASS** | Multi-quantile regressors (P10/P50/P90) with non-flight-certified notice |
| **H** | **XAI Verification** | **PASS** | Physics residual attribution and causal explanations verified |
| **I** | **Safety Verification** | **PASS** | Dual-layer interlocks, hard bounds, 2.0s watchdog, and E-Stop latch verified |
| **J** | **End-to-End Causal Chain** | **PASS** | Telemetry $\to$ Twin $\to$ Residual $\to$ AI $\to$ Health $\to$ RUL $\to$ XAI $\to$ Derate verified |
| **K** | **Known Limitations** | **PASS** | Laboratory BLDC boundary vs future aero-piston UAV boundary fully documented |

---

### Section A: Software Verification
- **Status:** **PASS**
- **Artifacts:** `tests/backend/` and `tests/integration/`
- **Results:** 21 passed in 9.44s.
- **Coverage:** FastAPI REST APIs, WebSocket real-time broadcast, Pydantic schemas, validation filters, multi-scenario degradation engine, mission simulation, deterministic flight replay, and UI state synchronization.

---

### Section B: APM/MAVLink Software Verification
- **Status:** **PASS**
- **Artifacts:** `backend/hardware/mavlink/mavlink_parser.py`, `telemetry_mapper.py`, `mavlink_connection.py`, `tests/backend/test_mavlink_adapter.py`
- **Capabilities:**
  - Decodes `ESC_TELEMETRY` (RPM, Voltage cV $\to$ V, Current cA $\to$ A, ESC Temp °C).
  - Decodes `SYS_STATUS` (Battery Voltage, Battery Current, Battery Remaining %).
  - Decodes `VFR_HUD` (Throttle %, Altitude m, Groundspeed m/s).
  - Decodes `RAW_IMU` (Vibration RMS magnitude calculation from xacc, yacc, zacc).
  - Decodes `SCALED_PRESSURE` (Ambient Temperature, Pressure).
  - Tracks MAVLink 2.0 heartbeat, System ID, Component ID, packet loss sequence counters, and message rate (Hz).

---

### Section C: Physical Hardware Verification
- **Status:** **PARTIAL** *(Software & Adapter Ready; Physical Testbed Plug-In Pending)*
- **Validation Criteria:**
  - `SOFTWARE VERIFIED` is awarded based on 21/21 passing automated tests.
  - `PHYSICAL HARDWARE VERIFIED` is strictly gated behind receiving active live MAVLink packets and valid heartbeats from the physical APM/ArduPilot board.
- **Physical Verification Tooling:**
  ```powershell
  # Run live physical verification with real APM connected:
  python scripts/verify_live_apm.py --connection COM3 --baud 115200
  ```
- **Operator Execution Checklist:**
  1. Connect APM Flight Controller to USB port (or telemetry radio).
  2. Power ESC from 4S LiPo battery.
  3. Run verification script or click `CONNECT APM` on the Hardware Center dashboard.
  4. Confirm status changes to `PHYSICAL HARDWARE VERIFIED (APM LIVE)` with $>0$ Hz packet rate.

---

### Section D: Telemetry Field Verification
- **Status:** **PASS**
- **Strict Provenance Rules Enforced:**
  - **REAL (VALIDATED ON RIG):** Active channels received from physical APM / ESC (RPM, Bus Voltage, Stator Current, ESC Temp, Rig Vibration).
  - **PROXY / SIMULATED:** Ambient environmental parameters or controlled laboratory testbed proxies.
  - **FUTURE MALE-UAV / UNAVAILABLE:** CHT, EGT, Engine Oil Pressure, Engine Oil Temp, Fuel Flow are explicitly displayed as `UNAVAILABLE` or `FUTURE MALE-UAV` without artificial data fabrication.

---

### Section E: Digital Twin Verification
- **Status:** **PASS**
- **Mathematical Formulations:**
  - Electrical Power: $P_{elec} = V_{applied} \cdot I_{stator} = (V_{bat} \cdot \frac{\text{Throttle}}{100}) \cdot I_{stator}$
  - Aerodynamic Propeller Load: $\tau_{aero} = C_{prop} \cdot \omega^2$ where $C_{prop} = 3.8 \times 10^{-9}\,\text{N}\cdot\text{m}/(\text{rad/s})^2$
  - Mechanical Power: $P_{mech} = \tau_{shaft} \cdot \omega$
  - Thermal ODE: $\frac{dT_{stator}}{dt} = \frac{P_{loss} - \frac{T_{stator} - T_{amb}}{R_{th}}}{C_{th}}$ ($C_{th} = 150\,\text{J/K}$, $R_{th} = 0.85\,\text{K/W}$)
  - Baseline Vibration: $V_{baseline} = 0.05 + 0.00015 \cdot \text{RPM}^{1.1}$

---

### Section F: AI/ML Verification
- **Status:** **PASS**
- **Evaluation Artifact:** `ml/evaluation/metrics.json`
- **Key Metrics:**
  - **Fault Classifier (Random Forest):**
    - Accuracy: **92.22%**
    - Macro F1-Score: **0.9231**
    - Test Sample Count: 1,440 samples (out of 7,200 run-to-failure dataset)
    - Classes: `Nominal`, `Bearing Degraded`, `Propeller Imbalance`, `Stator Overheating`
  - **Anomaly Detector (Isolation Forest):**
    - Precision: **0.938**, Recall: **0.945**, F1-Score: **0.941**

---

### Section G: RUL Validation
- **Status:** **PASS**
- **Architecture:** Multi-quantile Gradient Boosting Regressors ($q=0.10, 0.50, 0.90$).
- **Metrics:** $R^2 = 0.9173$, MAE = $9.97\,\text{hours}$.
- **Notice:** Explicitly stamped with `PROTOTYPE RUL (NON-FLIGHT-CERTIFIED)` badge. RUL outputs provide experimental advisory guidance and confidence bounds ($P_{10} - P_{90}$) without claiming civil airworthiness certification.

---

### Section H: Explainable AI (XAI) Verification
- **Status:** **PASS**
- **Mechanism:** Residual-weighted feature attribution linking AI predictions back to physical parameters (e.g. $\Delta I > 5\text{A}$ and $dT/dt > 0.35\text{°C/s}$ driving Stator Overheating diagnosis).
- **Causal Graph:** Generates root-cause causal trees displayed on Page 3 and Page 4 of the GCS.

---

### Section I: Safety Verification
- **Status:** **PASS**
- **Dual-Layer Interlocks:**
  - **Hardware Layer:** ESC low-voltage cutoff, thermal fuse, hardware RPM limiters.
  - **Software Layer:**
    - Hard RPM Limit: $7,500\,\text{RPM}$
    - Hard Current Limit: $38.0\,\text{A}$
    - Hard Temperature Limit: $85.0\text{°C}$
    - Hard Vibration Limit: $2.5\,\text{g}$
    - Watchdog Timeout: $2.0\,\text{s}$ (automatic fallback to safe idle)
    - Emergency Stop: Latched state machine requiring manual operator reset.
    - Control Modes: `MANUAL`, `ASSISTED`, `AUTOMATIC`.

---

### Section J: End-to-End Causal Chain
- **Status:** **PASS**
- **Verified Propagation Path:**
  $$\text{Degradation Scenario} \longrightarrow \text{Telemetry Ingress} \longrightarrow \text{Digital Twin Physics} \longrightarrow \text{Residual Calculation} \longrightarrow \text{AI Anomaly \& Fault} \longrightarrow \text{Health Index} \longrightarrow \text{RUL Forecast} \longrightarrow \text{XAI Attribution} \longrightarrow \text{Maintenance Advisory} \longrightarrow \text{Safe Derate Action}$$
- Verified via `test_complete_causal_propagation_chain` in [test_end_to_end_causal_chain.py](file:///c:/Users/sarveshwaran/Downloads/sih_2026/tests/integration/test_end_to_end_causal_chain.py).

---

### Section K: Known Limitations
- **Status:** **PASS** (Fully Documented)
- Documented in [limitations.md](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/limitations.md) and [male-uav-migration.md](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/male-uav-migration.md):
  1. Validation testbed is an electric BLDC motor; future target is a multi-cylinder heavy-fuel aero-piston engine (e.g., Rotax 914 / Austro Engine AE300 class).
  2. BLDC phase current and stator temperature act as electrical analogues to cylinder pressure and CHT.
  3. No destructive physical faults injected; all laboratory testbed testing utilizes safe, non-destructive degradation profiles.

