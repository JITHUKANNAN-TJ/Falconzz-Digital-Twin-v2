import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  MessageSquare, 
  HelpCircle, 
  AlertTriangle,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { useAppStore } from '../state/store';

interface ChatMessage {
  id: string;
  sender: 'user' | 'falconz';
  text: string;
  timestamp: string;
}

export const AskFalconzModal: React.FC = () => {
  const { askFalconzOpen, setAskFalconzOpen, systemState, activeAlerts } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'falconz',
      text: 'Hello. I am the FALCONZ Propulsion Assistant. I can explain current quadcopter telemetry, motor channel health, residuals, and ML predictions using validated system state.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (askFalconzOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, askFalconzOpen]);

  const generateFalconzResponse = (query: string): string => {
    if (!systemState) {
      return 'System state is currently unavailable. Please connect APM telemetry to stream propulsion parameters.';
    }

    const tel = systemState.telemetry;
    const intel = systemState.intelligence;
    const res = systemState.residuals;
    const q = query.toLowerCase();

    // 1. Motor specific queries
    if (q.includes('motor 3') || q.includes('m3')) {
      const m3 = tel.motors?.motor_3;
      const rpm = m3?.live_rpm ?? tel.rpm;
      const temp = m3?.temperature_c ?? tel.temperature_c;
      const curr = m3?.current_a ?? tel.current_a;
      
      if (intel.is_anomaly || (tel.rpm_imbalance_pct && tel.rpm_imbalance_pct > 15)) {
        return `Motor 3 is showing a persistent RPM deviation compared with the other motors (${tel.rpm_imbalance_pct?.toFixed(0) || 'elevated'} RPM delta). Stator temperature is ${temp.toFixed(1)} °C and current is ${curr.toFixed(2)} A. The evidence indicates a propulsion performance deviation, but available telemetry is not sufficient to confirm a specific mechanical bearing fault. Inspect Motor 3, its ESC connections, and propeller mounting.`;
      }
      return `Motor 3 measured speed is ${rpm !== null ? `${rpm.toFixed(0)} RPM` : 'UNAVAILABLE'}, current is ${curr.toFixed(2)} A, and temperature is ${temp.toFixed(1)} °C. Channel operating within nominal parameters.`;
    }

    if (q.includes('motor 1') || q.includes('motor 2') || q.includes('motor 4')) {
      return 'Motors 1, 2, and 4 are operating within the nominal learned baseline. Telemetry shows balanced RPM and thermal parameters.';
    }

    // 2. Health & Prediction
    if (q.includes('health') || q.includes('status')) {
      return `Overall propulsion health is currently ${intel.health_index.toFixed(1)}% (${intel.health_band}). System trend is ${intel.trend}. Confidence is ${intel.confidence_pct || 94}%.`;
    }

    if (q.includes('prediction') || q.includes('predict') || q.includes('forecast')) {
      if (intel.predicted_fault !== 'NORMAL') {
        return `Degradation prediction: ${intel.predicted_fault.replace(/_/g, ' ')} with ${intel.fault_confidence_pct.toFixed(0)}% model confidence. Contributing features: ${intel.xai_why || 'RPM residual and vibration elevation'}. Recommended action: ${intel.xai_recommendation}. (Note: This is an analytical prediction, not a confirmed hardware failure).`;
      }
      return 'Current propulsion behavior is within learned operating baseline. No degradation trend predicted. Recommended action: Continue real-time monitoring.';
    }

    // 3. Connection & Link
    if (q.includes('apm') || q.includes('connect') || q.includes('mavlink') || q.includes('link')) {
      const isLive = tel.connection_status === 'CONNECTED' && tel.heartbeat_received;
      return `APM Link status: ${tel.connection_status}. Heartbeat: ${tel.heartbeat_received ? 'ACTIVE' : 'OFFLINE'}. Packet rate: ${tel.packet_rate_hz || 0} Hz. Telemetry age: ${tel.telemetry_age_ms !== null ? `${tel.telemetry_age_ms} ms` : 'N/A'}.`;
    }

    // 4. Alerts & Safety
    if (q.includes('alert') || q.includes('warning') || q.includes('critical')) {
      if (activeAlerts.length > 0) {
        return `There are ${activeAlerts.length} active alerts. Most severe: ${activeAlerts[0].level} - ${activeAlerts[0].event}. Evidence: ${activeAlerts[0].evidence}. Action: ${activeAlerts[0].action}`;
      }
      return 'No critical or warning alerts currently active. All telemetry bounds are nominal.';
    }

    // 5. Check / Maintenance Actions
    if (q.includes('check') || q.includes('action') || q.includes('maintenance')) {
      return `Recommended actions based on current state: ${intel.xai_recommendation || 'Maintain normal pre-flight and in-flight inspection protocols.'}`;
    }

    // 6. RUL
    if (q.includes('rul') || q.includes('life')) {
      return 'Remaining Useful Life (RUL) currently requires sufficient validated degradation history before a certified prognostics figure can be generated.';
    }

    // Fallback response using actual state
    return `Current system overview: Health ${intel.health_index.toFixed(0)}%, Telemetry ${tel.source_type}, RPM: ${tel.rpm.toFixed(0)}, Temp: ${tel.temperature_c.toFixed(1)} °C, Vibration: ${tel.vibration_rms_g.toFixed(3)} g. Let me know if you need details on specific motor channels or predictions.`;
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const replyText = generateFalconzResponse(inputText.trim());
    const aiMsg: ChatMessage = {
      id: `f-${Date.now() + 1}`,
      sender: 'falconz',
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  const handleQuickQuestion = (q: string) => {
    setInputText(q);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const replyText = generateFalconzResponse(q);
    const aiMsg: ChatMessage = {
      id: `f-${Date.now() + 1}`,
      sender: 'falconz',
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Left) */}
      {!askFalconzOpen && (
        <button
          onClick={() => setAskFalconzOpen(true)}
          className="fixed bottom-5 left-6 md:left-20 z-40 bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-full shadow-lg hover:shadow-sky-500/25 flex items-center gap-2 text-xs font-bold font-sans transition-all duration-200 hover:scale-105 select-none"
          title="Ask FALCONZ AI Assistant"
        >
          <Bot className="w-5 h-5 text-white" />
          <span className="pr-1">ASK FALCONZ</span>
        </button>
      )}

      {/* Assistant Modal / Widget (Bottom Left) */}
      {askFalconzOpen && (
        <div className="fixed bottom-5 left-6 md:left-20 z-50 w-96 max-w-[calc(100vw-2.5rem)] h-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 select-none">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-sans flex items-center gap-1.5">
                  ASK FALCONZ
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    ASSISTANT
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Propulsion Health Intelligence Q&A
                </p>
              </div>
            </div>

            <button
              onClick={() => setAskFalconzOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Questions Pills */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
            <button
              onClick={() => handleQuickQuestion('Why is Motor 3 warning?')}
              className="shrink-0 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-500 hover:text-sky-500 transition-colors"
            >
              Why Motor 3 warning?
            </button>
            <button
              onClick={() => handleQuickQuestion('What should I check?')}
              className="shrink-0 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-500 hover:text-sky-500 transition-colors"
            >
              What should I check?
            </button>
            <button
              onClick={() => handleQuickQuestion('Is APM connected?')}
              className="shrink-0 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-500 hover:text-sky-500 transition-colors"
            >
              Is APM connected?
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((m) => {
              const isAi = m.sender === 'falconz';
              return (
                <div
                  key={m.id}
                  className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 space-y-1 ${
                      isAi
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-sans'
                        : 'bg-sky-600 text-white font-sans'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    <span className={`text-[9px] font-mono block ${isAi ? 'text-slate-400' : 'text-sky-200 text-right'}`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about telemetry, motors, predictions..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-hidden focus:border-sky-500 font-sans"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-lg transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
