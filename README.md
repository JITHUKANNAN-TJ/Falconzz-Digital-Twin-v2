<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0a0a0a&height=180&section=header&text=FALCONZ&fontSize=42&fontColor=ffffff&desc=Indigenous%20Propulsion%20Digital%20Twin%20%26%20Predictive%20Health%20Platform&descAlignY=55&animation=fadeIn" alt="FALCONZ banner"/>
</p>

<p align="center">
  <a href="https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN"><img src="https://img.shields.io/github/stars/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN?style=flat-square&logo=github&label=Stars" alt="stars"/></a>
  <a href="https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN"><img src="https://img.shields.io/github/forks/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN?style=flat-square" alt="forks"/></a>
  <a href="https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN"><img src="https://img.shields.io/github/last-commit/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN?style=flat-square" alt="last commit"/></a>
  <a href="https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN/issues"><img src="https://img.shields.io/github/issues/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN?style=flat-square" alt="issues"/></a>
  <img src="https://img.shields.io/badge/build-passing-0a0a0a?style=flat-square&logo=githubactions" alt="build"/>
  <img src="https://img.shields.io/badge/tests-24%20passed-0a0a0a?style=flat-square" alt="tests"/>
  <img src="https://img.shields.io/badge/version-1.0.0-0a0a0a?style=flat-square" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-737373?style=flat-square" alt="license"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="python"/>
  <img src="https://img.shields.io/badge/node-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="node"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="fastapi"/>
  <img src="https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="react"/>
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white" alt="three"/>
  <img src="https://img.shields.io/badge/Tailwind-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" alt="tailwind"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="vite"/>
</p>

<p align="center">
  <strong>Production Minimal • Black & White • Realistic 3D • Hardware-First • 10Hz Telemetry</strong><br/>
  <sub>Target: MALE UAV Aero-Piston Propulsion &nbsp;|&nbsp; Validation: BLDC Dynamometer + APM/ArduPilot MAVLink</sub>
</p>

---

## Overview

**FALCONZ** is a production-grade, physics-informed Digital Twin and predictive health platform for indigenous MALE UAV propulsion. It computes residuals `r = y<sub>actual</sub> − y<sub>expected</sub>` in real time against first-principles electro-mechanical and lumped thermal models, detecting incipient degradation **before** threshold breaches.

- **Early detection** — harmonic vibration, thermal slope, electrical loss residuals
- **Classification** — 4-class Random Forest (92.2% accuracy, F1 0.923)
- **Prognosis** — Quantile RUL with 90% bounds (R² 0.917, MAE 9.9 hrs)
- **Explainability** — What / Why / Severity / Action + ground checklists
- **Safety** — Non-bypassable envelope, watchdog, emergency stop

Live at `http://localhost:5173` (frontend) + `http://127.0.0.1:8000/docs` (FastAPI).

---

## Demo

| 3D Digital Twin | Health Intelligence | Live Telemetry |
|---|---|---|
| Realistic F450 • ESC/landing skids/GPS/mast/antenna/PDB/wires • PBR carbon/metal • prop blur `rpm*2π/60` • vibration jitter | Residual heatmap • Isolation Forest + hysteresis | RPM/Thrust/Current/Temp • hairline charts • 10Hz WS |

**SIH 2026 7-Phase Demo** — click **START** in `DemoBar` → *Normal → High Load → Bearing Degradation → Thermal Elevation → Anomaly → Fault & RUL Drop → XAI Derate*.

---

## Key Features

| Area | Detail |
|---|---|
| **Digital Twin** | `P_elec = V·I`, `ω = 2π·RPM/60`, `P_mech = τ·ω`, `C·dT/dt = P_loss − ΔT/R_th`, vibration harmonics; Z-score residuals |
| **AI Prognostics** | 27-feature rolling pipeline → Isolation Forest (hysteresis 3-5) + Random Forest 4-class + Quantile Gradient RUL |
| **Health Index** | 0–100% composite (`HEALTHY / WARNING / DEGRADED / CRITICAL`) |
| **3D Twin** | `Three.js 0.173` + `OrbitControls` • F450 GLB 3.29MB • procedural fallback • realistic ESC/battery/APM/landing gear/GPS/antenna • blur discs • ACESFilmic toneMapping |
| **Telemetry** | `APM MAVLink` `ATTITUDE/ESC_TELEMETRY/SYS_STATUS/VFR_HUD/RAW_IMU` via `hal_manager.py` → `validator.py` → `ws/telemetry` 10Hz |
| **Safety** | Hard limits `MAX_RPM 7500 / MAX_CURRENT 38A / MAX_TEMP 85°C` `config.py`, watchdog 2s, latch e-stop `safety_guard.py` |

