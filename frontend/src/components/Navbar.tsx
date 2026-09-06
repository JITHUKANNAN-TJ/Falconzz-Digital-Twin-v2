import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  Sun, 
  Moon, 
  Zap, 
  Power, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle, 
  Radio, 
  Activity,
  CheckCircle2,
  XCircle,
  Wifi
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
    triggerEmergencyStop, 
    resetEmergencyStop, 
    setSource 
  } = useAppStore();

  // Connection controls state
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [connType, setConnType] = useState<'USB_SERIAL' | 'UDP'>('USB_SERIAL');
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
  const isEmergency = systemState?.emergency_stop_active || systemState?.safety_state === 'EMERGENCY';
  const isSimMode = systemState?.data_source === 'SIMULATION';

  const handleToggleConnect = async () => {
    if (isConnected) {
      // Disconnect action
      setConnecting(true);
      setIsConnectedLocally(false);
      setConnError(null);
      try {
        await api.disconnectMAVLink();
        await api.setTelemetrySource('SIMULATION');
        await fetchPortsAndDiag();
      } catch (err) {
        console.error('Failed to disconnect:', err);
      } finally {
        setConnecting(false);
      }
    } else {
      if (connType === 'USB_SERIAL' && !selectedPort) {
        setConnError('NO PORT DETECTED');
        return;
      }
      // Connect action
      setConnecting(true);
      setConnError(null);
      try {
        const target = connType === 'UDP' ? `udpin:0.0.0.0:${udpPort}` : selectedPort;
        const res = await api.connectMAVLink(target, baudRate, connType);
        if (res?.success || res?.status === 'CONNECTED' || res?.status === 'CONNECTING') {
          setIsConnectedLocally(true);
          await api.setTelemetrySource('APM_MAVLINK');
          await fetchPortsAndDiag();
        } else {
          setConnError(res?.status || 'CONNECTION FAILED');
          setIsConnectedLocally(false);
        }
      } catch (err: any) {
        setConnError('CONNECTION FAILED');
        setIsConnectedLocally(false);
      } finally {
        setConnecting(false);
      }
    }
  };

  const unreadAlertCount = activeAlerts.length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-3.5 h-14 flex items-center shadow-md select-none transition-colors duration-200">
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        {/* ========================================================
            1. LEFT: MENU TOGGLE (☰), ALERTS (🔔), THEME (☀/🌙), BRAND
           ======================================================== */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Menu Button (☰) */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Alert Bell with unread counter */}
          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1"
            title="Open Alerts Drawer"
          >
            <Bell className="w-4 h-4" />
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              unreadAlertCount > 0 
                ? 'bg-rose-500 text-white animate-pulse' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {unreadAlertCount}
            </span>
          </button>

          {/* Theme Toggle (☀ / 🌙) */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-300" />
            )}
          </button>

          {/* Brand Identity */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            <div className="bg-sky-600 text-slate-950 p-1.5 rounded-md flex items-center justify-center font-black">
              <Zap className="w-3.5 h-3.5 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-wider text-white">FALCONZ</h1>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 tracking-wider">
                  QUADCOPTER GCS
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono hidden sm:block">
                4-BLDC Real-Time Monitoring
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. CENTER: HARDWARE CONNECTION [ PORT ▼ ] [ BAUD ▼ ] [ CONNECT ]
           ======================================================== */}
        <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 px-2 py-1 rounded-lg shadow-inner h-10 shrink-0">
          {/* Connection Mode (Serial vs UDP) */}
          <div className="flex bg-slate-900 rounded p-0.5 text-[9px] font-mono font-semibold">
            <button
              onClick={() => setConnType('USB_SERIAL')}
              className={`px-2 py-0.5 rounded transition-colors ${
                connType === 'USB_SERIAL' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Connect to physical connected telemetry COM port"
            >
              PHYSICAL SERIAL
            </button>
            <button
              onClick={() => setConnType('UDP')}
              className={`px-2 py-0.5 rounded transition-colors ${
                connType === 'UDP' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Connect to UDP Demo / SITL Telemetry stream"
            >
              UDP (DEMO / SITL)
            </button>
          </div>

          {/* PORT DROPDOWN / INPUT */}
          {connType === 'USB_SERIAL' ? (
            <div className="flex items-center gap-1">
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isConnected || connecting || ports.length === 0}
                className="bg-slate-900 border border-slate-700 text-sky-300 text-xs font-mono font-bold rounded px-2 py-1 outline-hidden focus:border-sky-500 disabled:opacity-60 max-w-[190px] truncate"
              >
                {ports.length > 0 ? (
                  ports.map((p) => (
                    <option key={p.port} value={p.port}>
                      {p.port} {p.description ? `(${p.description.slice(0, 18)})` : ''}
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
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">UDP PORT:</span>
              <input
                type="number"
                value={udpPort}
                onChange={(e) => setUdpPort(Number(e.target.value))}
                disabled={isConnected || connecting}
                placeholder="14550"
                className="w-18 bg-slate-900 border border-slate-700 text-sky-300 text-xs font-mono font-bold rounded px-1.5 py-1 outline-hidden focus:border-sky-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* BAUD RATE DROPDOWN */}
          {connType === 'USB_SERIAL' && (
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={isConnected || connecting || ports.length === 0}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono rounded px-2 py-1 outline-hidden focus:border-sky-500 disabled:opacity-50"
            >
              <option value={115200}>115200 (APM USB)</option>
              <option value={57600}>57600 (Telemetry Radio)</option>
              <option value={921600}>921600 (High Speed)</option>
              <option value={576000}>576000</option>
              <option value={38400}>38400</option>
            </select>
          )}

          {/* SINGLE CONNECT / DISCONNECT BUTTON */}
          <button
            onClick={handleToggleConnect}
            disabled={connecting || (connType === 'USB_SERIAL' && !isConnected && ports.length === 0)}
            className={`text-xs font-bold font-mono px-3 py-1 rounded flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 ${
              isConnected
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : connecting
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Power className="w-3 h-3" />
            {connecting 
              ? (isConnected ? 'DISCONNECTING...' : 'CONNECTING...') 
              : isConnected 
              ? 'DISCONNECT' 
              : 'CONNECT'}
          </button>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1 px-1.5 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? isHeartbeatOk ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400 animate-pulse'
                  : connecting
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-600'
              }`}
            />
            <span className="font-bold text-slate-300">
              {isConnected ? (
                isHeartbeatOk ? (
                  <span className="text-emerald-400">CONNECTED</span>
                ) : (
                  <span className="text-sky-400">{connType === 'UDP' ? 'UDP LISTENING' : 'CONNECTED'}</span>
                )
              ) : connError ? (
                <span className="text-rose-400">{connError}</span>
              ) : (
                <span className="text-slate-400">DISCONNECTED</span>
              )}
            </span>
          </div>
        </div>

        {/* ========================================================
            3. RIGHT: TELEMETRY SOURCE, SAFETY STATUS & E-STOP
           ======================================================== */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Source Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[9px] font-mono">
            <button
              onClick={() => setSource('APM_MAVLINK')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                !isSimMode ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              APM HARDWARE
            </button>
            <button
              onClick={() => setSource('SIMULATION')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                isSimMode ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              TESTBED SIM
            </button>
          </div>

          {/* Emergency Stop Button */}
          {isEmergency ? (
            <button
              onClick={resetEmergencyStop}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              RESET E-STOP
            </button>
          ) : (
            <button
              onClick={triggerEmergencyStop}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold px-2.5 py-1.5 rounded flex items-center gap-1 shadow-sm transition-all animate-pulse"
              title="Immediate software propulsion cutoff interlock (Does not replace physical switch)"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              EMERGENCY STOP
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
