# Safety Architecture & Hardware Protection Governance

## 1. Dual-Layer Safety System
FALCONZ implements an independent two-tier safety architecture:
1. **Physical Hardware Protection:** In-line 35A DC fuse, physical mushroom Emergency Stop button, thermal heat-sinking, and polycarbonate safety shield.
2. **Deterministic Software Interlocks:** Watchdog timer (2.0s stale data timeout), hard limit envelope checkers, and automatic safe derate governor.

---

## 2. Safety State Machine
The system transitions deterministically between five states:

```
[ SAFE ] <-----> [ WARNING ] <-----> [ DEGRADED ] <-----> [ CRITICAL ] ----> [ EMERGENCY ]
   ↑                                                                               |
   +--------------------------- RESET COMMAND -------------------------------------+
```

- **SAFE:** All physical parameters within nominal operating bounds. Full throttle authority (0-100%).
- **WARNING:** Residuals exceed $2.2\sigma$ or anomaly hysteresis count $\ge 3$. Operator notified.
- **DEGRADED:** Temperature $> 75^\circ\text{C}$ or vibration $> 3.0\text{g}$. Throttle capped at 65%.
- **CRITICAL:** Hard limit breach (Over-RPM $> 7500$, Current $> 38\text{A}$, Temp $> 85^\circ\text{C}$). Automatic derate to $\le 25\%$ throttle.
- **EMERGENCY:** Hardware/Software E-Stop engaged. Throttle output forced immediately to $0.0\%$. Requires explicit operator reset.

---

## 3. Triple Control Modes
- **MANUAL:** Operator maintains direct control over throttle setting. Safety limits remain strictly enforced.
- **ASSISTED:** AI synthesizes safe throttle recommendations based on thermal state and health index; operator approves with single click.
- **AUTOMATIC:** Closed-loop governor automatically bounds commanded throttle within the safe operational envelope.
