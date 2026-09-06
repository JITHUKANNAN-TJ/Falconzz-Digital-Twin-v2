import React from 'react';
import { Settings, Save, Shield, Sliders, Database, Info } from 'lucide-react';
import { useAppStore } from '../state/store';

export const SettingsPage: React.FC = () => {
  const { systemState } = useAppStore();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" />
          FALCONZ System Settings & Propulsion Physics Calibration
        </h2>
        <p className="text-xs text-slate-500">
          Hardware constants, safety governor thresholds, and telemetry streaming configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Physical Testbed Parameters */}
        <div className="aerospace-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-sky-600" />
            BLDC Physical Rig Motor Parameters
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Motor Velocity Constant (Kv)</label>
              <input type="text" readOnly value="880 RPM/V" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-slate-800" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Phase Resistance (Rm)</label>
              <input type="text" readOnly value="0.085 Ohms" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-slate-800" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">No-Load Current (I0)</label>
              <input type="text" readOnly value="0.65 A" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-slate-800" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Thermal Capacitance (C_th)</label>
              <input type="text" readOnly value="45.0 J/K" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-slate-800" />
            </div>
          </div>
        </div>

        {/* Safety Limits */}
        <div className="aerospace-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Shield className="w-4 h-4 text-rose-600" />
            Hard Safety Envelope Limits
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Max Stator Temperature Limit</label>
              <input type="text" readOnly value="85.0 °C" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-rose-700 font-bold" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Max Continuous Current Limit</label>
              <input type="text" readOnly value="38.0 A" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-rose-700 font-bold" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Max Rotational Speed Limit</label>
              <input type="text" readOnly value="7,500 RPM" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-rose-700 font-bold" />
            </div>
            <div>
              <label className="text-slate-500 font-semibold block mb-0.5">Watchdog Stale Telemetry Timeout</label>
              <input type="text" readOnly value="2.0 Seconds" className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Mode info */}
      <div className="aerospace-card p-4 bg-slate-50">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Edge & Local Deployment Topology
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-2.5 rounded bg-white border border-slate-200">
            <strong>Edge Local Mode:</strong> Active on Companion SBC / Local GCS without cloud dependency.
          </div>
          <div className="p-2.5 rounded bg-white border border-slate-200">
            <strong>Telemetry Stream:</strong> Native WebSocket on port 8000 (/ws/telemetry) at 2.0 Hz.
          </div>
          <div className="p-2.5 rounded bg-white border border-slate-200">
            <strong>Model Registry:</strong> Local Scikit-learn serialized models with quantile confidence estimation.
          </div>
        </div>
      </div>
    </div>
  );
};
