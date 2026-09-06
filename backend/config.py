import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FALCONZ - Indigenous Propulsion Digital Twin"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Telemetry Streaming
    TELEMETRY_HZ: float = 2.0  # 2 Hz base update rate
    TELEMETRY_BUFFER_SIZE: int = 2000
    
    # Safety Limits (Hard Hardware Interlocks)
    MAX_RPM: float = 7500.0
    MAX_CURRENT_A: float = 38.0
    MAX_TEMP_C: float = 85.0
    MAX_VIBRATION_RMS: float = 12.0
    WATCHDOG_TIMEOUT_SEC: float = 2.0
    
    # Default Physical Parameters (SunnySky / T-Motor 2216 Class BLDC Testbed)
    MOTOR_KV: float = 880.0
    MOTOR_RESISTANCE_OHMS: float = 0.085
    MOTOR_NO_LOAD_CURRENT_A: float = 0.65
    MOTOR_POLE_PAIRS: int = 7
    THERMAL_CAPACITANCE_J_PER_K: float = 45.0
    THERMAL_RESISTANCE_K_PER_W: float = 1.45
    
    # Default Environmental
    DEFAULT_AMBIENT_TEMP_C: float = 25.0
    
    # Model Directory
    MODEL_DIR: str = os.path.join(os.path.dirname(__file__), "models")

settings = Settings()
