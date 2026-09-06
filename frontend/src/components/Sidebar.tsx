import React from 'react';
import {
  Home,
  Cpu,
  Radio,
  TrendingUp,
  Activity,
  AlertOctagon,
  FileText,
  HardDrive,
  Sliders,
  Settings
} from 'lucide-react';
import { useAppStore } from '../state/store';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, sidebarOpen } = useAppStore();

  const navItems = [
    { id: 'overview', label: 'HOME', icon: <Home className="w-4 h-4" />, desc: 'Real-time 4-motor GCS' },
    { id: 'live-twin', label: 'LIVE DIGITAL TWIN', icon: <Cpu className="w-4 h-4" />, desc: 'Physics-informed twin' },
    { id: 'telemetry-data', label: 'TELEMETRY', icon: <Radio className="w-4 h-4" />, desc: 'Real-time telemetry stream' },
    { id: 'fault-prediction', label: 'PREDICTIONS', icon: <TrendingUp className="w-4 h-4" />, desc: 'ML degradation forecasts' },
    { id: 'health-intel', label: 'HEALTH', icon: <Activity className="w-4 h-4" />, desc: 'Propulsion health analytics' },
    { id: 'model-evaluation', label: 'FAULTS', icon: <AlertOctagon className="w-4 h-4" />, desc: 'Fault classification & metrics' },
    { id: 'mission-replay', label: 'DATA LOGGING', icon: <FileText className="w-4 h-4" />, desc: 'Blackbox flight recording' },
    { id: 'hardware-center', label: 'HARDWARE CENTER', icon: <HardDrive className="w-4 h-4" />, desc: 'APM mapping & link diagnostics' },
    { id: 'safety-center', label: 'CALIBRATION', icon: <Sliders className="w-4 h-4" />, desc: 'Thresholds & safety interlocks' },
    { id: 'settings', label: 'SETTINGS', icon: <Settings className="w-4 h-4" />, desc: 'System configuration' }
  ];

  return (
    <aside 
      className={`${
        sidebarOpen ? 'w-56' : 'w-16'
      } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex flex-col h-[calc(100vh-53px)] sticky top-[53px] select-none shadow-xs transition-all duration-200 shrink-0`}
    >
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center ${
                sidebarOpen ? 'justify-start gap-2.5 px-3' : 'justify-center px-2'
              } py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-800/80 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'}`}>
                {item.icon}
              </span>

              {sidebarOpen && (
                <div className="text-left truncate">
                  <span className="block truncate font-sans text-xs">{item.label}</span>
                </div>
              )}

              {/* Collapsed Tooltip */}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-mono rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer GCS Status */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] text-slate-500 font-mono">
        <div className="flex justify-between items-center">
          {sidebarOpen && <span>GCS CONSOLE</span>}
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {sidebarOpen ? 'ONLINE' : ''}
          </span>
        </div>
      </div>
    </aside>
  );
};
