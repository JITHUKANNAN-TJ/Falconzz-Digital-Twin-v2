import math
from typing import Tuple
from backend.telemetry.schema import CanonicalTelemetry, DigitalTwinExpected, ResidualMetrics
from backend.digital_twin.bldc_physics import bldc_twin
from backend.digital_twin.thermal_model import thermal_model
from backend.digital_twin.vibration_model import vibration_model

class ResidualEngine:
    """
    Computes differences between actual sensor measurements and physics-informed Digital Twin predictions:
    Residual = Actual - Expected
    Also standardizes normalized residuals for AI/ML inference.
    """
    def __init__(self):
        # Nominal standard deviations for normalization (Z-score scaling)
        self.sigma_rpm = 120.0
        self.sigma_current = 0.8
        self.sigma_temp = 2.5
        self.sigma_vib = 0.08
        self.sigma_eff = 4.0

    def compute_twin_and_residuals(self, telemetry: CanonicalTelemetry) -> Tuple[DigitalTwinExpected, ResidualMetrics]:
        # 1. Physics expected electro-mechanical values
        expected_elec = bldc_twin.compute_expected_state(
            throttle_pct=telemetry.throttle_pct,
            voltage_v=telemetry.voltage_v,
            load_pct=telemetry.load_pct
        )
        
        # 2. Thermal ODE expected value
        expected_temp = thermal_model.step(
            current_a=expected_elec["expected_current_a"],
            rpm=expected_elec["expected_rpm"],
            ambient_temp_c=telemetry.ambient_temperature_c,
            timestamp=telemetry.timestamp
        )
        
        # 3. Vibration model expected value
        expected_vib = vibration_model.compute_expected_vibration(
            rpm=expected_elec["expected_rpm"],
            load_pct=telemetry.load_pct
        )

        dt_expected = DigitalTwinExpected(
            timestamp=telemetry.timestamp,
            expected_rpm=expected_elec["expected_rpm"],
            expected_voltage_v=expected_elec["expected_voltage_v"],
            expected_current_a=expected_elec["expected_current_a"],
            expected_power_elec_w=expected_elec["expected_power_elec_w"],
            expected_power_mech_w=expected_elec["expected_power_mech_w"],
            expected_efficiency_pct=expected_elec["expected_efficiency_pct"],
            expected_temperature_c=expected_temp,
            expected_vibration_rms_g=expected_vib
        )

        # 4. Raw Residuals
        res_rpm = telemetry.rpm - dt_expected.expected_rpm
        res_current = telemetry.current_a - dt_expected.expected_current_a
        res_voltage = telemetry.voltage_v - dt_expected.expected_voltage_v
        res_power = telemetry.power_elec_w - dt_expected.expected_power_elec_w
        res_temp = telemetry.temperature_c - dt_expected.expected_temperature_c
        res_vib = telemetry.vibration_rms_g - dt_expected.expected_vibration_rms_g
        res_eff = telemetry.efficiency_pct - dt_expected.expected_efficiency_pct

        # 5. Normalized Z-score Residuals
        norm_rpm = res_rpm / max(1.0, self.sigma_rpm)
        norm_current = res_current / max(0.1, self.sigma_current)
        norm_temp = res_temp / max(0.5, self.sigma_temp)
        norm_vib = res_vib / max(0.01, self.sigma_vib)
        norm_eff = res_eff / max(0.5, self.sigma_eff)

        # Composite score (Euclidean distance in normalized deviation space)
        composite = math.sqrt(
            0.2 * (norm_rpm ** 2) +
            0.2 * (norm_current ** 2) +
            0.25 * (norm_temp ** 2) +
            0.25 * (norm_vib ** 2) +
            0.1 * (norm_eff ** 2)
        )

        residuals = ResidualMetrics(
            timestamp=telemetry.timestamp,
            residual_rpm=round(res_rpm, 1),
            residual_current_a=round(res_current, 2),
            residual_voltage_v=round(res_voltage, 2),
            residual_power_w=round(res_power, 2),
            residual_temperature_c=round(res_temp, 2),
            residual_vibration_g=round(res_vib, 3),
            residual_efficiency_pct=round(res_eff, 2),
            norm_residual_rpm=round(norm_rpm, 2),
            norm_residual_current=round(norm_current, 2),
            norm_residual_temp=round(norm_temp, 2),
            norm_residual_vibration=round(norm_vib, 2),
            norm_residual_efficiency=round(norm_eff, 2),
            composite_residual_score=round(composite, 2)
        )

        return dt_expected, residuals

residual_engine = ResidualEngine()
