import React, { useState, useEffect } from 'react';
import { Menu, Bell, Sun, Moon, Radio, Power, RefreshCw } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, toggleSidebar, activeAlerts, setAlertDrawerOpen } = useAppStore();
  const [diag, setDiag] = useState<any>(null);
  const [isConnectedLocally, setIsConnectedLocally] = useState<boolean>(false);
  const [ports, setPorts] = useState<any[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(57600);
  const [connType, setConnType] = useState<'USB_SERIAL' | 'UDP'>('USB_SERIAL');
  const [udpIp, setUdpIp] = useState<string>('0.0.0.0');
  const [udpPort, setUdpPort] = useState<number>(14550);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchPortsAndDiag = async () => {
    try {
      const [p, d] = await Promise.all([api.getSerialPorts(), api.getAPMDiagnostics()]);
      if (p?.ports && Array.isArray(p.ports)) {
        setPorts(p.ports);
        if (p.ports.length > 0) {
          const names = p.ports.map((x: any) => x.port);
          if (!selectedPort || !names.includes(selectedPort)) {
            setSelectedPort(p.ports[0].port);
            const desc = (p.ports[0].description || '').toLowerCase();
            if (desc.includes('cp210') || desc.includes('radio') || desc.includes('3dr')) setBaudRate(57600);
          }
        } else setSelectedPort('');
      }
      if (d) {
        setDiag(d);
        if (d.apm_connection === 'CONNECTED') setIsConnectedLocally(true);
        else if (d.apm_connection === 'DISCONNECTED') setIsConnectedLocally(false);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPortsAndDiag();
    const id = setInterval(fetchPortsAndDiag, 1500);
    return () => clearInterval(id);
  }, [selectedPort]);

  const isConnected = isConnectedLocally || diag?.apm_connection === 'CONNECTED';
  const heartbeatOk = diag?.heartbeat === 'RECEIVED';
  const unread = activeAlerts.length;

  const handleConnect = async () => {
    if (connType === 'USB_SERIAL' && !selectedPort) return;
    setLoading(true);
    try {
      const target = connType === 'UDP' ? `udpin:${udpIp}:${udpPort}` : selectedPort;
      const res: any = await api.connectMAVLink(target, baudRate, connType);
      if (res?.success || res?.status === 'CONNECTED' || res?.status === 'CONNECTING') {
        await api.setTelemetrySource('APM_MAVLINK' as any);
      }
      await fetchPortsAndDiag();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.disconnectMAVLink();
      await api.setTelemetrySource('SIMULATION' as any);
      await fetchPortsAndDiag();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center h-14 px-3 sm:px-6 border-b select-none" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        {/* LEFT — menu + brand + live */}
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={toggleSidebar} className="w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor: 'var(--border)', color: 'var(--text)' }} aria-label="Toggle menu">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5 pl-3 ml-1 border-l" style={{ borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-md bg-black dark:bg-white flex items-center justify-center">
              <span className="text-[11px] font-bold text-white dark:text-black tracking-widest">F</span>
            </div>
            <span className="text-[13px] font-semibold tracking-[0.16em]" style={{ color: 'var(--text)' }}>FALCONZ</span>
            <span className="hidden sm:inline text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>GCS</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l text-xs" style={{ borderColor: 'var(--border)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: isConnected ? (heartbeatOk ? 'var(--text)' : '#a3a3a3') : '#d4d4d4' }} />
            <span className="font-medium tracking-wide text-xs" style={{ color: isConnected ? 'var(--text)' : 'var(--text-faint)' }}>
              {isConnected ? (heartbeatOk ? 'LIVE' : 'LINK') : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* CENTER — connect in interface */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full border" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1">
            <button onClick={() => setConnType('USB_SERIAL')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${connType==='USB_SERIAL' ? 'bg-black dark:bg-white text-white dark:text-black' : ''}`} style={connType!=='USB_SERIAL'?{color:'var(--text-muted)'}:{}}>COM</button>
            <button onClick={() => setConnType('UDP')} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${connType==='UDP' ? 'bg-black dark:bg-white text-white dark:text-black' : ''}`} style={connType!=='UDP'?{color:'var(--text-muted)'}:{}}>UDP</button>
          </div>
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
          {connType === 'USB_SERIAL' ? (
            <>
              <select value={selectedPort} onChange={e=>setSelectedPort(e.target.value)} disabled={isConnected || loading} className="h-7 text-xs rounded-full border px-2.5 bg-transparent max-w-[150px] truncate disabled:opacity-50" style={{ borderColor:'var(--border)', color:'var(--text)' }}>
                {ports.length>0 ? ports.map((p:any)=><option key={p.port} value={p.port}>{p.port} {p.description?`(${p.description.slice(0,18)})`:''}</option>) : <option value="" disabled>No ports</option>}
              </select>
              <select value={baudRate} onChange={e=>setBaudRate(Number(e.target.value))} disabled={isConnected || loading} className="h-7 text-xs rounded-full border px-2 bg-transparent disabled:opacity-50" style={{ borderColor:'var(--border)', color:'var(--text-muted)' }}>
                <option value={57600}>57600</option><option value={115200}>115200</option><option value={9600}>9600</option><option value={921600}>921600</option>
              </select>
              <button onClick={fetchPortsAndDiag} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor:'var(--border)', color:'var(--text-faint)' }} title="Refresh ports">
                <RefreshCw className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <input value={udpIp} onChange={e=>setUdpIp(e.target.value)} disabled={isConnected||loading} placeholder="0.0.0.0" className="h-7 w-24 text-xs rounded-full border px-2.5 bg-transparent disabled:opacity-50" style={{ borderColor:'var(--border)', color:'var(--text)' }} />
              <span style={{ color:'var(--text-faint)' }}>:</span>
              <input type="number" value={udpPort} onChange={e=>setUdpPort(Number(e.target.value))} disabled={isConnected||loading} className="h-7 w-20 text-xs rounded-full border px-2 bg-transparent disabled:opacity-50" style={{ borderColor:'var(--border)', color:'var(--text)' }} />
            </div>
          )}
          {isConnected ? (
            <button onClick={handleDisconnect} disabled={loading} className="h-7 px-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
              <Power className="w-3 h-3" /> Disconnect
            </button>
          ) : (
            <button onClick={handleConnect} disabled={loading || (connType==='USB_SERIAL' && ports.length===0)} className="h-7 px-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
              <Radio className="w-3 h-3" /> {loading ? '...' : 'Connect'}
            </button>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">
          <a href="#hardware" onClick={e=>{e.preventDefault(); document.dispatchEvent(new CustomEvent('falconz:navigate',{detail:'hardware-center'}));}} className="lg:hidden text-[11px] px-2.5 py-1 rounded-full border lg:hidden" style={{ borderColor:'var(--border)', color:'var(--text-muted)'}}>
            Connect
          </a>
          <button onClick={() => setAlertDrawerOpen(true)} className="relative w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor:'var(--border)', color:'var(--text-muted)'}} aria-label="Alerts">
            <Bell className="w-4 h-4" />
            {unread>0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium flex items-center justify-center">{unread}</span>}
          </button>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-md flex items-center justify-center border hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor:'var(--border)', color:'var(--text-muted)'}} aria-label="Toggle theme">
            {theme==='dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
