import React from 'react';

interface BadgeProps {
  type: 'VALIDATED' | 'PROXY' | 'FUTURE' | 'HEALTH' | 'SOURCE' | 'SAFETY';
  value?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'VALIDATED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold tracking-wide border h-5 ${className}`} style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ opacity: 0.9 }}></span>
        VALIDATED
      </span>
    );
  }
  if (type === 'PROXY') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold tracking-wide border h-5 ${className}`} style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        SIMULATED
      </span>
    );
  }
  if (type === 'FUTURE') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold tracking-wide border h-5 ${className}`} style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', borderColor: '#ddd6fe' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
        FUTURE
      </span>
    );
  }
  if (type === 'HEALTH') {
    const band = value || 'HEALTHY';
    const map: Record<string, { bg: string; color: string; border: string }> = {
      HEALTHY: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success-border)' },
      WARNING: { bg: 'var(--warning-bg)', color: 'var(--warning)', border: 'var(--warning-border)' },
      DEGRADED: { bg: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '#fed7aa' },
      CRITICAL: { bg: 'var(--critical-bg)', color: 'var(--critical)', border: 'var(--critical-border)' }
    };
    const s = map[band] || map.HEALTHY;
    return <span className={`inline-flex items-center px-2.5 rounded-full text-[11px] font-bold tracking-wide border h-5 ${className}`} style={{ background: s.bg, color: s.color, borderColor: s.border }}>{band}</span>;
  }
  if (type === 'SOURCE') {
    const isHardware = value && value !== 'SIMULATION';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-bold tracking-wide border h-5 ${className}`} style={{ background: isHardware ? 'rgba(2,132,199,0.08)' : 'color-mix(in srgb, var(--bg) 80%, transparent)', color: isHardware ? 'var(--accent)' : 'var(--text-muted)', borderColor: isHardware ? 'rgba(2,132,199,0.18)' : 'var(--border)' }}>
        <span className={`w-1.5 h-1.5 rounded-full ${isHardware ? 'bg-sky-500' : 'bg-slate-400'}`}></span>
        {value || 'SIMULATION'}
      </span>
    );
  }
  return null;
};
