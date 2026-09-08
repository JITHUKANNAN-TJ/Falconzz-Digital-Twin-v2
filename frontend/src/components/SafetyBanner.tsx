import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '../state/store';

export const SafetyBanner: React.FC = () => {
  const { systemState } = useAppStore();
  if (!systemState) return null;
  const isCritical = systemState.safety_state === 'CRITICAL';
  const isDegraded = systemState.safety_state === 'DEGRADED';
  const isEmergency = systemState.emergency_stop_active || systemState.safety_state === 'EMERGENCY';

  if (isEmergency) {
    return (
      <div className="animate-slideDown flex items-center gap-3 px-4 py-3 rounded-lg border text-sm mb-4" style={{ background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-medium">Emergency stop — Throttle derated to 0%</span>
      </div>
    );
  }
  if (isCritical) {
    return (
      <div className="animate-slideDown flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm mb-4" style={{ background: 'var(--card)', borderColor: 'var(--text)', color: 'var(--text)' }}>
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Critical envelope breach</span>
        <span className="text-xs font-medium px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)' }}>{systemState.safety_state}</span>
      </div>
    );
  }
  if (isDegraded) {
    return (
      <div className="animate-slideDown flex items-center gap-2 px-4 py-3 rounded-lg border text-sm mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <AlertTriangle className="w-4 h-4" /> Health degradation detected
      </div>
    );
  }
  return null;
};
