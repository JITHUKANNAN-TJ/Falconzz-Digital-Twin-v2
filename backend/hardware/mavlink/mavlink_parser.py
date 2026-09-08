from typing import Dict, Any, Optional
import math

ARDUPILOT_FLIGHT_MODES = {
    0: "STABILIZE",
    1: "ACRO",
    2: "ALT_HOLD",
    3: "AUTO",
    4: "GUIDED",
    5: "LOITER",
    6: "RTL",
    7: "CIRCLE",
    9: "LAND",
    11: "DRIFT",
    13: "SPORT",
    14: "FLIP",
    15: "AUTOTUNE",
    16: "POSHOLD",
    17: "BRAKE",
    18: "THROW",
    19: "AVOID_ADSB",
    20: "GUIDED_NOGPS",
    21: "SMART_RTL",
    22: "FLOWHOLD",
    23: "FOLLOW",
    24: "ZIGZAG",
    25: "SYSTEMID",
    26: "AUTOROTATE",
    27: "AUTO_RTL"
}

class MAVLinkParser:
    """
    Parses ArduPilot / APM MAVLink messages including:
    - ESC_TELEMETRY: Real-time ESC RPM, Voltage, Current, Temperature
    - ATTITUDE: Roll, Pitch, Yaw, Roll/Pitch/Yaw angular velocities
    - VIBRATION: 3-axis vibration metrics and clipping counts
    - GLOBAL_POSITION_INT & GPS_RAW_INT: Lat, Lon, Altitude MSL/AGL, Groundspeed, Fix, Sats
    - SYS_STATUS & BATTERY_STATUS: Battery voltage, battery current, remaining %, consumed mAh
    - VFR_HUD: Commanded throttle %, Airspeed, Groundspeed, Heading, Altitude, Climb rate
    - SERVO_OUTPUT_RAW: Raw PWM values on motor channels (ch1-ch8)
    - RC_CHANNELS / RC_CHANNELS_RAW: Pilot transmitter stick inputs (ch1-ch8) & RSSI
    - RAW_IMU / SCALED_IMU / HIGHRES_IMU: Accelerometer, Gyroscope, Magnetometer
    - SCALED_PRESSURE: Ambient temperature, barometric pressure
    - STATUSTEXT: Flight controller advisory, arming, and diagnostic text
    - NAV_CONTROLLER_OUTPUT: Navigation roll, pitch, waypoint distance, cross-track error
    - HEARTBEAT: Autopilot type, decoded flight mode string, arm status
    """
    
    @staticmethod
    def parse_message(msg) -> Optional[Dict[str, Any]]:
        if msg is None:
            return None
            
        msg_type = msg.get_type()
        data: Dict[str, Any] = {"msg_type": msg_type}
        
        if msg_type in ("ESC_TELEMETRY", "ESC_TELEMETRY_1_TO_4", "ESC_TELEMETRY_5_TO_8"):
            # Direct ESC Telemetry (DShot / BLHeli_32 / DroneCAN ESCs)
            raw_rpm = getattr(msg, "rpm", 0)
            raw_voltage = getattr(msg, "voltage", 0)
            raw_current = getattr(msg, "current", 0)
            raw_temp = getattr(msg, "temperature", 0)
            
            data["instance"] = getattr(msg, "instance", 0)
            data["count"] = getattr(msg, "count", 1)
            
            # If arrays are returned (e.g. 4 ESCs in a single frame)
            if isinstance(raw_rpm, (list, tuple)):
                data["rpm_list"] = [float(x) for x in raw_rpm]
                data["voltage_list"] = [float(x) * 0.01 for x in raw_voltage] if isinstance(raw_voltage, (list, tuple)) else [float(raw_voltage) * 0.01]
                data["current_list"] = [float(x) * 0.01 for x in raw_current] if isinstance(raw_current, (list, tuple)) else [float(raw_current) * 0.01]
                data["temperature_list"] = [float(x) for x in raw_temp] if isinstance(raw_temp, (list, tuple)) else [float(raw_temp)]
                data["rpm"] = data["rpm_list"][0] if len(data["rpm_list"]) > 0 else 0.0
                data["voltage_v"] = data["voltage_list"][0] if len(data["voltage_list"]) > 0 else 0.0
                data["current_a"] = data["current_list"][0] if len(data["current_list"]) > 0 else 0.0
                data["temperature_c"] = data["temperature_list"][0] if len(data["temperature_list"]) > 0 else 25.0
            else:
                data["rpm"] = float(raw_rpm)
                data["voltage_v"] = float(raw_voltage) * 0.01
                data["current_a"] = float(raw_current) * 0.01
                data["temperature_c"] = float(raw_temp)

        elif msg_type == "ATTITUDE":
            # Roll, Pitch, Yaw in radians converted to degrees
            roll_rad = float(getattr(msg, "roll", 0.0))
            pitch_rad = float(getattr(msg, "pitch", 0.0))
            yaw_rad = float(getattr(msg, "yaw", 0.0))
            
            data["roll_rad"] = roll_rad
            data["pitch_rad"] = pitch_rad
            data["yaw_rad"] = yaw_rad
            data["roll_deg"] = round(math.degrees(roll_rad), 2)
            data["pitch_deg"] = round(math.degrees(pitch_rad), 2)
            data["yaw_deg"] = round(math.degrees(yaw_rad) % 360.0, 2)
            
            data["rollspeed_deg_s"] = round(math.degrees(float(getattr(msg, "rollspeed", 0.0))), 2)
            data["pitchspeed_deg_s"] = round(math.degrees(float(getattr(msg, "pitchspeed", 0.0))), 2)
            data["yawspeed_deg_s"] = round(math.degrees(float(getattr(msg, "yawspeed", 0.0))), 2)

        elif msg_type == "VIBRATION":
            vx = float(getattr(msg, "vibration_x", 0.0))
            vy = float(getattr(msg, "vibration_y", 0.0))
            vz = float(getattr(msg, "vibration_z", 0.0))
            # APM sends vibration in m/s^2. Convert to Gs (1G = 9.80665 m/s^2)
            data["vibration_x_g"] = round(vx / 9.80665, 3)
            data["vibration_y_g"] = round(vy / 9.80665, 3)
            data["vibration_z_g"] = round(vz / 9.80665, 3)
            data["vibration_rms_g"] = round(math.sqrt(vx**2 + vy**2 + vz**2) / 9.80665, 3)
            data["clipping_0"] = int(getattr(msg, "clipping_0", 0))
            data["clipping_1"] = int(getattr(msg, "clipping_1", 0))
            data["clipping_2"] = int(getattr(msg, "clipping_2", 0))
            
        elif msg_type == "SYS_STATUS":
            raw_v = float(getattr(msg, "voltage_battery", 0))
            raw_c = float(getattr(msg, "current_battery", -1))
            raw_rem = float(getattr(msg, "battery_remaining", -1))
            
            # 0 or 65535 indicates voltage monitor not installed/inactive in APM
            data["voltage_battery_v"] = (raw_v / 1000.0) if (raw_v > 500 and raw_v < 65000) else None
            # -1 indicates current monitor not installed/inactive in APM
            data["current_battery_a"] = (raw_c / 100.0) if (raw_c >= 0 and raw_c < 30000) else None
            # -1 indicates remaining % not calculated
            data["battery_remaining_pct"] = raw_rem if (raw_rem >= 0 and raw_rem <= 100) else None
            data["drop_rate_comm"] = float(getattr(msg, "drop_rate_comm", 0)) / 100.0
            data["errors_comm"] = int(getattr(msg, "errors_comm", 0))
            
        elif msg_type == "BATTERY_STATUS":
            raw_v = getattr(msg, "voltages", [0])
            if isinstance(raw_v, (list, tuple)) and len(raw_v) > 0:
                cell_volts = [round(float(x) / 1000.0, 2) for x in raw_v if x > 500 and x < 65000]
                data["cell_voltages"] = cell_volts
                data["voltage_battery_v"] = sum(cell_volts) if cell_volts else None
            else:
                raw_single = float(getattr(msg, "voltage", 0))
                data["voltage_battery_v"] = (raw_single / 1000.0) if (raw_single > 500 and raw_single < 65000) else None
                
            raw_c = float(getattr(msg, "current_battery", -1))
            data["current_battery_a"] = (raw_c / 100.0) if (raw_c >= 0 and raw_c < 30000) else None
            raw_rem = float(getattr(msg, "battery_remaining", -1))
            data["battery_remaining_pct"] = raw_rem if (raw_rem >= 0 and raw_rem <= 100) else None
            raw_temp = getattr(msg, "temperature", 0)
            data["battery_temp_c"] = float(raw_temp) / 100.0 if raw_temp != 0 and raw_temp < 32767 else None
            data["current_consumed_mah"] = float(getattr(msg, "current_consumed", 0)) if getattr(msg, "current_consumed", 0) >= 0 else None
            
        elif msg_type == "VFR_HUD":
            data["throttle_pct"] = float(getattr(msg, "throttle", 0))
            data["alt_m"] = float(getattr(msg, "alt", 0))
            data["groundspeed_mps"] = float(getattr(msg, "groundspeed", 0))
            data["airspeed_mps"] = float(getattr(msg, "airspeed", 0))
            data["heading_deg"] = float(getattr(msg, "heading", 0))
            data["climb_mps"] = float(getattr(msg, "climb", 0))

        elif msg_type == "GLOBAL_POSITION_INT":
            data["latitude"] = float(getattr(msg, "lat", 0)) / 1e7
            data["longitude"] = float(getattr(msg, "lon", 0)) / 1e7
            data["alt_m"] = float(getattr(msg, "alt", 0)) / 1000.0  # MSL
            data["relative_alt_m"] = float(getattr(msg, "relative_alt", 0)) / 1000.0  # AGL
            data["vx_mps"] = float(getattr(msg, "vx", 0)) / 100.0
            data["vy_mps"] = float(getattr(msg, "vy", 0)) / 100.0
            data["vz_mps"] = float(getattr(msg, "vz", 0)) / 100.0
            data["heading_deg"] = float(getattr(msg, "hdg", 0)) / 100.0
            data["groundspeed_mps"] = round(math.sqrt(data["vx_mps"]**2 + data["vy_mps"]**2), 2)
            data["climb_mps"] = -data["vz_mps"]  # vz positive is downward

        elif msg_type == "GPS_RAW_INT":
            data["fix_type"] = int(getattr(msg, "fix_type", 0))
            data["satellites_visible"] = int(getattr(msg, "satellites_visible", 0))
            data["latitude"] = float(getattr(msg, "lat", 0)) / 1e7
            data["longitude"] = float(getattr(msg, "lon", 0)) / 1e7
            data["alt_m"] = float(getattr(msg, "alt", 0)) / 1000.0
            data["eph_hdop"] = float(getattr(msg, "eph", 0)) / 100.0
            data["epv_vdop"] = float(getattr(msg, "epv", 0)) / 100.0
            data["vel_mps"] = float(getattr(msg, "vel", 0)) / 100.0
            data["cog_deg"] = float(getattr(msg, "cog", 0)) / 100.0
            
        elif msg_type == "SERVO_OUTPUT_RAW":
            # Map servo PWM outputs to throttle % (1000us = 0%, 2000us = 100%) for all 8 channels
            servos = {}
            for ch in range(1, 9):
                pwm = float(getattr(msg, f"servo{ch}_raw", 1000))
                servos[f"servo{ch}_raw"] = pwm
                servos[f"throttle_ch{ch}"] = max(0.0, min(100.0, (pwm - 1000.0) / 10.0))
            data.update(servos)
            data["motor_pwm"] = servos["servo1_raw"]
            data["throttle_from_pwm"] = servos["throttle_ch1"]

        elif msg_type in ("RC_CHANNELS", "RC_CHANNELS_RAW"):
            rc_dict = {}
            for ch in range(1, 9):
                key = f"chan{ch}_raw"
                if hasattr(msg, key):
                    rc_dict[f"rc_ch{ch}"] = float(getattr(msg, key, 1500))
            data["rc_channels"] = rc_dict
            data["rc_roll"] = rc_dict.get("rc_ch1", 1500)
            data["rc_pitch"] = rc_dict.get("rc_ch2", 1500)
            data["rc_throttle"] = rc_dict.get("rc_ch3", 1000)
            data["rc_yaw"] = rc_dict.get("rc_ch4", 1500)
            data["rssi"] = float(getattr(msg, "rssi", 255))
            
        elif msg_type in ("RAW_IMU", "SCALED_IMU", "HIGHRES_IMU"):
            xacc = float(getattr(msg, "xacc", 0))
            yacc = float(getattr(msg, "yacc", 0))
            zacc = float(getattr(msg, "zacc", 0))
            data["xacc_g"] = xacc / 1000.0
            data["yacc_g"] = yacc / 1000.0
            data["zacc_g"] = zacc / 1000.0
            tot_acc = math.sqrt(xacc**2 + yacc**2 + zacc**2)
            data["vibration_rms_g"] = round(abs(tot_acc - 1000.0) / 1000.0, 3)
            data["xgyro_deg_s"] = float(getattr(msg, "xgyro", 0)) * 0.001
            data["ygyro_deg_s"] = float(getattr(msg, "ygyro", 0)) * 0.001
            data["zgyro_deg_s"] = float(getattr(msg, "zgyro", 0)) * 0.001
            if hasattr(msg, "xmag"):
                data["xmag"] = float(getattr(msg, "xmag", 0))
                data["ymag"] = float(getattr(msg, "ymag", 0))
                data["zmag"] = float(getattr(msg, "zmag", 0))
            
        elif msg_type in ("SCALED_PRESSURE", "SCALED_PRESSURE2"):
            data["ambient_temp_c"] = float(getattr(msg, "temperature", 2500)) / 100.0  # cdegC to degC
            data["press_abs_hpa"] = float(getattr(msg, "press_abs", 1013.25))
            
        elif msg_type == "STATUSTEXT":
            data["severity"] = getattr(msg, "severity", 6)
            text_raw = getattr(msg, "text", "")
            if isinstance(text_raw, bytes):
                text_raw = text_raw.decode('utf-8', errors='ignore')
            data["text"] = str(text_raw).strip('\x00').strip()

        elif msg_type == "NAV_CONTROLLER_OUTPUT":
            data["nav_roll_deg"] = float(getattr(msg, "nav_roll", 0))
            data["nav_pitch_deg"] = float(getattr(msg, "nav_pitch", 0))
            data["nav_bearing_deg"] = float(getattr(msg, "nav_bearing", 0))
            data["target_bearing_deg"] = float(getattr(msg, "target_bearing", 0))
            data["wp_dist_m"] = float(getattr(msg, "wp_dist", 0))
            data["alt_error_m"] = float(getattr(msg, "alt_error", 0))
            data["aspd_error_mps"] = float(getattr(msg, "aspd_error", 0))
            data["xtrack_error_m"] = float(getattr(msg, "xtrack_error", 0))

        elif msg_type == "HEARTBEAT":
            custom_mode = getattr(msg, "custom_mode", 0)
            base_mode = getattr(msg, "base_mode", 0)
            data["custom_mode"] = custom_mode
            data["base_mode"] = base_mode
            data["system_status"] = getattr(msg, "system_status", 0)
            data["autopilot"] = getattr(msg, "autopilot", 3)  # 3 = ArduPilot
            data["mavtype"] = getattr(msg, "type", 2)  # 2 = Quadrotor
            data["is_armed"] = bool(base_mode & 128)
            data["flight_mode"] = ARDUPILOT_FLIGHT_MODES.get(custom_mode, f"MODE_{custom_mode}")
            
        elif msg_type in ("RADIO", "RADIO_STATUS"):
            data["rssi"] = float(getattr(msg, "rssi", 0))
            data["remrssi"] = float(getattr(msg, "remrssi", 0))
            data["txbuf"] = float(getattr(msg, "txbuf", 100))
            data["noise"] = float(getattr(msg, "noise", 0))
            data["remnoise"] = float(getattr(msg, "remnoise", 0))
            data["rxerrors"] = int(getattr(msg, "rxerrors", 0))
            data["fixed"] = int(getattr(msg, "fixed", 0))
            
        else:
            return None
            
        return data


mavlink_parser = MAVLinkParser()
