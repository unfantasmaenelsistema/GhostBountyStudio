import React, { useState } from 'react';
import { ReconItem, Program, HttpMethod, IdType, Priority } from '../types';
import {
  Crosshair,
  Plus,
  Trash2,
  Edit2,
  Download,
  FileText,
  Check,
  Search,
  Filter,
  Users,
  ArrowUpDown,
  Copy,
} from 'lucide-react';

interface ReconTrackerViewProps {
  programs: Program[];
  reconItems: ReconItem[];
  selectedProgramId?: string;
  onSaveReconItem: (item: ReconItem) => void;
  onDeleteReconItem: (id: string) => void;
  onCreateFindingFromRecon: (item: ReconItem) => void;
}

export const ReconTrackerView: React.FC<ReconTrackerViewProps> = ({
  programs,
  reconItems,
  selectedProgramId,
  onSaveReconItem,
  onDeleteReconItem,
  onCreateFindingFromRecon,
}) => {
  const [filterProgramId, setFilterProgramId] = useState<string>(selectedProgramId || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCrossUser, setFilterCrossUser] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // high to low or low to high

  // Modal / form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ReconItem> | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const priorityWeights: Record<Priority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const filteredItems = reconItems
    .filter((item) => {
      const matchProg = filterProgramId === 'all' || item.programId === filterProgramId;
      const matchSearch =
        item.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = filterPriority === 'all' || item.priority === filterPriority;
      const matchCross =
        filterCrossUser === 'all' ||
        (filterCrossUser === 'yes' ? item.involvesOtherUser : !item.involvesOtherUser);
      return matchProg && matchSearch && matchPriority && matchCross;
    })
    .sort((a, b) => {
      const weightA = priorityWeights[a.priority];
      const weightB = priorityWeights[b.priority];
      return sortOrder === 'desc' ? weightB - weightA : weightA - weightB;
    });

  const handleOpenAdd = () => {
    setEditingItem({
      id: `recon-${Date.now()}`,
      programId: filterProgramId !== 'all' ? filterProgramId : programs[0]?.id || '',
      endpoint: '',
      method: 'GET',
      idType: 'sequential',
      involvesOtherUser: true,
      priority: 'high',
      notes: '',
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ReconItem) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.endpoint || !editingItem.programId) return;

    const saved: ReconItem = {
      id: editingItem.id || `recon-${Date.now()}`,
      programId: editingItem.programId,
      endpoint: editingItem.endpoint,
      method: editingItem.method || 'GET',
      idType: editingItem.idType || 'none',
      involvesOtherUser: Boolean(editingItem.involvesOtherUser),
      priority: editingItem.priority || 'medium',
      notes: editingItem.notes || '',
      updatedAt: new Date().toISOString(),
    };

    onSaveReconItem(saved);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Programa',
      'Metodo HTTP',
      'Endpoint',
      'Tipo de ID',
      'Involucra Otro Usuario',
      'Prioridad',
      'Notas',
      'Actualizado',
    ];

    const rows = filteredItems.map((item) => {
      const prog = programs.find((p) => p.id === item.programId);
      return [
        `"${prog?.name || item.programId}"`,
        `"${item.method}"`,
        `"${item.endpoint.replace(/"/g, '""')}"`,
        `"${item.idType}"`,
        item.involvesOtherUser ? 'SI' : 'NO',
        `"${item.priority.toUpperCase()}"`,
        `"${item.notes.replace(/"/g, '""')}"`,
        `"${item.updatedAt}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recon_tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Markdown table
  const handleExportMarkdown = () => {
    let md = `| Programa | Método | Endpoint | Tipo de ID | ¿Otro Usuario? | Prioridad | Notas |\n`;
    md += `| :--- | :---: | :--- | :---: | :---: | :---: | :--- |\n`;

    filteredItems.forEach((item) => {
      const prog = programs.find((p) => p.id === item.programId);
      md += `| ${prog?.name || 'N/A'} | \`${item.method}\` | \`${item.endpoint}\` | ${item.idType} | ${item.involvesOtherUser ? '✅ Sí' : '❌ No'} | **${item.priority.toUpperCase()}** | ${item.notes.replace(/\|/g, '\\|')} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedNotification('Tabla Markdown copiada al portapapeles');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const methodBadge = (m: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
      POST: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      PUT: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      DELETE: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      PATCH: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      OPTIONS: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
      HEAD: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${colors[m] || 'text-slate-300'}`}>
        {m}
      </span>
    );
  };

  const priorityBadge = (p: Priority) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
            ALTA
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
            MEDIA
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            BAJA
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
            Recon Tracker — Matriz de Superficie de Ataque
          </h2>
          <p className="text-xs text-slate-400">
            Mapeo granular de endpoints, tipología de IDs para vectores IDOR/BOLA y prioridades de inspección.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
            title="Exportar a archivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            CSV
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
            title="Copiar tabla en formato Markdown"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            Markdown
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)] transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Endpoint
          </button>
        </div>
      </div>

      {copiedNotification && (
        <div className="p-3 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          {copiedNotification}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Program filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Programa</label>
            <select
              value={filterProgramId}
              onChange={(e) => setFilterProgramId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Todos los programas ({reconItems.length})</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search input */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Buscar Endpoint / Notas</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="/api/v1/users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Prioridad</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta (High)</option>
              <option value="medium">Media (Medium)</option>
              <option value="low">Baja (Low)</option>
            </select>
          </div>

          {/* Cross User filter */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">¿Involucra Otro Usuario?</label>
            <select
              value={filterCrossUser}
              onChange={(e) => setFilterCrossUser(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Cualquiera</option>
              <option value="yes">Sí (Vector BOLA/IDOR directo)</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-mono">
          <span>{filteredItems.length} endpoints encontrados</span>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Ordenar por prioridad: <span className="font-bold">{sortOrder === 'desc' ? 'Alta → Baja' : 'Baja → Alta'}</span>
          </button>
        </div>
      </div>

      {/* Recon Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Método</th>
                <th className="py-3 px-4 font-semibold">Endpoint</th>
                <th className="py-3 px-4 font-semibold">Tipo de ID</th>
                <th className="py-3 px-4 font-semibold">¿Otro Usuario?</th>
                <th className="py-3 px-4 font-semibold">Prioridad</th>
                <th className="py-3 px-4 font-semibold">Notas Técnicas</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const prog = programs.find((p) => p.id === item.programId);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {methodBadge(item.method)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                      <div className="truncate max-w-sm" title={item.endpoint}>
                        {item.endpoint}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">{prog?.name || 'General'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                        {item.idType}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.involvesOtherUser ? (
                        <span className="inline-flex items-center gap-1 text-purple-300 font-semibold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/30">
                          <Users className="w-3 h-3 text-purple-400" /> Sí (BOLA/IDOR)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {priorityBadge(item.priority)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs">
                      <div className="line-clamp-2" title={item.notes}>
                        {item.notes || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onCreateFindingFromRecon(item)}
                          className="px-2 py-1 text-[11px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded transition"
                          title="Crear hallazgo en Triage Board"
                        >
                          + Hallazgo
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este endpoint del tracker?')) {
                              onDeleteReconItem(item.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No se encontraron endpoints con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Recon Item Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 text-xs space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              {editingItem.id?.startsWith('recon-') && !reconItems.some(i => i.id === editingItem.id)
                ? 'Registrar Nuevo Endpoint en Recon'
                : 'Editar Endpoint de Recon'}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Programa Asociado *</label>
                <select
                  required
                  value={editingItem.programId}
                  onChange={(e) => setEditingItem({ ...editingItem, programId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-300 font-semibold mb-1">Método *</label>
                  <select
                    value={editingItem.method}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, method: e.target.value as HttpMethod })
                    }
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-300 font-semibold mb-1">Endpoint Path *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. /api/v2/cards/{id}/reveal"
                    value={editingItem.endpoint}
                    onChange={(e) => setEditingItem({ ...editingItem, endpoint: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de ID</label>
                  <select
                    value={editingItem.idType}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, idType: e.target.value as IdType })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="sequential">Secuencial (1, 2, 3)</option>
                    <option value="uuid">UUID v4</option>
                    <option value="hash">Hash / MD5 / SHA</option>
                    <option value="slug">Slug / Username</option>
                    <option value="none">Ninguno</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prioridad</label>
                  <select
                    value={editingItem.priority}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, priority: e.target.value as Priority })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="high">Alta (Objetivo inmediato)</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">¿Otro Usuario?</label>
                  <select
                    value={editingItem.involvesOtherUser ? 'yes' : 'no'}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        involvesOtherUser: e.target.value === 'yes',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="yes">Sí (Afecta a terceros)</option>
                    <option value="no">No (Recurso propio)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas Técnicas / Parámetros</label>
                <textarea
                  rows={3}
                  placeholder="ej. Cabeceras necesarias, tokens, parámetros en body, comportamiento al enviar id negativo..."
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg"
                >
                  Guardar Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
