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
      <div className="animate-slideDown flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium mb-4" style={{ background: 'var(--critical-bg)', borderColor: 'var(--critical-border)', color: 'var(--critical)' }}>
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="tracking-wide">EMERGENCY STOP — Throttle derated to 0%</span>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-semibold tracking-wide px-2 py-1 rounded-full border" style={{ background: 'var(--card)', borderColor: 'var(--critical-border)' }}>INTERLOCK ACTIVE</span>
      </div>
    );
  }
  if (isCritical) {
    return (
      <div className="animate-slideDown flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium mb-4" style={{ background: 'var(--critical-bg)', borderColor: 'var(--critical-border)', color: 'var(--critical)' }}>
        <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /><span>Critical envelope breach — auto derate active</span></div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full border" style={{ background: 'var(--card)', borderColor: 'var(--critical-border)' }}>{systemState.safety_state}</span>
      </div>
    );
  }
  if (isDegraded) {
    return (
      <div className="animate-slideDown flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium mb-4" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning)' }}>
        <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /><span>Health degradation — intervention recommended</span></div>
        <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-full border" style={{ background: 'var(--card)', borderColor: 'var(--warning-border)' }}>{Math.round(systemState.intelligence.health_index)}% HEALTH</span>
      </div>
    );
  }

  return null;
};
