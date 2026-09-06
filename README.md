# FALCONZ: Indigenous Propulsion Digital Twin & Predictive Health Monitoring Platform

> **Target Platform:** Indigenous Predictive Health & Digital Twin Architecture for MALE UAV Aero-Piston Propulsion  
> **Physical Validation Testbed:** Instrumented BLDC Motor Propulsion Dynamometer Rig & APM/ArduPilot Flight Controller Telemetry

---

## 1. Executive Summary

Traditional aerospace monitoring systems alert flight crews only after a critical threshold (e.g. over-temperature or over-current) has already been breached. **FALCONZ** introduces an indigenous, physics-informed Digital Twin and AI/ML prognostic framework that continuously calculates real-time residuals ($r = y_{actual} - y_{expected}$) between live sensor telemetry and first-principles electro-mechanical and lumped-parameter thermal models.

By identifying minute residual deviations across harmonic vibrations, thermal slopes, and electrical losses, FALCONZ:
1. Detects incipient degradation prior to threshold failure.
2. Classifies multi-class fault modes with high confidence.
3. Quantifies Remaining Useful Life (RUL) with 90% confidence uncertainty intervals.
4. Generates Explainable AI (XAI) insights (*What, Why, Severity, Action*).
5. Provides automated ground support maintenance advisories and mission profile impact forecasts.

---

## 2. Core Functional Pipeline

```
PHYSICAL / SIMULATED PROPULSION (BLDC Rig / APM MAVLink / ESP32 / Arduino / Simulator)
        ↓
MULTI-SOURCE HARDWARE ABSTRACTION LAYER (HAL)
        ↓
DATA VALIDATION & SPIKE REJECTION (Outlier filter, physical bounding, power derivation)
        ↓
PHYSICS-INFORMED DIGITAL TWIN (P_elec, P_mech, ω, Lumped Thermal ODE, Vibration Harmonics)
        ↓
PHYSICS RESIDUAL ENGINE (Residual = Actual - Expected, Z-score normalization)
        ↓
FEATURE ENGINEERING (Rolling variance, thermal slope dT/dt, vibration slope, loss ratio)
        ↓
EDGE AI PROGNOSTIC MODELS (Isolation Forest + Hysteresis, Random Forest Faults, Quantile RUL)
        ↓
COMPOSITE DYNAMIC HEALTH INDEX (0-100%, Health Bands: HEALTHY, WARNING, DEGRADED, CRITICAL)
        ↓
EXPLAINABLE AI & MAINTENANCE ADVISORY (What, Why, Severity, Action, Ground Checklists)
        ↓
MISSION PROFILE IMPACT & 100% REPLAY (Altitude, thermal loiter, damage factor, scrubbable playback)
        ↓
AEROSPACE GCS DASHBOARD & 3D PROPULSION TWIN (15 modules, Three.js WebGL, SIH 7-Phase Demo)
```

---

## 3. Telemetry Ingress & Hardware Interfaces

FALCONZ supports multi-source telemetry routing with automatic fallback:
1. **APM / ArduPilot MAVLink**: Ingests `ESC_TELEMETRY`, `SYS_STATUS`, `VFR_HUD`, and `RAW_IMU` over USB Serial or UDP (`udpin:0.0.0.0:14550`).
2. **ESP32 DAQ**: High-speed interrupt Hall RPM, INA219 current/voltage, DS18B20 stator temperature, MPU6050 vibration over Serial USB / Wi-Fi UDP.
3. **Arduino Uno / Nano**: Analog ACS712, LM35, voltage divider, and optical RPM over Serial USB.
4. **Multi-Scenario Simulation Engine**: High-fidelity mathematical generator simulating 8 distinct degradation scenarios withParis-Erdogan wear progression.

---

## 4. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Install & Verify Backend
```powershell
# In project root
pip install -r requirements.txt (or ensure fastapi, uvicorn, scikit-learn, pymavlink, joblib, pytest installed)

# Run full test suite (20 automated tests)
python -m pytest -v tests/
```

### 2. Launch FastAPI Backend
```powershell
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Launch React GCS Frontend
```powershell
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