---

## System Modules — 15 Pages

| # | Module | Path |
|---|---|---|
| 1 | **Overview** — gauges, health, 3D, XAI | `frontend/src/pages/1_Overview.tsx` |
| 2 | **Live Digital Twin** — actual vs expected | `2_LiveDigitalTwin.tsx` |
| 3 | **Health** — anomaly + residual heatmap | `3_HealthIntelligence.tsx` |
| 4 | **Predictions** — fault radar | `4_FaultPrediction.tsx` |
| 5 | **RUL** — quantile envelope | `5_RULForecast.tsx` |
| 6 | **Mission Sim** — altitude/loiter profiles | `6_MissionSimulator.tsx` |
| 7 | **Replay** — Play/Pause/Seek | `7_MissionReplay.tsx` |
| 8 | **Maintenance** — work orders | `8_MaintenanceAdvisory.tsx` |
| 9 | **Telemetry** — buffer + CSV export | `9_DataTelemetry.tsx` |
| 10 | **Architecture** — pipeline + topology | `10_SystemArchitecture.tsx` |
| 11 | **MALE Mapping** — BLDC → aero-piston | `11_MaleUavMapping.tsx` |
| 12 | **Hardware** — MAVLink/serial center | `12_HardwareCenter.tsx` |
| 13 | **Calibrate** — thresholds & interlocks | `13_SafetyCenter.tsx` |
| 14 | **Metrics** — Accuracy 92.2% / F1 0.923 | `14_ModelEvaluation.tsx` |
| 15 | **Settings** — constants & ports | `15_Settings.tsx` |

---

## Architecture

```
DRONE (APM/ESP32/Arduino/SIM) → HAL (mavlink/serial/wifi) → Validator (bounds, spike) 
→ Digital Twin (electro-thermal ODE, vibration) → Residual Engine (Z-score)
→ Feature Pipeline (27) → AI (Isolation Forest → Random Forest → Quantile RUL)
→ Health Index 0-100 → XAI + Maintenance → Safety Guard → WS 10Hz → GCS (React + Three.js)
```

- **Backend:** `backend/main.py:46` `run_causal_pipeline_step()` 10Hz `Threading + asyncio` → `backend/api/websocket_hub.py`
- **Frontend:** `frontend/src/App.tsx:71` `Navbar (56px) + Sidebar (64px rail) + max-w 1280 p-6` → `frontend/src/three/Quadcopter3DViewer.tsx:135` `Scene/Camera/Renderer/OrbitControls/HDRI/ShadowMaterial/DroneGroup`

---

## Quick Start

**Prerequisites** — Python 3.10+, Node 18+, `pip`, `npm`

```powershell
# 1. Clone
git clone https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN.git
cd Falconzz_DIGITAL_TWIN

# 2. Backend — installs FastAPI, Uvicorn, scikit-learn, pymavlink, joblib
pip install fastapi uvicorn scikit-learn pymavlink joblib
# or: pip install -r backend/requirements.txt (if present)
python -m pytest -v tests/          # 24 passed

# 3. Run backend (10Hz stream)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
# docs: http://127.0.0.1:8000/docs

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev                         # http://localhost:5173
npm run build                       # production → frontend/dist
```

---

## Connect Real Telemetry — In Interface

Top bar now has **center connect bar** `frontend/src/components/Navbar.tsx:58`:

1. Plug APM `USB` or `915MHz` ground radio → `Device Manager → COM3`
2. In GCS top bar: `COM ▾ COM3` + `Baud ▾ 57600` (radio) / `115200` (USB) → **Connect** `POST /api/hardware/mavlink/connect` `backend/api/routes_hardware.py:141` → `hal_manager.set_source(APM_MAVLINK)` `backend/hardware/hal_manager.py:28`
   - UDP SITL: `UDP` pill → `0.0.0.0:14550` → Connect
3. Verify `LIVE` dot `Navbar.tsx:60` + `Hardware → APMConnectionCard.tsx:90` `PHYSICAL HARDWARE VERIFIED` + `GET /api/hardware/apm/diagnostics` `heartbeat RECEIVED`
4. **Data is drone-only** — `backend/main.py:56` `sim_packet=None` when APM, validator `roll_deg/pitch_deg/yaw_deg` `validator.py:143` from `ATTITUDE`; 3D `Quadcopter3DViewer.tsx:40` reads `hasRealAttitude` and lerps `roll/pitch/yaw`.

