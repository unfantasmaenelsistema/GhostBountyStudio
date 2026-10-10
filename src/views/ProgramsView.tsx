import React, { useState } from 'react';
import { Program, TestedVector, ProgramStatus, VectorResult } from '../types';
import {
  FolderGit2,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ShieldBan,
  Calendar,
  Globe,
  Filter,
  Search,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ProgramsViewProps {
  programs: Program[];
  onSaveProgram: (program: Program) => void;
  onDeleteProgram: (id: string) => void;
  onSelectProgramForRecon: (programId: string) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  programs,
  onSaveProgram,
  onDeleteProgram,
  onSelectProgramForRecon,
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    programs[0]?.id || ''
  );
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProgramStatus>('all');

  // Program form state
  const [formProgram, setFormProgram] = useState<Partial<Program>>({
    name: '',
    domain: '',
    outOfScope: '',
    minSeverity: 'medium',
    lastCampaignDate: new Date().toISOString().split('T')[0],
    status: 'active',
    notes: '',
    testedVectors: [],
  });

  // Vector modal/form state
  const [isAddingVector, setIsAddingVector] = useState(false);
  const [newVector, setNewVector] = useState<Partial<TestedVector>>({
    name: '',
    targetEndpoint: '',
    testedAt: new Date().toISOString().split('T')[0],
    result: 'no_result',
    notes: '',
  });

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenNewProgram = () => {
    setFormProgram({
      id: `prog-${Date.now()}`,
      name: '',
      domain: '',
      outOfScope: '',
      minSeverity: 'medium',
      lastCampaignDate: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: '',
      testedVectors: [],
      createdAt: new Date().toISOString().split('T')[0],
    });
    setIsAddingNew(true);
    setIsEditingProgram(true);
  };

  const handleOpenEditProgram = (prog: Program) => {
    setFormProgram({ ...prog });
    setIsAddingNew(false);
    setIsEditingProgram(true);
  };

  const handleSaveProgramForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProgram.name || !formProgram.domain) return;

    const saved: Program = {
      id: formProgram.id || `prog-${Date.now()}`,
      name: formProgram.name,
      domain: formProgram.domain,
      outOfScope: formProgram.outOfScope || '',
      minSeverity: formProgram.minSeverity || 'medium',
      lastCampaignDate: formProgram.lastCampaignDate || new Date().toISOString().split('T')[0],
      status: formProgram.status || 'active',
      notes: formProgram.notes || '',
      testedVectors: formProgram.testedVectors || [],
      createdAt: formProgram.createdAt || new Date().toISOString().split('T')[0],
    };

    onSaveProgram(saved);
    setSelectedProgramId(saved.id);
    setIsEditingProgram(false);
    setIsAddingNew(false);
  };

  const handleAddVector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVector.name || !selectedProgram) return;

    const vectorItem: TestedVector = {
      id: `vec-${Date.now()}`,
      name: newVector.name,
      targetEndpoint: newVector.targetEndpoint || '',
      testedAt: newVector.testedAt || new Date().toISOString().split('T')[0],
      result: newVector.result || 'no_result',
      notes: newVector.notes || '',
    };

    const updatedProgram: Program = {
      ...selectedProgram,
      testedVectors: [vectorItem, ...(selectedProgram.testedVectors || [])],
      lastCampaignDate: new Date().toISOString().split('T')[0],
    };

    onSaveProgram(updatedProgram);
    setIsAddingVector(false);
    setNewVector({
      name: '',
      targetEndpoint: '',
      testedAt: new Date().toISOString().split('T')[0],
      result: 'no_result',
      notes: '',
    });
  };

  const handleDeleteVector = (vectorId: string) => {
    if (!selectedProgram) return;
    const updatedProgram: Program = {
      ...selectedProgram,
      testedVectors: (selectedProgram.testedVectors || []).filter((v) => v.id !== vectorId),
    };
    onSaveProgram(updatedProgram);
  };

  const statusBadge = (status: ProgramStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Activo
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pausado
          </span>
        );
      case 'exhausted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Agotado (Pivote)
          </span>
        );
    }
  };

  const vectorResultBadge = (result: VectorResult) => {
    switch (result) {
      case 'finding_found':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Hallazgo encontrado
          </span>
        );
      case 'blocked_waf':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
            Bloqueado por WAF/Defensa
          </span>
        );
      case 'no_result':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Sin resultado
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
            Gestión de Programas & Criterio de Pivote
          </h2>
          <p className="text-xs text-slate-400">
            Registra el alcance, out-of-scope y la bitácora de vectores probados para decidir con rigor técnico cuándo pivotar a otro objetivo.
          </p>
        </div>
        <button
          onClick={handleOpenNewProgram}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Programa
        </button>
      </div>

      {/* Program Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Programs List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filter */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar programa o dominio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <Filter className="w-3 h-3 text-slate-500 mr-1" />
              {(['all', 'active', 'paused', 'exhausted'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-0.5 rounded transition uppercase ${
                    statusFilter === s
                      ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s === 'all' ? 'Todos' : s}
                </button>
              ))}
            </div>
          </div>

          {/* List of Programs */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredPrograms.map((prog) => {
              const isSelected = selectedProgram?.id === prog.id;
              const findingsCount = (prog.testedVectors || []).filter(
                (v) => v.result === 'finding_found'
              ).length;
              return (
                <div
                  key={prog.id}
                  onClick={() => {
                    setSelectedProgramId(prog.id);
                    setIsEditingProgram(false);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{prog.name}</h3>
                    {statusBadge(prog.status)}
                  </div>
                  <div className="text-xs font-mono text-slate-400 truncate flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{prog.domain}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span>{prog.testedVectors?.length || 0} vectores probados</span>
                    <span className="text-emerald-400 font-bold">
                      {findingsCount} {findingsCount === 1 ? 'hallazgo' : 'hallazgos'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredPrograms.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No hay programas coincidentes.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Program Details & Tested Vectors (8 Cols) */}
        <div className="lg:col-span-8">
          {isEditingProgram ? (
            /* Program Form */
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">
                {isAddingNew ? 'Nuevo Programa de Bug Bounty' : 'Editar Programa'}
              </h3>
              <form onSubmit={handleSaveProgramForm} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nombre del Programa *</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. FinVault Payments Platform"
                      value={formProgram.name}
                      onChange={(e) => setFormProgram({ ...formProgram, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Estado</label>
                    <select
                      value={formProgram.status}
                      onChange={(e) =>
                        setFormProgram({ ...formProgram, status: e.target.value as ProgramStatus })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="active">Activo</option>
                      <option value="paused">Pausado</option>
                      <option value="exhausted">Agotado (Criterio de pivote cumplido)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dominio / Scope Incluido (wildcards, URLs) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. *.finvault.io, api.finvault.io"
                    value={formProgram.domain}
                    onChange={(e) => setFormProgram({ ...formProgram, domain: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Out of Scope (Fuera de alcance prohibido)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ej. DoS/DDoS, ataques de fuerza bruta al portal de login, blog.acme.com administrado por terceros..."
                    value={formProgram.outOfScope}
                    onChange={(e) => setFormProgram({ ...formProgram, outOfScope: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Severidad Mínima Aceptada
                    </label>
                    <select
                      value={formProgram.minSeverity}
                      onChange={(e) =>
                        setFormProgram({
                          ...formProgram,
                          minSeverity: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Baja (Low)</option>
                      <option value="medium">Media (Medium)</option>
                      <option value="high">Alta (High)</option>
                      <option value="critical">Solo Crítica (Critical)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Fecha de Última Campaña
                    </label>
                    <input
                      type="date"
                      value={formProgram.lastCampaignDate}
                      onChange={(e) =>
                        setFormProgram({ ...formProgram, lastCampaignDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notas / Políticas del Programa</label>
                  <textarea
                    rows={2}
                    placeholder="Tiempos de respuesta de triage, recompensas promedio, requisitos especiales de safe harbor..."
                    value={formProgram.notes}
                    onChange={(e) => setFormProgram({ ...formProgram, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingProgram(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition"
                  >
                    Guardar Programa
                  </button>
                </div>
              </form>
            </div>
          ) : selectedProgram ? (
            /* Program Detail View */
            <div className="space-y-6">
              {/* Program Overview Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(selectedProgram.status)}
                      <span className="text-xs font-mono text-slate-500">
                        Última campaña: {selectedProgram.lastCampaignDate}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedProgram.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProgramForRecon(selectedProgram.id)}
                      className="px-3 py-1.5 text-xs font-mono bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg transition flex items-center gap-1"
                    >
                      Ir a Recon <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditProgram(selectedProgram)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="Editar programa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {programs.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar programa ${selectedProgram.name}?`)) {
                            onDeleteProgram(selectedProgram.id);
                          }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition"
                        title="Eliminar programa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                    <div className="text-slate-400 font-mono uppercase tracking-wider mb-1 font-semibold flex items-center gap-1 text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" /> In-Scope
                    </div>
                    <div className="font-mono text-slate-200 break-all">{selectedProgram.domain}</div>
                    <div className="text-[11px] text-slate-500 mt-2 font-mono">
                      Severidad mínima: <span className="uppercase text-amber-400 font-bold">{selectedProgram.minSeverity}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                    <div className="text-rose-400 font-mono uppercase tracking-wider mb-1 font-semibold flex items-center gap-1 text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Out-of-Scope
                    </div>
                    <div className="text-slate-300">
                      {selectedProgram.outOfScope || 'No se han especificado exclusiones.'}
                    </div>
                  </div>
                </div>

                {selectedProgram.notes && (
                  <div className="text-xs text-slate-400 bg-slate-950/30 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-300 font-semibold font-mono">Notas de campo: </span>
                    {selectedProgram.notes}
                  </div>
                )}
              </div>

              {/* Tested Attack Vectors Log (Pivot Criteria) */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Bitácora de Vectores Probados & Criterio de Pivote
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {selectedProgram.testedVectors?.length || 0} registrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Documenta qué ataques has ejecutado y su desenlace para fundamentar cuándo pivotar de endpoint o de programa.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingVector(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Probar Vector
                  </button>
                </div>

                {/* Add Vector Form Modal / Panel */}
                {isAddingVector && (
                  <form
                    onSubmit={handleAddVector}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs animate-in fade-in"
                  >
                    <div className="font-bold text-white text-xs">Registrar Resultado de Prueba de Vector</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Vector / Técnica Probada *</label>
                        <input
                          type="text"
                          required
                          placeholder="ej. Race Condition en redención de cupón"
                          value={newVector.name}
                          onChange={(e) => setNewVector({ ...newVector, name: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Endpoint / Parámetro</label>
                        <input
                          type="text"
                          placeholder="ej. POST /api/v2/coupons/redeem"
                          value={newVector.targetEndpoint}
                          onChange={(e) => setNewVector({ ...newVector, targetEndpoint: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Resultado Obtenido *</label>
                        <select
                          value={newVector.result}
                          onChange={(e) => setNewVector({ ...newVector, result: e.target.value as VectorResult })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                        >
                          <option value="no_result">Sin resultado (Vulnerable: No)</option>
                          <option value="finding_found">Hallazgo encontrado (Vulnerable: Sí)</option>
                          <option value="blocked_waf">Bloqueado por defensa perimetral / WAF</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Fecha de Prueba</label>
                        <input
                          type="date"
                          value={newVector.testedAt}
                          onChange={(e) => setNewVector({ ...newVector, testedAt: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Notas de Triage / Motivo de Pivote</label>
                      <textarea
                        rows={2}
                        placeholder="ej. Servidor responde 429 tras 5 peticiones y bloquea IP por 10 min. Pivote necesario hacia autenticación."
                        value={newVector.notes}
                        onChange={(e) => setNewVector({ ...newVector, notes: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setIsAddingVector(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg"
                      >
                        Añadir a la Bitácora
                      </button>
                    </div>
                  </form>
                )}

                {/* Vectors List */}
                <div className="space-y-2.5">
                  {(selectedProgram.testedVectors || []).map((vec) => (
                    <div
                      key={vec.id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{vec.name}</span>
                          {vectorResultBadge(vec.result)}
                          <span className="text-[11px] font-mono text-slate-500">{vec.testedAt}</span>
                        </div>
                        {vec.targetEndpoint && (
                          <div className="text-xs font-mono text-purple-300/90 truncate">
                            {vec.targetEndpoint}
                          </div>
                        )}
                        {vec.notes && (
                          <p className="text-xs text-slate-400 pt-0.5">{vec.notes}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteVector(vec.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition self-end sm:self-auto"
                        title="Eliminar vector"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {(!selectedProgram.testedVectors || selectedProgram.testedVectors.length === 0) && (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
                      <Info className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                      <div className="font-semibold text-slate-400">Sin vectores probados aún en este programa</div>
                      <div>Haz clic en "+ Probar Vector" para registrar ataques y justificar tus decisiones de pivote.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              Selecciona o crea un programa para comenzar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
