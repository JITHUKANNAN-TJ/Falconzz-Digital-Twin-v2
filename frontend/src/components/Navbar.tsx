import React, { useState, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Zap, Power, RefreshCw } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { systemState, theme, toggleTheme, toggleSidebar, activeAlerts, setAlertDrawerOpen, setSource } = useAppStore();
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(57600);
  const [connProtocol, setConnProtocol] = useState<'COM_PORT' | 'UDP'>('COM_PORT');
  const [udpPort, setUdpPort] = useState<number>(14550);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [diag, setDiag] = useState<any>(null);
  const [isConnectedLocally, setIsConnectedLocally] = useState<boolean>(false);

  const fetchPortsAndDiag = async () => {
    try {
      const [portsRes, diagRes] = await Promise.all([api.getSerialPorts(), api.getAPMDiagnostics()]);
      if (portsRes?.ports && Array.isArray(portsRes.ports)) {
        setPorts(portsRes.ports);
        if (portsRes.ports.length > 0) {
          const portNames = portsRes.ports.map((p: any) => p.port);
          if (!selectedPort || !portNames.includes(selectedPort)) setSelectedPort(portsRes.ports[0].port);
        } else setSelectedPort('');
      } else { setPorts([]); setSelectedPort(''); }
      if (diagRes) {
        setDiag(diagRes);
        if (diagRes.apm_connection === 'CONNECTED') setIsConnectedLocally(true);
        else if (diagRes.apm_connection === 'DISCONNECTED') setIsConnectedLocally(false);
      }
    } catch {}
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
      setConnecting(true); setIsConnectedLocally(false); setConnError(null);
      try { await api.disconnectMAVLink(); await api.setTelemetrySource('SIMULATION' as any); await fetchPortsAndDiag(); }
      catch (err) { console.error(err); } finally { setConnecting(false); }
    } else {
      if (connProtocol === 'COM_PORT' && !selectedPort) { setConnError('NO PORT SELECTED'); return; }
      setConnecting(true); setConnError(null);
      try {
        const target = connProtocol === 'UDP' ? `udpin:0.0.0.0:${udpPort}` : selectedPort;
        const connType = connProtocol === 'UDP' ? 'UDP' : 'USB_SERIAL';
        const res: any = await api.connectMAVLink(target, baudRate, connType);
        if (res?.success || res?.status === 'CONNECTED' || res?.status === 'CONNECTING') {
          setIsConnectedLocally(true); await api.setTelemetrySource('APM_MAVLINK' as any);
        } else { setConnError(res?.error ? res.error.slice(0, 28) : (res?.status || 'FAILED')); setIsConnectedLocally(false); }
        await fetchPortsAndDiag();
      } catch (err: any) { setConnError(err?.message ? err.message.slice(0, 28) : 'FAILED'); setIsConnectedLocally(false); }
      finally { setConnecting(false); }
    }
  };

  const unread = activeAlerts.length;

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-14 px-3 sm:px-5 border-b select-none glass"
      style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        {/* LEFT */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Toggle sidebar"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>

          <button
            onClick={() => setAlertDrawerOpen(true)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Alerts"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none animate-pulse-soft">
                {unread}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'}`}
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-500" /> : <Moon className="w-[18px] h-[18px] text-slate-500" />}
          </button>

          <div className="flex items-center gap-2.5 pl-3 ml-1 border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="hidden sm:block leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold tracking-[0.12em]" style={{ color: 'var(--text)' }}>FALCONZ</span>
                <span className="hidden md:inline-flex text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50">QUADCOPTER GCS</span>
              </div>
              <span className="text-[10px] tracking-wide hidden lg:block" style={{ color: 'var(--text-faint)' }}>4-BLDC Digital Twin • Minimal</span>
            </div>
          </div>
        </div>

        {/* CENTER — connection */}
        <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex p-0.5 rounded-lg gap-0.5" style={{ background: 'color-mix(in srgb, var(--bg) 100%, transparent)', border: '1px solid var(--border)' }}>
            {(['COM_PORT','UDP'] as const).map(p => (
              <button key={p} onClick={() => setConnProtocol(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-colors ${connProtocol===p ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-white dark:hover:bg-slate-800'}`}
                style={connProtocol!==p ? { color: 'var(--text-muted)' } : {}}
              >{p === 'COM_PORT' ? 'COM' : 'UDP'}</button>
            ))}
          </div>

          {connProtocol === 'COM_PORT' ? (
            <div className="flex items-center gap-1">
              <select value={selectedPort} onChange={e=>setSelectedPort(e.target.value)} disabled={isConnected || connecting || ports.length===0}
                className="h-7 text-[11px] font-medium rounded-lg px-2 border outline-none max-w-[160px] truncate bg-transparent disabled:opacity-60"
                style={{ borderColor:'var(--border)', color:'var(--text)' }}>
                {ports.length>0 ? ports.map((p:any)=><option key={p.port} value={p.port}>{p.port}</option>) : <option value="" disabled>No ports</option>}
              </select>
              <button onClick={fetchPortsAndDiag} className="w-7 h-7 rounded-lg border flex items-center justify-center hover:opacity-80" style={{ borderColor:'var(--border)', color:'var(--text-faint)' }}><RefreshCw className="w-3.5 h-3.5" /></button>
              <select value={baudRate} onChange={e=>setBaudRate(Number(e.target.value))} disabled={isConnected || connecting}
                className="h-7 text-[11px] font-medium rounded-lg px-2 border outline-none bg-transparent disabled:opacity-60"
                style={{ borderColor:'var(--border)', color:'var(--text-muted)' }}>
                <option value={57600}>57600</option><option value={115200}>115200</option><option value={9600}>9600</option><option value={38400}>38400</option><option value={921600}>921600</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium" style={{ color:'var(--text-faint)' }}>UDP</span>
              <input type="number" value={udpPort} onChange={e=>setUdpPort(Number(e.target.value))} disabled={isConnected||connecting}
                className="h-7 w-20 text-[11px] font-medium rounded-lg px-2 border outline-none bg-transparent"
                style={{ borderColor:'var(--border)', color:'var(--text)' }} />
            </div>
          )}

          <button onClick={handleToggleConnect} disabled={connecting || (connProtocol==='COM_PORT' && !isConnected && ports.length===0)}
            className={`h-7 px-3 rounded-lg text-[11px] font-bold tracking-wide flex items-center gap-1.5 transition-colors disabled:opacity-50 ${isConnected ? 'bg-rose-600 hover:bg-rose-700 text-white' : connecting ? 'bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
            <Power className="w-3 h-3" />{connecting ? '…' : isConnected ? 'DISCONNECT' : 'CONNECT'}
          </button>

          <div className="flex items-center gap-1.5 pl-2 ml-1 border-l text-[11px] font-medium" style={{ borderColor:'var(--border)', color:'var(--text-muted)' }}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? (isHeartbeatOk ? 'bg-emerald-500 animate-pulse-soft' : 'bg-sky-500 animate-pulse-soft') : connecting ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <span className="hidden 2xl:inline truncate max-w-[150px] font-semibold">
              {isConnected ? (isHeartbeatOk ? <span className="text-emerald-600 dark:text-emerald-400">LIVE</span> : <span className="text-sky-600 dark:text-sky-400">STANDBY</span>) : connError ? <span className="text-rose-500">{connError}</span> : <span style={{ color:'var(--text-faint)' }}>OFFLINE</span>}
            </span>
          </div>
        </div>

        {/* Mobile connection collapsed indicator (visible < xl) */}
        <div className="flex xl:hidden items-center gap-1.5 text-[11px] font-semibold">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse-soft' : 'bg-slate-300'}`} />
          <span style={{ color: isConnected ? 'var(--success)' : 'var(--text-faint)' }}>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex p-0.5 rounded-full border" style={{ background:'var(--bg)', borderColor:'var(--border)' }}>
            <button onClick={()=>setSource('APM_MAVLINK' as any)} className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors ${!isSimMode ? 'bg-sky-600 text-white shadow-sm' : ''}`} style={isSimMode?{color:'var(--text-muted)'}:{}}>APM</button>
            <button onClick={()=>setSource('SIMULATION' as any)} className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors ${isSimMode ? 'bg-amber-500 text-white shadow-sm' : ''}`} style={!isSimMode?{color:'var(--text-muted)'}:{}}>SIM</button>
          </div>
        </div>
      </div>
    </header>
  );
};
