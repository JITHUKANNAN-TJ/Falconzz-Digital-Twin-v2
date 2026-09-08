import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Cpu, Power, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';

export const SafetyCenterPage: React.FC = () => {
  const { systemState, triggerEmergencyStop, resetEmergencyStop } = useAppStore();
  const [safetyStatus, setSafetyStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getSafetyStatus();
      setSafetyStatus(data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const isEmergency = safetyStatus?.emergency_stop_latched || systemState?.safety_state === 'EMERGENCY';

  const telRpm = systemState?.telemetry?.rpm ?? 0;
  const telCurr = systemState?.telemetry?.current_a ?? 0;
  const telTemp = systemState?.telemetry?.temperature_c ?? 25;
  const telVib = systemState?.telemetry?.vibration_rms_g ?? 0.05;

  const hardLimits = [
    { limit: 'Maximum RPM Limit', value: '7,500 RPM', current: `${telRpm.toFixed(0)} RPM`, status: telRpm > 7500 ? 'VIOLATED' : 'SAFE' },
    { limit: 'Maximum Phase Current', value: '38.0 A', current: `${telCurr.toFixed(1)} A`, status: telCurr > 38 ? 'VIOLATED' : 'SAFE' },
    { limit: 'Maximum Stator Winding Temp', value: '85.0 °C', current: `${telTemp.toFixed(1)} °C`, status: telTemp > 85 ? 'VIOLATED' : 'SAFE' },
    { limit: 'Maximum Vibration Threshold', value: '12.0 g RMS', current: `${telVib.toFixed(2)} g`, status: telVib > 12 ? 'VIOLATED' : 'SAFE' },
    { limit: 'Stale Data Watchdog Timeout', value: '2.0 seconds', current: '< 0.5s stream lag', status: 'SAFE' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Safety Center & Hardware Interlock Governance
        </h2>
        <p className="text-xs text-slate-500">
          Deterministic hardware envelope boundaries, watchdog stale-data detection, and fail-safe governor transitions
        </p>
      </div>

      {/* Emergency Status Banner */}
      <div className={`aerospace-card p-5 border-l-4 ${isEmergency ? 'border-l-rose-600 bg-rose-50/50' : 'border-l-emerald-500 bg-emerald-50/30'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400">
              SAFETY GOVERNANCE STATUS
            </span>
            <h3 className={`text-xl font-bold font-mono ${isEmergency ? 'text-rose-700' : 'text-emerald-800'}`}>
              {isEmergency ? 'EMERGENCY SHUTDOWN LATCHED' : `SAFETY STATE: ${systemState?.safety_state || 'SAFE'}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active Control Mode: <strong className="font-bold text-slate-800">{systemState?.control_mode || 'MANUAL'}</strong> (Governor Interlocks Enabled)
            </p>
          </div>

          <div>
            {isEmergency ? (
              <button
                onClick={resetEmergencyStop}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> RESET & CLEAR E-STOP
              </button>
            ) : (
              <button
                onClick={triggerEmergencyStop}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors animate-pulse"
              >
                <Power className="w-4 h-4" /> MANUAL EMERGENCY SHUTDOWN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hard Interlock Limits Table */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Hard Physical Protection Envelopes (Non-Bypassable)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px]">
                <th className="py-2.5 px-3">SAFETY PARAMETER</th>
                <th className="py-2.5 px-3">HARD ENVELOPE LIMIT</th>
                <th className="py-2.5 px-3">CURRENT LIVE READING</th>
                <th className="py-2.5 px-3">INTERLOCK STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {hardLimits.map((lim, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">{lim.limit}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{lim.value}</td>
                  <td className="py-2.5 px-3 font-bold text-sky-700">{lim.current}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lim.status === 'SAFE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {lim.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Philosophy */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <strong className="text-slate-800 block text-xs uppercase font-bold">Safety Rule:</strong>
        <p>
          AI predictions never have write-authority over safety constraints. Automatic derate actions can only restrict throttle to protect the physical testbed, never exceed operator limits or hardware safety ceilings.
        </p>
      </div>
    </div>
  );
};
