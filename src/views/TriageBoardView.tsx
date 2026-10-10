import React, { useState } from 'react';
import { TriageFinding, Program, KanbanStatus, FindingCategory, Severity } from '../types';
import { CVSSCalculatorModal } from '../components/CVSSCalculatorModal';
import {
  Kanban,
  Plus,
  Trash2,
  Edit3,
  Calculator,
  FileText,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Filter,
  Search,
} from 'lucide-react';

interface TriageBoardViewProps {
  programs: Program[];
  findings: TriageFinding[];
  onSaveFinding: (finding: TriageFinding) => void;
  onDeleteFinding: (id: string) => void;
  onGenerateReportFromFinding: (findingId: string) => void;
}

const KANBAN_COLUMNS: { id: KanbanStatus; title: string; color: string }[] = [
  { id: 'candidate', title: 'Candidato', color: 'border-slate-700 bg-slate-900/50' },
  { id: 'testing', title: 'En prueba', color: 'border-sky-500/40 bg-sky-950/20' },
  { id: 'confirmed', title: 'Confirmado (PoC)', color: 'border-emerald-500/40 bg-emerald-950/20' },
  { id: 'reported', title: 'Reportado', color: 'border-purple-500/40 bg-purple-950/20' },
  { id: 'resolved_paid', title: 'Resuelto / Pagado', color: 'border-amber-500/40 bg-amber-950/20' },
  { id: 'rejected', title: 'Rechazado / N-A', color: 'border-rose-900/40 bg-rose-950/15' },
];

