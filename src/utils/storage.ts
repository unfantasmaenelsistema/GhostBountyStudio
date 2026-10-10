import { AppBackupData, Program, ReconItem, TriageFinding, ReportDraft } from '../types';
import {
  INITIAL_PROGRAMS,
  INITIAL_RECON,
  INITIAL_FINDINGS,
  INITIAL_REPORTS,
  INITIAL_ACTIVITY_DATES,
} from '../data/seedData';

const STORAGE_KEYS = {
  PROGRAMS: 'ghostbounty_programs',
  RECON: 'ghostbounty_recon',
  FINDINGS: 'ghostbounty_findings',
  REPORTS: 'ghostbounty_reports',
  ACTIVITY: 'ghostbounty_activity_dates',
  THEME: 'ghostbounty_theme',
};

export function getStoredPrograms(): Program[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRAMS);
    if (!raw) {
      setStoredPrograms(INITIAL_PROGRAMS);
      return INITIAL_PROGRAMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROGRAMS;
  }
}

export function setStoredPrograms(programs: Program[]): void {
  localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(programs));
  recordActivityToday();
}

export function getStoredRecon(): ReconItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECON);
    if (!raw) {
      setStoredRecon(INITIAL_RECON);
      return INITIAL_RECON;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECON;
  }
}

export function setStoredRecon(recon: ReconItem[]): void {
  localStorage.setItem(STORAGE_KEYS.RECON, JSON.stringify(recon));
  recordActivityToday();
}

export function getStoredFindings(): TriageFinding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINDINGS);
    if (!raw) {
      setStoredFindings(INITIAL_FINDINGS);
      return INITIAL_FINDINGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FINDINGS;
  }
}

export function setStoredFindings(findings: TriageFinding[]): void {
  localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(findings));
  recordActivityToday();
}

export function getStoredReports(): ReportDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!raw) {
      setStoredReports(INITIAL_REPORTS);
      return INITIAL_REPORTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_REPORTS;
  }
}

export function setStoredReports(reports: ReportDraft[]): void {
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  recordActivityToday();
}

export function getStoredActivityDates(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY_DATES));
      return INITIAL_ACTIVITY_DATES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ACTIVITY_DATES;
  }
}

export function recordActivityToday(): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dates = getStoredActivityDates();
    if (!dates.includes(today)) {
      dates.unshift(today);
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(dates));
    }
  } catch {
    // Ignore storage issues
  }
}

export function calculateStreak(dates: string[]): { currentStreak: number; totalDays: number } {
  if (!dates || dates.length === 0) return { currentStreak: 0, totalDays: 0 };
  const sorted = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  
  // Check if today or yesterday had activity
  const d0 = new Date(today);
  const dLatest = new Date(sorted[0]);
  const diffDays = Math.round((d0.getTime() - dLatest.getTime()) / (1000 * 3600 * 24));

  if (diffDays > 1) {
    // Streak broken
    return { currentStreak: 0, totalDays: sorted.length };
  }

  let streak = 0;
  let cursor = new Date(sorted[0]);

  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 3600 * 24));
    if (diff <= 1) {
      streak += 1;
      cursor = d;
    } else {
      break;
    }
  }

  return { currentStreak: streak, totalDays: sorted.length };
}

export function exportFullBackup(): AppBackupData {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    programs: getStoredPrograms(),
    reconItems: getStoredRecon(),
    findings: getStoredFindings(),
    reports: getStoredReports(),
    activityDates: getStoredActivityDates(),
  };
}

export function importFullBackup(data: AppBackupData): boolean {
  try {
    if (!data || !Array.isArray(data.programs)) {
      throw new Error('Formato de copia de seguridad no válido');
    }
    setStoredPrograms(data.programs || []);
    setStoredRecon(data.reconItems || []);
    setStoredFindings(data.findings || []);
    setStoredReports(data.reports || []);
    if (Array.isArray(data.activityDates)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(data.activityDates));
    }
    return true;
  } catch (err) {
    console.error('Error importing backup:', err);
    return false;
  }
}

export function resetToSeedData(): void {
  localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(INITIAL_PROGRAMS));
  localStorage.setItem(STORAGE_KEYS.RECON, JSON.stringify(INITIAL_RECON));
  localStorage.setItem(STORAGE_KEYS.FINDINGS, JSON.stringify(INITIAL_FINDINGS));
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY_DATES));
}
