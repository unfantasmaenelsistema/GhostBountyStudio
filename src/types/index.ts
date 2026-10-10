export type Severity = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
export type ProgramStatus = 'active' | 'paused' | 'exhausted';
export type VectorResult = 'no_result' | 'finding_found' | 'blocked_waf';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
export type IdType = 'sequential' | 'uuid' | 'hash' | 'slug' | 'none' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type FindingCategory =
  | 'IDOR'
  | 'Auth/JWT'
  | 'Business Logic / Race Condition'
  | 'Injection'
  | 'XSS/Client'
  | 'SSRF/Network'
  | 'Other';

export type KanbanStatus =
  | 'candidate'
  | 'testing'
  | 'confirmed'
  | 'reported'
  | 'resolved_paid'
  | 'rejected';

export interface CVSSMetrics {
  av: 'N' | 'A' | 'L' | 'P';
  ac: 'L' | 'H';
  pr: 'N' | 'L' | 'H';
  ui: 'N' | 'R';
  s: 'U' | 'C';
  c: 'N' | 'L' | 'H';
  i: 'N' | 'L' | 'H';
  a: 'N' | 'L' | 'H';
}

export interface CVSSCalculationResult {
  score: number;
  severity: Severity;
  vectorString: string;
  impactSubScore: number;
  exploitability: number;
  impact: number;
}

export interface TestedVector {
  id: string;
  name: string;
  targetEndpoint: string;
  testedAt: string;
  result: VectorResult;
  notes: string;
}

export interface Program {
  id: string;
  name: string;
  domain: string;
  outOfScope: string;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  lastCampaignDate: string;
  status: ProgramStatus;
  testedVectors: TestedVector[];
  createdAt: string;
  notes?: string;
  hourlyRateTarget?: number; // Target $/hour, e.g. 120
  totalHoursLogged?: number;  // Hours invested in this target
}

export interface ReconItem {
  id: string;
  programId: string;
  endpoint: string;
  method: HttpMethod;
  idType: IdType;
  involvesOtherUser: boolean;
  priority: Priority;
  notes: string;
  updatedAt: string;
}

export interface TriageFinding {
  id: string;
  programId: string;
  title: string;
  category: FindingCategory;
  status: KanbanStatus;
  bountyAmount?: number;     // Real paid bounty
  expectedBounty?: number;   // Target/expected bounty based on program matrix
  hoursSpent?: number;       // Hours dedicated to finding and documenting
  penaltyMultiplier?: number;// Multiplier modifier (e.g. 1.0 = full, 0.75 = partial impact, 0.5 = mitigated)
  cvss: CVSSMetrics & {
    score: number;
    severity: Severity;
    vectorString: string;
  };
  summary: string;
  reproductionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDraft {
  id: string;
  findingId?: string;
  programId: string;
  title: string;
  impactSummary: string;
  reproductionSteps: string;
  rawHttp: string;
  concreteImpactProof: string;
  cvssVector: string;
  cvssScore: number;
  suggestedRemediation: string;
  updatedAt: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  source: 'gemini' | 'offline_expert';
  analysis?: {
    qualityScore?: number;
    hasSpeculation?: boolean;
    speculativeWords?: string[];
    missingSteps?: boolean;
    missingHttp?: boolean;
    impactSummaryLines?: number;
  };
}

export interface AppBackupData {
  version: string;
  exportedAt: string;
  programs: Program[];
  reconItems: ReconItem[];
  findings: TriageFinding[];
  reports: ReportDraft[];
  activityDates: string[];
}