---

## 5. System Modules (15 Dashboard Pages)

| Page | Module Name | Description |
| :--- | :--- | :--- |
| 1 | **Overview GCS** | Real-time gauges, dynamic health trend, Three.js 3D twin, XAI diagnosis, subsystem integrity matrix. |
| 2 | **Live Digital Twin** | Validated rig channels vs Future MALE-UAV aero-piston channels, actual vs expected curves. |
| 3 | **Health Intelligence** | Isolation Forest anomaly scoring, 3-5 sample temporal hysteresis, normalized residual heatmap. |
| 4 | **Fault Classification** | Multi-class Random Forest predictions, confidence radar, root-cause feature attributions. |
| 5 | **RUL Estimation** | Quantile Gradient Boosting RUL regressor, 10th-90th percentile uncertainty envelope, Paris-Erdogan wear. |
| 6 | **Mission Simulator** | Multi-hour flight profiles (High Altitude, Hot Weather, Loiter), equivalent damage, feasibility rating. |
| 7 | **Flight Replay Engine** | Deterministic mission playback with Play/Pause/Seek/Speed controls and synchronized phase telemetry. |
| 8 | **Maintenance Advisory** | Prescriptive maintenance actions, urgency ratings, and ground support workshop inspection checklists. |
| 9 | **Data & Telemetry** | Live streaming buffer table, historical query, source filter, and one-click CSV audit export. |
| 10 | **System Architecture** | Interactive end-to-end pipeline diagrams, data flow schemas, and edge/cloud topology. |
| 11 | **MALE UAV Mapping** | Channel-by-channel matrix translating physical BLDC testbed signals to future aero-piston UAV engines. |
| 12 | **Hardware & APM Center** | MAVLink connection controller, ESP32 serial/UDP, Arduino, calibration, and sensor health. |
| 13 | **Safety & Interlocks** | Non-bypassable hard envelope limits, watchdog timer, emergency stop, and audit history. |
| 14 | **Scientific ML Metrics** | Real test-set evaluation results (Accuracy: 92.2%, F1: 0.923, RUL R²: 0.917, MAE: 9.9 hrs). |
| 15 | **System Settings** | Physical motor constants, safety governor thresholds, and network port configurations. |

---

## 6. SIH 2026 7-Phase Live Demonstration Flow

Click **START SIH DEMO** on the top demo controller bar to step through the evaluation sequence:
- **Phase 1: Normal Baseline** — 55% cruise throttle, all physics residuals balanced.
- **Phase 2: High Dynamic Load** — Dynamometer torque surges, current increases, RPM sags under load.
- **Phase 3: Bearing Degradation** — Ball raceway spalling induces 1X harmonic vibration residual (+0.65g).
- **Phase 4: Thermal Elevation** — Stator cooling restriction causes rapid temperature escalation (+38°C residual).
- **Phase 5: Anomaly Detection** — Isolation Forest confirms anomalous state across 3 consecutive frames.
- **Phase 6: Multi-Class Fault Classification & RUL Drop** — Classifies Compound Failure, RUL decreases with 90% confidence bounds.
- **Phase 7: Explainable AI & Safe Derate Action** — XAI generates What/Why/Action, triggering safe automatic throttle derate.

---

## 7. Documentation Index

Comprehensive technical documentation is available in the [`docs/`](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/) directory:
- [System Architecture](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/system-architecture.md)
- [Digital Twin Physics Model](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/physics-model.md)
- [AI/ML Prognostic Pipeline](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/ai-ml.md)
- [Scientific ML Model Evaluation](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/ml-model-evaluation.md)
- [APM / ArduPilot MAVLink Integration](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/apm-mavlink-integration.md)
- [Hardware Architecture & Bill of Materials (BOM)](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/hardware-bom.md)
- [MALE UAV Migration Matrix](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/male-uav-migration.md)
- [Requirements Traceability Matrix](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/requirements-traceability.md)
- [System Limitations & Boundary Assumptions](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/limitations.md)
- [Final System Verification Report](file:///c:/Users/sarveshwaran/Downloads/sih_2026/docs/final-verification.md)
