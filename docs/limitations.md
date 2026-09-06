# System Boundaries, Assumptions & Limitations

## 1. Laboratory Validation Platform Boundary
- **Current Physical Testbed:** The current physical hardware rig utilizes a brushless DC (BLDC) motor (2216 / 880Kv class) instrumented with optical RPM, INA219 current/voltage, DS18B20 temperature, and MPU6050 accelerometer sensors.
- **Scientific Integrity:** Measurements taken on the BLDC testbed are **not** equivalent to real heavy-fuel aero-piston engine measurements. All aero-piston specific parameters (CHT, EGT, oil pressure, fuel flow) are simulated proxies and clearly tagged with `PROXY / SIMULATED` or `FUTURE MALE-UAV` badges.

---

## 2. Prognostic & RUL Uncertainty
- **Synthetic Ground Truth:** Run-to-failure degradation trajectories for ML model training are generated using calibrated Paris-Erdogan wear and Arrhenius thermal loss formulations.
- **Certification Scope:** RUL estimates are prototype-level decision support indicators with 90% confidence uncertainty envelopes and are not civil or military aviation flight-certified.

---

## 3. Control Authority & Safety Envelopes
- **Safety Precedence:** AI prognostic models have zero write-authority to bypass hard safety limits. Automatic derate actions only reduce commanded throttle within pre-set safety boundaries.
- **Physical Testbed Limits:** The maximum tested operating limits on the bench are 7500 RPM, 38A continuous current, and 85°C stator temperature.
