import React from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AlertDrawer } from './components/AlertDrawer';
import { ParameterHelpModal } from './components/ParameterHelpModal';
import { AskFalconzModal } from './components/AskFalconzModal';
import { useAppStore } from './state/store';

// Pages
import { OverviewPage } from './pages/1_Overview';
import { LiveDigitalTwinPage } from './pages/2_LiveDigitalTwin';
import { HealthIntelligencePage } from './pages/3_HealthIntelligence';
import { FaultPredictionPage } from './pages/4_FaultPrediction';
import { RULForecastPage } from './pages/5_RULForecast';
import { MissionSimulatorPage } from './pages/6_MissionSimulator';
import { MissionReplayPage } from './pages/7_MissionReplay';
import { MaintenanceAdvisoryPage } from './pages/8_MaintenanceAdvisory';
import { DataTelemetryPage } from './pages/9_DataTelemetry';
import { SystemArchitecturePage } from './pages/10_SystemArchitecture';
import { MaleUavMappingPage } from './pages/11_MaleUavMapping';
import { HardwareCenterPage } from './pages/12_HardwareCenter';
import { SafetyCenterPage } from './pages/13_SafetyCenter';
import { ModelEvaluationPage } from './pages/14_ModelEvaluation';
import { SettingsPage } from './pages/15_Settings';

export const App: React.FC = () => {
  const { activePage } = useAppStore();

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />;
      case 'live-twin':
        return <LiveDigitalTwinPage />;
      case 'health-intel':
        return <HealthIntelligencePage />;
      case 'fault-prediction':
        return <FaultPredictionPage />;
      case 'rul-forecast':
        return <RULForecastPage />;
      case 'mission-sim':
        return <MissionSimulatorPage />;
      case 'mission-replay':
        return <MissionReplayPage />;
      case 'maintenance-advisory':
        return <MaintenanceAdvisoryPage />;
      case 'telemetry-data':
        return <DataTelemetryPage />;
      case 'system-architecture':
        return <SystemArchitecturePage />;
      case 'male-uav-mapping':
        return <MaleUavMappingPage />;
      case 'hardware-center':
        return <HardwareCenterPage />;
      case 'safety-center':
        return <SafetyCenterPage />;
      case 'model-evaluation':
        return <ModelEvaluationPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto w-full">
          <div className="max-w-[1280px] mx-auto w-full animate-fadeInUp" key={activePage}>
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Global Modals & Floating Assistants */}
      <AlertDrawer />
      <ParameterHelpModal />
      <AskFalconzModal />
    </div>
  );
};