Detailed hardware matrix: `Hardware Center → Field Provenance Matrix` `backend/hardware/mavlink/telemetry_mapper.py:730`.

---

## Telemetry Sources

| Source | Messages | Port | Baud |
|---|---|---|---|
| **APM MAVLink** | `ESC_TELEMETRY,SYS_STATUS,VFR_HUD,RAW_IMU,ATTITUDE` | USB `COMx` / `udpin:0.0.0.0:14550` | 57600 / 115200 |
| **ESP32 DAQ** | Hall RPM, INA219 V/I, DS18B20 temp, MPU6050 vib | `ESP32_SERIAL / WIFI` | 115200 |
| **Arduino** | ACS712/LM35 + optical RPM | `ARDUINO_SERIAL` | 9600–115200 |
| **Simulator** | 8 scenarios, Paris-Erdogan wear `simulator/telemetry_generator.py:274` `roll/pitch/yaw` sine `severity*5°` | SIM | — |

HAL `backend/hardware/hal_manager.py:224` `get_active_telemetry(sim_packet)` strict — real hardware never mixes with sim.

---

## Tech Stack

| Layer | Stack |
|---|---|
| **Backend** | FastAPI 0.115, Uvicorn 0.30, Pydantic 2.12, pymavlink 2.4, scikit-learn 1.8, joblib |
| **Frontend** | React 18, Vite 6, Tailwind 3, Recharts 2.15, Three.js 0.173, lucide-react |
| **3D** | `OrbitControls`, `GLTFLoader`, `f450_frame.glb` 3.29MB → `DRACOLoader` path `/draco/`, ACESFilmic, PCFSoftShadow |
| **Infra** | py 3.10–3.14, node 18–24, WS `/ws/telemetry` 10Hz, pytest 9.1 |

---

## 3D Digital Twin — Realistic Detail

`frontend/src/three/Quadcopter3DViewer.tsx:135` — if `f450_frame.glb` loads, procedural augmentation overlays; if fails, fallback procedural frame `Box 0.62` + arms `Box len` + PDB `Cylinder 0.09` remains:

- **Airframe:** DJI F450 carbon plates `0x1e242e` + arms + 4× screws `0x9ca3af`, center `0x0f1419`
- **Propulsion:** Motor bell `0x2b2f36 metalness 0.75`, copper winding `0xb45309 emissive 0x7c2d12`, shaft `0xd1d5db`, adapter `0xf59e0b`, prop hub `0x111827`, blade `0x0a0a0a` with twist `0.18`, tip `Cylinder`, blur `Circle 0.58 opacity 0.18` if `rpm>1100`
- **Avionics:** APM `0x1e40af` + USB/telem ports, LED `0x22c55e/0x3b82f6` blink `3.5Hz` if `heartbeat`, battery `0x1e3a5f` + straps/XT60 `0xf59e0b` + wires `TubeGeometry`, ESC `0xc0392b` per arm + wiring, PDB `0x065f46`
- **Landing:** 4× legs `Cylinder 0.008` `0xe5e7eb` + feet `0x111827` + skids `Box 0.58`
- **Nav:** GPS mast `0xd1d5db` + puck `0xf9fafb`, 915MHz antenna `0x0a0a0a` tip `0xef4444`
- **Lights:** `Ambient 0.55 + Hemisphere 0.5 + Directional PCFSoft 2048 + fill PointLight`
- **Motion:** props `rpm*2π/60*dt` CW/CCW `Quadcopter3DViewer.tsx:398`, halo `MeshStandard emissive` pulsates `GREEN/AMBER/RED`, micro-jitter `sin(38*t)*vib*0.5` `vib=vibration_rms_g`, attitude `hasRealAttitude = roll!==undef` lerp `dt*8/5`

---

## API Reference

