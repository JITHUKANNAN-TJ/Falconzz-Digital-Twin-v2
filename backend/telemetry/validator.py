import math
from typing import Tuple, List
from backend.telemetry.schema import CanonicalTelemetry, TelemetrySource, ConnectionStatus
from backend.config import settings

class TelemetryValidator:
    def __init__(self):
        self.last_timestamp: float = 0.0
        self.last_valid_packet: CanonicalTelemetry = None
        self.stale_timeout: float = settings.WATCHDOG_TIMEOUT_SEC
        
    def validate_and_enrich(self, raw_data: dict, source_type: TelemetrySource) -> CanonicalTelemetry:
        """
        Validates raw telemetry dictionary, rejects corrupt values, detects spikes,
        enriches derived physics parameters (power, omega, efficiency), and marks invalid if corrupted.
        """
        flags: List[str] = []
        is_valid = True
        
        # 1. Timestamp validation
        ts = raw_data.get("timestamp", 0.0)
        if ts <= 0:
            import time
            ts = time.time()
            flags.append("TIMESTAMP_SYNTHESIZED")
            
        # 2. Sensor value extraction with physical boundary checks
        throttle = float(raw_data.get("throttle_pct", 0.0))
        if not (0.0 <= throttle <= 100.0):
            flags.append("THROTTLE_OUT_OF_RANGE")
            throttle = max(0.0, min(100.0, throttle))
            
        rpm = float(raw_data.get("rpm", 0.0))
        if rpm < 0.0 or rpm > 15000.0 or math.isnan(rpm):
            flags.append("RPM_PHYSICALLY_IMPOSSIBLE")
            is_valid = False
            rpm = 0.0
            
        voltage = float(raw_data.get("voltage_v", 0.0))
        if voltage < 0.0 or voltage > 60.0 or math.isnan(voltage):
            flags.append("VOLTAGE_OUT_OF_RANGE")
            is_valid = False
            voltage = 0.0
            
        current = float(raw_data.get("current_a", 0.0))
        if current < 0.0 or current > 100.0 or math.isnan(current):
            flags.append("CURRENT_OUT_OF_RANGE")
            is_valid = False
            current = 0.0
            
        temp = float(raw_data.get("temperature_c", 25.0))
        if temp < -40.0 or temp > 150.0 or math.isnan(temp):
            flags.append("TEMPERATURE_SENSOR_CORRUPT")
            is_valid = False
            temp = 25.0
            
        vib = float(raw_data.get("vibration_rms_g", 0.0))
        if vib < 0.0 or vib > 50.0 or math.isnan(vib):
            flags.append("VIBRATION_SPIKE_INVALID")
            is_valid = False
            vib = 0.0
            
        load = float(raw_data.get("load_pct", 0.0))
        load = max(0.0, min(100.0, load))
        
        amb_temp = float(raw_data.get("ambient_temperature_c", settings.DEFAULT_AMBIENT_TEMP_C))
        
        # 3. Physics Derivations: Electrical Power, Mechanical Power, Efficiency
        v_applied = voltage * (throttle / 100.0) if throttle > 0 else 0.0
        power_elec = v_applied * current
        
        # Torque estimation or direct measurement
        torque = float(raw_data.get("torque_nm", 0.0))
        if torque <= 0.0 and rpm > 50.0:
            # Physics torque estimate: tau = (I - I0) * Kt
            kt = 60.0 / (2.0 * math.pi * settings.MOTOR_KV)
            net_i = max(0.0, current - settings.MOTOR_NO_LOAD_CURRENT_A)
            torque = net_i * kt
            
        omega = 2.0 * math.pi * rpm / 60.0
        power_mech = torque * omega
        
        # Efficiency
        if power_elec > 5.0:
            eff = min(98.0, max(0.0, (power_mech / power_elec) * 100.0))
        else:
            eff = 0.0
            
        # 4. Create CanonicalTelemetry
        conn_status = raw_data.get("connection_status")
        if not conn_status:
            conn_status = ConnectionStatus.CONNECTED if source_type != TelemetrySource.SIMULATION else ConnectionStatus.SIMULATED
            
        motors_map = raw_data.get("motors", {})
        connected_count = raw_data.get("connected_motors_count")
        conn_motors = [
            m for m in motors_map.values()
            if (m.get("is_connected") if isinstance(m, dict) else getattr(m, "is_connected", False))
        ]
        if connected_count is None:
            connected_count = len(conn_motors)
            
        tot_curr = raw_data.get("total_current_a")
        if tot_curr is None and conn_motors:
            tot_curr = sum([float(m.get("current_a", 0.0) if isinstance(m, dict) else getattr(m, "current_a", 0.0) or 0.0) for m in conn_motors])
            
        tot_pwr = raw_data.get("total_power_w")
        if tot_pwr is None and conn_motors:
            tot_pwr = sum([float(m.get("power_w", 0.0) if isinstance(m, dict) else getattr(m, "power_w", 0.0) or 0.0) for m in conn_motors])
            
        tot_thrust = raw_data.get("total_thrust_g")
        if tot_thrust is None and conn_motors:
            tot_thrust = sum([float(m.get("thrust_g", 0.0) if isinstance(m, dict) else getattr(m, "thrust_g", 0.0) or 0.0) for m in conn_motors])
            
        avg_rpm_calc = raw_data.get("avg_rpm")
        if avg_rpm_calc is None and conn_motors:
            avg_rpm_calc = sum([float(m.get("live_rpm", 0.0) if isinstance(m, dict) else getattr(m, "live_rpm", 0.0) or 0.0) for m in conn_motors]) / len(conn_motors)

        telemetry = CanonicalTelemetry(
            timestamp=ts,
            source_type=source_type,
            connection_status=conn_status,
            connection_id=raw_data.get("connection_id", "USB_SERIAL"),
            motors=motors_map,
            total_current_a=tot_curr,
            total_power_w=tot_pwr,
            total_thrust_g=tot_thrust,
            avg_efficiency_pct=raw_data.get("avg_efficiency_pct"),
            avg_g_per_watt=raw_data.get("avg_g_per_watt"),
            avg_rpm=avg_rpm_calc,
            connected_motors_count=connected_count,
            total_motors_count=raw_data.get("total_motors_count", 4),
            rpm_imbalance_pct=raw_data.get("rpm_imbalance_pct"),
            current_imbalance_pct=raw_data.get("current_imbalance_pct"),
            temp_imbalance_c=raw_data.get("temp_imbalance_c"),
            vibration_imbalance_g=raw_data.get("vibration_imbalance_g", 0.0),
            battery_voltage_v=raw_data.get("battery_voltage_v"),
            battery_current_a=raw_data.get("battery_current_a"),
            battery_remaining_pct=raw_data.get("battery_remaining_pct"),
            battery_consumed_mah=raw_data.get("battery_consumed_mah"),
            battery_temp_c=raw_data.get("battery_temp_c"),
            cell_voltages=raw_data.get("cell_voltages", []),
            roll_deg=raw_data.get("roll_deg", 0.0),
            pitch_deg=raw_data.get("pitch_deg", 0.0),
            yaw_deg=raw_data.get("yaw_deg", 0.0),
            rollspeed_deg_s=raw_data.get("rollspeed_deg_s", 0.0),
            pitchspeed_deg_s=raw_data.get("pitchspeed_deg_s", 0.0),
            yawspeed_deg_s=raw_data.get("yawspeed_deg_s", 0.0),
            vibration_x_g=raw_data.get("vibration_x_g", 0.0),
            vibration_y_g=raw_data.get("vibration_y_g", 0.0),
            vibration_z_g=raw_data.get("vibration_z_g", 0.0),
            clipping_0=raw_data.get("clipping_0", 0),
            clipping_1=raw_data.get("clipping_1", 0),
            clipping_2=raw_data.get("clipping_2", 0),
            latitude=raw_data.get("latitude"),
            longitude=raw_data.get("longitude"),
            relative_altitude_m=raw_data.get("relative_altitude_m", 0.0),
            climb_rate_mps=raw_data.get("climb_rate_mps", 0.0),
            heading_deg=raw_data.get("heading_deg", 0.0),
            satellites_visible=raw_data.get("satellites_visible", 0),
            gps_fix_type=raw_data.get("gps_fix_type", 0),
            flight_mode=raw_data.get("flight_mode", "STABILIZE"),
            is_armed=raw_data.get("is_armed", False),
            rc_throttle=raw_data.get("rc_throttle", 1000.0),
            rc_roll=raw_data.get("rc_roll", 1500.0),
            rc_pitch=raw_data.get("rc_pitch", 1500.0),
            rc_yaw=raw_data.get("rc_yaw", 1500.0),
            rc_rssi=raw_data.get("rc_rssi", 255.0),
            rc_channels=raw_data.get("rc_channels", {}),
            statustext_log=raw_data.get("statustext_log", []),
            telemetry_age_ms=raw_data.get("telemetry_age_ms"),
            packet_rate_hz=raw_data.get("packet_rate_hz", 0.0),
            packet_loss_count=raw_data.get("packet_loss_count", 0),
            heartbeat_received=raw_data.get("heartbeat_received", False),
            radio_rssi=raw_data.get("radio_rssi"),
            radio_remrssi=raw_data.get("radio_remrssi"),
            radio_noise=raw_data.get("radio_noise"),
            radio_remnoise=raw_data.get("radio_remnoise"),
            radio_txbuf=raw_data.get("radio_txbuf"),
            throttle_pct=round(throttle, 2),
            rpm=round(rpm, 1),
            voltage_v=round(voltage, 2),
            current_a=round(current, 2),
            power_elec_w=round(power_elec, 2),
            torque_nm=round(torque, 4),
            power_mech_w=round(power_mech, 2),
            efficiency_pct=round(eff, 2),
            temperature_c=round(temp, 2),
            vibration_rms_g=round(vib, 3),
            load_pct=round(load, 2),
            ambient_temperature_c=round(amb_temp, 2),
            altitude_m=raw_data.get("altitude_m", 0.0),
            airspeed_mps=raw_data.get("airspeed_mps", 0.0),
            cht_c=raw_data.get("cht_c"),
            egt_c=raw_data.get("egt_c"),
            oil_pressure_psi=raw_data.get("oil_pressure_psi"),
            oil_temperature_c=raw_data.get("oil_temperature_c"),
            fuel_flow_gph=raw_data.get("fuel_flow_gph"),
            alternator_current_a=raw_data.get("alternator_current_a"),
            manifold_pressure_inhg=raw_data.get("manifold_pressure_inhg"),
            message_discovery=raw_data.get("message_discovery", {}),
            is_valid=is_valid,
            validation_flags=flags,
            raw_packet=raw_data
        )
        
        self.last_timestamp = ts
        if is_valid:
            self.last_valid_packet = telemetry
            
        return telemetry

validator = TelemetryValidator()
