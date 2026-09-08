import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Radio, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleFallbackSimulation = async () => {
    try {
      await api.disconnectMAVLink();
      await api.setTelemetrySource('SIMULATION' as any);
    } catch (e) {
      console.error(e);
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-sans tracking-wide">
                  FALCONZ GCS — Runtime Intercept Guard
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Telemetry rendering exception safely prevented blank screen.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-rose-300 overflow-x-auto">
              <span className="text-slate-500 block mb-1">Diagnostic Exception:</span>
              <code>{this.state.error?.message || 'Unknown runtime error'}</code>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This usually occurs if an unexpected telemetry payload format arrived from the serial COM port or a sensor channel was uninitialized. You can recover immediately:
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Render
              </button>

              <button
                onClick={this.handleFallbackSimulation}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Fallback to Safe Simulation Mode
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              >
                Reload GCS
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
