import React, { useState, useMemo } from 'react';
import {
  parseRawHttpRequest,
  generatePythonPoC,
  generateCurlCommand,
  splitHttpExchange,
} from '../utils/pocGenerator';
import { Terminal, Copy, Check, Code, Play, Download, ArrowRight, ShieldCheck, Sparkles, X } from 'lucide-react';

interface PoCGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawHttpInitial?: string;
  reportTitle?: string;
  onInsertIntoReport?: (codeSnippet: string) => void;
}

export const PoCGeneratorModal: React.FC<PoCGeneratorModalProps> = ({
  isOpen,
  onClose,
  rawHttpInitial = '',
  reportTitle = 'Vulnerabilidad Detectada',
  onInsertIntoReport,
}) => {
  const [inputRaw, setInputRaw] = useState<string>(rawHttpInitial);
  const [activeTab, setActiveTab] = useState<'python' | 'curl' | 'parsed'>('python');
  const [curlSingleLine, setCurlSingleLine] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [insertedNotice, setInsertedNotice] = useState(false);

  // Default demo template if empty
  const handleLoadDemo = () => {
    setInputRaw(`POST /api/v2/users/transfer-balance HTTP/1.1
Host: secure.targetbank.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token
Content-Type: application/json
Accept: application/json

{
  "source_account_id": "ACC-992140",
  "destination_account_id": "ACC-100234",
  "amount": 5000,
  "currency": "EUR",
  "note": "IDOR/BAC test transfer"
}`);
  };

  const parsed = useMemo(() => {
    return parseRawHttpRequest(inputRaw || '');
  }, [inputRaw]);

  const pythonPoC = useMemo(() => {
    return generatePythonPoC(parsed, { description: reportTitle });
  }, [parsed, reportTitle]);

  const curlPoC = useMemo(() => {
    return generateCurlCommand(parsed, { singleLine: curlSingleLine });
  }, [parsed, curlSingleLine]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadPython = () => {
    const filename = `poc_${(reportTitle || 'exploit')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 25)}.py`;
    const blob = new Blob([pythonPoC], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCurl = () => {
    const filename = `poc_${(reportTitle || 'request')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 25)}.sh`;
    const blob = new Blob([`#!/usr/bin/env bash\n\n${curlPoC}\n`], { type: 'application/x-sh;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleInsert = (format: 'python' | 'curl') => {
    if (!onInsertIntoReport) return;
    const block =
      format === 'python'
        ? `\n\`\`\`python\n${pythonPoC}\n\`\`\`\n`
        : `\n\`\`\`bash\n${curlPoC}\n\`\`\`\n`;
    onInsertIntoReport(block);
    setInsertedNotice(true);
    setTimeout(() => {
      setInsertedNotice(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Generador Automático de PoCs en Python y cURL</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HTTP Parser Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pega la petición capturada en Burp Suite o ZAP para compilar scripts reproducibles listos para el informe.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Raw HTTP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Petición HTTP Cruda (Raw Request de Burp Suite)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="text-[11px] font-mono text-purple-400 hover:text-purple-300 transition"
                >
                  Cargar ejemplo de API/IDOR
                </button>
                <button
                  type="button"
                  onClick={() => setInputRaw('')}
                  className="text-[11px] font-mono text-slate-500 hover:text-slate-400 transition"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={inputRaw}
              onChange={(e) => setInputRaw(e.target.value)}
              placeholder="GET /api/v1/profile HTTP/1.1&#10;Host: example.com&#10;Authorization: Bearer token123&#10;&#10;{ ... }"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 font-mono text-xs focus:outline-none focus:border-purple-500 transition resize-y"
            />
          </div>

          {/* Quick Stats on Parsed Request */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">MÉTODO</span>
              <span className="text-sm font-bold text-emerald-400">{parsed.method}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">HOST / DESTINO</span>
              <span className="text-slate-200 truncate block font-bold" title={parsed.host}>
                {parsed.host || 'N/A'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">CABECERAS</span>
              <span className="text-purple-400 font-bold">
                {Object.keys(parsed.headers).length} detectadas
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">PAYLOAD / BODY</span>
              <span className="text-slate-200 truncate block font-bold">
                {parsed.body ? `${parsed.body.length} bytes ${parsed.isJson ? '(JSON)' : ''}` : 'Sin cuerpo'}
              </span>
            </div>
          </div>

          {/* Code Viewer Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('python')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                    activeTab === 'python'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>🐍 Python (requests)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('curl')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                    activeTab === 'curl'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>⚡ cURL Command</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'curl' && (
                  <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={curlSingleLine}
                      onChange={(e) => setCurlSingleLine(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                    />
                    <span>Una sola línea (Oneliner)</span>
                  </label>
                )}

                {activeTab === 'python' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopy(pythonPoC, 'python')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
                    >
                      {copiedType === 'python' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Python</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPython}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar .py</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopy(curlPoC, 'curl')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
                    >
                      {copiedType === 'curl' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar cURL</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCurl}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar .sh</span>
                    </button>
                  </>
                )}

                {onInsertIntoReport && (
                  <button
                    type="button"
                    onClick={() => handleInsert(activeTab === 'python' ? 'python' : 'curl')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition"
                  >
                    {insertedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Insertado en Reporte!</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Insertar en Reporte</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative rounded-xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs overflow-x-auto max-h-96 text-slate-200 leading-relaxed shadow-inner">
              <pre className="whitespace-pre">
                {activeTab === 'python' ? pythonPoC : curlPoC}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Generación estándar con soporte para proxies locales (Burp/ZAP en 127.0.0.1:8080)</span>
          </div>
          <div>
            <span>GhostBountyStudio • Un Fantasma en el Sistema</span>
          </div>
        </div>
      </div>
    </div>
  );
};
