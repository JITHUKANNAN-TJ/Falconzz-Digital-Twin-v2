import React from 'react';
import { Home, Cpu, Radio, TrendingUp, Activity, AlertOctagon, FileText, HardDrive, Sliders, Settings } from 'lucide-react';
import { useAppStore } from '../state/store';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, sidebarOpen } = useAppStore();
  const navItems = [
    { id: 'overview', label: 'HOME', icon: <Home className="w-[18px] h-[18px]" />, k: 'H' },
    { id: 'live-twin', label: 'DIGITAL TWIN', icon: <Cpu className="w-[18px] h-[18px]" />, k: 'T' },
    { id: 'telemetry-data', label: 'TELEMETRY', icon: <Radio className="w-[18px] h-[18px]" />, k: 'L' },
    { id: 'health-intel', label: 'HEALTH', icon: <Activity className="w-[18px] h-[18px]" />, k: 'H' },
    { id: 'fault-prediction', label: 'PREDICTIONS', icon: <TrendingUp className="w-[18px] h-[18px]" />, k: 'P' },
    { id: 'model-evaluation', label: 'FAULTS', icon: <AlertOctagon className="w-[18px] h-[18px]" />, k: 'F' },
    { id: 'mission-replay', label: 'DATA LOG', icon: <FileText className="w-[18px] h-[18px]" />, k: 'D' },
    { id: 'hardware-center', label: 'HARDWARE', icon: <HardDrive className="w-[18px] h-[18px]" />, k: 'W' },
    { id: 'safety-center', label: 'CALIBRATE', icon: <Sliders className="w-[18px] h-[18px]" />, k: 'C' },
    { id: 'settings', label: 'SETTINGS', icon: <Settings className="w-[18px] h-[18px]" />, k: 'S' },
  ];

  return (
    <aside
      className={`${sidebarOpen ? 'w-[220px]' : 'w-[64px]'} flex flex-col h-[calc(100vh-56px)] sticky top-14 shrink-0 border-r transition-all duration-200 select-none`}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all relative group ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
              style={
                isActive
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)', fontWeight: 600 }
                  : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'color-mix(in srgb, var(--bg) 80%, transparent)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="shrink-0" style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}>{item.icon}</span>
              {sidebarOpen && <span className="truncate text-[11px] tracking-[0.06em] font-semibold">{item.label}</span>}
              {isActive && sidebarOpen && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />}
              {!sidebarOpen && (
                <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border"
                  style={{ background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}>{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 60%, var(--card))' }}>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft shrink-0" />
          {sidebarOpen ? (
            <>
              <span className="font-medium tracking-wide">GCS ONLINE</span>
              <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50">10 Hz</span>
            </>
          ) : null}
        </div>
        {sidebarOpen && <div className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Minimal • Professional</div>}
      </div>
    </aside>
  );
};
