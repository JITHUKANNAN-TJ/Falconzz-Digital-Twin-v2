import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../state/store';

export const SafetyBanner: React.FC = () => {
  const { systemState } = useAppStore();

  if (!systemState) return null;

  const isCritical = systemState.safety_state === 'CRITICAL';
  const isDegraded = systemState.safety_state === 'DEGRADED';
  const isEmergency = systemState.emergency_stop_active || systemState.safety_state === 'EMERGENCY';

  if (isEmergency) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md mb-4 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <AlertTriangle className="w-5 h-5 animate-bounce" />
          <span>HARDWARE EMERGENCY STOP ENGAGED — THROTTLE COMMAND DERATED TO 0%</span>
        </div>
        <span className="text-[11px] bg-rose-700/80 px-2 py-0.5 rounded font-mono">WATCHDOG / INTERLOCK ACTIVE</span>
      </div>
    );
  }

  if (isCritical) {
    return (
      <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-2 flex items-center justify-between mb-4 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>CRITICAL SAFETY ENVELOPE BREACH — AUTOMATIC SAFE THROTTLE DERATE ACTIVE</span>
        </div>
        <span className="text-xs font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
          {systemState.safety_state}
        </span>
      </div>
    );
  }

  if (isDegraded) {
    return (
      <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2 flex items-center justify-between mb-4 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>PROPULSION HEALTH DEGRADATION DETECTED — ASSISTED INTERVENTION RECOMMENDED</span>
        </div>
        <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
          HEALTH: {systemState.intelligence.health_index}%
        </span>
      </div>
    );
  }

  return null;
};
