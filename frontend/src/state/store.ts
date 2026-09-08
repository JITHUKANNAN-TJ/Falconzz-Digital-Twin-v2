import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  FullSystemState, 
  ScenarioType, 
  TelemetrySource, 
  ControlMode, 
  DemoState, 
  SystemAlert 
} from '../types/telemetry';
import { wsService } from '../services/websocket';
import { api } from '../services/api';

interface AppContextType {
  systemState: FullSystemState | null;
  wsConnected: boolean;
  history: FullSystemState[];
  demoState: DemoState | null;
  activePage: string;
  setActivePage: (page: string) => void;
  
  // Theme & Layout
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Alerts
  activeAlerts: SystemAlert[];
  dismissAlert: (id: string) => void;
  alertDrawerOpen: boolean;
  setAlertDrawerOpen: (open: boolean) => void;

  // Technical Help Modal
  helpModalParam: string | null;
  setHelpModalParam: (param: string | null) => void;

  // Ask FALCONZ AI Assistant
  askFalconzOpen: boolean;
  setAskFalconzOpen: (open: boolean) => void;

  // Hardware & Propulsion Actions
  setThrottle: (throttle: number, load?: number) => Promise<void>;
  setScenario: (scenario: ScenarioType, severity?: number) => Promise<void>;
  setSource: (source: TelemetrySource) => Promise<void>;
  setControlMode: (mode: ControlMode) => Promise<void>;
  triggerEmergencyStop: () => Promise<void>;
  resetEmergencyStop: () => Promise<void>;
  refreshDemoState: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [systemState, setSystemState] = useState<FullSystemState | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [history, setHistory] = useState<FullSystemState[]>([]);
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [activePage, setActivePage] = useState<string>('overview');

