import pytest
from simulator.scenarios import SCENARIOS
from simulator.telemetry_generator import telemetry_generator
from backend.telemetry.schema import ScenarioType

def test_all_scenarios_configured():
    for scen in ScenarioType:
        assert scen in SCENARIOS
        s_def = SCENARIOS[scen]
        assert s_def.name == scen

def test_telemetry_generator_scenarios():
    # Test Normal
    telemetry_generator.set_scenario(ScenarioType.NORMAL, 0.0)
    p_norm = telemetry_generator.generate_packet()
    assert p_norm["rpm"] > 0.0
    assert p_norm["vibration_rms_g"] < 0.5

    # Test Bearing Degradation
    telemetry_generator.set_scenario(ScenarioType.BEARING_DEGRADATION, 1.0)
    p_bear = telemetry_generator.generate_packet()
    assert p_bear["vibration_rms_g"] > p_norm["vibration_rms_g"]

    # Test Overheating
    telemetry_generator.set_scenario(ScenarioType.OVERHEATING, 1.0)
    for _ in range(5):
        p_hot = telemetry_generator.generate_packet()
    assert p_hot["temperature_c"] >= p_norm["temperature_c"]
