import { CVSSMetrics, CVSSCalculationResult, Severity } from '../types';

export const CVSS_WEIGHTS = {
  av: {
    N: { value: 0.85, label: 'Network (N)', desc: 'Explotable remotamente a través de Internet/red' },
    A: { value: 0.62, label: 'Adjacent (A)', desc: 'Requiere acceso a la misma red física o lógica' },
    L: { value: 0.55, label: 'Local (L)', desc: 'Requiere acceso local o shell en el host' },
    P: { value: 0.20, label: 'Physical (P)', desc: 'Requiere acceso físico directo al dispositivo' },
  },
  ac: {
    L: { value: 0.77, label: 'Low (L)', desc: 'Sin condiciones especiales o condiciones reproducibles fácilmente' },
    H: { value: 0.44, label: 'High (H)', desc: 'Requiere condiciones de carrera complejas o evasión difícil' },
  },
  pr: {
    N: {
      U: 0.85,
      C: 0.85,
      label: 'None (N)',
      desc: 'No requiere autenticación previa ni privilegios',
    },
    L: {
      U: 0.62,
      C: 0.68,
      label: 'Low (L)',
      desc: 'Requiere credenciales básicas o usuario estándar autenticado',
    },
    H: {
      U: 0.27,
      C: 0.50,
      label: 'High (H)',
      desc: 'Requiere permisos elevados de administrador o sistema',
    },
  },
  ui: {
    N: { value: 0.85, label: 'None (N)', desc: 'No requiere interacción de la víctima' },
    R: { value: 0.62, label: 'Required (R)', desc: 'Requiere que la víctima haga clic, visite un enlace o suba un archivo' },
  },
  s: {
    U: { label: 'Unchanged (U)', desc: 'El impacto se limita al componente vulnerable' },
    C: { label: 'Changed (C)', desc: 'Afecta a componentes más allá de la autorización del componente' },
  },
  c: {
    N: { value: 0, label: 'None (N)', desc: 'Sin pérdida de confidencialidad' },
    L: { value: 0.22, label: 'Low (L)', desc: 'Divulgación parcial de datos no críticos' },
    H: { value: 0.56, label: 'High (H)', desc: 'Exfiltración total o acceso a datos confidenciales críticos/PII' },
  },
  i: {
    N: { value: 0, label: 'None (N)', desc: 'Sin modificación de datos' },
    L: { value: 0.22, label: 'Low (L)', desc: 'Modificación parcial de datos no críticos' },
    H: { value: 0.56, label: 'High (H)', desc: 'Modificación total, compromiso de integridad o ejecución de comandos' },
  },
  a: {
    N: { value: 0, label: 'None (N)', desc: 'Sin impacto en disponibilidad' },
    L: { value: 0.22, label: 'Low (L)', desc: 'Rendimiento reducido o interrupción parcial' },
    H: { value: 0.56, label: 'High (H)', desc: 'Denegación de servicio total o caída de recursos críticos' },
  },
};

/**
 * Official FIRST.org CVSS v3.1 Roundup function (Section 7.4)
 * Rounds up to the nearest 1 decimal place with floating point safety.
 */
export function cvssRoundUp(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) {
    return intInput / 100000;
  }
  return (Math.floor(intInput / 10000) + 1) / 10;
}

