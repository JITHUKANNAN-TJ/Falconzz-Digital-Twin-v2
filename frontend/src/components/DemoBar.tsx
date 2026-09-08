import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const DemoBar: React.FC = () => {
  const { demoState, refreshDemoState } = useAppStore();
  if (!demoState) return null;
  const currentIdx = demoState.current_phase_index;
  const isRunning = demoState.is_running;
  const handleStart = async () => { await api.startDemo(true); await refreshDemoState(); };
  const handleStop = async () => { await api.stopDemo(); await refreshDemoState(); };
  const handleNext = async () => { await api.nextDemoPhase(); await refreshDemoState(); };
  const handlePrev = async () => { await api.prevDemoPhase(); await refreshDemoState(); };
  const handleJump = async (idx: number) => { await api.jumpToDemoPhase(idx); await refreshDemoState(); };

  return (
    <div className="aerospace-card p-4 sm:p-5 mb-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-sky-600/20">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--accent)' }}>SIH 2026 • ONE-CLICK DEMO</span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full border" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'rgba(2,132,199,0.15)' }}>{currentIdx+1}/7 PHASES</span>
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight leading-tight mt-0.5" style={{ color: 'var(--text)' }}>{demoState.current_phase?.title || 'Phase 1: Normal Baseline'}</h2>
            <p className="text-[12px] leading-relaxed mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{demoState.current_phase?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handlePrev} className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}><SkipBack className="w-4 h-4" /></button>
          {isRunning ? (
            <button onClick={handleStop} className="flex items-center gap-1.5 px-4 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold tracking-wide shadow-sm transition-colors"><Pause className="w-3.5 h-3.5" /> PAUSE</button>
          ) : (
            <button onClick={handleStart} className="flex items-center gap-1.5 px-4 h-8 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-[12px] font-bold tracking-wide shadow-sm transition-colors"><Play className="w-3.5 h-3.5 fill-white" /> START DEMO</button>
          )}
          <button onClick={handleNext} className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:opacity-80" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}><SkipForward className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {demoState.all_phases.map((phase: any, idx: number) => {
          const isPassed = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <button key={idx} onClick={() => handleJump(idx)}
              className={`text-left p-2.5 rounded-xl border transition-all text-[11px] font-medium leading-tight ${isCurrent ? 'shadow-sm scale-[1.02]' : 'hover:opacity-90'}`}
              style={
                isCurrent
                  ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                  : isPassed
                  ? { background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }
                  : { background: 'color-mix(in srgb, var(--bg) 70%, var(--card))', color: 'var(--text-faint)', borderColor: 'var(--border)' }
              }>
              <div className="flex items-center gap-1 mb-1">
                {isPassed ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCurrent ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-800 border'}`} style={!isCurrent?{borderColor:'var(--border)'}:{}}>{idx+1}</span>}
              </div>
              <span className="block truncate font-semibold">{phase.title.split(':')[1]?.trim() || `Phase ${idx+1}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
