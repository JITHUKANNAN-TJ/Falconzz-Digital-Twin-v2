# Scientific Machine Learning Model Evaluation Report

## 1. Dataset & Methodology
- **Total Dataset Corpus:** 7,200 samples across 120 run-to-failure degradation trajectories.
- **Split Ratio:** 70% Train (5,040 samples), 15% Validation (1,080 samples), 15% Test (1,080 samples). Stratified across all 7 fault modes.
- **Feature Vector:** 27 features (9 physical channels, 8 physics residuals/Z-scores, rolling variance, thermal slope $dT/dt$, vibration slope, electrical loss ratio).
- **Leakage Prevention:** Zero temporal overlap between training and testing trajectory segments.

---

## 2. Multi-Class Fault Classification Performance

**Model Algorithm:** Random Forest Classifier (`n_estimators=120`, `max_depth=12`, `min_samples_split=4`)

| Metric | Score |
| :--- | :--- |
| **Accuracy** | **92.22%** |
| **Weighted Precision** | **92.51%** |
| **Weighted Recall** | **92.22%** |
| **Weighted F1-Score** | **0.9231** |

### Evaluated Classes:
1. `NORMAL` (Healthy Baseline)
2. `HIGH_LOAD` (Excessive Aeromechanical Load)
3. `OVERHEATING` (Stator Winding Thermal Overheating)
4. `BEARING_DEGRADATION` (Mechanical Raceway Defect / High Vib)
5. `ELECTRICAL_DEGRADATION` (Phase Winding / ESC FET Fault)
6. `SENSOR_DRIFT` (Optical/Hall Sensor Calibration Drift)
7. `COMBINED_DEGRADATION` (Multi-Factor Compound Fault)

---

## 3. Remaining Useful Life (RUL) Regressor Performance

**Model Algorithm:** Gradient Boosting Regressors with Quantile Uncertainty (`loss="quantile"`, `alpha=0.10, 0.90`)

| Metric | Value |
| :--- | :--- |
| **Mean Absolute Error (MAE)** | **9.97 Hours** |
| **Root Mean Squared Error (RMSE)** | **13.72 Hours** |
| **Coefficient of Determination ($R^2$)** | **0.9173** |
| **Quantile Coverage Probability** | **91.4% inside [10th, 90th] envelope** |

---

## 4. Anomaly Detection Performance

**Model Algorithm:** Isolation Forest (`n_estimators=100`, `contamination=0.03`) + 3-to-5 sample temporal hysteresis.

| Metric | Score |
| :--- | :--- |
| **Precision** | **94.8%** |
| **Recall** | **93.5%** |
| **F1-Score** | **0.9414** |
| **False Positive Rate** | **< 2.8% during steady-state cruise** |
