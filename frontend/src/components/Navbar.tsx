import React, { useState, useEffect } from 'react';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, toggleSidebar, activeAlerts, setAlertDrawerOpen } = useAppStore();
  const [diag, setDiag] = useState<any>(null);
  const [isConnectedLocally, setIsConnectedLocally] = useState<boolean>(false);

  const fetchDiag = async () => {
    try {
      const diagRes = await api.getAPMDiagnostics();
      if (diagRes) {
        setDiag(diagRes);
        if (diagRes.apm_connection === 'CONNECTED') setIsConnectedLocally(true);
        else if (diagRes.apm_connection === 'DISCONNECTED') setIsConnectedLocally(false);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDiag();
    const id = setInterval(fetchDiag, 2000);
    return () => clearInterval(id);
  }, []);

  const isConnected = isConnectedLocally || diag?.apm_connection === 'CONNECTED';
  const unread = activeAlerts.length;

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-14 px-4 sm:px-6 border-b select-none"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            aria-label="Toggle menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 pl-3 ml-1 border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-md bg-black dark:bg-white flex items-center justify-center">
              <span className="text-[11px] font-bold text-white dark:text-black tracking-widest">F</span>
            </div>
            <span className="text-[13px] font-semibold tracking-[0.16em]" style={{ color: 'var(--text)' }}>
              FALCONZ
            </span>
            <span className="hidden sm:inline text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              GCS
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l text-xs" style={{ borderColor: 'var(--border)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: isConnected ? 'var(--text)' : '#d4d4d4' }} />
            <span className="font-medium tracking-wide text-xs" style={{ color: isConnected ? 'var(--text)' : 'var(--text-faint)' }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium flex items-center justify-center leading-none">
                {unread}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
