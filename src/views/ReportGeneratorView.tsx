import React, { useState, useEffect } from 'react';
import { ReportDraft, Program, TriageFinding, Severity } from '../types';
import { analyzeReportLocally } from '../utils/expertEngine';
import { parseCVSSVector } from '../utils/cvss';
import { splitHttpExchange } from '../utils/pocGenerator';
import { CVSSCalculatorModal } from '../components/CVSSCalculatorModal';
import { PoCGeneratorModal } from '../components/PoCGeneratorModal';
import { GhostLogo } from '../components/GhostLogo';
import iconoImg from '../assets/icono.png';
import {
  FileText,
  Copy,
  Download,
  Check,
  AlertTriangle,
  Bot,
  Calculator,
  Save,
  Printer,
  Columns,
  Maximize2,
  Edit3,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Code2,
  FolderOpen,
  Terminal,
  Sparkles,
} from 'lucide-react';

interface ReportGeneratorViewProps {
  programs: Program[];
  findings: TriageFinding[];
  reports: ReportDraft[];
  activeFindingId?: string | null;
  onSaveReport: (report: ReportDraft) => void;
  onOpenCopilot: (initialPrompt?: string) => void;
}

export const ReportGeneratorView: React.FC<ReportGeneratorViewProps> = ({
  programs,
  findings,
  reports,
  activeFindingId,
  onSaveReport,
  onOpenCopilot,
}) => {
  // View mode: 'split' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  // Current active report
  const [currentReport, setCurrentReport] = useState<ReportDraft>(() => {
    if (activeFindingId) {
      const matchFinding = findings.find((f) => f.id === activeFindingId);
      const existing = reports.find((r) => r.findingId === activeFindingId);
      if (existing) return existing;
      if (matchFinding) {
        return {
          id: `rep-${Date.now()}`,
          findingId: matchFinding.id,
          programId: matchFinding.programId,
          title: matchFinding.title,
          impactSummary: matchFinding.summary,
          reproductionSteps:
            matchFinding.reproductionNotes ||
            '1. Iniciar sesión como Usuario A en la plataforma.\n2. Capturar la petición HTTP en Burp Suite.\n3. Modificar el parámetro de identificación con el de la víctima.\n4. Comprobar que el servidor responde con 200 OK y entrega los datos no autorizados.',
          rawHttp: '',
          concreteImpactProof: 'Se confirmó acceso directo a registros pertenecientes a otra cuenta sin autorización previa.',
          cvssVector: matchFinding.cvss.vectorString,
          cvssScore: matchFinding.cvss.score,
          suggestedRemediation: 'Implementar validación de control de acceso basada en objetos (BOLA) antes de devolver el recurso.',
          updatedAt: new Date().toISOString(),
        };
      }
    }
    return (
      reports[0] || {
        id: `rep-${Date.now()}`,
        programId: programs[0]?.id || '',
        title: '',
        impactSummary: '',
        reproductionSteps: '',
        rawHttp: '',
        concreteImpactProof: '',
        cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
        cvssScore: 6.5,
        suggestedRemediation: '',
        updatedAt: new Date().toISOString(),
      }
    );
  });

  const [copiedFormat, setCopiedFormat] = useState<'md' | 'plain' | 'html' | null>(null);
  const [isCVSSModalOpen, setIsCVSSModalOpen] = useState(false);
  const [isPoCModalOpen, setIsPoCModalOpen] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Sync if activeFindingId changes externally
  useEffect(() => {
    if (activeFindingId) {
      const matchFinding = findings.find((f) => f.id === activeFindingId);
      const existing = reports.find((r) => r.findingId === activeFindingId);
      if (existing) {
        setCurrentReport(existing);
      } else if (matchFinding) {
        setCurrentReport({
          id: `rep-${Date.now()}`,
          findingId: matchFinding.id,
          programId: matchFinding.programId,
          title: matchFinding.title,
          impactSummary: matchFinding.summary,
          reproductionSteps:
            matchFinding.reproductionNotes ||
            '1. Iniciar sesión como Usuario A en la plataforma.\n2. Capturar la petición en Burp Suite.\n3. Modificar el parámetro...\n4. Comprobar acceso a los datos de Usuario B.',
          rawHttp: '',
          concreteImpactProof: 'Se confirmó acceso no autorizado sin credenciales válidas...',
          cvssVector: matchFinding.cvss.vectorString,
          cvssScore: matchFinding.cvss.score,
          suggestedRemediation: 'Implementar control de acceso a nivel de objeto (BOLA).',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [activeFindingId, findings, reports]);

  // Live quality analysis
  const analysis = analyzeReportLocally(currentReport);

  const selectedProgram = programs.find((p) => p.id === currentReport.programId);

  const handleFieldChange = (field: keyof ReportDraft, value: any) => {
    setCurrentReport((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSaveCurrent = () => {
    onSaveReport(currentReport);
    setSaveStatusMessage('Borrador guardado localmente');
    setTimeout(() => setSaveStatusMessage(null), 2500);
  };

  const getSeverityLabel = (score: number): Severity => {
    if (score >= 9.0) return 'Critical';
    if (score >= 7.0) return 'High';
    if (score >= 4.0) return 'Medium';
    if (score >= 0.1) return 'Low';
    return 'None';
  };

  const currentSeverity = getSeverityLabel(currentReport.cvssScore || 0);

  const generateMarkdownReport = (): string => {
    return `# ${currentReport.title || 'Reporte de Vulnerabilidad'}

**Organización / Programa:** ${selectedProgram?.name || 'No especificado'} (${selectedProgram?.domain || 'N/A'})  
**Severidad CVSS v3.1:** \`${currentReport.cvssVector || 'N/A'}\` (Score: **${currentReport.cvssScore || 'N/A'}** - ${currentSeverity})  
**Fecha de Emisión:** ${new Date().toISOString().split('T')[0]}  
**Publicado por:** Investigador de Seguridad (Un Fantasma en el Sistema)  

---

## 1. Resumen de Impacto
${currentReport.impactSummary || 'Sin resumen'}

---

## 2. Pasos de Reproducción
${currentReport.reproductionSteps || 'Sin pasos'}

---

## 3. Petición y Respuesta HTTP Cruda (PoC)
\`\`\`http
${currentReport.rawHttp || 'Sin petición HTTP adjunta'}
\`\`\`

---

## 4. Prueba Concreta de Impacto
${currentReport.concreteImpactProof || 'Sin prueba concreta'}

---

## 5. Vector CVSS v3.1 Detallado
- **Vector String:** \`${currentReport.cvssVector}\`
- **Puntuación Base:** **${currentReport.cvssScore}** (${currentSeverity})

---

## 6. Remediación Sugerida
${currentReport.suggestedRemediation || 'Revisar control de acceso y validación del lado servidor.'}

---
*Reporte generado con GhostBountyStudio — Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)*
`;
  };

  const generatePlainTextReport = (): string => {
    return `TITULO: ${currentReport.title || 'Sin título'}
PROGRAMA: ${selectedProgram?.name || 'N/A'}
SEVERIDAD: ${currentReport.cvssVector} (Score: ${currentReport.cvssScore} ${currentSeverity})

=== 1. RESUMEN DE IMPACTO ===
${currentReport.impactSummary}

=== 2. PASOS DE REPRODUCCION ===
${currentReport.reproductionSteps}

=== 3. PETICION Y RESPUESTA HTTP CRUDA ===
${currentReport.rawHttp}

=== 4. PRUEBA CONCRETA DE IMPACTO ===
${currentReport.concreteImpactProof}

=== 5. VECTOR CVSS v3.1 ===
${currentReport.cvssVector}

=== 6. REMEDIACION SUGERIDA ===
${currentReport.suggestedRemediation}
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopiedFormat('md');
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(generatePlainTextReport());
    setCopiedFormat('plain');
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const handleDownloadMarkdown = () => {
    const text = generateMarkdownReport();
    const filename = `report_${(currentReport.title || 'bounty')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30)}.md`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadHTMLReport = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${currentReport.title || 'Informe de Seguridad'} - Un Fantasma en el Sistema</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 860px; margin: 40px auto; padding: 0 20px; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; font-family: monospace; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #ffedd5; color: #9a3412; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #dcfce7; color: #166534; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
    pre { background: #0f172a; color: #38bdf8; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${currentReport.title || 'Informe Técnico de Vulnerabilidad'}</h1>
      <div><strong>Programa:</strong> ${selectedProgram?.name || 'N/A'} (${selectedProgram?.domain || 'N/A'})</div>
      <div><strong>Fecha:</strong> ${new Date().toISOString().split('T')[0]} | <strong>Score CVSS:</strong> ${currentReport.cvssScore} (${currentSeverity})</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">1. Resumen de Impacto</div>
    <p>${(currentReport.impactSummary || '').replace(/\n/g, '<br>')}</p>
  </div>
  <div class="section">
    <div class="section-title">2. Pasos de Reproducción</div>
    <p>${(currentReport.reproductionSteps || '').replace(/\n/g, '<br>')}</p>
  </div>
  <div class="section">
    <div class="section-title">3. Petición y Respuesta HTTP Cruda (PoC)</div>
    <pre>${currentReport.rawHttp || 'Sin petición adjunta'}</pre>
  </div>
  <div class="section">
    <div class="section-title">4. Prueba Concreta de Impacto</div>
    <p>${(currentReport.concreteImpactProof || '').replace(/\n/g, '<br>')}</p>
  </div>
  <div class="section">
    <div class="section-title">5. Vector CVSS v3.1</div>
    <p><code>${currentReport.cvssVector}</code> (Puntuación: <strong>${currentReport.cvssScore}</strong>)</p>
  </div>
  <div class="section">
    <div class="section-title">6. Remediación Sugerida</div>
    <p>${(currentReport.suggestedRemediation || '').replace(/\n/g, '<br>')}</p>
  </div>
  <div class="footer">
    Informe generado con GhostBountyStudio por <strong>Un Fantasma en el Sistema</strong> • <a href="https://www.unfantasmaenelsistema.com/">https://www.unfantasmaenelsistema.com/</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${(currentReport.title || 'bounty').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFinding = (findingId: string) => {
    const f = findings.find((item) => item.id === findingId);
    if (!f) return;
    setCurrentReport({
      id: `rep-${Date.now()}`,
      findingId: f.id,
      programId: f.programId,
      title: f.title,
      impactSummary: f.summary,
      reproductionSteps:
        f.reproductionNotes ||
        '1. Iniciar sesión como Usuario A en...\n2. Enviar petición a...\n3. Modificar ID a...\n4. Confirmar respuesta 200 con datos de Usuario B.',
      rawHttp: '',
      concreteImpactProof: 'Se extrajeron datos sensibles sin autorización...',
      cvssVector: f.cvss.vectorString,
      cvssScore: f.cvss.score,
      suggestedRemediation: 'Implementar verificación de pertenencia en backend.',
      updatedAt: new Date().toISOString(),
    });
  };

  const severityBadgeClass = (sev: Severity) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      case 'High':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
      case 'Medium':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'Low':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Controls (Hidden in Print) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Editor de Reportes — Split-Screen & Exportación PDF
          </h2>
          <p className="text-xs text-slate-400">
            Formulario guiado a la izquierda con vista previa renderizada en tiempo real y membrete oficial de Un Fantasma en el Sistema.
          </p>
        </div>

        {/* View Mode Tabs & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Mode switch */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 font-semibold ${
                viewMode === 'split'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Dividido</span>
            </button>
            <button
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 font-semibold ${
                viewMode === 'editor'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 font-semibold ${
                viewMode === 'preview'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Vista Previa</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setIsPoCModalOpen(true)}
            className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-mono transition flex items-center gap-1.5"
            title="Generador de PoCs en Python y cURL"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>Generar PoC</span>
          </button>

          <button
            onClick={handleSaveCurrent}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono transition flex items-center gap-1.5"
            title="Guardar borrador actual"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guardar</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] transition flex items-center gap-1.5"
            title="Descargar o Imprimir PDF Oficial"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={handleDownloadHTMLReport}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-mono transition flex items-center gap-1.5"
            title="Descargar reporte HTML autónomo"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>.HTML</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] transition flex items-center gap-1.5"
            title="Descargar archivo Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.MD</span>
          </button>
        </div>
      </div>

      {saveStatusMessage && (
        <div className="no-print p-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          {saveStatusMessage}
        </div>
      )}

      {/* Main Grid Workspace */}
      <div
        className={`grid gap-6 ${
          viewMode === 'split'
            ? 'grid-cols-1 xl:grid-cols-12'
            : viewMode === 'editor'
            ? 'grid-cols-1'
            : 'grid-cols-1'
        }`}
      >
        {/* LEFT COLUMN: Guided Editor Form (Hidden when viewMode === 'preview') */}
        {viewMode !== 'preview' && (
          <div
            className={`space-y-5 no-print ${
              viewMode === 'split' ? 'xl:col-span-6' : 'max-w-4xl mx-auto w-full'
            }`}
          >
            {/* Import & Quality Banner Bar */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-slate-300 font-semibold truncate">Cargar Hallazgo:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleImportFinding(e.target.value);
                  }}
                  value={currentReport.findingId || ''}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 max-w-[200px] truncate"
                >
                  <option value="">Seleccionar de triage...</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.cvss.score})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quality score meter pill */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[11px]">Calidad Triage:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    analysis.qualityScore >= 80
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : analysis.qualityScore >= 50
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {analysis.qualityScore}/100
                </span>
                <button
                  onClick={() =>
                    onOpenCopilot(
                      '¿Este reporte es lo bastante claro para que triage no lo rechace? Revisa especificidad del impacto y pasos de reproducción.'
                    )
                  }
                  className="p-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition"
                  title="Auditar con Copiloto"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form Fields Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
              {/* 1. Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                      1
                    </span>
                    Título con Categoría e Impacto
                  </label>
                </div>
                <input
                  type="text"
                  value={currentReport.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="[IDOR] /api/v1/users/{id}/invoices permite exfiltrar facturas de terceros"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              {/* Program & CVSS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Programa Asociado</label>
                  <select
                    value={currentReport.programId}
                    onChange={(e) => handleFieldChange('programId', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold block">Vector CVSS v3.1</label>
                    <button
                      type="button"
                      onClick={() => setIsCVSSModalOpen(true)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1"
                    >
                      <Calculator className="w-3 h-3" />
                      Calculadora
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentReport.cvssVector}
                      onChange={(e) => handleFieldChange('cvssVector', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                    />
                    <span className="px-2.5 py-1.5 bg-slate-800 font-mono font-bold text-white rounded-xl text-xs shrink-0">
                      {currentReport.cvssScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Impact Summary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                      2
                    </span>
                    Resumen de Impacto (2 a 3 líneas)
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      analysis.impactSummaryWarning ? 'text-rose-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {analysis.impactSummaryLines} líneas {analysis.impactSummaryWarning && '(¡> 4 líneas!)'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={currentReport.impactSummary}
                  onChange={(e) => handleFieldChange('impactSummary', e.target.value)}
                  placeholder="Explica qué daño directo se produce en confidencialidad, integridad o dinero..."
                  className={`w-full px-3 py-2 bg-slate-950 rounded-xl text-slate-200 focus:outline-none text-xs transition border ${
                    analysis.impactSummaryWarning
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-slate-800 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* 3. Numbered Reproduction Steps */}
              <div>
                <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                    3
                  </span>
                  Pasos de Reproducción Numerados
                </label>
                <textarea
                  rows={4}
                  value={currentReport.reproductionSteps}
                  onChange={(e) => handleFieldChange('reproductionSteps', e.target.value)}
                  placeholder="1. Iniciar sesión como Usuario A en la URL...&#10;2. Enviar petición a /api/v1/...&#10;3. Modificar el parámetro ID al del Usuario B...&#10;4. Verificar código HTTP 200 y extracción de datos."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              {/* 4. Raw HTTP Request/Response */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                      4
                    </span>
                    Petición / Respuesta HTTP Cruda (PoC)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPoCModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-mono flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    <span>Generar PoC Python / cURL</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={currentReport.rawHttp}
                  onChange={(e) => handleFieldChange('rawHttp', e.target.value)}
                  placeholder="GET /api/v2/cards/10452/reveal HTTP/1.1&#10;Host: api.target.com&#10;Authorization: Bearer eyJhbGci...&#10;&#10;HTTP/1.1 200 OK&#10;Content-Type: application/json&#10;&#10;{&#10;  &quot;card_id&quot;: 10452,&#10;  &quot;owner&quot;: &quot;Victim&quot;&#10;}"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 font-mono focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              {/* 5. Concrete Impact Proof */}
              <div>
                <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                    5
                  </span>
                  Prueba de Impacto Concreta
                </label>
                <textarea
                  rows={3}
                  value={currentReport.concreteImpactProof}
                  onChange={(e) => handleFieldChange('concreteImpactProof', e.target.value)}
                  placeholder="Detalla qué registros específicos se extrajeron o qué transacción se ejecutó..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              {/* 6. Remediation */}
              <div>
                <label className="text-slate-200 font-bold flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-mono text-[11px]">
                    6
                  </span>
                  Remediación Sugerida
                </label>
                <textarea
                  rows={2}
                  value={currentReport.suggestedRemediation}
                  onChange={(e) => handleFieldChange('suggestedRemediation', e.target.value)}
                  placeholder="Instrucciones técnicas para el equipo de desarrollo para subsanar la falla..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Real-Time Rendered Formal Document & PDF Print Target */}
        {viewMode !== 'editor' && (
          <div
            className={`${
              viewMode === 'split' ? 'xl:col-span-6' : 'max-w-4xl mx-auto w-full'
            }`}
          >
            {/* Document Sheet (Styled for Screen & Formatted for Print) */}
            <div className="print-page bg-white text-slate-900 rounded-2xl border border-slate-300 shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Formal Letterhead Header */}
              <div className="border-b-2 border-slate-200 pb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={iconoImg}
                    alt="Logo Un Fantasma en el Sistema"
                    width={52}
                    height={52}
                    className="object-contain select-none shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900 leading-tight">
                      UN FANTASMA EN EL SISTEMA
                    </h3>
                    <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
                      <span>INFORME TÉCNICO DE SEGURIDAD</span>
                      <span>•</span>
                      <a
                        href="https://www.unfantasmaenelsistema.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 font-semibold hover:underline"
                      >
                        unfantasmaenelsistema.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-600 space-y-0.5">
                  <div>
                    Fecha: <strong className="text-slate-800">{new Date().toISOString().split('T')[0]}</strong>
                  </div>
                  <div>
                    Clasificación: <strong className="text-amber-700">TLP:AMBER / CONFIDENCIAL</strong>
                  </div>
                  <div>
                    Herramienta: <strong className="text-slate-800">GhostBountyStudio v1.0</strong>
                  </div>
                </div>
              </div>

              {/* Title & Scope Banner */}
              <div className="space-y-2">
                <div className="inline-block text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  PROGRAMA: {selectedProgram?.name || 'ALCANCE GENERAL'} ({selectedProgram?.domain || 'N/A'})
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {currentReport.title || 'Título de la Vulnerabilidad no especificado'}
                </h2>
              </div>

              {/* Severity & Official CVSS v3.1 Breakdown Table */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 page-break-avoid">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1.5 rounded-lg border font-mono font-black text-xl sm:text-2xl ${
                        currentSeverity === 'Critical'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : currentSeverity === 'High'
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : currentSeverity === 'Medium'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {currentReport.cvssScore?.toFixed(1) || '0.0'}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Severidad Base: {currentSeverity}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600">
                        Calculado bajo especificación FIRST.org CVSS v3.1
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Vector String Oficial</span>
                    <div className="text-[11px] font-mono text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-300 select-all font-semibold">
                      {currentReport.cvssVector}
                    </div>
                  </div>
                </div>

                {/* CVSS Metric Breakdown Badges */}
                {(() => {
                  const parsedMetrics = parseCVSSVector(currentReport.cvssVector);
                  if (!parsedMetrics) return null;
                  return (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-mono uppercase font-bold text-slate-500 mb-1.5">
                        Desglose de Métricas de Explotabilidad e Impacto:
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[10px] font-mono">
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">AV (Vector)</span>
                          <span className="font-bold text-slate-800">{parsedMetrics.av} ({parsedMetrics.av === 'N' ? 'Network' : parsedMetrics.av === 'A' ? 'Adj' : parsedMetrics.av === 'L' ? 'Local' : 'Phys'})</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">AC (Complex)</span>
                          <span className="font-bold text-slate-800">{parsedMetrics.ac} ({parsedMetrics.ac === 'L' ? 'Low' : 'High'})</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">PR (Privs)</span>
                          <span className="font-bold text-slate-800">{parsedMetrics.pr} ({parsedMetrics.pr === 'N' ? 'None' : parsedMetrics.pr === 'L' ? 'Low' : 'High'})</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">UI (User Int)</span>
                          <span className="font-bold text-slate-800">{parsedMetrics.ui} ({parsedMetrics.ui === 'N' ? 'None' : 'Required'})</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">S (Scope)</span>
                          <span className="font-bold text-purple-700">{parsedMetrics.s} ({parsedMetrics.s === 'U' ? 'Unchanged' : 'Changed'})</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">C (Conf)</span>
                          <span className={`font-bold ${parsedMetrics.c === 'H' ? 'text-rose-700' : 'text-slate-800'}`}>{parsedMetrics.c}</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">I (Integ)</span>
                          <span className={`font-bold ${parsedMetrics.i === 'H' ? 'text-rose-700' : 'text-slate-800'}`}>{parsedMetrics.i}</span>
                        </div>
                        <div className="p-1 rounded bg-white border border-slate-200">
                          <span className="text-slate-400 block text-[9px]">A (Avail)</span>
                          <span className={`font-bold ${parsedMetrics.a === 'H' ? 'text-rose-700' : 'text-slate-800'}`}>{parsedMetrics.a}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Section 1: Executive Impact Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  1. Resumen Ejecutivo de Impacto
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 italic">
                  {currentReport.impactSummary || 'Pendiente de redacción...'}
                </div>
              </div>

              {/* Section 2: Numbered Reproduction Steps */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-800" />
                  2. Pasos de Reproducción Detallados
                </h4>
                <div className="text-xs text-slate-800 font-mono space-y-1.5 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-lg border border-slate-200">
                  {currentReport.reproductionSteps || 'Pasos no definidos aún...'}
                </div>
              </div>

              {/* Section 3: Raw HTTP Request & Response PoC */}
              <div className="space-y-2 page-break-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    3. Evidencia Técnica: Petición / Respuesta HTTP Cruda (PoC)
                  </h4>
                  <div className="no-print flex items-center gap-2">
                    <button
                      onClick={() => setIsPoCModalOpen(true)}
                      className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 font-mono"
                    >
                      <Terminal className="w-3 h-3" /> Generar Python/cURL
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentReport.rawHttp || '');
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3 h-3" /> Copiar HTTP
                    </button>
                  </div>
                </div>

                {(() => {
                  const { requestRaw, responseRaw } = splitHttpExchange(currentReport.rawHttp || '');
                  if (responseRaw) {
                    return (
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                            Petición Transmitida (Request):
                          </span>
                          <div className="bg-slate-950 text-emerald-300 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800 leading-tight">
                            <pre className="whitespace-pre">{requestRaw}</pre>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                            Respuesta del Servidor (Server Response):
                          </span>
                          <div className="bg-slate-950 text-sky-300 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800 leading-tight">
                            <pre className="whitespace-pre">{responseRaw}</pre>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-slate-950 text-emerald-300 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-72 leading-tight">
                      <pre className="whitespace-pre">{currentReport.rawHttp || '// Adjunta aquí la petición y respuesta HTTP cruda de Burp Suite'}</pre>
                    </div>
                  );
                })()}
              </div>

              {/* Section 4: Concrete Impact Proof */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-800" />
                  4. Demostración Concreta de Impacto
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-lg border border-slate-200">
                  {currentReport.concreteImpactProof || 'Pendiente de prueba concreta...'}
                </div>
              </div>

              {/* Section 5: Remediation */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-200 pb-1 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  5. Remediación Sugerida & Mitigación
                </h4>
                <div className="text-xs text-slate-800 leading-relaxed bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200 whitespace-pre-line">
                  {currentReport.suggestedRemediation || 'Revisar control de autorización y lógica de negocio.'}
                </div>
              </div>

              {/* Formal Document Footer */}
              <div className="pt-6 border-t-2 border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
                <div>
                  Informe confidencial preparado para{' '}
                  <strong className="text-slate-700">{selectedProgram?.name || 'el cliente/programa'}</strong>
                </div>
                <div>
                  <a
                    href="https://www.unfantasmaenelsistema.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-slate-700 hover:text-red-600"
                  >
                    Un Fantasma en el Sistema
                  </a>{' '}
                  • Seguridad Ofensiva Ética
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CVSS Modal */}
      <CVSSCalculatorModal
        isOpen={isCVSSModalOpen}
        onClose={() => setIsCVSSModalOpen(false)}
        onApply={(vectorString, score) => {
          handleFieldChange('cvssVector', vectorString);
          handleFieldChange('cvssScore', score);
        }}
      />

      {/* PoC Python / cURL Generator Modal */}
      <PoCGeneratorModal
        isOpen={isPoCModalOpen}
        onClose={() => setIsPoCModalOpen(false)}
        rawHttpInitial={currentReport.rawHttp}
        reportTitle={currentReport.title || 'Vulnerabilidad'}
        onInsertIntoReport={(codeSnippet) => {
          handleFieldChange(
            'reproductionSteps',
            `${currentReport.reproductionSteps}\n\n### Script / PoC de Reproducción Automática:\n${codeSnippet}`
          );
          setSaveStatusMessage('PoC insertado en los pasos de reproducción');
          setTimeout(() => setSaveStatusMessage(null), 2500);
        }}
      />
    </div>
  );
};
