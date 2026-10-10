import React, { useState, useEffect, useRef } from 'react';
import { CopilotMessage, ReportDraft } from '../types';
import { queryCopilot, checkServerHealth } from '../utils/copilotClient';
import {
  Bot,
  Send,
  Zap,
  Globe,
  WifiOff,
  Sparkles,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Terminal,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface MethodologyCopilotViewProps {
  currentReport?: Partial<ReportDraft>;
  initialPrompt?: string;
  isDrawer?: boolean;
  onCloseDrawer?: () => void;
}

const DEFAULT_PROMPTS = [
  '¿Esto es lo bastante claro para que triage no lo rechace?',
  '¿Cómo pruebo race conditions en un endpoint de canje de cupón?',
  '¿Cómo probar IDOR si los IDs son UUID v4?',
  'Checklist de bypass para 403 Forbidden en API REST',
  'Evasión de SSRF hacia metadatos de AWS (169.254.169.254)',
  'Verificación y ataques a JWT (JSON Web Tokens)',
];

export const MethodologyCopilotView: React.FC<MethodologyCopilotViewProps> = ({
  currentReport,
  initialPrompt,
  isDrawer = false,
  onCloseDrawer,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `¡Saludos, cazador! Soy tu **Copiloto de Metodología y Triage de Un Fantasma en el Sistema** ([unfantasmaenelsistema.com](https://www.unfantasmaenelsistema.com/)).

Puedo auditar tus reportes para evitar que triage los cierre como *Informative* o *Needs More Info*, o resolver dudas tácticas sobre explotación de vectores (Race Conditions, IDOR, JWT, SSRF, Bypasses de WAF).

Pregúntame sobre cualquier vector o pulsa un botón rápido abajo para auditar el reporte que tienes redactado en el Generador.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'offline_expert',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [serverState, setServerState] = useState<{ isOnline: boolean; hasGeminiKey: boolean }>({
    isOnline: false,
    hasGeminiKey: false,
  });
  const [forceOffline, setForceOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkServerHealth().then((st) => {
      setServerState(st);
    });
  }, []);

  useEffect(() => {
    if (initialPrompt && initialPrompt !== inputPrompt) {
      setInputPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: forceOffline ? 'offline_expert' : serverState.hasGeminiKey ? 'gemini' : 'offline_expert',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const result = await queryCopilot(prompt, currentReport, forceOffline);
      const assistantMsg: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: result.source,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `Error al procesar la consulta: ${err?.message || 'Error desconocido'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'offline_expert',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Chat reiniciado. ¿En qué vector o reporte estás trabajando hoy?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'offline_expert',
      },
    ]);
  };

  const isGeminiActive = serverState.isOnline && serverState.hasGeminiKey && !forceOffline;

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden ${
        isDrawer ? 'max-h-[85vh]' : 'min-h-[640px]'
      }`}
    >
      {/* Top Header / Status bar */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Copiloto de Metodología & Triage
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
              >
                unfantasmaenelsistema.com ↗
              </a>
            </h3>
            <p className="text-[11px] text-slate-400">
              Mentor interactivo para auditoría de reportes y playbooks de explotación
            </p>
          </div>
        </div>

        {/* Operating Mode Indicator & Toggle */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 border transition ${
              isGeminiActive
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
            }`}
          >
            {isGeminiActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>[🟢 Gemini 3.8 Flash Online]</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>[⚡ Motor Experto Offline (Reglas Locales)]</span>
              </>
            )}
          </div>

          {/* Force offline toggle button for testing */}
          <button
            onClick={() => setForceOffline(!forceOffline)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition ${
              forceOffline
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Forzar motor de reglas offline incluso con backend disponible"
          >
            {forceOffline ? 'Forzar Offline: ON' : 'Forzar Offline: OFF'}
          </button>

          <button
            onClick={handleResetChat}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Reiniciar conversación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts Bar */}
      <div className="px-6 py-2.5 bg-slate-900/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-mono flex items-center gap-1 shrink-0 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Sugerencias:
        </span>
        {DEFAULT_PROMPTS.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(promptText)}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-purple-950/60 hover:text-purple-300 hover:border-purple-500/40 text-slate-300 border border-slate-700/60 whitespace-nowrap transition"
          >
            {promptText}
          </button>
        ))}
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-slate-400">
                <span className="font-bold text-slate-300">
                  {isUser ? 'Tú (Cazador)' : 'Ghost Mentor'}
                </span>
                <span>• {msg.timestamp}</span>
                {!isUser && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      msg.source === 'gemini'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {msg.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Motor Offline'}
                  </span>
                )}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs max-w-3xl leading-relaxed whitespace-pre-line ${
                  isUser
                    ? 'bg-purple-600/30 border border-purple-500/40 text-white rounded-tr-none'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-none font-sans shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {isGeminiActive ? 'Analizando con Gemini...' : 'Procesando reglas de triage offline...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Terminal className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Haz una consulta de metodología o pide auditar tu reporte..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-sans focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 transition"
          >
            Un Fantasma en el Sistema • Metodología de Seguridad Ofensiva
          </a>
          <span>Nunca se transmiten credenciales ni claves en el frontend</span>
        </div>
      </div>
    </div>
  );
};
