import React, { useState } from 'react';
import {
  Program,
  TriageFinding,
  ReconItem,
  FindingCategory,
  Severity,
} from '../types';
import { calculateStreak } from '../utils/storage';
import { GhostLogo } from '../components/GhostLogo';
import {
  ShieldCheck,
  Flame,
  Award,
  Crosshair,
  TrendingUp,
  FolderGit2,
  ChevronRight,
  Zap,
  DollarSign,
  Clock,
  Target,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Percent,
} from 'lucide-react';

interface DashboardViewProps {
  programs: Program[];
  findings: TriageFinding[];
  reconItems: ReconItem[];
  activityDates: string[];
  onNavigate: (tab: string) => void;
  onSelectFindingForReport: (findingId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  findings,
  reconItems,
  activityDates,
  onNavigate,
  onSelectFindingForReport,
}) => {
  const activePrograms = programs.filter((p) => p.status === 'active');
  const streak = calculateStreak(activityDates);

  // Financial & ROI States for Simulator
  const [simulatorBaseTier, setSimulatorBaseTier] = useState<'critical' | 'high' | 'medium' | 'low' | 'custom'>('high');
  const [simulatorCustomBase, setSimulatorCustomBase] = useState<number>(1500);
  const [selectedBonuses, setSelectedBonuses] = useState<string[]>(['clean_poc']);
  const [selectedPenalties, setSelectedPenalties] = useState<string[]>([]);

  // Financial Calculations
  const totalPaidBounty = findings.reduce((acc, f) => acc + (f.bountyAmount || 0), 0);
  const totalExpectedBounty = findings.reduce(
    (acc, f) => acc + (f.expectedBounty || f.bountyAmount || 0),
    0
  );
  const totalHoursInvested = findings.reduce(
    (acc, f) => acc + (f.hoursSpent || 3.5),
    0
  );
  const realHourlyRate = totalHoursInvested > 0 ? totalPaidBounty / totalHoursInvested : 0;
  const targetHourlyRate = 130; // Standard researcher benchmark
  const daysActive = Math.max(1, streak.totalDays);
  const dailyAverageBounty = totalPaidBounty / daysActive;

  // Findings by severity
  const severityCounts: Record<Severity, number> = {
    Critical: findings.filter((f) => f.cvss.severity === 'Critical').length,
    High: findings.filter((f) => f.cvss.severity === 'High').length,
    Medium: findings.filter((f) => f.cvss.severity === 'Medium').length,
    Low: findings.filter((f) => f.cvss.severity === 'Low').length,
    None: findings.filter((f) => f.cvss.severity === 'None').length,
  };

  const maxSeverityCount = Math.max(1, ...Object.values(severityCounts));

  // Category performance ("Dónde rindes mejor")
  const categoryCounts: Record<FindingCategory, number> = {
    'IDOR': 0,
    'Auth/JWT': 0,
    'Business Logic / Race Condition': 0,
    'Injection': 0,
    'XSS/Client': 0,
    'SSRF/Network': 0,
    'Other': 0,
  };

  findings.forEach((f) => {
    if (categoryCounts[f.category] !== undefined) {
      categoryCounts[f.category] += 1;
    } else {
      categoryCounts['Other'] += 1;
    }
  });

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const bestCategory = sortedCategories[0];

  const confirmedOrReported = findings.filter((f) =>
    ['confirmed', 'reported', 'resolved_paid'].includes(f.status)
  ).length;

  // Simulator Configuration
  const TIER_PRICES: Record<string, number> = {
    critical: 4000,
    high: 1500,
    medium: 600,
    low: 200,
  };

  const basePrice = simulatorBaseTier === 'custom' ? simulatorCustomBase : TIER_PRICES[simulatorBaseTier];

  const BONUSES = [
    { id: 'clean_poc', label: 'PoC reproducible 1:1 con video / script', multiplier: 0.20, desc: '+20% por facilitar validación en <3 min' },
    { id: 'remediation', label: 'Remediación o parche propuesto', multiplier: 0.10, desc: '+10% por valor defensivo añadido' },
    { id: 'critical_asset', label: 'Activo crítico / Core API en scope', multiplier: 0.15, desc: '+15% bonus por impacto en activo principal' },
  ];

  const PENALTIES = [
    { id: 'theoretical', label: 'Impacto teórico (sin datos exfiltrados)', multiplier: -0.25, desc: '-25% reducción habitual en triages' },
    { id: 'mitigated_waf', label: 'Mitigación parcial previa por WAF/Rate limit', multiplier: -0.35, desc: '-35% por barrera de defensa previa' },
    { id: 'split_bounty', label: 'Duplicado parcial / Colaborativo', multiplier: -0.50, desc: '-50% reparto de recompensa' },
    { id: 'unlikely_ui', label: 'Requiere interacción compleja de la víctima', multiplier: -0.30, desc: '-30% por fricción de explotabilidad' },
  ];

  const toggleBonus = (id: string) => {
    setSelectedBonuses((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const togglePenalty = (id: string) => {
    setSelectedPenalties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const totalBonusRate = selectedBonuses.reduce((acc, id) => {
    const item = BONUSES.find((b) => b.id === id);
    return acc + (item ? item.multiplier : 0);
  }, 0);

  const totalPenaltyRate = selectedPenalties.reduce((acc, id) => {
    const item = PENALTIES.find((p) => p.id === id);
    return acc + (item ? Math.abs(item.multiplier) : 0);
  }, 0);

  const finalNetMultiplier = Math.max(0.1, 1 + totalBonusRate - totalPenaltyRate);
  const simulatedFinalBounty = Math.round(basePrice * finalNetMultiplier);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-red-950/30 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-lg">
        <div className="flex items-start gap-4">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visitar Un Fantasma en el Sistema"
            className="shrink-0 transition-transform hover:scale-105"
          >
            <GhostLogo size={52} />
          </a>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CONSOLA DE SEGURIDAD
              </span>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-emerald-400 font-mono transition flex items-center gap-1"
              >
                <span>unfantasmaenelsistema.com</span>
                <span>↗</span>
              </a>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              GhostBountyStudio
              <span className="text-red-400 font-mono text-sm font-normal">Un Fantasma en el Sistema</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Cuaderno de campaña táctico para cazadores de recompensas: programas en alcance, recon BOLA/IDOR, tablero kanban, métricas financieras de ROI y reportes de alta conversión.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('recon')}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            + Recon Target
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
            Redactar Reporte
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Programs */}
        <div
          onClick={() => onNavigate('programs')}
          className="p-5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-purple-500/40 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Programas Activos</span>
            <FolderGit2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{activePrograms.length}</span>
            <span className="text-xs text-slate-400">/ {programs.length} total</span>
          </div>
          <div className="text-[11px] text-purple-400/90 mt-2 flex items-center gap-1">
            <span>Gestionar scopes y pivotes</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Activity Streak */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Racha de Actividad</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400 font-mono">{streak.currentStreak}</span>
            <span className="text-xs text-slate-300 font-medium">días consecutivos</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {streak.totalDays} jornadas registradas en total
          </div>
        </div>

        {/* Real Hourly Rate (Tasa Horaria Real) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">Hourly Rate Real</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              ${Math.round(realHourlyRate)}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ hora</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            {realHourlyRate >= targetHourlyRate ? (
              <span className="text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{Math.round(((realHourlyRate - targetHourlyRate) / targetHourlyRate) * 100)}% s/ objetivo (${targetHourlyRate}/h)
              </span>
            ) : (
              <span className="text-slate-400">Objetivo fijado: ${targetHourlyRate}/h</span>
            )}
          </div>
        </div>

        {/* Where You Perform Best */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Dónde Rindes Mejor</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="truncate">
            <span className="text-lg font-black text-amber-300 font-mono block truncate">
              {bestCategory[0]}
            </span>
            <span className="text-xs text-slate-400">
              {bestCategory[1]} hallazgos ({findings.length ? Math.round((bestCategory[1] / findings.length) * 100) : 0}% de efectividad)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3 text-amber-400" /> Tu vector insignia
          </div>
        </div>
      </div>

      {/* SECTION: FINANCIAL ROI & BOUNTY CALCULATOR */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Métricas Financieras & ROI de Campaña
            </h3>
            <p className="text-xs text-slate-400">
              Control de recompensas esperadas vs. cobradas, rendimiento por hora invertida y simulador de penalizaciones.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Rendimiento por jornada:</span>
              <span className="text-emerald-400 font-bold">${Math.round(dailyAverageBounty)} / día</span>
            </div>
          </div>
        </div>

        {/* Financial KPI summary widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Paid Bounties */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
              <span>Bounties Cobrados (Real)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                PAGADO
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ${totalPaidBounty.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {findings.filter((f) => f.status === 'resolved_paid' || (f.bountyAmount && f.bountyAmount > 0)).length} recompensas emitidas
            </div>
          </div>

          {/* Expected / Pipeline Bounties */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
              <span>Bounties en Pipeline / Esperados</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                EN TRIAGE
              </span>
            </div>
            <div className="text-2xl font-black text-purple-300 font-mono">
              ${totalExpectedBounty.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Cumplimiento de cobro: <strong className="text-slate-300">{totalExpectedBounty > 0 ? Math.round((totalPaidBounty / totalExpectedBounty) * 100) : 0}%</strong>
            </div>
          </div>

          {/* Time & Productivity */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
              <span>Tiempo de Investigación</span>
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono">
              {totalHoursInvested.toFixed(1)} <span className="text-xs font-normal text-slate-400">horas registradas</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Rentabilidad: <strong className="text-emerald-400">${realHourlyRate.toFixed(2)}/h neta</strong>
            </div>
          </div>
        </div>

        {/* Programs Comparison Table (Esperados vs. Pagados por programa) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Comparativa de Bounties por Programa (Esperado vs. Pagado)
            </h4>
            <span className="text-[11px] font-mono text-slate-400">Tasa de conversión financiera</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider bg-slate-950/80">
                  <th className="py-2.5 px-4 font-semibold">Programa</th>
                  <th className="py-2.5 px-4 font-semibold">Estado</th>
                  <th className="py-2.5 px-4 font-semibold">Horas</th>
                  <th className="py-2.5 px-4 font-semibold">Esperado</th>
                  <th className="py-2.5 px-4 font-semibold">Cobrado</th>
                  <th className="py-2.5 px-4 font-semibold">Cumplimiento</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Hourly Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {programs.map((p) => {
                  const progFindings = findings.filter((f) => f.programId === p.id);
                  const progPaid = progFindings.reduce((sum, f) => sum + (f.bountyAmount || 0), 0);
                  const progExpected = progFindings.reduce(
                    (sum, f) => sum + (f.expectedBounty || f.bountyAmount || 0),
                    0
                  );
                  const progHours = p.totalHoursLogged || progFindings.reduce((sum, f) => sum + (f.hoursSpent || 3.5), 0) || 5;
                  const progRate = progHours > 0 ? progPaid / progHours : 0;
                  const ratio = progExpected > 0 ? Math.round((progPaid / progExpected) * 100) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/60 transition">
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">
                        {p.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {progHours.toFixed(1)}h
                      </td>
                      <td className="py-3 px-4 text-purple-300 font-semibold">
                        ${progExpected.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        ${progPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ratio)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-300">{ratio}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ${Math.round(progRate)}/h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIMULATOR: Multiplicadores de Severidad y Penalizaciones Habituales */}
        <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Simulador de Multiplicadores y Penalizaciones de Triage
              </h4>
              <p className="text-xs text-slate-400">
                Calcula la recompensa neta aplicando los factores reales de deducción y bonificaciones de las plataformas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Multiplicador Neto:</span>
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {finalNetMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Tier buttons */}
          <div>
            <label className="block text-slate-300 font-semibold text-xs mb-2">
              1. Selecciona Nivel de Severidad Base (Tarifa estándar)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              {(['critical', 'high', 'medium', 'low', 'custom'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSimulatorBaseTier(tier)}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    simulatorBaseTier === tier
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold uppercase text-[11px]">{tier}</div>
                  <div className="text-xs font-black mt-0.5">
                    {tier === 'custom' ? `$${simulatorCustomBase}` : `$${TIER_PRICES[tier]}`}
                  </div>
                </button>
              ))}
            </div>
            {simulatorBaseTier === 'custom' && (
              <div className="mt-2 max-w-xs">
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={simulatorCustomBase}
                  onChange={(e) => setSimulatorCustomBase(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Monto base personalizado ($)"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Modifiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            {/* Bonuses */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 font-mono text-[11px] uppercase tracking-wider block">
                Bonus & Multiplicadores Positivos (+)
              </span>
              <div className="space-y-2">
                {BONUSES.map((b) => {
                  const isChecked = selectedBonuses.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      onClick={() => toggleBonus(b.id)}
                      className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 flex items-center justify-between">
                          <span>{b.label}</span>
                          <span className="font-mono text-emerald-400 font-bold ml-1">+{Math.round(b.multiplier * 100)}%</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{b.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Penalties */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-bold text-rose-400 font-mono text-[11px] uppercase tracking-wider block">
                Penalizaciones & Deducciones de Programa (-)
              </span>
              <div className="space-y-2">
                {PENALTIES.map((p) => {
                  const isChecked = selectedPenalties.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      onClick={() => togglePenalty(p.id)}
                      className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-700 text-rose-500 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 flex items-center justify-between">
                          <span>{p.label}</span>
                          <span className="font-mono text-rose-400 font-bold ml-1">{Math.round(p.multiplier * 100)}%</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{p.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Simulated Final Result Output */}
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 font-mono">
                Cálculo Estimado de Recompensa Neta:
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Base: <span className="font-mono font-bold">${basePrice}</span> | 
                Bonus: <span className="font-mono font-bold text-emerald-400">+{Math.round(totalBonusRate * 100)}%</span> | 
                Penalizaciones: <span className="font-mono font-bold text-rose-400">-{Math.round(totalPenaltyRate * 100)}%</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-amber-300 font-mono">
                ${simulatedFinalBounty.toLocaleString()} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Valor objetivo estimado para negociación
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Severity Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Severity Distribution Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Distribución de Hallazgos por Severidad
                  <span className="text-xs font-mono text-slate-400 font-normal">CVSS v3.1</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Desglose de vulnerabilidades documentadas según el estándar FIRST
                </p>
              </div>
              <button
                onClick={() => onNavigate('triage')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium font-mono"
              >
                Ver Triage Board →
              </button>
            </div>

            {/* Custom Bar Chart */}
            <div className="space-y-3.5 my-4">
              {/* Critical */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    Crítica (9.0 - 10.0)
                  </span>
                  <span className="text-slate-300 font-semibold">{severityCounts.Critical}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    style={{ width: `${(severityCounts.Critical / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* High */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-orange-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Alta (7.0 - 8.9)
                  </span>
                  <span className="text-slate-300 font-semibold">{severityCounts.High}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(severityCounts.High / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Media (4.0 - 6.9)
                  </span>
                  <span className="text-slate-300 font-semibold">{severityCounts.Medium}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${(severityCounts.Medium / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Low */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Baja (0.1 - 3.9)
                  </span>
                  <span className="text-slate-300 font-semibold">{severityCounts.Low}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${(severityCounts.Low / maxSeverityCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Total de hallazgos archivados: <strong className="text-slate-200">{findings.length}</strong></span>
            <span className="font-mono text-emerald-400">100% calculados con CVSS oficial</span>
          </div>
        </div>

        {/* Performance By Category ("Dónde Rindes Mejor") (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Especialidad de Caza
                  <span className="text-xs font-mono text-amber-400 font-normal">Conversion Rate</span>
                </h3>
                <p className="text-xs text-slate-400">
                  ¿En qué vectores consigues mayor retorno de bugs válidos?
                </p>
              </div>
            </div>

            <div className="space-y-2.5 my-2">
              {sortedCategories.slice(0, 5).map(([category, count], idx) => {
                const percent = findings.length > 0 ? Math.round((count / findings.length) * 100) : 0;
                const isTop = idx === 0 && count > 0;
                return (
                  <div
                    key={category}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isTop
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-xs font-semibold truncate">{category}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold">{count} bugs</span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                          isTop ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            Consejo táctico: <span className="text-slate-300">Prioriza recon en {bestCategory[0]} al iniciar un programa nuevo.</span>
          </div>
        </div>
      </div>

      {/* Recent Findings Quick List */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Hallazgos Recientes en Campaña
            <span className="text-xs text-slate-400 font-normal">Últimos registros en triage</span>
          </h3>
          <button
            onClick={() => onNavigate('triage')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
          >
            Abrir Tablero Kanban →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="pb-3 font-semibold">Vulnerabilidad</th>
                <th className="pb-3 font-semibold">Categoría</th>
                <th className="pb-3 font-semibold">Programa</th>
                <th className="pb-3 font-semibold">CVSS v3.1</th>
                <th className="pb-3 font-semibold">Estado</th>
                <th className="pb-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {findings.slice(0, 4).map((f) => {
                const prog = programs.find((p) => p.id === f.programId);
                return (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pr-4 font-medium text-slate-200 max-w-xs truncate">
                      {f.title}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {f.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400 truncate max-w-[160px]">
                      {prog?.name || 'Desconocido'}
                    </td>
                    <td className="py-3 pr-4 font-mono font-bold">
                      <span
                        className={
                          f.cvss.severity === 'Critical'
                            ? 'text-rose-400'
                            : f.cvss.severity === 'High'
                            ? 'text-orange-400'
                            : 'text-amber-400'
                        }
                      >
                        {f.cvss.score.toFixed(1)} {f.cvss.severity}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-800 text-slate-300">
                        {f.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onSelectFindingForReport(f.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-mono"
                      >
                        Generar Reporte →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
