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
  const borderColors = {
    normal: 'border-slate-200 hover:border-slate-300',
    warning: 'border-amber-300 bg-amber-50/20',
    critical: 'border-rose-300 bg-rose-50/20',
    info: 'border-sky-300 bg-sky-50/20'
  };

  const textColors = {
    normal: 'text-slate-900',
    warning: 'text-amber-700',
    critical: 'text-rose-700',
    info: 'text-sky-700'
  };

  return (
    <div className={`aerospace-card p-4 transition-all duration-150 ${borderColors[statusColor]}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          {icon && <span className="text-slate-400">{icon}</span>}
          {title}
        </span>
        <StatusBadge type={badge} />
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-2xl font-bold font-mono tracking-tight ${textColors[statusColor]}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
      </div>

      {(expectedValue !== undefined || residual !== undefined) && (
        <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-slate-100 text-slate-500">
          {expectedValue !== undefined && (
            <span>
              EXP: <strong className="text-slate-700 font-semibold">{expectedValue}</strong>
            </span>
          )}
          {residual !== undefined && (
            <span>
              RES:{' '}
              <strong className={Number(residual) > 0 ? 'text-amber-600' : 'text-slate-700'}>
                {Number(residual) > 0 ? `+${residual}` : residual}
              </strong>
            </span>
          )}
        </div>
      )}

      {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};
