import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Zap, 
  Power, 
  RefreshCw 
} from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { 
    systemState, 
    theme, 
    toggleTheme, 
    toggleSidebar, 
    activeAlerts, 
    setAlertDrawerOpen,
    setSource 
  } = useAppStore();

  // Connection controls state: COM PORT vs UDP
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(57600);
  const [connProtocol, setConnProtocol] = useState<'COM_PORT' | 'UDP'>('COM_PORT');
  const [udpPort, setUdpPort] = useState<number>(14550);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [diag, setDiag] = useState<any>(null);
  const [isConnectedLocally, setIsConnectedLocally] = useState<boolean>(false);

  // Poll diagnostics and serial ports
  const fetchPortsAndDiag = async () => {
    try {
      const [portsRes, diagRes] = await Promise.all([
        api.getSerialPorts(),
        api.getAPMDiagnostics()
      ]);
      if (portsRes?.ports && Array.isArray(portsRes.ports)) {
        setPorts(portsRes.ports);
        if (portsRes.ports.length > 0) {
          const portNames = portsRes.ports.map((p: any) => p.port);
          if (!selectedPort || !portNames.includes(selectedPort)) {
            setSelectedPort(portsRes.ports[0].port);
          }
        } else {
          setSelectedPort('');
        }
      } else {
        setPorts([]);
        setSelectedPort('');
      }
      if (diagRes) {
        setDiag(diagRes);
        if (diagRes.apm_connection === 'CONNECTED') {
          setIsConnectedLocally(true);
        } else if (diagRes.apm_connection === 'DISCONNECTED') {
          setIsConnectedLocally(false);
        }
      }
    } catch (err) {
      // Backend polling error
    }
  };

  useEffect(() => {
    fetchPortsAndDiag();
    const interval = setInterval(fetchPortsAndDiag, 1500);
    return () => clearInterval(interval);
  }, [selectedPort]);

  const isConnected = isConnectedLocally || diag?.apm_connection === 'CONNECTED';
  const isHeartbeatOk = diag?.heartbeat === 'RECEIVED';
  const isSimMode = systemState?.data_source === 'SIMULATION';

  const handleToggleConnect = async () => {
    if (isConnected) {
      // Disconnect action
      setConnecting(true);
      setIsConnectedLocally(false);
      setConnError(null);
      try {
        await api.disconnectMAVLink();
        await api.setTelemetrySource('SIMULATION' as any);
        await fetchPortsAndDiag();
      } catch (err) {
        console.error('Failed to disconnect:', err);
      } finally {
        setConnecting(false);
      }
    } else {
      if (connProtocol === 'COM_PORT' && !selectedPort) {
        setConnError('NO PORT SELECTED');
        return;
      }
      // Connect action
      setConnecting(true);
      setConnError(null);
      try {
        const target = connProtocol === 'UDP' ? `udpin:0.0.0.0:${udpPort}` : selectedPort;
        const connType = connProtocol === 'UDP' ? 'UDP' : 'USB_SERIAL';
        const res: any = await api.connectMAVLink(target, baudRate, connType);
        if (res?.success || res?.status === 'CONNECTED' || res?.status === 'CONNECTING') {
          setIsConnectedLocally(true);
          await api.setTelemetrySource('APM_MAVLINK' as any);
        } else {
          setConnError(res?.error ? res.error.slice(0, 32) : (res?.status || 'CONNECTION FAILED'));
          setIsConnectedLocally(false);
        }
        await fetchPortsAndDiag();
      } catch (err: any) {
        setConnError(err?.message ? err.message.slice(0, 32) : 'CONNECTION FAILED');
        setIsConnectedLocally(false);
      } finally {
        setConnecting(false);
      }
    }
  };

  const unreadAlertCount = activeAlerts.length;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-40 px-4 sm:px-6 h-[72px] flex items-center shadow-lg select-none transition-all duration-200">
      <div className="flex items-center justify-between gap-4 w-full min-w-0">
        {/* ========================================================
            1. LEFT: MENU TOGGLE (☰), ALERTS (🔔), THEME (☀/🌙), BRAND
           ======================================================== */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Menu Button (☰) */}
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all hover:scale-105 active:scale-95 shadow-xs"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Alert Bell with unread counter */}
          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all hover:scale-105 active:scale-95 shadow-xs flex items-center gap-1.5"
            title="Open Alerts Drawer"
          >
            <Bell className="w-5 h-5" />
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
              unreadAlertCount > 0 
                ? 'bg-rose-500 text-white animate-pulse shadow-xs shadow-rose-500/50' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {unreadAlertCount}
            </span>
          </button>

          {/* Theme Toggle (☀ / 🌙) */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all hover:scale-105 active:scale-95 shadow-xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-sky-300" />
            )}
          </button>

          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800/80">
            <div className="bg-sky-600 text-white p-2 rounded-xl flex items-center justify-center font-black shadow-md shadow-sky-600/30">
              <Zap className="w-4.5 h-4.5 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-white">FALCONZ</h1>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-950/90 text-sky-300 border border-sky-800/80 tracking-wider">
                  QUADCOPTER GCS
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono hidden md:block">
                4-BLDC Real-Time Monitoring & Digital Twin
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. CENTER: HARDWARE CONNECTION [ COM PORT / UDP ] [ PORT ▼ ] [ BAUD ▼ ] [ CONNECT ]
           ======================================================== */}
        <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-800/90 px-3 py-1.5 rounded-xl shadow-inner min-h-[46px] shrink-0">
          {/* Connection Protocol Selector: COM PORT / UDP */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono font-bold gap-1">
            <button
              onClick={() => setConnProtocol('COM_PORT')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                connProtocol === 'COM_PORT' 
                  ? 'bg-sky-600 text-white shadow-sm font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Serial COM Port Direct Hardware Connection"
            >
              COM PORT
            </button>
            <button
              onClick={() => setConnProtocol('UDP')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                connProtocol === 'UDP' 
                  ? 'bg-sky-600 text-white shadow-sm font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="UDP Network / SITL Stream (Port 14550)"
            >
              UDP
            </button>
          </div>

          {/* PORT DROPDOWN / INPUT */}
          {connProtocol === 'COM_PORT' ? (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isConnected || connecting || ports.length === 0}
                className="h-9 bg-slate-900 border border-slate-700 text-sky-300 text-xs font-mono font-bold rounded-lg px-3 outline-hidden focus:border-sky-500 disabled:opacity-60 max-w-[210px] truncate cursor-pointer"
              >
                {ports.length > 0 ? (
                  ports.map((p) => (
                    <option key={p.port} value={p.port}>
                      {p.port} {p.description ? `(${p.description.slice(0, 20)})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No Available Ports
                  </option>
                )}
              </select>

              <button
                onClick={fetchPortsAndDiag}
                title="Rescan Connected Telemetry Ports"
                className="h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-sky-400 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-mono font-semibold">UDP PORT:</span>
              <input
                type="number"
                value={udpPort}
                onChange={(e) => setUdpPort(Number(e.target.value))}
                disabled={isConnected || connecting}
                placeholder="14550"
                className="h-9 w-24 bg-slate-900 border border-slate-700 text-sky-300 text-xs font-mono font-bold rounded-lg px-2.5 outline-hidden focus:border-sky-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* BAUD RATE DROPDOWN (Shown when COM PORT) */}
          {connProtocol === 'COM_PORT' && (
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={isConnected || connecting || ports.length === 0}
              className="h-9 bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono rounded-lg px-3 outline-hidden focus:border-sky-500 disabled:opacity-50 cursor-pointer"
            >
              <option value={57600}>57600 (Telemetry Radio 433/915 MHz)</option>
              <option value={115200}>115200 (Direct USB Standard / ESP32)</option>
              <option value={9600}>9600 (Standard Serial 9600 / Arduino)</option>
              <option value={38400}>38400 (Legacy Radio)</option>
              <option value={19200}>19200</option>
              <option value={921600}>921600 (High Speed)</option>
            </select>
          )}

          {/* SINGLE CONNECT / DISCONNECT BUTTON */}
          <button
            onClick={handleToggleConnect}
            disabled={connecting || (connProtocol === 'COM_PORT' && !isConnected && ports.length === 0)}
            className={`h-9 text-xs font-bold font-mono px-4 rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isConnected
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : connecting
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {connecting 
              ? (isConnected ? 'DISCONNECTING...' : 'CONNECTING...') 
              : isConnected 
              ? 'DISCONNECT' 
              : 'CONNECT'}
          </button>

          {/* Connection status indicator */}
          <div className="flex items-center gap-2 px-2 text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? isHeartbeatOk ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-sky-400 animate-pulse shadow-sm shadow-sky-400/50'
                  : connecting
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              {isConnected ? (
                isHeartbeatOk ? (
                  <span className="text-emerald-400">CONNECTED (LIVE)</span>
                ) : diag?.radio_link?.active ? (
                  <span className="text-sky-400 flex items-center gap-1">
                    <span>
                      RADIO ({diag.radio_link.rssi > 100 ? `${Math.round((diag.radio_link.rssi / 1.9) - 127)} dBm` : `${diag.radio_link.rssi} dBm`})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                      {diag.radio_link.remrssi > 0 
                        ? `AIR LINK ${diag.radio_link.remrssi > 100 ? `${Math.round((diag.radio_link.remrssi / 1.9) - 127)} dBm` : `${diag.radio_link.remrssi}%`}` 
                        : 'AWAITING AIR LINK'}
                    </span>
                  </span>
                ) : (
                  <span className="text-sky-400">{connProtocol === 'UDP' ? 'UDP LISTENING' : 'PORT OPEN (STANDBY)'}</span>
                )
              ) : connError ? (
                <span className="text-rose-400 truncate max-w-[150px]" title={connError}>{connError}</span>
              ) : (
                <span className="text-slate-400">DISCONNECTED</span>
              )}
            </span>
          </div>
        </div>

        {/* ========================================================
            3. RIGHT: TELEMETRY SOURCE TOGGLE (NO EMERGENCY STOP)
           ======================================================== */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Source Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setSource('APM_MAVLINK')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                !isSimMode ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              APM HARDWARE
            </button>
            <button
              onClick={() => setSource('SIMULATION')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                isSimMode ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              TESTBED SIM
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
