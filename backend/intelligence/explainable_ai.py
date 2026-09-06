from typing import Dict, Any, Tuple
from backend.telemetry.schema import CanonicalTelemetry, ResidualMetrics, DigitalTwinExpected

class ExplainableAIEngine:
    """
    Explainable AI (XAI) engine answering:
    - WHAT happened?
    - WHY did it happen?
    - HOW SEVERE is it?
    - WHAT SHOULD BE DONE NEXT?
    Generates actionable Maintenance Advisories and Feature Importance attributions.
    """
    def generate_explanation_and_advisory(self,
                                         telemetry: CanonicalTelemetry,
                                         twin: DigitalTwinExpected,
                                         residuals: ResidualMetrics,
                                         health_index: float,
                                         predicted_fault: str,
                                         fault_severity: str,
                                         is_anomaly: bool) -> Dict[str, Any]:
        contributions: Dict[str, float] = {}
        
        # Calculate feature attribution contributions from normalized residuals
        contributions["Vibration Deviation"] = round(max(0.0, abs(residuals.norm_residual_vibration) * 28.0), 1)
        contributions["Thermal Deviation"] = round(max(0.0, abs(residuals.norm_residual_temp) * 26.0), 1)
        contributions["Current Draw Deviation"] = round(max(0.0, abs(residuals.norm_residual_current) * 20.0), 1)
        contributions["RPM Deviation"] = round(max(0.0, abs(residuals.norm_residual_rpm) * 14.0), 1)
        contributions["Efficiency Loss"] = round(max(0.0, abs(residuals.norm_residual_efficiency) * 12.0), 1)
        
        # Sort contributions
        sorted_contribs = sorted(contributions.items(), key=lambda x: x[1], reverse=True)
        top_driver = sorted_contribs[0][0] if sorted_contribs else "Nominal physics"
        top_val = sorted_contribs[0][1] if sorted_contribs else 0.0

        if health_index >= 90.0 and not is_anomaly:
            what = "Propulsion system operating within nominal physics baseline."
            why = f"All sensor residuals ({residuals.residual_rpm:+.0f} RPM, {residuals.residual_temperature_c:+.1f}°C, {residuals.residual_vibration_g:+.2f}g) remain within ±1.5σ."
            severity = "Nominal"
            action = "Continue scheduled flight profile. No corrective maintenance required."
            maint_urgency = "NONE"
            subsystem = "All Subsystems Nominal"
            maint_action = "Routine pre-flight visual inspection."
            risk_level = "Low"
            
        elif "Thermal" in predicted_fault or "Overheating" in predicted_fault or residuals.residual_temperature_c > 15.0:
            what = f"Thermal degradation detected: Winding temperature is {telemetry.temperature_c:.1f}°C vs expected {twin.expected_temperature_c:.1f}°C."
            why = f"Temperature residual is {residuals.residual_temperature_c:+.1f}°C ({residuals.norm_residual_temp:.1f}σ above Digital Twin expectation) driven by high thermal resistance or cooling restriction."
            severity = "Warning" if health_index >= 70.0 else "Critical"
            action = "Throttle back below 65% to reduce I²R winding dissipation; verify cooling shroud airflow."
            maint_urgency = "IMMEDIATE" if health_index < 50.0 else "SOON"
            subsystem = "Thermal Management / Stator Windings"
            maint_action = "Inspect motor stator insulation resistance and check cooling fan/duct obstructions."
            risk_level = "High" if health_index < 50.0 else "Moderate"
            
        elif "Bearing" in predicted_fault or residuals.residual_vibration_g > 0.3:
            what = f"Mechanical bearing degradation detected: Vibration at {telemetry.vibration_rms_g:.2f}g vs {twin.expected_vibration_rms_g:.2f}g baseline."
            why = f"Vibration residual is {residuals.residual_vibration_g:+.2f}g ({residuals.norm_residual_vibration:.1f}σ elevated), indicating raceway pitting or rotational unbalance."
            severity = "Warning" if health_index >= 70.0 else "Critical"
            action = "Limit maximum RPM to 4500 to minimize centrifugal stress; schedule bearing replacement."
            maint_urgency = "IMMEDIATE" if health_index < 50.0 else "SOON"
            subsystem = "Rotor Bearings & Shaft Assembly"
            maint_action = "Perform dial-indicator runout check, inspect bearing play, replace 608/MR105 bearings."
            risk_level = "High" if health_index < 50.0 else "Moderate"
            
        elif "Electrical" in predicted_fault or residuals.residual_current_a > 3.0:
            what = f"Electrical phase degradation detected: Current draw is {telemetry.current_a:.1f}A vs expected {twin.expected_current_a:.1f}A."
            why = f"Current residual is {residuals.residual_current_a:+.1f}A ({residuals.norm_residual_current:.1f}σ elevated), indicating inter-turn short or ESC MOSFET gate resistance increase."
            severity = "Critical" if health_index < 50.0 else "Warning"
            action = "Avoid peak throttle transitions; prepare for assisted diversion if current escalates."
            maint_urgency = "IMMEDIATE"
            subsystem = "Phase Windings / ESC Inverter"
            maint_action = "Perform milli-ohm phase balance measurement and ESC diagnostic telemetry check."
            risk_level = "High"
            
        elif "Sensor Drift" in predicted_fault or abs(residuals.residual_rpm) > 400.0:
            what = f"Sensor calibration anomaly: Measured RPM is {telemetry.rpm:.0f} vs expected {twin.expected_rpm:.0f} RPM."
            why = f"RPM residual is {residuals.residual_rpm:+.0f} RPM with electrical power remaining balanced, indicating optical/Hall sensor pulse jitter or magnetic ring slip."
            severity = "Warning"
            action = "Cross-validate RPM against back-EMF frequency estimator."
            maint_urgency = "ROUTINE"
            subsystem = "Optical/Hall RPM Telemetry Sensor"
            maint_action = "Clean optical sensor pickup lens and verify magnetic pole alignment gap."
            risk_level = "Moderate"
            
        else:  # Combined or High Load
            what = f"Compound multi-subsystem stress detected (Health: {health_index:.1f}%)."
            why = f"Top degradation contributors: {sorted_contribs[0][0]} ({sorted_contribs[0][1]}%) and {sorted_contribs[1][0]} ({sorted_contribs[1][1]}%)."
            severity = "Critical" if health_index < 40.0 else "Warning"
            action = "Reduce throttle load immediately; verify propulsion telemetry and safe landing readiness."
            maint_urgency = "IMMEDIATE" if health_index < 50.0 else "SOON"
            subsystem = "Integrated Propulsion Assembly"
            maint_action = "Comprehensive bench teardown: inspect winding resistance, bearing clearance, and ESC FETs."
            risk_level = "Critical" if health_index < 40.0 else "High"

        return {
            "xai_what": what,
            "xai_why": why,
            "xai_severity": severity,
            "xai_recommendation": action,
            "contributing_features": contributions,
            "maintenance_urgency": maint_urgency,
            "affected_subsystem": subsystem,
            "maintenance_action": maint_action,
            "maintenance_risk_level": risk_level
        }

xai_engine = ExplainableAIEngine()
