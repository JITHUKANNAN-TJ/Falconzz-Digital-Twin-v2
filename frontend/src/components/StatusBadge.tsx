import React from 'react';

interface BadgeProps {
  type: 'VALIDATED' | 'PROXY' | 'FUTURE' | 'HEALTH' | 'SOURCE' | 'SAFETY';
  value?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'VALIDATED') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        VALIDATED ON RIG
      </span>
    );
  }

  if (type === 'PROXY') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        PROXY / SIMULATED
      </span>
    );
  }

  if (type === 'FUTURE') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-300 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
        FUTURE MALE-UAV
      </span>
    );
  }

  if (type === 'HEALTH') {
    const band = value || 'HEALTHY';
    const colorMap: Record<string, string> = {
      HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      WARNING: 'bg-amber-100 text-amber-800 border-amber-300',
      DEGRADED: 'bg-orange-100 text-orange-800 border-orange-300',
      CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorMap[band] || colorMap.HEALTHY} ${className}`}>
        {band}
      </span>
    );
  }

  if (type === 'SOURCE') {
    const isHardware = value && value !== 'SIMULATION';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${isHardware ? 'bg-sky-50 text-sky-700 border-sky-300' : 'bg-slate-100 text-slate-700 border-slate-300'} ${className}`}>
        <span className={`w-2 h-2 rounded-full ${isHardware ? 'bg-sky-500 animate-ping' : 'bg-slate-400'}`}></span>
        {value || 'SIMULATION'}
      </span>
    );
  }

  return null;
};
