import React from 'react';
import { Sliders, Zap, Shield, Play } from 'lucide-react';
import { useAppStore } from '../state/store';
import { ControlMode, ScenarioType, TelemetrySource } from '../types/telemetry';

export const ModeSelector: React.FC = () => {
  const { systemState, setThrottle, setScenario, setControlMode, setSource } = useAppStore();

  const scenarios: { id: ScenarioType; label: string }[] = [
    { id: 'NORMAL', label: '1. Normal Baseline' },
    { id: 'HIGH_LOAD', label: '2. High Dynamic Load' },
    { id: 'OVERHEATING', label: '3. Stator Overheating' },
    { id: 'BEARING_DEGRADATION', label: '4. Bearing Degradation' },
    { id: 'ELECTRICAL_DEGRADATION', label: '5. Electrical Phase Fault' },
    { id: 'SENSOR_DRIFT', label: '6. Sensor Calibration Drift' },
    { id: 'COMBINED_DEGRADATION', label: '7. Combined Compound Fault' }
  ];

  const modes: ControlMode[] = ['MANUAL', 'ASSISTED', 'AUTOMATIC'];
  const sources: TelemetrySource[] = ['SIMULATION', 'APM_MAVLINK', 'ESP32_SERIAL', 'ESP32_WIFI', 'ARDUINO_SERIAL'];

  const currentMode = systemState?.control_mode || 'MANUAL';
  const currentScenario = systemState?.scenario || 'NORMAL';
  const currentSource = systemState?.data_source || 'SIMULATION';
  const currentThrottle = systemState?.telemetry.throttle_pct || 55;
  const currentLoad = systemState?.telemetry.load_pct || 40;

  return (
    <div className="aerospace-card p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Control Mode */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            CONTROL MODE
          </label>
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setControlMode(m)}
                className={`flex-1 text-xs py-1 rounded-md font-bold transition-all ${
                  currentMode === m
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Source */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            TELEMETRY INGRESS SOURCE
          </label>
          <select
            value={currentSource}
            onChange={(e) => setSource(e.target.value as TelemetrySource)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Degradation Scenario */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Play className="w-3.5 h-3.5 text-slate-400" />
            PROPULSION SCENARIO
          </label>
          <select
            value={currentScenario}
            onChange={(e) => setScenario(e.target.value as ScenarioType, 0.75)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Throttle & Load Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-600">
            <span>THROTTLE: <strong className="text-slate-900">{currentThrottle}%</strong></span>
            <span>LOAD: <strong className="text-slate-900">{currentLoad}%</strong></span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentThrottle}
            onChange={(e) => setThrottle(Number(e.target.value), currentLoad)}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>
      </div>
    </div>
  );
};
