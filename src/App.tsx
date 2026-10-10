import React, { useState, useEffect } from 'react';
import {
  Program,
  ReconItem,
  TriageFinding,
  ReportDraft,
} from './types';
import {
  getStoredPrograms,
  setStoredPrograms,
  getStoredRecon,
  setStoredRecon,
  getStoredFindings,
  setStoredFindings,
  getStoredReports,
  setStoredReports,
  getStoredActivityDates,
  recordActivityToday,
} from './utils/storage';
import { checkServerHealth } from './utils/copilotClient';

// Components & Views
import { GhostLogo } from './components/GhostLogo';
import { BackupModal } from './components/BackupModal';
import { CVSSCalculatorModal } from './components/CVSSCalculatorModal';
import { PoCGeneratorModal } from './components/PoCGeneratorModal';
import { DashboardView } from './views/DashboardView';
import { ProgramsView } from './views/ProgramsView';
import { ReconTrackerView } from './views/ReconTrackerView';
import { TriageBoardView } from './views/TriageBoardView';
import { ReportGeneratorView } from './views/ReportGeneratorView';
import { MethodologyCopilotView } from './views/MethodologyCopilotView';

// Icons
import {
  LayoutDashboard,
  FolderGit2,
  Crosshair,
  Kanban,
  FileText,
  Bot,
  Sun,
  Moon,
  Database,
  Calculator,
  Shield,
  Menu,
  X,
  Zap,
  Terminal,
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('ghostbounty_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // App State from localStorage
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reconItems, setReconItems] = useState<ReconItem[]>([]);
  const [findings, setFindings] = useState<TriageFinding[]>([]);
  const [reports, setReports] = useState<ReportDraft[]>([]);
  const [activityDates, setActivityDates] = useState<string[]>([]);

  // Cross-view state & bridge
  const [selectedProgramForRecon, setSelectedProgramForRecon] = useState<string | undefined>(undefined);
  const [activeFindingForReport, setActiveFindingForReport] = useState<string | null>(null);

  // Modals
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isGlobalCVSSOpen, setIsGlobalCVSSOpen] = useState(false);
  const [isGlobalPoCOpen, setIsGlobalPoCOpen] = useState(false);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string | undefined>(undefined);

  // Server & AI Status
  const [aiStatus, setAiStatus] = useState<{ isOnline: boolean; hasGeminiKey: boolean }>({
    isOnline: false,
    hasGeminiKey: false,
  });

  // Load state on mount
  const reloadData = () => {
    setPrograms(getStoredPrograms());
    setReconItems(getStoredRecon());
    setFindings(getStoredFindings());
    setReports(getStoredReports());
    setActivityDates(getStoredActivityDates());
  };

  useEffect(() => {
    reloadData();
    recordActivityToday();
    checkServerHealth().then(setAiStatus);
  }, []);

  // Sync theme with DOM
  useEffect(() => {
    localStorage.setItem('ghostbounty_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Program Handlers
  const handleSaveProgram = (prog: Program) => {
    const exists = programs.some((p) => p.id === prog.id);
    const updated = exists
      ? programs.map((p) => (p.id === prog.id ? prog : p))
      : [prog, ...programs];
    setPrograms(updated);
    setStoredPrograms(updated);
  };

  const handleDeleteProgram = (id: string) => {
    const updated = programs.filter((p) => p.id !== id);
    setPrograms(updated);
    setStoredPrograms(updated);
  };

  // Recon Handlers
  const handleSaveReconItem = (item: ReconItem) => {
    const exists = reconItems.some((r) => r.id === item.id);
    const updated = exists
      ? reconItems.map((r) => (r.id === item.id ? item : r))
      : [item, ...reconItems];
    setReconItems(updated);
    setStoredRecon(updated);
  };

  const handleDeleteReconItem = (id: string) => {
    const updated = reconItems.filter((r) => r.id !== id);
    setReconItems(updated);
    setStoredRecon(updated);
  };

  const handleCreateFindingFromRecon = (recon: ReconItem) => {
    const newFinding: TriageFinding = {
      id: `find-${Date.now()}`,
      programId: recon.programId,
      title: `[${recon.involvesOtherUser ? 'IDOR' : 'BAC'}] ${recon.method} ${recon.endpoint} - Posible falla de autorización`,
      category: recon.involvesOtherUser ? 'IDOR' : 'Business Logic / Race Condition',
      status: 'candidate',
      bountyAmount: 0,
      summary: `Endpoint identificado durante el reconocimiento: ${recon.endpoint}. Tipo de ID: ${recon.idType}. ${recon.notes}`,
      reproductionNotes: `1. Enviar petición ${recon.method} a ${recon.endpoint}.\n2. Evaluar respuestas con privilegios de otro usuario.`,
      cvss: {
        av: 'N',
        ac: 'L',
        pr: 'L',
        ui: 'N',
        s: 'U',
        c: 'H',
        i: 'N',
        a: 'N',
        score: 6.5,
        severity: 'Medium',
        vectorString: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
      },
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newFinding, ...findings];
    setFindings(updated);
    setStoredFindings(updated);
    setActiveTab('triage');
  };

  // Triage Finding Handlers
  const handleSaveFinding = (finding: TriageFinding) => {
    const exists = findings.some((f) => f.id === finding.id);
    const updated = exists
      ? findings.map((f) => (f.id === finding.id ? finding : f))
      : [finding, ...findings];
    setFindings(updated);
    setStoredFindings(updated);
  };

  const handleDeleteFinding = (id: string) => {
    const updated = findings.filter((f) => f.id !== id);
    setFindings(updated);
    setStoredFindings(updated);
  };

  const handleGenerateReportFromFinding = (findingId: string) => {
    setActiveFindingForReport(findingId);
    setActiveTab('reports');
  };

  // Report Handlers
  const handleSaveReport = (report: ReportDraft) => {
    const exists = reports.some((r) => r.id === report.id);
    const updated = exists
      ? reports.map((r) => (r.id === report.id ? report : r))
      : [report, ...reports];
    setReports(updated);
    setStoredReports(updated);
  };

  // Copilot Bridge Handler
  const handleOpenCopilot = (initialPrompt?: string) => {
    setCopilotInitialPrompt(initialPrompt);
    setIsCopilotDrawerOpen(true);
  };

  // Sidebar navigation items
  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'programs', label: 'Programas', icon: FolderGit2, badge: programs.length },
    { id: 'recon', label: 'Recon Tracker', icon: Crosshair, badge: reconItems.length },
    { id: 'triage', label: 'Triage Board', icon: Kanban, badge: findings.length },
    { id: 'reports', label: 'Generador Reportes', icon: FileText },
    { id: 'copilot', label: 'Copiloto Metodología', icon: Bot, isSpecial: true },
  ];

  const currentReportDraft = reports.find((r) => r.findingId === activeFindingForReport) || reports[0];

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDarkMode ? 'bg-[#090c10] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 flex flex-col border-r ${
            isDarkMode
              ? 'bg-[#0d1117] border-slate-800/80'
              : 'bg-white border-slate-200'
          } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Logo / Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/60 shrink-0">
            <GhostLogo withText size={30} />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Status Badge in Sidebar */}
          <div className="px-4 py-2.5">
            <div
              className={`p-2 rounded-xl border flex items-center justify-between text-[11px] font-mono ${
                aiStatus.hasGeminiKey
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    aiStatus.hasGeminiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">
                  {aiStatus.hasGeminiKey ? 'Gemini 3.8 Flash' : 'Motor Offline Activo'}
                </span>
              </div>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400 shrink-0">
                {aiStatus.hasGeminiKey ? 'API' : 'LOCAL'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? isDarkMode
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                        : 'bg-purple-100 text-purple-900 border border-purple-200'
                      : isDarkMode
                      ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-purple-400'
                          : item.isSpecial
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-purple-500/30 text-purple-200'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Tools & Utilities in Sidebar */}
          <div className="p-3 border-t border-slate-800/80 space-y-2">
            <button
              onClick={() => setIsGlobalPoCOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition font-mono border border-slate-800/60"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>Generador PoCs (cURL/Py)</span>
            </button>

            <button
              onClick={() => setIsGlobalCVSSOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition font-mono border border-slate-800/60"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calculadora CVSS v3.1</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition font-mono border border-slate-800/60"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>Backup / JSON Export</span>
            </button>
          </div>

          {/* Sidebar Footer with Theme Toggle & Brand */}
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex flex-col">
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-200 hover:text-emerald-400 font-mono text-[11px] flex items-center gap-1 transition"
              >
                <span>Un Fantasma en el Sistema</span>
              </a>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400/80 hover:text-emerald-300 transition"
              >
                unfantasmaenelsistema.com ↗
              </a>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar for Mobile & Quick Status */}
          <header
            className={`h-14 px-4 sm:px-6 flex items-center justify-between border-b shrink-0 ${
              isDarkMode
                ? 'bg-[#0d1117]/80 border-slate-800/80 backdrop-blur'
                : 'bg-white/80 border-slate-200 backdrop-blur'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-1.5 md:hidden text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                GhostBountyStudio /{' '}
                <span className="text-emerald-400">
                  {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700 text-xs font-mono font-medium transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>unfantasmaenelsistema.com ↗</span>
              </a>

              <button
                onClick={() => handleOpenCopilot('¿Puedes auditar mi reporte actual para triage?')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-xs font-semibold transition"
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>Copiloto de Metodología</span>
              </button>

              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                title="Copia de seguridad y exportación JSON"
              >
                <Database className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </header>

          {/* Main View Port (Scrollable, 1280-1366px laptop resilient) */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && (
                <DashboardView
                  programs={programs}
                  findings={findings}
                  reconItems={reconItems}
                  activityDates={activityDates}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectFindingForReport={(fid) => handleGenerateReportFromFinding(fid)}
                />
              )}

              {activeTab === 'programs' && (
                <ProgramsView
                  programs={programs}
                  onSaveProgram={handleSaveProgram}
                  onDeleteProgram={handleDeleteProgram}
                  onSelectProgramForRecon={(pid) => {
                    setSelectedProgramForRecon(pid);
                    setActiveTab('recon');
                  }}
                />
              )}

              {activeTab === 'recon' && (
                <ReconTrackerView
                  programs={programs}
                  reconItems={reconItems}
                  selectedProgramId={selectedProgramForRecon}
                  onSaveReconItem={handleSaveReconItem}
                  onDeleteReconItem={handleDeleteReconItem}
                  onCreateFindingFromRecon={handleCreateFindingFromRecon}
                />
              )}

              {activeTab === 'triage' && (
                <TriageBoardView
                  programs={programs}
                  findings={findings}
                  onSaveFinding={handleSaveFinding}
                  onDeleteFinding={handleDeleteFinding}
                  onGenerateReportFromFinding={handleGenerateReportFromFinding}
                />
              )}

              {activeTab === 'reports' && (
                <ReportGeneratorView
                  programs={programs}
                  findings={findings}
                  reports={reports}
                  activeFindingId={activeFindingForReport}
                  onSaveReport={handleSaveReport}
                  onOpenCopilot={handleOpenCopilot}
                />
              )}

              {activeTab === 'copilot' && (
                <MethodologyCopilotView
                  currentReport={currentReportDraft}
                  initialPrompt={copilotInitialPrompt}
                />
              )}
            </div>
          </main>

          {/* Global Footer */}
          <footer
            className={`px-6 py-3 border-t text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              isDarkMode
                ? 'bg-[#0d1117] border-slate-800 text-slate-500'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">GhostBountyStudio</span>
              <span>•</span>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
              >
                Un Fantasma en el Sistema
              </a>
              <span>•</span>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white"
              >
                https://www.unfantasmaenelsistema.com/
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span>Licencia MIT</span>
              <span>•</span>
              <span className="text-purple-400">CVSS v3.1 Oficial FIRST.org</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Floating Copilot Drawer Modal */}
      {isCopilotDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl h-[85vh] flex flex-col relative">
            <button
              onClick={() => setIsCopilotDrawerOpen(false)}
              className="absolute -top-10 right-0 p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 h-full overflow-hidden">
              <MethodologyCopilotView
                currentReport={currentReportDraft}
                initialPrompt={copilotInitialPrompt}
                isDrawer
                onCloseDrawer={() => setIsCopilotDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global CVSS Calculator Modal */}
      <CVSSCalculatorModal
        isOpen={isGlobalCVSSOpen}
        onClose={() => setIsGlobalCVSSOpen(false)}
        onApply={(vector, score, sev) => {
          setIsGlobalCVSSOpen(false);
        }}
      />

      {/* Global PoC Python & cURL Generator Modal */}
      <PoCGeneratorModal
        isOpen={isGlobalPoCOpen}
        onClose={() => setIsGlobalPoCOpen(false)}
        rawHttpInitial=""
        reportTitle="Prueba de Concepto"
        onInsertIntoReport={(snippet) => {
          setIsGlobalPoCOpen(false);
          setActiveTab('reports');
        }}
      />

      {/* Backup Import / Export Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataReloaded={reloadData}
      />
    </div>
  );
}
