# Requirements Traceability Matrix (RTM)

| Req ID | Requirement Description | Implementation Module | Automated Test File | Live Verification / Demo |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Multi-source telemetry ingress (APM MAVLink, ESP32, Arduino, Simulation) | `backend/hardware/` | `test_mavlink_adapter.py` | Page 12 (Hardware Center) |
| **REQ-02** | Real-time telemetry validation, spike rejection, and power/efficiency derivation | `backend/telemetry/validator.py` | `test_telemetry_validation.py` | Page 9 (Data Telemetry) |
| **REQ-03** | Physics-informed Digital Twin (P_elec, P_mech, lumped thermal ODE, baseline vibration) | `backend/digital_twin/` | `test_digital_twin.py` | Page 2 (Live Digital Twin) |
| **REQ-04** | Residual engine calculating raw and normalized Z-score deviations | `backend/digital_twin/residual_engine.py` | `test_residual_engine.py` | Page 2 & Page 3 |
| **REQ-05** | Multi-scenario degradation simulation (7 scenarios + combined fault) | `simulator/scenarios.py`, `degradation_engine.py` | `test_scenarios.py` | Top Mode Selector |
| **REQ-06** | Isolation Forest Anomaly Detection with temporal hysteresis (3-5 frames) | `backend/intelligence/anomaly_detector.py` | `test_ml_inference.py` | Page 3 (Health Intel) |
| **REQ-07** | Multi-class supervised fault classification with confidence percentages | `backend/intelligence/fault_classifier.py` | `test_ml_inference.py` | Page 4 (Fault Prediction) |
| **REQ-08** | Dynamic composite health index (0-100%) with 4 health bands | `backend/intelligence/health_index.py` | `test_health_and_rul.py` | Page 1 & Page 3 |
| **REQ-09** | Quantile Gradient Boosting RUL prediction with 90% confidence uncertainty bounds | `backend/intelligence/rul_predictor.py` | `test_health_and_rul.py` | Page 5 (RUL Forecast) |
| **REQ-10** | Explainable AI (XAI) answering What, Why, Severity, and Recommended Action | `backend/intelligence/explainable_ai.py` | `test_health_and_rul.py` | Page 1 & Page 8 |
| **REQ-11** | Condition-based maintenance advisories and ground support inspection checklists | `backend/intelligence/explainable_ai.py` | `test_health_and_rul.py` | Page 8 (Maintenance Advisory) |
| **REQ-12** | Multi-hour flight mission simulator with altitude, ambient temp, and wear impact | `backend/mission/mission_simulator.py` | `test_mission_sim.py` | Page 6 (Mission Simulator) |
| **REQ-13** | 100% Deterministic flight mission replay with play/pause/seek/speed controls | `backend/mission/mission_replay.py` | `test_mission_sim.py` | Page 7 (Mission Replay) |
| **REQ-14** | Interactive WebGL 3D propulsion twin visualizing rotation, thermal shift, and vibration | `frontend/src/three/Propulsion3DViewer.tsx` | Frontend Build | Page 1 (Overview) |
| **REQ-15** | Dual-layer safety guard, hard limits, watchdog timer, and emergency shutdown | `backend/safety/safety_guard.py` | `test_safety_guard.py` | Page 13 (Safety Center) |
| **REQ-16** | One-click 7-phase SIH Live Demonstrator progression | `backend/api/routes_demo.py` | `test_api_endpoints.py` | Top SIH Demo Bar |
| **REQ-17** | Clear separation between Validated on Rig, Proxy, and Future MALE-UAV channels | `frontend/src/components/StatusBadge.tsx` | Frontend Build | Across all 15 pages |
| **REQ-18** | End-to-end causal chain propagation from scenario change to maintenance advisory | `backend/main.py` | `test_end_to_end_causal_chain.py` | Full Test Suite |