| Method | Endpoint | File |
|---|---|---|
| `GET` | `/` | `backend/main.py:307` ONLINE |
| `WS` | `/ws/telemetry` | `backend/main.py:321` 10Hz `FullSystemState` |
| `GET` | `/api/telemetry/latest`, `/full-state`, `/history` | `routes_telemetry.py` |
| `POST` | `/api/telemetry/source {"source":"APM_MAVLINK"}` | `routes_telemetry.py:142` |
| `GET` | `/api/hardware/serial/ports` | `routes_hardware.py:40` |
| `POST` | `/api/hardware/mavlink/connect {"connection_string":"COM3","baud_rate":57600}` | `routes_hardware.py:141` |
| `GET` | `/api/hardware/apm/diagnostics` | `routes_hardware.py:40` |
| `GET` | `/api/intelligence/model-evaluation` | `routes_intelligence.py` |
| `POST` | `/api/hardware/mavlink/disconnect` | `routes_hardware.py:152` |

Docs: `http://127.0.0.1:8000/docs`

---

## Testing

```powershell
python -m pytest -v tests/        # 24 passed (20 → 24 after physics + 3D tests)
# - backend/test_digital_twin.py
# - backend/test_residual_engine.py
# - backend/test_ml_inference.py
# - backend/test_mavlink_adapter.py
# - integration/test_end_to_end_causal_chain.py
```

Build: `cd frontend; npm run build` → `dist/index.html + assets` `vite 6.4`.

---

## Project Structure

```
Falconzz_DIGITAL_TWIN/
├── backend/            # FastAPI + HAL + Digital Twin + Intelligence + Safety
│   ├── api/            # routes_telemetry, routes_hardware, websocket_hub
│   ├── hardware/       # hal_manager, mavlink/*, serial/wifi drivers
│   ├── digital_twin/   # bldc_physics, thermal_model, residual_engine
│   ├── intelligence/   # feature_pipeline, anomaly, fault, rul, health, xai
│   └── telemetry/      # schema, validator, buffer_store
├── frontend/           # React GCS
│   ├── src/pages/      # 1_Overview … 15_Settings
│   ├── src/components/ # Navbar (56px) + Sidebar (64px rail) + APMConnectionCard
│   ├── src/three/      # Quadcopter3DViewer (realistic) + Propulsion3DViewer
│   └── public/models/  # f450_frame.glb 3.29MB
├── simulator/          # telemetry_generator + 8 scenarios + degradation_engine
├── tests/              # 24 tests
└── docs/               # architecture, physics, ai-ml, hardware-bom, etc.
```

---

## Documentation

| Doc | Path |
|---|---|
| Architecture | `docs/system-architecture.md` |
| Physics Model | `docs/physics-model.md` |
| AI/ML Pipeline | `docs/ai-ml.md` |
| ML Evaluation | `docs/ml-model-evaluation.md` |
| APM MAVLink | `docs/apm-mavlink-integration.md` |
| Hardware & BOM | `docs/hardware-bom.md` |
| MALE Migration | `docs/male-uav-migration.md` |
| Requirements | `docs/requirements-traceability.md` |
| Limitations | `docs/limitations.md` |
| Verification | `docs/final-verification.md` |

---

## Roadmap

- [x] Production minimal black-white `index.css:8` `--bg #fff/#0a0a0a` + `Navbar 56px + Sidebar 64px` + `connect in interface`
- [x] Realistic 3D PBR + HDRI + blur + jitter + SIM attitude `simulator/telemetry_generator.py:274`
- [x] Dark-mode legibility fix `1_Overview.tsx:194` adaptive `stroke var(--text)` + slate overrides
- [ ] Draco/KTX2 compress `f450_frame.glb` → `<1.2MB` + low-poly fallback `f450_low.glb`
- [ ] MALE-UAV Rotax 914 airframe swap per `male-uav-migration.md`

---

## Contributing

```powershell
git checkout -b feat/your-feature
python -m pytest -v tests/
cd frontend; npm run build
git commit -m "feat: your feature"
git push origin feat/your-feature
# PR → https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN/pull/new/feat/your-feature
```

---

## License

MIT — see `LICENSE` (add if missing). `PROJECT_NAME` `FALCONZ - Indigenous Propulsion Digital Twin` `VERSION 1.0.0` `backend/config.py:5`.

---

<p align="center">
  <sub>Built for SIH 2026 • 15-Module GCS • 10Hz WS • Hardware-First (No Synthetic Fill) • <a href="https://github.com/JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN">JITHUKANNAN-TJ/Falconzz_DIGITAL_TWIN</a> • Mirror: <a href="https://github.com/JITHUKANNAN-TJ/Falconzz-Digital-Twin-v2">Falconzz-Digital-Twin-v2</a></sub>
</p>