  // Theme setup (default dark for aerospace GCS)
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('falconz_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState<boolean>(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [helpModalParam, setHelpModalParam] = useState<string | null>(null);
  const [askFalconzOpen, setAskFalconzOpen] = useState<boolean>(false);

  // Apply theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('falconz_theme', theme);
  }, [theme]);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    wsService.connect();

    const unsubStatus = wsService.subscribeStatus((connected) => {
      setWsConnected(connected);
    });

    const unsubMsg = wsService.subscribe((state) => {
      setSystemState(state);
      setHistory((prev) => {
        const next = [...prev, state];
        // Keep up to 3000 points ≈ 25m at 2Hz to support 5m/10m/20m windows
        return next.length > 3000 ? next.slice(-3000) : next;
      });
    });

    // Initial fallback REST poll
    api.getFullSystemState().then(setSystemState).catch(() => {});
    api.getDemoState().then(setDemoState).catch(() => {});

    const demoPollInterval = setInterval(() => {
      api.getDemoState().then(setDemoState).catch(() => {});
    }, 2000);

    return () => {
      unsubStatus();
      unsubMsg();
      clearInterval(demoPollInterval);
    };
  }, []);

  // Compute live backend-derived alerts without fake data
  const activeAlerts = useMemo<SystemAlert[]>(() => {
    if (!systemState) return [];
    const alerts: SystemAlert[] = [];
    const tel = systemState.telemetry;
    const intel = systemState.intelligence;
    const now = tel.timestamp || Date.now() / 1000;

    // 1. Emergency Stop Active
    if (systemState.emergency_stop_active || systemState.safety_state === 'EMERGENCY') {
      alerts.push({
        id: 'alert_estop',
        timestamp: now,
        level: 'CRITICAL',
        target: 'GLOBAL PROPULSION',
        event: 'Emergency Stop Interlock Active',
        evidence: 'Propulsion output commands cut off due to operator or safety guard trigger.',
        action: 'Inspect hardware, ensure area is clear, and reset software/physical E-Stop.'
      });
    }

    // 2. Critical Safety Threshold Violations
    const tempC = tel.temperature_c ?? 25.0;
    if (tempC > 75) {
      alerts.push({
        id: 'alert_temp_crit',
        timestamp: now,
        level: 'CRITICAL',
        target: 'MOTOR / STATOR',
        parameter: 'Temperature',
        measured: `${tempC.toFixed(1)} °C`,
        limit: '75.0 °C',
        event: 'Motor Stator Temperature Exceeded Critical Safety Limit',
        evidence: `Measured ${tempC.toFixed(1)} °C vs 75.0 °C safety threshold.`,
        action: 'STOP MOTOR OPERATION / FOLLOW SAFE SHUTDOWN PROCEDURE.'
      });
    } else if (tempC > 60) {
      alerts.push({
        id: 'alert_temp_warn',
        timestamp: now,
        level: 'WARNING',
        target: 'MOTOR / STATOR',
        parameter: 'Temperature',
        measured: `${tempC.toFixed(1)} °C`,
        limit: '60.0 °C',
        event: 'Motor Temperature Elevation Detected',
        evidence: `Measured temperature elevated at ${tempC.toFixed(1)} °C.`,
        action: 'Reduce throttle load and verify air cooling flow.'
      });
    }

    const vibG = tel.vibration_rms_g ?? 0.05;
    if (vibG > 0.45) {
      alerts.push({
        id: 'alert_vib_crit',
        timestamp: now,
        level: 'CRITICAL',
        target: 'PROPULSION IMU',
        parameter: 'Vibration',
        measured: `${vibG.toFixed(3)} g`,
        limit: '0.450 g',
        event: 'Excessive Structural / Motor Vibration Magnitude',
        evidence: `IMU vibration level is ${vibG.toFixed(3)} g exceeding 0.450 g limit.`,
        action: 'STOP OPERATION. Inspect propeller balance, motor bearings and arm mounting.'
      });
    } else if (vibG > 0.25) {
      alerts.push({
        id: 'alert_vib_warn',
        timestamp: now,
        level: 'WARNING',
        target: 'PROPULSION IMU',
        parameter: 'Vibration',
        measured: `${vibG.toFixed(3)} g`,
        limit: '0.250 g',
        event: 'Elevated Vibration Baseline',
        evidence: `Vibration reading ${vibG.toFixed(3)} g above nominal baseline.`,
        action: 'Check propeller track and mechanical fasteners at next maintenance.'
      });
    }

    const currA = tel.current_a ?? 0.0;
    if (currA > 18.0) {
      alerts.push({
        id: 'alert_curr_crit',
        timestamp: now,
        level: 'CRITICAL',
        target: 'ESC ELECTRICAL',
        parameter: 'Current',
        measured: `${currA.toFixed(2)} A`,
        limit: '18.00 A',
        event: 'ESC Overcurrent Safety Exceeded',
        evidence: `Current draw ${currA.toFixed(2)} A exceeds 18.0 A continuous safe threshold.`,
        action: 'Reduce throttle immediately. Inspect for aerodynamic stall or motor short.'
      });
    }

    // 3. Multi-Motor Imbalance Alert (Channel Deviation)
    if (tel.rpm_imbalance_pct !== null && tel.rpm_imbalance_pct !== undefined && tel.rpm_imbalance_pct > 15) {
      alerts.push({
        id: 'alert_rpm_imbalance',
        timestamp: now,
        level: 'WARNING',
        target: '4-MOTOR CLUSTER',
        event: 'Motor Performance Deviation Detected',
        evidence: `Cross-motor RPM deviation of ${(tel.rpm_imbalance_pct || 0).toFixed(0)} RPM between propulsion channels.`,
        action: 'Inspect ESC calibration, propeller condition, and telemetry wiring.'
      });
    }

    // 4. Anomaly & ML Fault Prediction Alert
    if (intel.is_anomaly && intel.predicted_fault && intel.predicted_fault !== 'NORMAL') {
      const isHighRisk = intel.anomaly_severity === 'CRITICAL' || intel.fault_severity === 'CRITICAL';
      const faultName = intel.predicted_fault.replace(/_/g, ' ');
      const faultConf = (intel.fault_confidence_pct ?? 90).toFixed(0);
      alerts.push({
        id: 'alert_ml_pred',
        timestamp: now,
        level: isHighRisk ? 'CRITICAL' : 'WARNING',
        target: intel.affected_subsystem || 'BLDC PROPULSION',
        event: `${faultName} (${faultConf}% Confidence)`,
        evidence: intel.xai_why || 'Telemetry residuals deviate significantly from learned operating baseline.',
        action: intel.xai_recommendation || 'Inspect propulsion subsystem before continued flight.'
      });
    }

    // 5. MAVLink / Telemetry Link State Alert
    if (tel.source_type === 'APM_MAVLINK') {
      if (tel.connection_status === 'CONNECTED' && tel.heartbeat_received) {
        alerts.push({
          id: 'alert_link_ok',
          timestamp: now,
          level: 'INFO',
          target: 'APM MAVLINK',
          event: 'APM MAVLink Connection Active',
          evidence: `Heartbeat verified at ${tel.packet_rate_hz || 10} Hz.`,
          action: 'Telemetry streaming live from hardware.'
        });
      } else if (tel.connection_status === 'STALE') {
        alerts.push({
          id: 'alert_link_stale',
          timestamp: now,
          level: 'WARNING',
          target: 'APM MAVLINK',
          event: 'MAVLink Telemetry Stream Stale',
          evidence: `No valid packet received in the last ${(tel.telemetry_age_ms || 3000) / 1000}s.`,
          action: 'Check USB serial / radio link and flight controller power.'
        });
      }
    }

    return alerts.filter(a => !dismissedAlertIds.has(a.id));
  }, [systemState, dismissedAlertIds]);

  const dismissAlert = (id: string) => {
    setDismissedAlertIds((prev) => new Set([...prev, id]));
  };

  const setThrottle = async (throttle: number, load?: number) => {
    await api.setThrottle(throttle, load);
  };

  const setScenario = async (scenario: ScenarioType, severity = 0.5) => {
    await api.setScenario(scenario, severity);
  };

  const setSource = async (source: TelemetrySource) => {
    await api.setTelemetrySource(source);
  };

  const setControlMode = async (mode: ControlMode) => {
    await api.setControlMode(mode);
  };

  const triggerEmergencyStop = async () => {
    await api.triggerEmergencyStop();
  };

  const resetEmergencyStop = async () => {
    await api.resetEmergencyStop();
  };

  const refreshDemoState = async () => {
    const d = await api.getDemoState();
    setDemoState(d);
  };

  return React.createElement(
    AppContext.Provider,
    {
      value: {
        systemState,
        wsConnected,
        history,
        demoState,
        activePage,
        setActivePage,
        theme,
        setTheme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        activeAlerts,
        dismissAlert,
        alertDrawerOpen,
        setAlertDrawerOpen,
        helpModalParam,
        setHelpModalParam,
        askFalconzOpen,
        setAskFalconzOpen,
        setThrottle,
        setScenario,
        setSource,
        setControlMode,
        triggerEmergencyStop,
        resetEmergencyStop,
        refreshDemoState
      }
    },
    children
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within an AppProvider');
  return context;
};