export function calculateCVSS(metrics: CVSSMetrics): CVSSCalculationResult {
  const av = CVSS_WEIGHTS.av[metrics.av].value;
  const ac = CVSS_WEIGHTS.ac[metrics.ac].value;
  const pr = metrics.s === 'U' 
    ? CVSS_WEIGHTS.pr[metrics.pr].U 
    : CVSS_WEIGHTS.pr[metrics.pr].C;
  const ui = CVSS_WEIGHTS.ui[metrics.ui].value;
  const c = CVSS_WEIGHTS.c[metrics.c].value;
  const i = CVSS_WEIGHTS.i[metrics.i].value;
  const a = CVSS_WEIGHTS.a[metrics.a].value;

  // Impact Sub-Score (ISS)
  const impactSubScore = 1 - (1 - c) * (1 - i) * (1 - a);

  // Impact
  let impact: number;
  if (metrics.s === 'U') {
    impact = 6.42 * impactSubScore;
  } else {
    impact = 7.52 * (impactSubScore - 0.029) - 3.25 * Math.pow(impactSubScore - 0.02, 15);
  }

  // Exploitability
  const exploitability = 8.22 * av * ac * pr * ui;

  // Base Score
  let score = 0;
  if (impact <= 0) {
    score = 0.0;
  } else if (metrics.s === 'U') {
    score = cvssRoundUp(Math.min(impact + exploitability, 10));
  } else {
    score = cvssRoundUp(Math.min(1.08 * (impact + exploitability), 10));
  }

  // Qualitative Severity Rating Scale (FIRST.org)
  let severity: Severity = 'None';
  if (score === 0.0) {
    severity = 'None';
  } else if (score >= 0.1 && score <= 3.9) {
    severity = 'Low';
  } else if (score >= 4.0 && score <= 6.9) {
    severity = 'Medium';
  } else if (score >= 7.0 && score <= 8.9) {
    severity = 'High';
  } else if (score >= 9.0 && score <= 10.0) {
    severity = 'Critical';
  }

  const vectorString = `CVSS:3.1/AV:${metrics.av}/AC:${metrics.ac}/PR:${metrics.pr}/UI:${metrics.ui}/S:${metrics.s}/C:${metrics.c}/I:${metrics.i}/A:${metrics.a}`;

  return {
    score,
    severity,
    vectorString,
    impactSubScore: Number(impactSubScore.toFixed(4)),
    exploitability: Number(exploitability.toFixed(4)),
    impact: Number(impact.toFixed(4)),
  };
}

export function parseCVSSVector(vectorStr: string): CVSSMetrics | null {
  try {
    const parts = vectorStr.trim().split('/');
    const metrics: Partial<CVSSMetrics> = {};

    for (const part of parts) {
      const [key, val] = part.split(':');
      if (!key || !val) continue;

      if (key === 'AV' && ['N', 'A', 'L', 'P'].includes(val)) metrics.av = val as any;
      if (key === 'AC' && ['L', 'H'].includes(val)) metrics.ac = val as any;
      if (key === 'PR' && ['N', 'L', 'H'].includes(val)) metrics.pr = val as any;
      if (key === 'UI' && ['N', 'R'].includes(val)) metrics.ui = val as any;
      if (key === 'S' && ['U', 'C'].includes(val)) metrics.s = val as any;
      if (key === 'C' && ['N', 'L', 'H'].includes(val)) metrics.c = val as any;
      if (key === 'I' && ['N', 'L', 'H'].includes(val)) metrics.i = val as any;
      if (key === 'A' && ['N', 'L', 'H'].includes(val)) metrics.a = val as any;
    }

    if (
      metrics.av && metrics.ac && metrics.pr && metrics.ui &&
      metrics.s && metrics.c && metrics.i && metrics.a
    ) {
      return metrics as CVSSMetrics;
    }
    return null;
  } catch {
    return null;
  }
}

export const CVSS_BENCHMARKS = [
  {
    name: 'Log4Shell / RCE No-Auth Remoto',
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    expectedScore: 10.0,
    severity: 'Critical',
  },
  {
    name: 'IDOR Clásico Exfiltración PII (Usuario Autenticado)',
    vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
    expectedScore: 6.5,
    severity: 'Medium',
  },
  {
    name: 'Stored XSS con Robo de Sesión (Requiere Clic)',
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    expectedScore: 6.1,
    severity: 'Medium',
  },
  {
    name: 'Race Condition en Checkout / Saldo Negativo (BOLA + Integridad)',
    vector: 'CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:H/A:N',
    expectedScore: 5.3,
    severity: 'Medium',
  },
  {
    name: 'SSRF Completo a Metadatos AWS (169.254.169.254)',
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:N',
    expectedScore: 9.3,
    severity: 'Critical',
  },
];
