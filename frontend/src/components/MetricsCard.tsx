import React, { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';

interface MetricsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  expectedValue?: string | number;
  residual?: string | number;
  badge?: 'VALIDATED' | 'PROXY' | 'FUTURE';
  statusColor?: 'normal' | 'warning' | 'critical' | 'info';
  icon?: ReactNode;
  subtitle?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  unit,
  expectedValue,
  residual,
  badge = 'VALIDATED',
  statusColor = 'normal',
  icon,
  subtitle
}) => {
  const accent: Record<string, string> = {
    normal: 'color:var(--text)',
    warning: 'var(--warning)',
    critical: 'var(--critical)',
    info: 'var(--accent)'
  };
  const bgTint: Record<string, string> = {
    normal: 'transparent',
    warning: 'var(--warning-bg)',
    critical: 'var(--critical-bg)',
    info: 'var(--accent-soft)'
  };

  return (
    <div className="aerospace-card p-5 group" style={{ background: statusColor !== 'normal' ? bgTint[statusColor] : 'var(--card)' }}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase flex items-center gap-1.5" style={{ color: 'var(--text-faint)' }}>
          {icon && <span style={{ color: 'var(--text-faint)' }}>{icon}</span>}
          {title}
        </span>
        <StatusBadge type={badge} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold tabular-nums tracking-tight leading-none" style={{ color: statusColor === 'normal' ? 'var(--text)' : (accent as any)[statusColor] || 'var(--text)' }}>
          {value}
        </span>
        {unit && <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-faint)' }}>{unit}</span>}
      </div>
      {(expectedValue !== undefined || residual !== undefined) && (
        <div className="flex items-center justify-between text-[11px] font-mono mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          {expectedValue !== undefined && <span>EXP <strong style={{ color: 'var(--text-muted)' }}>{expectedValue}</strong></span>}
          {residual !== undefined && (
            <span>Δ <strong style={{ color: Number(residual) !== 0 ? (Number(residual) > 0 ? 'var(--warning)' : 'var(--success)') : 'var(--text-muted)' }}>{Number(residual) > 0 ? `+${residual}` : residual}</strong></span>
          )}
        </div>
      )}
      {subtitle && <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>}
    </div>
  );
};
