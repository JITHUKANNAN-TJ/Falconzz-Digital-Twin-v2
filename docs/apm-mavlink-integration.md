# APM / ArduPilot MAVLink Telemetry Integration Guide

## 1. Overview
The FALCONZ platform integrates native MAVLink protocol ingestion using `pymavlink` to capture real-time telemetry from APM, Pixhawk, Cube, or SITL ArduPilot flight controllers connected to the physical BLDC testbed.

```
+------------------+       +-------------------------+       +------------------------+
| BLDC Motor & ESC | ----> | APM / ArduPilot FC     | ----> | FALCONZ MAVLink Adapter|
| (DShot / Telemetry)      | (MAVLink v2 Protocol)   |       | (Serial / UDP Ingress)  |
+------------------+       +-------------------------+       +------------------------+
                                                                         ↓
                                                              +------------------------+
                                                              | Canonical Telemetry    |
                                                              | Validation & Twin Flow |
                                                              +------------------------+
```

## 2. Ingested MAVLink Messages

| MAVLink Message | Field Ingested | Target Canonical Parameter |
| :--- | :--- | :--- |
| `ESC_TELEMETRY` | `rpm` | `rpm` (Revolutions per minute) |
| `ESC_TELEMETRY` | `voltage` (cV) | `voltage_v` (ESC Bus Voltage) |
| `ESC_TELEMETRY` | `current` (cA) | `current_a` (ESC Phase Current) |
| `ESC_TELEMETRY` | `temperature` | `temperature_c` (ESC/FET Temperature) |
| `SYS_STATUS` | `voltage_battery` (mV) | Battery bus voltage fallback |
| `SYS_STATUS` | `current_battery` (cA) | Battery total current draw |
| `VFR_HUD` | `throttle` (%) | `throttle_pct` (Commanded throttle) |
| `RAW_IMU` | `xacc`, `yacc`, `zacc` | `vibration_rms_g` (3-axis vibration magnitude) |
| `SCALED_PRESSURE` | `temperature` (cdegC)| `ambient_temperature_c` |
| `HEARTBEAT` | `base_mode`, `custom_mode` | `is_armed`, Autopilot state |

## 3. Communication Configurations
- **Serial USB:** Default baud rate `115200` (configurable to `57600` or `921600`). Port: `COM3` on Windows, `/dev/ttyUSB0` or `/dev/ttyACM0` on Linux.
- **UDP Network Stream:** Default `udpin:0.0.0.0:14550` (listening on standard GCS telemetry port).

## 4. Telemetry Mapping & Fallback Behavior
1. When valid MAVLink packets arrive, the source is badged as `APM_MAVLINK` and connection status is `CONNECTED`.
2. Telemetry age is tracked in milliseconds. If no packets arrive within 2.0 seconds, connection status transitions to `STALE`.
3. If disconnected or unpowered, FALCONZ seamlessly falls back to the high-fidelity Simulation Engine while clearly indicating `DATA SOURCE: SIMULATION`.
4. Channels not measured on the BLDC rig (such as CHT, EGT, oil pressure) remain strictly tagged as `UNAVAILABLE` or `FUTURE MALE-UAV` without silent fabrication.
