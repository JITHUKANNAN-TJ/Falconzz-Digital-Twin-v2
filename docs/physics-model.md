# Physics-Informed Digital Twin & Residual Engine Documentation

## 1. Electro-Mechanical Power Equations

The core BLDC physics twin computes the theoretical expected operating point:

### Applied Voltage
$$V_{applied} = V_{battery} \times \left( \frac{\text{Throttle}}{100} \right)$$

### No-Load Speed & Load Sag
$$\text{RPM}_{no\_load} = (V_{applied} - I_0 \cdot R_m) \times K_v$$
$$\text{RPM}_{expected} = \text{RPM}_{no\_load} \times \left( 1 - 0.18 \times \frac{\text{Load}}{100} \right)$$

### Aerodynamic Drag & Mechanical Torque
$$\tau_{load} = C_{prop} \times \text{RPM}^2 \times \left( 0.4 + 0.6 \times \frac{\text{Load}}{100} \right)$$
where $C_{prop} \approx 3.8 \times 10^{-9}$ for a 10x4.5 carbon propeller.

### Motor Current & Power
$$I_{expected} = I_0 + \frac{\tau_{load}}{K_t}, \quad \text{where } K_t = \frac{60}{2\pi K_v}$$
$$P_{elec} = V_{applied} \times I_{expected}$$
$$P_{mech} = \tau_{load} \times \omega = \tau_{load} \times \left( \frac{2\pi \times \text{RPM}}{60} \right)$$
$$\eta = \left( \frac{P_{mech}}{P_{elec}} \right) \times 100\%$$

---

## 2. Lumped-Parameter Thermal Model

Winding temperature dynamics are integrated using a first-order differential ODE:
$$C_{th} \frac{dT}{dt} = P_{loss} - \frac{T - T_{amb}}{R_{th}(RPM)}$$
where:
- $P_{loss} = I^2 R_m + P_{core}(RPM)$ (Ohmic copper loss + eddy/hysteresis iron loss).
- $R_{th}(RPM) = \frac{R_{th0}}{1 + 0.0003 \times RPM}$ (Convective cooling enhancement from propeller wash).
- $C_{th} = 45.0 \text{ J/K}$ (Thermal mass).

---

## 3. Baseline Vibration Model

Healthy rotational vibration is modeled as ISO 10816 1X rotational unbalance + aerodynamic turbulence:
$$\text{Vib}_{expected} = V_0 + K_{rpm} \left( \frac{\text{RPM}}{1000} \right)^{1.75} + K_{load} \left( \frac{\text{Load}}{100} \right)$$
where $V_0 = 0.04\text{g}$, $K_{rpm} = 0.010\text{g}$.

---

## 4. Physics Residual Engine

Raw residuals:
$$\Delta y = y_{actual} - y_{expected}$$

Normalized Z-score residuals:
$$z_i = \frac{\Delta y_i}{\sigma_i}$$
Composite residual distance:
$$D_{res} = \sqrt{\sum w_i z_i^2}$$
Residuals exceeding $2.2\sigma$ trigger temporal anomaly evaluation.
