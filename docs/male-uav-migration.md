# MALE UAV Aero-Piston Propulsion Migration Plan

## 1. Migration Overview
FALCONZ separates the validation architecture into three distinct tiers:
1. **TIER 1 (VALIDATED NOW):** Physical BLDC motor dynamometer testbed with real-time APM MAVLink, ESP32, and Arduino DAQ.
2. **TIER 2 (SIMULATED PROXY):** Aero-engine proxy signals (CHT, EGT, oil pressure, fuel flow) and multi-factor Paris-Erdogan degradation scenarios.
3. **TIER 3 (FUTURE TARGET):** Indigenous MALE-UAV heavy-fuel aero-piston propulsion integration (e.g. Rotax 914 Turbo / Austro AE300 / DRDO TAPAS class).

---

## 2. Hardware Migration Architecture

```
CURRENT BENCH RIG                           FUTURE MALE-UAV PROPULSION
=================                           ==========================
BLDC Motor (2216 / 4S)           ===>       Turbocharged Aero-Piston Engine (Rotax 914 / AE300)
Optical/Hall RPM Tachometer      ===>       Crankshaft Magnetic Reluctor / Hall Sensor (60-2 Wheel)
Winding Thermistor (NTC)         ===>       Cylinder Head Temperature (CHT) Thermocouples (Type K)
ESC Inverter Current (INA219)    ===>       Fuel Flow Transducer (Floscan / Red Cube Differential)
3-Axis IMU (MPU6050)             ===>       High-Temp Piezoelectric Crankcase Accelerometer (IEPE)
Benchtop Power Supply / LiPo     ===>       Dual Alternator + 28V Aviation DC Bus
APM / Pixhawk Flight Controller  ===>       Triple Redundant Flight Management & FADEC Bus (CANaerospace)
```

---

## 3. Software Architecture Transition
1. **Hardware Abstraction Layer (HAL):** Replace `bldc_physics.py` with `aero_piston_thermodynamics.py` implementing Otto/Diesel indicated mean effective pressure (IMEP) and volumetric efficiency tables.
2. **MAVLink Data Mapping:** Switch from `ESC_TELEMETRY` packets to `EFI_STATUS` and `ENGINE_STATUS` MAVLink v2 messages natively supported in ArduPilot Plane FADEC interfaces.
3. **Model Retraining:** Re-fit Random Forest and Gradient Boosting RUL models using engine dynamometer run-to-overhaul data logs.
