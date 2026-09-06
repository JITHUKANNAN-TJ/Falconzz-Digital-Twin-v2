# FALCONZ: Comprehensive System Features & Technical Architecture Report

**Document ID:** FALCONZ-CR-2026-V1  
**Project:** Indigenous Propulsion Digital Twin + Predictive Health Monitoring Platform  
**Target Applications:** Physical BLDC Laboratory Testbed (Validation Platform) $\longrightarrow$ Multi-Cylinder Aero-Piston Engine (Target MALE-UAV Platform)  
**Execution Environment:** FastAPI 0.139.0 | React 18.3.1 | Vite 6.4.3 | Three.js | Scikit-Learn | Pymavlink  

---

## Table of Contents
1. [System Architecture & Ingress Pipeline](#1-system-architecture--ingress-pipeline)
2. [Hardware Ingress & APM / ArduPilot MAVLink Adapter](#2-hardware-ingress--apm--ardupilot-mavlink-adapter)
3. [Telemetry Ingestion, Validation & Buffering](#3-telemetry-ingestion-validation--buffering)
4. [First-Principles Physics Digital Twin](#4-first-principles-physics-digital-twin)
5. [Physics Residual Engine & Z-Score Normalizer](#5-physics-residual-engine--z-score-normalizer)
6. [Multi-Scenario Degradation & Simulation Engine](#6-multi-scenario-degradation--simulation-engine)
7. [AI/ML Intelligence & Diagnostic Pipeline](#7-aiml-intelligence--diagnostic-pipeline)
8. [Dynamic Health Index & Remaining Useful Life (RUL)](#8-dynamic-health-index--remaining-useful-life-rul)
9. [Explainable AI (XAI) & Maintenance Advisory Engine](#9-explainable-ai-xai--maintenance-advisory-engine)
10. [Mission Intelligence & Deterministic Flight Replay](#10-mission-intelligence--deterministic-flight-replay)
11. [Dual-Layer Safety Interlocks & Control Modes](#11-dual-layer-safety-interlocks--control-modes)
12. [Three.js WebGL 3D Propulsion Twin](#12-threejs-webgl-3d-propulsion-twin)
13. [One-Click 7-Phase SIH Live Demonstrator](#13-one-click-7-phase-sih-live-demonstrator)
14. [Exhaustive Breakdown of All 15 GCS Dashboard Modules](#14-exhaustive-breakdown-of-all-15-gcs-dashboard-modules)
15. [MALE-UAV Migration & Sensor Attribution Governance](#15-male-uav-migration--sensor-attribution-governance)
16. [Automated Verification & Test Harness](#16-automated-verification--test-harness)

---

## 1. System Architecture & Ingress Pipeline

The FALCONZ platform is built upon a deterministic **Causal Propagation Pipeline** that connects real physical sensor data and synthetic degradation profiles directly to high-level mission intelligence.

```
[ BLDC Motor + ESC + Flight Controller ]
                   │
                   ▼ (USB-Serial / UDP)
[ FALCONZ MAVLink Telemetry Adapter ] ───► backend/hardware/mavlink/
                   │
                   ▼
[ Telemetry Ingestion & Validation ] ───► backend/telemetry/validator.py
                   │
                   ▼
[ First-Principles Physics Digital Twin ] ──► backend/digital_twin/bldc_physics.py
                   │
                   ▼
[ Physics Residual Engine ] ──────────────► backend/digital_twin/residual_engine.py
                   │
                   ▼
[ 27-Feature Dynamic Rolling Pipeline ] ──► backend/intelligence/feature_pipeline.py
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
[ Anomaly Detection ]   [ Fault Classification ] (Random Forest 92.2% Acc)
       │                       │
       └───────────┬───────────┘
                   ▼
[ Dynamic Composite Health Index ] ──────► backend/intelligence/health_index.py
                   │
                   ▼
[ Prognostic Quantile RUL Regressor ] ───► backend/intelligence/rul_predictor.py
                   │
                   ▼
[ Explainable AI (XAI) Engine ] ─────────► backend/intelligence/explainable_ai.py
                   │
                   ▼
[ Mission Feasibility & Derating ] ──────► backend/mission/mission_simulator.py
                   │
                   ▼
[ Dual-Layer Safety Interlocks ] ────────► backend/safety/safety_guard.py
                   │
                   ▼
[ 15-Page GCS Dashboard + 3D Twin ] ────► frontend/src/pages/
```

---

## 2. Hardware Ingress & APM / ArduPilot MAVLink Adapter

### 2.1 Multi-Source Hardware Abstraction Layer (HAL)
The HAL (`backend/hardware/hal_manager.py`) manages hot-swapping between physical hardware sources and synthetic simulations:
- `APM_MAVLINK`: Direct USB-Serial (`COM3`, 115200 baud) or network UDP (`udpin:0.0.0.0:14550`) receiving standard ArduPilot MAVLink streams.
- `ESP32_SERIAL`: Direct USB-UART connection to an external ESP32 sensor expansion board streaming JSON frames at 115200 baud.
- `ESP32_WIFI`: High-speed UDP packet stream receiving remote ESP32 frames over local Wi-Fi / Ethernet.
- `ARDUINO_SERIAL`: Direct USB-UART connection to Arduino Uno/Nano sensor nodes.
- `SIMULATION`: Physics-driven multi-scenario simulator with active fallback policy.

### 2.2 MAVLink Protocol Parser & Message Mapping
- **`ESC_TELEMETRY`**: Decodes motor RPM, voltage ($0.01\,\text{V}$), current ($0.01\,\text{A}$), and ESC temperature ($^\circ\text{C}$).
- **`SYS_STATUS`**: Decodes main battery bus voltage ($1\,\text{mV}$), battery current ($10\,\text{mA}$), and remaining charge.
- **`VFR_HUD`**: Decodes commanded throttle ($0\text{--}100\%$), barometric altitude, and airspeed.
- **`RAW_IMU`**: Decodes 3-axis accelerometer values ($x_{acc}, y_{acc}, z_{acc}$) and calculates structural vibration RMS:
  $$\text{Vibration RMS} = \frac{\sqrt{x_{acc}^2 + y_{acc}^2 + (z_{acc} - 1000)^2}}{1000} \quad [\text{g}]$$
- **`SCALED_PRESSURE`**: Decodes ambient pressure and external ambient air temperature.
- **`HEARTBEAT`**: Monitors autopilot arm state, base flight modes, and connection liveness.

### 2.3 Live Diagnostics & Frame Inspection
- **Heartbeat Monitor**: Computes real-time telemetry age in milliseconds and flags stale streams ($>3.0\,\text{s}$).
- **Sequence Loss Tracker**: Detects dropped MAVLink frames using circular packet sequence counters.
- **Message Rate (Hz)**: Sliding window rate tracker calculating live Hz frequency.
- **Diagnostic Stream**: Rolling 50-packet circular buffer displaying decoded JSON payloads.

---

## 3. Telemetry Ingestion, Validation & Buffering

### 3.1 Canonical Telemetry Schema
Every data source is normalized into a strict Pydantic model (`backend/telemetry/schema.py`):
- `timestamp`: Epoch time in seconds ($1\,\text{ms}$ precision).
- `source_type`: Data provenance origin tag.
- `throttle_pct`: Commanded throttle $[0, 100]\%$.
- `rpm`: Rotational speed $[0, 10000]\,\text{RPM}$.
- `voltage_v`: Bus voltage $[0, 30]\,\text{V}$.
- `current_a`: Stator/phase current $[0, 60]\,\text{A}$.
- `temperature_c`: Stator/ESC temperature $[-20, 150]^\circ\text{C}$.
- `vibration_rms_g`: Structural vibration $[0, 10]\,\text{g}$.
- `ambient_temperature_c`: Air temperature $[-40, 60]^\circ\text{C}$.
- `load_pct`: Torque load percentage $[0, 100]\%$.
- `cht_c`, `egt_c`, `oil_pressure_psi`, `oil_temperature_c`, `fuel_flow_gph`: Aero-piston channels (tagged `None` on BLDC rig).

### 3.2 Dynamic Validation & Outlier Rejection
- **Range Sanitization**: Clamps extreme sensor glitches outside physical bounds.
- **Rate-of-Change Filter**: Rejects unphysical single-frame spikes ($\Delta \text{RPM} > 4000/\text{frame}$, $\Delta T > 20^\circ\text{C}/\text{frame}$).
- **Channel Degradation Flags**: Flags telemetry frames as valid, degraded, or corrupt.
- **Buffer Store**: Thread-safe circular buffer (`backend/telemetry/buffer_store.py`) caching the last 300 chronological frames ($150\,\text{s}$ at $2\,\text{Hz}$).

---

## 4. First-Principles Physics Digital Twin

The Digital Twin (`backend/digital_twin/bldc_physics.py`) computes the theoretical nominal physical behavior of the propulsion system at every time-step using first-principles equations.

### 4.1 Electro-Mechanical Dynamics
1. **Effective Applied Stator Voltage**:
   $$V_{applied} = V_{battery} \cdot \left(\frac{\text{Throttle}}{100}\right)$$
2. **Back-EMF & Theoretical No-Load RPM**:
   $$\text{RPM}_{ideal} = V_{applied} \cdot K_v \quad (K_v = 880\,\text{RPM/V})$$
3. **Aerodynamic Propeller Load Torque**:
   $$\tau_{aero} = C_{prop} \cdot \omega^2 \quad \text{where } \omega = \frac{2\pi \cdot \text{RPM}}{60}, \; C_{prop} = 3.8 \times 10^{-9}\,\text{N}\cdot\text{m}/(\text{rad/s})^2$$
4. **Theoretical Stator Current**:
   $$I_{stator, expected} = I_0 + \frac{\tau_{aero}}{K_t} \quad \left(K_t = \frac{60}{2\pi K_v} \approx 0.01085\,\text{N}\cdot\text{m/A}, \; I_0 = 0.6\,\text{A}\right)$$
5. **Loaded RPM Under Mechanical Torque**:
   $$\text{RPM}_{loaded} = \max\left(0, \text{RPM}_{ideal} - \frac{I_{stator, expected} \cdot R_m}{K_v}\right) \quad (R_m = 0.075\,\Omega)$$
6. **Electrical & Mechanical Power Balance**:
   $$P_{elec} = V_{applied} \cdot I_{stator}, \quad P_{mech} = \tau_{aero} \cdot \omega, \quad \eta = \frac{P_{mech}}{P_{elec}}$$

### 4.2 Lumped-Parameter Thermal ODE
Stator and ESC heating is modeled using a differential thermal equation (`backend/digital_twin/thermal_model.py`):
$$\frac{dT_{stator}}{dt} = \frac{P_{loss} - \frac{T_{stator} - T_{ambient}}{R_{th}(RPM)}}{C_{th}}$$
- Internal Joule & Core Losses: $P_{loss} = I_{stator}^2 R_m + P_{iron}$
- Thermal Capacitance: $C_{th} = 150.0\,\text{J/K}$
- Forced Convection Resistance: $R_{th}(\text{RPM}) = \frac{0.85}{1.0 + 0.0003 \cdot \text{RPM}}\,\text{K/W}$

### 4.3 Baseline Harmonic Vibration Model
The nominal rotational baseline vibration (`backend/digital_twin/vibration_model.py`) is computed as:
$$V_{nominal}(\text{RPM}) = 0.05 + 0.00015 \cdot \text{RPM}^{1.10} \quad [\text{g}]$$

---

## 5. Physics Residual Engine & Z-Score Normalizer

The Residual Engine (`backend/digital_twin/residual_engine.py`) continuously computes the physical delta between validated telemetry and the Digital Twin predictions.

### 5.1 Residual Channels
1. **RPM Residual ($\Delta \text{RPM}$)**: $\text{Residual}_{RPM} = \text{RPM}_{measured} - \text{RPM}_{twin}$
2. **Current Residual ($\Delta I$)**: $\text{Residual}_{Current} = I_{measured} - I_{twin}$
3. **Temperature Residual ($\Delta T$)**: $\text{Residual}_{Temp} = T_{measured} - T_{twin}$
4. **Vibration Residual ($\Delta V$)**: $\text{Residual}_{Vib} = V_{measured} - V_{nominal}$
5. **Power Loss Residual ($\Delta P_{loss}$)**: $\text{Residual}_{Loss} = P_{loss, measured} - P_{loss, twin}$

### 5.2 Normalized Z-Score Computation
Each residual is converted to a standard score using calibrated baseline standard deviations ($\sigma_{RPM}=75.0, \sigma_I=0.45, \sigma_T=1.2, \sigma_V=0.035$):
$$Z_k = \frac{\text{Residual}_k}{\sigma_k}$$
Combined Residual Magnitude ($Z_{total}$):
$$Z_{total} = \sqrt{Z_{RPM}^2 + Z_I^2 + Z_T^2 + Z_V^2}$$

---

## 6. Multi-Scenario Degradation & Simulation Engine

The degradation generator (`backend/simulator/degradation_engine.py` & `scenarios.py`) simulates realistic laboratory testbed wear patterns:
1. **NORMAL_BASELINE**: Nominal operating conditions with minor sensor Gaussian noise.
2. **HIGH_LOAD_CRUISE**: Heavy aerodynamic drag ($+35\%$ current draw, mild thermal rise).
3. **THERMAL_OVERHEATING**: Blocked cooling / high ambient ($+35^\circ\text{C}$ winding temperature rise, $dT/dt > 0.4^\circ\text{C/s}$).
4. **BEARING_DEGRADATION**: Mechanical bearing raceway spalling ($+0.85\,\text{g}$ 1X vibration harmonics, $+15\%$ frictional torque loss).
5. **ELECTRICAL_RESISTANCE**: Phase winding inter-turn resistance drift ($+5.5\,\text{A}$ abnormal current draw, $\Delta P_{loss} > 80\,\text{W}$).
6. **SENSOR_DRIFT**: Gradual temperature/RPM calibration drift over time.
7. **RAPID_THERMAL_RUNAWAY**: Accelerated non-linear heating testing safety interlock triggers.
8. **COMBINED_MULTIPLE_FAULTS**: Compound bearing mechanical unbalance + stator overheating.

---

## 7. AI/ML Intelligence & Diagnostic Pipeline

### 7.1 Dynamic 27-Feature Engineering Pipeline
The feature extractor (`backend/intelligence/feature_pipeline.py`) transforms rolling telemetry into 27 dynamic statistical and physical indicators:
- **Instantaneous Residuals**: $\Delta \text{RPM}, \Delta I, \Delta T, \Delta V, \Delta P_{loss}$
- **Normalized Z-Scores**: $Z_{RPM}, Z_I, Z_T, Z_V, Z_{total}$
- **Rolling Statistics (10-sample window)**: Mean, standard deviation, and variance of RPM, current, temperature, and vibration.
- **Physical Slopes**:
  - Thermal Gradient: $\frac{dT}{dt} = \frac{T_t - T_{t-5}}{\Delta t}$
  - Vibration Acceleration Slope: $\frac{dV}{dt}$
- **Loss Ratio**: $\text{Loss Ratio} = \frac{P_{loss, measured}}{P_{elec}}$

### 7.2 Model 1: Anomaly Detection (Isolation Forest)
- **Algorithm**: `sklearn.ensemble.IsolationForest` (100 isolation trees, contamination$=0.06$).
- **Hysteresis Filter**: Requires $3\text{--}5$ consecutive positive anomaly detections to prevent false positive triggers on single noise spikes.
- **Performance**: Precision: $0.938$, Recall: $0.945$, F1-Score: $0.941$.

### 7.3 Model 2: Fault Classification (Random Forest)
- **Algorithm**: `sklearn.ensemble.RandomForestClassifier` (150 tuned estimators, max depth$=12$).
- **Trained Dataset**: 7,200 run-to-failure synthetic & laboratory trajectory records (`ml/datasets/run_to_failure_dataset.csv`).
- **Target Classes**:
  1. `Nominal`
  2. `Bearing Degraded`
  3. `Propeller Imbalance`
  4. `Stator Overheating`
- **Validated Performance (`ml/evaluation/metrics.json`)**:
  - **Overall Accuracy: 92.22%** (1,328 correct / 1,440 test samples)
  - **Macro F1-Score: 0.9231**
  - **Nominal F1:** $0.985$
  - **Bearing Degraded F1:** $0.912$
  - **Propeller Imbalance F1:** $0.884$
  - **Stator Overheating F1:** $0.911$

---

## 8. Dynamic Health Index & Remaining Useful Life (RUL)

### 8.1 Composite Health Index ($0\text{--}100\%$)
The health calculator (`backend/intelligence/health_index.py`) synthesizes physics residuals and AI classification into four calibrated health bands:
$$HI = 100 - \left(0.30 \cdot \min(100, Z_V \cdot 20) + 0.35 \cdot \min(100, Z_T \cdot 20) + 0.20 \cdot \min(100, Z_I \cdot 20) + 0.15 \cdot \text{Fault Penalty}\right)$$

| Health Index Range | Health Status | Operational Action |
| :--- | :--- | :--- |
| **$85\%\text{--}100\%$** | `HEALTHY` (Green) | Normal Flight Operations Permitted |
| **$70\%\text{--}84\%$** | `WARNING` (Amber) | Advisory Alert / Monitor Residuals |
| **$40\%\text{--}69\%$** | `DEGRADED` (Orange) | Automatic Power Derating ($80\%$ Throttle Limit) |
| **$<40\%$** | `CRITICAL` (Red) | Emergency RTB / Immediate Controlled Descent |

### 8.2 Model 3: Prognostic Quantile RUL Regressors
- **Algorithm**: Multi-Quantile Gradient Boosting Regressors (`sklearn.ensemble.GradientBoostingRegressor`) trained at quantiles $q=0.10, 0.50, 0.90$.
- **Outputs**:
  - Expected RUL (P50 Median): $R^2 = 0.9173$, MAE $= 9.97\,\text{hours}$.
  - $90\%$ Confidence Interval: $[P_{10}, P_{90}]$ lower and upper uncertainty bounds.
- **Experimental Notice**: Marked with `PROTOTYPE RUL (NON-FLIGHT-CERTIFIED)` badge.

---

## 9. Explainable AI (XAI) & Maintenance Advisory Engine

### 9.1 Physics-Linked Attribution
The XAI engine (`backend/intelligence/explainable_ai.py`) translates statistical model outputs into transparent aerospace engineering language:
1. **WHAT Happened**: Identified failure mode and confidence percentage.
2. **WHY It Happened**: Top 3 driving feature importances linked to physical residuals (e.g., $Z_T = 3.82$ contributing $48\%$ to Stator Overheating diagnosis).
3. **SEVERITY**: Assessment of thermal/mechanical runaway risk.
4. **RECOMMENDED ACTION**: Immediate derate, inspect bearing race, check cooling duct, or abort mission.

### 9.2 Causal Propagation Graph
Constructs a deterministic directed causal tree displayed on the GCS dashboard:
$$\text{Thermal Cooling Restriction} \longrightarrow \Delta T \text{ Surge } (+38^\circ\text{C}) \longrightarrow \text{Winding Resistivity Increase } (+18\%) \longrightarrow \text{Stator Overheating} \longrightarrow \text{Health Index Drop to } 52\%$$

### 9.3 Maintenance Advisory Module
Generates actionable ground maintenance action items:
- Prescriptive repair procedures.
- Urgency ratings: `ROUTINE`, `PRE-FLIGHT`, `IMMEDIATE GROUNDING`.
- Standard operating procedure (SOP) checklist for line maintenance technicians.

---

## 10. Mission Intelligence & Deterministic Flight Replay

### 10.1 Mission Feasibility Simulator
Simulates multi-hour UAV flight profiles (`backend/mission/mission_simulator.py`):
- **Profiles**: `HIGH_ALTITUDE` (cold, thin air), `HOT_DAY_DESERT` (high ambient), `EXTENDED_LOITER` (endurance), `HIGH_SPEED_DASH` (peak thermal load).
- **Damage Accumulation**: Integrates cumulative mechanical and thermal damage over mission duration ($1\text{--}48\,\text{hours}$).
- **Mission Feasibility Score**: Evaluates if the propulsion system can safely complete the planned profile without exceeding safety limits.

### 10.2 Deterministic Flight Replay Engine
Provides $100\%$ reproducible flight analysis (`backend/mission/mission_replay.py`):
- Play, Pause, Step Forward, Step Backward controls.
- Playback speeds: $0.5\times, 1.0\times, 2.0\times, 4.0\times$.
- Frame-by-frame scrubbing across synchronized telemetry, residuals, AI outputs, and 3D twin animation.

---

## 11. Dual-Layer Safety Interlocks & Control Modes

### 11.1 Safety Interlocks Matrix (`backend/safety/safety_guard.py`)
- **Hard RPM Limit**: $7,500\,\text{RPM}$ (Instant software throttle clamp).
- **Hard Current Limit**: $38.0\,\text{A}$ (Prevents ESC overcurrent / MOSFET failure).
- **Hard Temperature Limit**: $85.0^\circ\text{C}$ (Prevents winding insulation breakdown).
- **Hard Vibration Limit**: $2.5\,\text{g}$ (Prevents structural airframe resonance).
- **Communication Watchdog**: $2.0\,\text{s}$ timeout (automatic transition to safe idle if telemetry packet stream stops).
- **Emergency Stop (E-Stop)**: Hardware/Software latched state machine that drives throttle to $0\%$ and requires explicit operator acknowledgment and manual reset.

### 11.2 Operational Control Modes (`backend/safety/control_modes.py`)
- `MANUAL`: Direct operator throttle override with underlying hard safety boundary enforcement.
- `ASSISTED`: Operator commands with active automatic derating when health drops below $70\%$.
- `AUTOMATIC`: Full digital twin governor autonomously modulating throttle to maintain health $>80\%$.

---

## 12. Three.js WebGL 3D Propulsion Twin

Implemented in `frontend/src/components/Propulsion3DViewer.tsx`:
- Procedural 3D WebGL assembly consisting of stator core, copper windings, permanent magnet rotor bell, driveshaft, and carbon fiber propeller.
- Real-time dynamic rotation speed driven by live RPM telemetry.
- Dynamic thermal shader mapping stator temperature to a heat colormap (Cyan nominal $\to$ Amber warning $\to$ Glowing Red overheated).
- Harmonic mechanical vibration displacement jitter proportional to measured vibration RMS.

---

## 13. One-Click 7-Phase SIH Live Demonstrator

An automated demonstration controller (`backend/api/routes_demo.py` & `frontend/src/components/DemoBar.tsx`) that walks evaluators through the complete end-to-end failure and recovery lifecycle:
1. **Phase 1: Normal Baseline** $\to$ Stable $4800\,\text{RPM}$, all residuals $<1.0\,\sigma$, Health: $98\%$.
2. **Phase 2: High Load Inception** $\to$ Current draws $18\,\text{A}$, RPM sags under propeller drag.
3. **Phase 3: Bearing Degradation** $\to$ Vibration RMS spikes to $0.85\,\text{g}$ ($Z_V = 4.2$).
4. **Phase 4: Thermal Winding Elevation** $\to$ Temperature surges to $78^\circ\text{C}$ ($dT/dt = 0.42^\circ\text{C/s}$).
5. **Phase 5: Anomaly Confirmation** $\to$ Isolation Forest confirms anomaly after 3 consecutive frames.
6. **Phase 6: Multi-Class Diagnosis & RUL Drop** $\to$ Random Forest classifies `Stator Overheating` ($94\%$ confidence); RUL drops to $14.2\,\text{hours}$.
7. **Phase 7: XAI Synthesis & Safe Derating** $\to$ XAI generates actionable advisory and triggers automatic throttle derate to $65\%$, stabilizing motor temperature.

---

## 14. Exhaustive Breakdown of All 15 GCS Dashboard Modules

| Page # | Page Name | File Path | Key Features & Functional Scope |
| :---: | :--- | :--- | :--- |
| **1** | **Overview** | `pages/1_Overview.tsx` | Mission control dashboard, 3D WebGL twin, live KPI telemetry cards, dynamic composite health index dial, quick scenario selector. |
| **2** | **Live Digital Twin** | `pages/2_LiveDigitalTwin.tsx` | Side-by-side comparison of Measured vs Digital Twin parameters, dynamic residual gauges ($\Delta \text{RPM}, \Delta I, \Delta T, \Delta V$), normalized $Z$-scores. |
| **3** | **Health Intelligence** | `pages/3_HealthIntelligence.tsx` | Health index trend history chart, four calibrated health bands, component-level health breakdown (Stator, Bearings, ESC, Propeller). |
| **4** | **Fault Prediction** | `pages/4_FaultPrediction.tsx` | Random Forest multi-class diagnosis, anomaly detection flag, prediction confidence progress bar, failure mode distribution chart. |
| **5** | **RUL Forecast** | `pages/5_RULForecast.tsx` | Prognostic remaining useful life curve, $90\%$ confidence uncertainty envelope ($P_{10}\text{--}P_{90}$ bounds), non-flight-certified notice. |
| **6** | **Mission Simulator** | `pages/6_MissionSimulator.tsx` | Multi-profile mission selector (High Altitude, Hot Day, Loiter), mission feasibility scoring, cumulative component damage integration. |
| **7** | **Mission Replay** | `pages/7_MissionReplay.tsx` | $100\%$ deterministic flight replay engine, timeline scrubber, Play/Pause/Speed buttons, synchronized telemetry and AI review. |
| **8** | **Maintenance Advisory** | `pages/8_MaintenanceAdvisory.tsx` | Prescriptive maintenance actions, urgency ratings, line maintenance SOP checklists, component replacement scheduling. |
| **9** | **Data & Telemetry** | `pages/9_DataTelemetry.tsx` | High-frequency telemetry charts, live data export (CSV/JSON), historical buffer inspection, packet loss statistics. |
| **10** | **System Architecture** | `pages/10_SystemArchitecture.tsx` | Interactive end-to-end data pipeline diagram, MAVLink ingress architecture, physics twin equation cards, AI pipeline documentation. |
| **11** | **MALE UAV Mapping** | `pages/11_MaleUavMapping.tsx` | Physical BLDC testbed to aero-piston engine migration matrix, sensor analogy mapping, heavy-fuel target architecture. |
| **12** | **Hardware Center** | `pages/12_HardwareCenter.tsx` | Live APM/ArduPilot connection controller, baud selector, field-by-field provenance table, live MAVLink decoded frame terminal. |
| **13** | **Safety Center** | `pages/13_SafetyCenter.tsx` | Dual-layer safety interlocks, hard parameter limit gauges, emergency stop latched state controller, control mode selector. |
| **14** | **Model Evaluation** | `pages/14_ModelEvaluation.tsx` | Machine learning evaluation suite, confusion matrix viewer, precision/recall/F1 metrics linked to `metrics.json`, training dataset summary. |
| **15** | **Settings & Config** | `pages/15_Settings.tsx` | System configurations, safety limit threshold adjustment, WebSocket streaming rate controller, audio/visual alert preferences. |

---

## 15. MALE-UAV Migration & Sensor Attribution Governance

### 15.1 Physical BLDC Rig vs Future Aero-Piston Target
- **Current Validation Testbed**: Brushless DC (BLDC) electric motor + ESC + APM/ArduPilot flight controller.
- **Future Target Platform**: Heavy-fuel multi-cylinder aero-piston engine (e.g., Rotax 914 / Austro Engine AE300 class).

### 15.2 Sensor Attribution & Channel Demarcation
To ensure complete technical honesty without fabricating non-existent hardware sensors:
- **`VALIDATED ON RIG` (Green)**: Channels received directly from physical hardware (RPM, Voltage, Current, ESC Temp, Rig Vibration).
- **`PROXY/SIMULATED` (Amber)**: Environmental parameters and laboratory-controlled degradation proxies.
- **`FUTURE MALE-UAV / UNAVAILABLE` (Indigo/Gray)**: Aero-piston parameters (CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow) are displayed as `UNAVAILABLE` without fake data generation.

---

## 16. Automated Verification & Test Harness

The platform includes **21 comprehensive unit and integration tests** executing via Pytest:
```powershell
python -m pytest -v tests/
# Result: 21 passed in 9.44s
```

### Verified Test Modules:
1. `test_api_endpoints.py`: REST routes, WebSocket connections, throttle commands.
2. `test_digital_twin.py`: Physics twin power balance, ODE thermal solver, vibration harmonics.
3. `test_health_and_rul.py`: Health index calculation, XAI synthesis, RUL quantile prediction.
4. `test_mavlink_adapter.py`: MAVLink frame parser, field mapper, diagnostics, provenance.
5. `test_mission_sim.py`: Mission profile simulator, deterministic flight replay engine.
6. `test_ml_inference.py`: 27-feature pipeline, Isolation Forest anomaly detector, Random Forest classifier.
7. `test_residual_engine.py`: Residual calculation and normalized Z-score standardization.
8. `test_safety_guard.py`: Hard limit enforcement, watchdog timer, emergency stop state latch.
9. `test_scenarios.py`: All 8 degradation scenarios and synthetic telemetry generator.
10. `test_telemetry_validation.py`: Telemetry schema validation, spike filters, and rate-of-change limiters.
11. `test_end_to_end_causal_chain.py`: Complete end-to-end integration test validating causal propagation from scenario injection to safe derate.
