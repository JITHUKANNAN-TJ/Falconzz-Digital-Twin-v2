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

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, unit, expectedValue, residual, badge = 'VALIDATED', icon, subtitle }) => {
  return (
    <div className="aerospace-card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          {icon && <span style={{ color: 'var(--text-faint)' }}>{icon}</span>}
          {title}
        </span>
        <StatusBadge type={badge} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold tabular-nums tracking-tight leading-none" style={{ color: 'var(--text)' }}>
          {value}
        </span>
        {unit && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {(expectedValue !== undefined || residual !== undefined) && (
        <div className="flex items-center justify-between text-xs font-mono mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          {expectedValue !== undefined && <span>Exp <strong style={{ color: 'var(--text-muted)' }}>{expectedValue}</strong></span>}
          {residual !== undefined && <span>Δ <strong style={{ color: 'var(--text)' }}>{Number(residual) > 0 ? `+${residual}` : residual}</strong></span>}
        </div>
      )}
      {subtitle && <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-faint)' }}>{subtitle}</p>}
    </div>
  );
};
