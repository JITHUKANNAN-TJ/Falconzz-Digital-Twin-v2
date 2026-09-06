from typing import Dict, Any, Optional

class MAVLinkParser:
    """
    Parses ArduPilot / APM MAVLink messages including:
    - ESC_TELEMETRY: Real-time ESC RPM, Voltage, Current, Temperature
    - SYS_STATUS: Battery voltage, battery current, battery remaining
    - VFR_HUD: Throttle %, Heading, Groundspeed, Altitude
    - SERVO_OUTPUT_RAW: Raw PWM values on motor channels (ch1-ch8)
    - RAW_IMU: Accelerometer / Gyro vibration harmonics (xacc, yacc, zacc)
    - SCALED_PRESSURE: Ambient temperature, barometric pressure
    - HEARTBEAT: Autopilot type, flight mode, arm status
    """
    
    @staticmethod
    def parse_message(msg) -> Optional[Dict[str, Any]]:
        if msg is None:
            return None
            
        msg_type = msg.get_type()
        data: Dict[str, Any] = {"msg_type": msg_type}
        
        if msg_type == "ESC_TELEMETRY" or msg_type == "ESC_TELEMETRY_1_TO_4" or msg_type == "ESC_TELEMETRY_5_TO_8":
            # Direct ESC Telemetry (DShot / BLHeli_32 / DroneCAN ESCs)
            raw_rpm = getattr(msg, "rpm", 0)
            raw_voltage = getattr(msg, "voltage", 0)
            raw_current = getattr(msg, "current", 0)
            raw_temp = getattr(msg, "temperature", 0)
            
            data["instance"] = getattr(msg, "instance", 0)
            data["count"] = getattr(msg, "count", 1)
            
            # If arrays are returned (e.g. 4 ESCs in a single frame)
            if isinstance(raw_rpm, list) or isinstance(raw_rpm, tuple):
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
            
        elif msg_type == "SYS_STATUS":
            data["voltage_battery_v"] = float(getattr(msg, "voltage_battery", 0)) / 1000.0  # mV to V
            data["current_battery_a"] = float(getattr(msg, "current_battery", 0)) / 100.0   # cA to A
            data["battery_remaining_pct"] = float(getattr(msg, "battery_remaining", 0))
            data["drop_rate_comm"] = float(getattr(msg, "drop_rate_comm", 0)) / 100.0
            
        elif msg_type == "BATTERY_STATUS":
            data["voltage_battery_v"] = float(getattr(msg, "voltages", [0])[0]) / 1000.0 if isinstance(getattr(msg, "voltages", 0), (list, tuple)) else float(getattr(msg, "voltage", 0)) / 1000.0
            data["current_battery_a"] = float(getattr(msg, "current_battery", 0)) / 100.0
            data["battery_remaining_pct"] = float(getattr(msg, "battery_remaining", 0))
            data["battery_temp_c"] = float(getattr(msg, "temperature", 0)) / 100.0 if getattr(msg, "temperature", 0) != 0 else None
            
        elif msg_type == "VFR_HUD":
            data["throttle_pct"] = float(getattr(msg, "throttle", 0))
            data["alt_m"] = float(getattr(msg, "alt", 0))
            data["groundspeed_mps"] = float(getattr(msg, "groundspeed", 0))
            data["heading_deg"] = float(getattr(msg, "heading", 0))
            
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
            
        elif msg_type == "RAW_IMU" or msg_type == "SCALED_IMU":
            xacc = float(getattr(msg, "xacc", 0))
            yacc = float(getattr(msg, "yacc", 0))
            zacc = float(getattr(msg, "zacc", 0))
            # Calculate vibration magnitude in Gs (raw is in mG)
            data["xacc_g"] = xacc / 1000.0
            data["yacc_g"] = yacc / 1000.0
            data["zacc_g"] = zacc / 1000.0
            data["vibration_rms_g"] = ((xacc**2 + yacc**2 + (zacc - 1000)**2) ** 0.5) / 1000.0
            data["xgyro_deg_s"] = float(getattr(msg, "xgyro", 0)) * 0.001
            data["ygyro_deg_s"] = float(getattr(msg, "ygyro", 0)) * 0.001
            data["zgyro_deg_s"] = float(getattr(msg, "zgyro", 0)) * 0.001
            
        elif msg_type == "SCALED_PRESSURE":
            data["ambient_temp_c"] = float(getattr(msg, "temperature", 2500)) / 100.0  # cdegC to degC
            data["press_abs_hpa"] = float(getattr(msg, "press_abs", 1013.25))
            
        elif msg_type == "HEARTBEAT":
            data["custom_mode"] = getattr(msg, "custom_mode", 0)
            data["base_mode"] = getattr(msg, "base_mode", 0)
            data["system_status"] = getattr(msg, "system_status", 0)
            data["autopilot"] = getattr(msg, "autopilot", 3)  # 3 = ArduPilot
            data["mavtype"] = getattr(msg, "type", 2)  # 2 = Quadrotor
            data["is_armed"] = bool(getattr(msg, "base_mode", 0) & 128)
            
        else:
            return None
            
        return data

mavlink_parser = MAVLinkParser()