export const TriageBoardView: React.FC<TriageBoardViewProps> = ({
  programs,
  findings,
  onSaveFinding,
  onDeleteFinding,
  onGenerateReportFromFinding,
}) => {
  const [filterProgramId, setFilterProgramId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // CVSS Modal state
  const [cvssModalFinding, setCvssModalFinding] = useState<TriageFinding | null>(null);

  // Edit / Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Partial<TriageFinding> | null>(null);

  const filteredFindings = findings.filter((f) => {
    const matchProg = filterProgramId === 'all' || f.programId === filterProgramId;
    const matchCat = filterCategory === 'all' || f.category === filterCategory;
    const matchSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchProg && matchCat && matchSearch;
  });

  const handleOpenAddFinding = (colStatus: KanbanStatus = 'candidate') => {
    setEditingFinding({
      id: `find-${Date.now()}`,
      programId: filterProgramId !== 'all' ? filterProgramId : programs[0]?.id || '',
      title: '',
      category: 'IDOR',
      status: colStatus,
      bountyAmount: 0,
      summary: '',
      reproductionNotes: '',
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
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditFinding = (f: TriageFinding) => {
    setEditingFinding({ ...f });
    setIsEditModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinding || !editingFinding.title || !editingFinding.programId) return;

    const saved: TriageFinding = {
      id: editingFinding.id || `find-${Date.now()}`,
      programId: editingFinding.programId,
      title: editingFinding.title,
      category: editingFinding.category || 'IDOR',
      status: editingFinding.status || 'candidate',
      bountyAmount: Number(editingFinding.bountyAmount) || 0,
      expectedBounty: Number(editingFinding.expectedBounty) || Number(editingFinding.bountyAmount) || 0,
      hoursSpent: Number(editingFinding.hoursSpent) || 3.0,
      penaltyMultiplier: Number(editingFinding.penaltyMultiplier) || 1.0,
      summary: editingFinding.summary || '',
      reproductionNotes: editingFinding.reproductionNotes || '',
      cvss: editingFinding.cvss || {
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
      createdAt: editingFinding.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onSaveFinding(saved);
    setIsEditModalOpen(false);
    setEditingFinding(null);
  };

  const handleMoveStatus = (finding: TriageFinding, nextStatus: KanbanStatus) => {
    onSaveFinding({
      ...finding,
      status: nextStatus,
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  const severityBadge = (sev: Severity, score: number) => {
    switch (sev) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {score.toFixed(1)} {sev}
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/40">
            {score.toFixed(1)} {sev}
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {score.toFixed(1)} {sev}
          </span>
        );
      case 'Low':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {score.toFixed(1)} {sev}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-800 text-slate-400">
            {score.toFixed(1)} {sev}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Triage Board — Tablero Kanban de Vulnerabilidades
          </h2>
          <p className="text-xs text-slate-400">
            Ciclo de vida de los hallazgos con calculadora FIRST CVSS v3.1 incorporada para evitar discrepancias de severidad.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddFinding('candidate')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Nuevo Hallazgo
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Program filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Programa:</span>
            <select
              value={filterProgramId}
              onChange={(e) => setFilterProgramId(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
            >
              <option value="all">Todos ({findings.length})</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Categoría:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 text-xs"
            >
              <option value="all">Todas</option>
              <option value="IDOR">IDOR / BOLA</option>
              <option value="Auth/JWT">Auth / JWT</option>
              <option value="Business Logic / Race Condition">Business Logic / Race Condition</option>
              <option value="Injection">Inyección</option>
              <option value="XSS/Client">XSS / Client-Side</option>
              <option value="SSRF/Network">SSRF / Network</option>
              <option value="Other">Otro</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar en triage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Kanban Board Container (Horizontal Scroll for viewport resilience) */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1240px]">
          {KANBAN_COLUMNS.map((col, colIdx) => {
            const colFindings = filteredFindings.filter((f) => f.status === col.id);
            return (
              <div
                key={col.id}
                className={`flex-1 min-w-[200px] max-w-[280px] rounded-2xl border p-3 flex flex-col gap-3 ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{col.title}</span>
                    <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {colFindings.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenAddFinding(col.id)}
                    className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition"
                    title={`Añadir a ${col.title}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards List */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-0.5">
                  {colFindings.map((finding) => {
                    const prog = programs.find((p) => p.id === finding.programId);
                    return (
                      <div
                        key={finding.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 shadow-md transition flex flex-col gap-2.5 group"
                      >
                        {/* Top card info */}
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate max-w-[140px]">
                            {finding.category}
                          </span>
                          <div className="shrink-0">
                            {severityBadge(finding.cvss.severity, finding.cvss.score)}
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-100 leading-snug line-clamp-2">
                          {finding.title}
                        </h4>

                        {/* Program & Bounty */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="truncate max-w-[110px]" title={prog?.name}>
                            {prog?.name || 'Scope general'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {finding.hoursSpent ? (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {finding.hoursSpent}h
                              </span>
                            ) : null}
                            {finding.bountyAmount ? (
                              <span className="text-emerald-400 font-bold">
                                ${finding.bountyAmount}
                              </span>
                            ) : finding.expectedBounty ? (
                              <span className="text-purple-300 font-medium">
                                ~${finding.expectedBounty}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* CVSS vector pill with Calculator button */}
                        <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[10px] font-mono">
                          <span className="text-slate-400 truncate" title={finding.cvss.vectorString}>
                            {finding.cvss.vectorString.replace('CVSS:3.1/', '')}
                          </span>
                          <button
                            onClick={() => setCvssModalFinding(finding)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition shrink-0"
                            title="Recalcular CVSS v3.1 oficial"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Actions Row */}
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-1">
                          {/* Column Mover controls */}
                          <div className="flex items-center gap-0.5">
                            {colIdx > 0 && (
                              <button
                                onClick={() =>
                                  handleMoveStatus(finding, KANBAN_COLUMNS[colIdx - 1].id)
                                }
                                className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition"
                                title={`Mover a ${KANBAN_COLUMNS[colIdx - 1].title}`}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {colIdx < KANBAN_COLUMNS.length - 1 && (
                              <button
                                onClick={() =>
                                  handleMoveStatus(finding, KANBAN_COLUMNS[colIdx + 1].id)
                                }
                                className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition"
                                title={`Mover a ${KANBAN_COLUMNS[colIdx + 1].title}`}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onGenerateReportFromFinding(finding.id)}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition"
                              title="Redactar reporte de bug bounty para este hallazgo"
                            >
                              <FileText className="w-3 h-3" />
                              Reporte
                            </button>
                            <button
                              onClick={() => handleOpenEditFinding(finding)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                              title="Editar hallazgo"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar hallazgo "${finding.title}"?`)) {
                                  onDeleteFinding(finding.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colFindings.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                      Sin tarjetas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit / Add Finding Modal */}
      {isEditModalOpen && editingFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Kanban className="w-4 h-4 text-emerald-400" />
              {editingFinding.id?.startsWith('find-') && !findings.some(f => f.id === editingFinding.id)
                ? 'Registrar Nuevo Hallazgo en Triage'
                : 'Editar Hallazgo'}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título del Hallazgo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. [IDOR] /api/v2/cards/{id}/reveal permite exfiltrar tarjetas ajenas"
                  value={editingFinding.title}
                  onChange={(e) => setEditingFinding({ ...editingFinding, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Programa *</label>
                  <select
                    required
                    value={editingFinding.programId}
                    onChange={(e) => setEditingFinding({ ...editingFinding, programId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={editingFinding.category}
                    onChange={(e) =>
                      setEditingFinding({
                        ...editingFinding,
                        category: e.target.value as FindingCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="IDOR">IDOR / BOLA</option>
                    <option value="Auth/JWT">Auth / JWT</option>
                    <option value="Business Logic / Race Condition">Business Logic / Race Condition</option>
                    <option value="Injection">Inyección (SQLi, NoSQL, Command)</option>
                    <option value="XSS/Client">XSS / Client-Side</option>
                    <option value="SSRF/Network">SSRF / Network</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Columna Kanban</label>
                  <select
                    value={editingFinding.status}
                    onChange={(e) =>
                      setEditingFinding({
                        ...editingFinding,
                        status: e.target.value as KanbanStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {KANBAN_COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Resumen Técnico del Hallazgo
                </label>
                <textarea
                  rows={3}
                  placeholder="Descripción concisa de la vulnerabilidad y por qué tiene impacto directo..."
                  value={editingFinding.summary}
                  onChange={(e) => setEditingFinding({ ...editingFinding, summary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Bounty Cobrado ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editingFinding.bountyAmount || 0}
                    onChange={(e) =>
                      setEditingFinding({
                        ...editingFinding,
                        bountyAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Bounty Esperado ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="ej. 1500"
                    value={editingFinding.expectedBounty || 0}
                    onChange={(e) =>
                      setEditingFinding({
                        ...editingFinding,
                        expectedBounty: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Horas Invertidas (h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="ej. 4.5"
                    value={editingFinding.hoursSpent || 3.0}
                    onChange={(e) =>
                      setEditingFinding({
                        ...editingFinding,
                        hoursSpent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-300 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Métricas CVSS v3.1 Actuales
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-[11px] truncate">
                    {editingFinding.cvss?.vectorString || 'No configurado'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCvssModalFinding(editingFinding as TriageFinding);
                    }}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-mono font-bold shrink-0 transition"
                  >
                    Calcular
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg"
                >
                  Guardar Hallazgo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CVSS Modal attached to finding */}
      {cvssModalFinding && (
        <CVSSCalculatorModal
          isOpen={Boolean(cvssModalFinding)}
          onClose={() => setCvssModalFinding(null)}
          initialMetrics={cvssModalFinding.cvss}
          onApply={(vectorString, score, severity, metrics) => {
            if (isEditModalOpen && editingFinding) {
              setEditingFinding({
                ...editingFinding,
                cvss: {
                  ...metrics,
                  vectorString,
                  score,
                  severity,
                },
              });
            } else if (cvssModalFinding.id) {
              const updated = {
                ...cvssModalFinding,
                cvss: {
                  ...metrics,
                  vectorString,
                  score,
                  severity,
                },
              };
              onSaveFinding(updated);
            }
          }}
        />
      )}
    </div>
  );
};
