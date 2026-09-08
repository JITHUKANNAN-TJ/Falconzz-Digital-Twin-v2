import React from 'react';

interface BadgeProps {
  type: 'VALIDATED' | 'PROXY' | 'FUTURE' | 'HEALTH' | 'SOURCE' | 'SAFETY';
  value?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  const base = `inline-flex items-center px-2.5 rounded-full text-[11px] font-medium tracking-wide border h-5 ${className}`;
  const style = { background: 'var(--card)', color: 'var(--text-muted)', borderColor: 'var(--border)' } as React.CSSProperties;

  if (type === 'VALIDATED') return <span className={base} style={style}>Validated</span>;
  if (type === 'PROXY') return <span className={base} style={style}>Simulated</span>;
  if (type === 'FUTURE') return <span className={base} style={style}>Future</span>;
  if (type === 'HEALTH') {
    const band = value || 'HEALTHY';
    const isHealthy = band === 'HEALTHY';
    return (
      <span
        className={base}
        style={isHealthy ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' } : style}
      >
        {band}
      </span>
    );
  }
  if (type === 'SOURCE') {
    return <span className={base} style={style}>{value || 'SIMULATION'}</span>;
  }
  return null;
};
