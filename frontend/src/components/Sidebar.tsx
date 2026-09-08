import React from 'react';
import { Home, Cpu, Radio, Activity, TrendingUp, AlertOctagon, FileText, HardDrive, Sliders, Settings } from 'lucide-react';
import { useAppStore } from '../state/store';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, sidebarOpen } = useAppStore();
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-4 h-4" /> },
    { id: 'live-twin', label: 'Digital Twin', icon: <Cpu className="w-4 h-4" /> },
    { id: 'telemetry-data', label: 'Telemetry', icon: <Radio className="w-4 h-4" /> },
    { id: 'health-intel', label: 'Health', icon: <Activity className="w-4 h-4" /> },
    { id: 'fault-prediction', label: 'Predictions', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'model-evaluation', label: 'Faults', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'mission-replay', label: 'Data Log', icon: <FileText className="w-4 h-4" /> },
    { id: 'hardware-center', label: 'Hardware', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'safety-center', label: 'Calibrate', icon: <Sliders className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={`${sidebarOpen ? 'w-[200px]' : 'w-[60px]'} flex flex-col h-[calc(100vh-56px)] sticky top-14 shrink-0 border-r transition-all select-none`}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-md text-[13px] transition-colors relative group ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
              style={
                isActive
                  ? { background: 'var(--text)', color: 'var(--bg)', fontWeight: 500 }
                  : { color: 'var(--text-muted)' }
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate text-[13px]">{item.label}</span>}
              {!sidebarOpen && (
                <span
                  className="absolute left-full ml-2 px-2.5 py-1 text-xs rounded-md shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border"
                  style={{ background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-faint)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white shrink-0" />
          {sidebarOpen && <span className="text-[11px] tracking-wide">System Online</span>}
        </div>
      </div>
    </aside>
  );
};
