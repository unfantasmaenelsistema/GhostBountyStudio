import React, { useState, useEffect } from 'react';
import { CVSSMetrics, Severity } from '../types';
import { calculateCVSS, CVSS_WEIGHTS, CVSS_BENCHMARKS } from '../utils/cvss';
import { ShieldAlert, Copy, Check, Sparkles, X } from 'lucide-react';

interface CVSSCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMetrics?: CVSSMetrics;
  onApply: (vectorString: string, score: number, severity: Severity, metrics: CVSSMetrics) => void;
}

export const CVSSCalculatorModal: React.FC<CVSSCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialMetrics,
  onApply,
}) => {
  const [metrics, setMetrics] = useState<CVSSMetrics>({
    av: initialMetrics?.av || 'N',
    ac: initialMetrics?.ac || 'L',
    pr: initialMetrics?.pr || 'L',
    ui: initialMetrics?.ui || 'N',
    s: initialMetrics?.s || 'U',
    c: initialMetrics?.c || 'H',
    i: initialMetrics?.i || 'N',
    a: initialMetrics?.a || 'N',
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialMetrics) {
      setMetrics(initialMetrics);
    }
  }, [initialMetrics, isOpen]);

  if (!isOpen) return null;

  const result = calculateCVSS(metrics);

  const handleCopyVector = () => {
    navigator.clipboard.writeText(result.vectorString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityColor = (sev: Severity) => {
    switch (sev) {
      case 'Critical':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]';
      case 'High':
        return 'text-orange-400 bg-orange-500/15 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]';
      case 'Medium':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/40';
      case 'Low':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
      default:
        return 'text-slate-400 bg-slate-500/15 border-slate-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Calculadora Oficial CVSS v3.1
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  FIRST.org Spec
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Fórmula oficial exacta de Common Vulnerability Scoring System v3.1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Banner & Vector */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-xl border flex items-baseline gap-2 ${severityColor(
                result.severity
              )}`}
            >
              <span className="text-3xl font-black font-mono tracking-tight">{result.score.toFixed(1)}</span>
              <span className="text-sm font-bold uppercase tracking-wider">{result.severity}</span>
            </div>
            <div className="text-xs text-slate-400 flex flex-col gap-0.5 font-mono">
              <div>Impacto: <span className="text-slate-200 font-semibold">{result.impact}</span> | ISS: <span className="text-slate-200 font-semibold">{result.impactSubScore}</span></div>
              <div>Explotabilidad: <span className="text-slate-200 font-semibold">{result.exploitability}</span></div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-xl justify-end">
            <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300 truncate select-all flex-1 text-center">
              {result.vectorString}
            </div>
            <button
              onClick={handleCopyVector}
              title="Copiar vector"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition shrink-0 flex items-center gap-1.5 text-xs font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Benchmarks Selector */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Plantillas típicas:
          </span>
          {CVSS_BENCHMARKS.map((bm, idx) => (
            <button
              key={idx}
              onClick={() => {
                const parts = bm.vector.split('/');
                const m: Partial<CVSSMetrics> = {};
                for (const p of parts) {
                  const [k, v] = p.split(':');
                  if (k === 'AV') m.av = v as any;
                  if (k === 'AC') m.ac = v as any;
                  if (k === 'PR') m.pr = v as any;
                  if (k === 'UI') m.ui = v as any;
                  if (k === 'S') m.s = v as any;
                  if (k === 'C') m.c = v as any;
                  if (k === 'I') m.i = v as any;
                  if (k === 'A') m.a = v as any;
                }
                setMetrics(m as CVSSMetrics);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-purple-950/60 hover:text-purple-300 hover:border-purple-500/40 text-slate-300 border border-slate-700/70 whitespace-nowrap transition"
            >
              {bm.name} ({bm.expectedScore})
            </button>
          ))}
        </div>

        {/* Metric Groups Form */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exploitability Metrics */}
          <div className="space-y-5 bg-slate-950/30 p-4 rounded-xl border border-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Métricas de Explotabilidad
            </h3>

            {/* Attack Vector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Attack Vector (AV) — Vector de Ataque
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['N', 'A', 'L', 'P'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, av: key })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.av === key
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'Network' : key === 'A' ? 'Adjacent' : key === 'L' ? 'Local' : 'Physical'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.av[metrics.av].desc}</p>
            </div>

            {/* Attack Complexity */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Attack Complexity (AC) — Complejidad del Ataque
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['L', 'H'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, ac: key })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.ac === key
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'L' ? 'Low (Baja)' : 'High (Alta)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.ac[metrics.ac].desc}</p>
            </div>

            {/* Privileges Required */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Privileges Required (PR) — Privilegios Requeridos
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['N', 'L', 'H'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, pr: key })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.pr === key
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'None (Ninguno)' : key === 'L' ? 'Low (Bajo)' : 'High (Admin)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.pr[metrics.pr].desc}</p>
            </div>

            {/* User Interaction */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                User Interaction (UI) — Interacción de Usuario
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['N', 'R'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, ui: key })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.ui === key
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'None (Sin clic)' : 'Required (Requiere acción)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.ui[metrics.ui].desc}</p>
            </div>
          </div>

          {/* Scope and Impact Metrics */}
          <div className="space-y-5 bg-slate-950/30 p-4 rounded-xl border border-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Alcance e Impacto (C / I / A)
            </h3>

            {/* Scope */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Scope (S) — Alcance / Traspaso de Autorización
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['U', 'C'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, s: key })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.s === key
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'U' ? 'Unchanged (Mismo)' : 'Changed (Cambiado)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.s[metrics.s].desc}</p>
            </div>

            {/* Confidentiality */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Confidentiality (C) — Confidencialidad
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['N', 'L', 'H'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, c: key })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.c === key
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'None' : key === 'L' ? 'Low (Parcial)' : 'High (Total/PII)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.c[metrics.c].desc}</p>
            </div>

            {/* Integrity */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Integrity (I) — Integridad
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['N', 'L', 'H'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, i: key })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.i === key
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'None' : key === 'L' ? 'Low (Parcial)' : 'High (Total)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.i[metrics.i].desc}</p>
            </div>

            {/* Availability */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Availability (A) — Disponibilidad
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['N', 'L', 'H'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMetrics({ ...metrics, a: key })}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${
                      metrics.a === key
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">{key}</div>
                    <div className="text-[10px] opacity-80">{key === 'N' ? 'None' : key === 'L' ? 'Low (Lentitud)' : 'High (Caída Total)'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{CVSS_WEIGHTS.a[metrics.a].desc}</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono">
            Score: <span className="text-white font-bold">{result.score.toFixed(1)}</span> ({result.severity})
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onApply(result.vectorString, result.score, result.severity, metrics);
                onClose();
              }}
              className="px-5 py-2 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
            >
              Aplicar a Hallazgo / Reporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
