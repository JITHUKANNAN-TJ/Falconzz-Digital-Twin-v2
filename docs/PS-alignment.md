# Smart India Hackathon (SIH 2026) Problem Statement Alignment

## 1. Problem Statement Context
**Challenge:** Development of an indigenous, physics-informed Digital Twin and real-time Predictive Health Monitoring (PHM) system for MALE UAV propulsion systems capable of early incipient anomaly detection, fault classification, remaining useful life estimation, explainable root-cause diagnosis, and condition-based maintenance advisory.

---

## 2. FALCONZ Alignment Matrix

| Evaluation Criterion | SIH Expectation | FALCONZ Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Physics Digital Twin** | First-principles physical models reflecting actual electro-mechanical and thermal dynamics | Exact power equations ($P_{elec} = V \cdot I$, $P_{mech} = \tau \cdot \omega$), lumped thermal differential ODE ($dT/dt$), and baseline 1X vibration harmonics | **PASS / IMPLEMENTED** |
| **Residual-Driven AI** | Machine learning consuming physics deviations rather than static threshold crossing | Z-score normalized residual engine feeding Isolation Forest and Multi-Class Random Forest classifier | **PASS / IMPLEMENTED** |
| **Real Hardware Ingress** | Interfacing with physical hardware flight controllers and telemetry protocols | Full APM/ArduPilot MAVLink v2 parser (`ESC_TELEMETRY`, `SYS_STATUS`, `RAW_IMU`), ESP32 DAQ, Arduino DAQ | **PASS / IMPLEMENTED** |
| **RUL & Uncertainty** | Remaining Useful Life prediction with statistical confidence bounds | Gradient Boosting Quantile Regressors outputting point estimates with 10th-90th percentile uncertainty interval | **PASS / IMPLEMENTED** |
| **Explainable AI (XAI)** | Clear root-cause explanation and actionable maintenance advisory | XAI Engine synthesizing What, Why, Severity, and Recommended Action directly linked to physics residuals | **PASS / IMPLEMENTED** |
| **Mission Intelligence** | Flight mission impact simulation and deterministic replay | Multi-profile mission simulator (1-48 hrs, altitude, thermal loiter) and scrubbable deterministic flight replay engine | **PASS / IMPLEMENTED** |
| **Safety Governance** | Dual-layer hardware and software safety interlocks | Hard limits (7500 RPM, 38A, 85°C), 2.0s watchdog timer, emergency stop, and Triple Control Modes (Manual/Assisted/Automatic) | **PASS / IMPLEMENTED** |
| **Demonstrator Impact** | Seamless live evaluation demonstration for judges | One-click 7-phase SIH Live Demonstrator stepping from normal baseline to compound fault and safe derate | **PASS / IMPLEMENTED** |
