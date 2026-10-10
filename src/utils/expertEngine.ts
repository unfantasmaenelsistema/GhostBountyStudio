import { ReportDraft } from '../types';

export interface ReportAnalysisResult {
  qualityScore: number; // 0 to 100
  speculativePhrasesFound: string[];
  hasNumberedSteps: boolean;
  hasRawHttp: boolean;
  impactSummaryLines: number;
  impactSummaryWarning: boolean;
  hasCvssVector: boolean;
  hasTitleCategory: boolean;
  feedbackPoints: {
    type: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  }[];
  verdict: 'Listo para enviar a Triage' | 'Requiere mejoras clave' | 'En riesgo alto de rechazo/N-A';
}

const SPECULATIVE_PATTERNS = [
  { regex: /\b(podr[íi]a|podr[íi]an|podr[íi]amos)\b/gi, word: 'podría' },
  { regex: /\b(es posible que|ser[íi]a posible)\b/gi, word: 'es posible que' },
  { regex: /\b(un atacante hipot[ée]tico|hipot[ée]ticamente)\b/gi, word: 'hipotéticamente' },
  { regex: /\b(quiz[áa]s|tal vez|a lo mejor)\b/gi, word: 'quizás / tal vez' },
  { regex: /\b(te[óo]ricamente|en teor[íi]a)\b/gi, word: 'teóricamente' },
  { regex: /\b(asumo que|probablemente)\b/gi, word: 'asumo que / probablemente' },
  { regex: /\b(could potentially|might possibly|hypothetically)\b/gi, word: 'could potentially' },
];

export function analyzeReportLocally(report: Partial<ReportDraft>): ReportAnalysisResult {
  const feedbackPoints: ReportAnalysisResult['feedbackPoints'] = [];
  const textToScan = `${report.title || ''} ${report.impactSummary || ''} ${report.concreteImpactProof || ''} ${report.reproductionSteps || ''}`;

  // 1. Speculative phrases detection
  const speculativePhrasesFound: string[] = [];
  for (const item of SPECULATIVE_PATTERNS) {
    if (item.regex.test(textToScan)) {
      speculativePhrasesFound.push(item.word);
    }
  }

  if (speculativePhrasesFound.length > 0) {
    feedbackPoints.push({
      type: 'warning',
      title: 'Lenguaje especulativo detectado',
      description: `Se detectaron expresiones no concluyentes: [${speculativePhrasesFound.join(', ')}]. Triage descarta reportes con condicionales. Reemplaza "un atacante podría..." por la prueba tangible: "Se logró acceder a 5 registros del usuario B (ID 9841) sin autorización".`,
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Tono fáctico y directo',
      description: 'No se detectó lenguaje especulativo. Los hechos se narran con certeza técnica.',
    });
  }

  // 2. Title has category & impact
  const title = (report.title || '').trim();
  const hasTitleCategory = /^(IDOR|BAC|BOLA|XSS|SSRF|RCE|CSRF|SQLI|Race Condition|JWT|Auth|OAuth|Info Leak|Open Redirect|Logic)/i.test(title);
  if (!title) {
    feedbackPoints.push({
      type: 'error',
      title: 'Falta título',
      description: 'El reporte no tiene título asignado.',
    });
  } else if (!hasTitleCategory) {
    feedbackPoints.push({
      type: 'warning',
      title: 'Estructura del título mejorable',
      description: 'Comienza el título con la categoría exacta e impacto, ej: "[IDOR] /api/v1/invoices permite a cualquier usuario autenticado descargar facturas de terceros".',
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Título estructurado correctamente',
      description: 'El título incluye clasificación de vulnerabilidad y alcance del impacto.',
    });
  }

  // 3. Impact Summary (2-3 lines ideal, warning if > 4 lines)
  const impactSummary = (report.impactSummary || '').trim();
  const summaryLines = impactSummary ? impactSummary.split('\n').filter(l => l.trim().length > 0).length : 0;
  const impactSummaryWarning = summaryLines > 4;

  if (summaryLines === 0) {
    feedbackPoints.push({
      type: 'error',
      title: 'Resumen de impacto ausente',
      description: 'El analista de triage necesita entender en los primeros 10 segundos el daño en confidencialidad, integridad o disponibilidad.',
    });
  } else if (impactSummaryWarning) {
    feedbackPoints.push({
      type: 'warning',
      title: 'Resumen de impacto demasiado extenso',
      description: `El resumen tiene ${summaryLines} líneas (ideal: 2 a 3 líneas). Si es demasiado largo, el triager perderá el foco. Condensa el valor del hallazgo y mueve los detalles a la prueba de impacto.`,
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Resumen de impacto conciso',
      description: `Longitud adecuada (${summaryLines} líneas). Permite al equipo de seguridad validar rápidamente la severidad.`,
    });
  }

  // 4. Numbered reproduction steps
  const reproductionSteps = (report.reproductionSteps || '').trim();
  const numberedStepsRegex = /^\s*(\d+[\.\)]|\bpaso\s+\d+)\s+/gim;
  const matchSteps = reproductionSteps.match(numberedStepsRegex);
  const hasNumberedSteps = matchSteps !== null && matchSteps.length >= 2;

  if (!hasNumberedSteps) {
    feedbackPoints.push({
      type: 'error',
      title: 'Faltan pasos de reproducción numerados',
      description: 'El estándar de oro en HackerOne/Bugcrowd son pasos secuenciales (1. Loguearse como Usuario A... 2. Obtener recurso X... 3. Repetir petición con token del Usuario B...). Los párrafos en prosa suelen ser devueltos como "Needs More Info".',
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Pasos de reproducción bien estructurados',
      description: `Detectados ${matchSteps.length} pasos secuenciales. Facilita la reproducción 1:1 en el entorno de triage.`,
    });
  }

  // 5. Raw HTTP request/response
  const rawHttp = (report.rawHttp || '').trim();
  const httpRegex = /(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+\S+\s+HTTP\/\d|HTTP\/\d(\.\d)?\s+\d{3}|Host:\s+|Content-Type:/i;
  const hasRawHttp = httpRegex.test(rawHttp) || rawHttp.length > 40;

  if (!hasRawHttp) {
    feedbackPoints.push({
      type: 'error',
      title: 'Falta petición/respuesta HTTP cruda',
      description: 'Sin la petición HTTP cruda (headers + body) ni la respuesta del servidor, el analista no puede cargar el payload en Burp Suite Repeater o Postman de inmediato.',
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Petición / Respuesta HTTP incluida',
      description: 'Formato técnico listo para importar a Burp Suite o cURL.',
    });
  }

  // 6. CVSS Vector check
  const hasCvssVector = Boolean(report.cvssVector && report.cvssVector.startsWith('CVSS:3.1/'));
  if (!hasCvssVector) {
    feedbackPoints.push({
      type: 'warning',
      title: 'Vector CVSS v3.1 no configurado',
      description: 'Incluir la métrica exacta oficial de FIRST.org ahorra disputas de severidad con el triage del programa.',
    });
  } else {
    feedbackPoints.push({
      type: 'success',
      title: 'Vector CVSS v3.1 integrado',
      description: `Métrica oficial incluida: ${report.cvssVector} (Score: ${report.cvssScore || 'N/A'}).`,
    });
  }

  // Score calculation
  let qualityScore = 0;
  if (title.length > 5) qualityScore += 10;
  if (hasTitleCategory) qualityScore += 10;
  if (summaryLines >= 1 && summaryLines <= 4) qualityScore += 15;
  if (hasNumberedSteps) qualityScore += 25;
  if (hasRawHttp) qualityScore += 20;
  if (speculativePhrasesFound.length === 0) qualityScore += 10;
  if (hasCvssVector) qualityScore += 10;

  qualityScore = Math.min(100, Math.max(0, qualityScore));

  let verdict: ReportAnalysisResult['verdict'] = 'En riesgo alto de rechazo/N-A';
  if (qualityScore >= 80) {
    verdict = 'Listo para enviar a Triage';
  } else if (qualityScore >= 50) {
    verdict = 'Requiere mejoras clave';
  }

  return {
    qualityScore,
    speculativePhrasesFound,
    hasNumberedSteps,
    hasRawHttp,
    impactSummaryLines: summaryLines,
    impactSummaryWarning,
    hasCvssVector,
    hasTitleCategory,
    feedbackPoints,
    verdict,
  };
}

export const METHODOLOGY_PLAYBOOKS: Record<string, { title: string; keywords: string[]; answer: string }> = {
  race_condition: {
    title: 'Metodología: Race Conditions & Canje de Cupones / Límite de Crédito',
    keywords: ['race', 'carrera', 'cupón', 'cupon', 'concurrencia', 'turbo intruder', 'checkout', 'canje'],
    answer: `### Playbook: Race Condition en Cupones / Transacciones Financieras

1. **Arquitectura del Vector**:
   Las race conditions ocurren cuando el backend realiza una verificación (Check) separada de la ejecución (Use) — *Time-Of-Check to Time-Of-Use (TOCTOU)* — sin transacciones con bloqueo pesimista (\`SELECT FOR UPDATE\`) o aislamiento SERIALIZABLE.

2. **Técnica de Paquete Único (Single-Packet Attack en HTTP/2)**:
   - Los métodos tradicionales con múltiples hilos TCP sufren fluctuaciones (jitter) de red.
   - En **Burp Suite (Repeater o Turbo Intruder)**:
     - Asegúrate de habilitar **HTTP/2**.
     - Agrupa 20-30 peticiones idénticas de canje de cupón en la misma conexión HTTP/2.
     - Envía todas las peticiones con el *single-packet attack* para que lleguen al kernel del servidor con sub-milisegundos de diferencia.

3. **Script de Turbo Intruder (Python)**:
\`\`\`python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           engine=Engine.BURP2)
    # Encolar 25 peticiones idénticas
    for i in range(25):
        engine.queue(target.req, gate='race_gate')
    # Disparar todas en un solo frame HTTP/2
    engine.openGate('race_gate')

def handleResponse(req, interesting):
    table.add(req)
\`\`\`

4. **Prueba de Impacto para Triage**:
   - Saldo inicial de la cuenta o estado del cupón.
   - Captura de pantalla/logs mostrando que el código de descuento de $10 se aplicó 4 veces en el mismo pedido o en pedidos paralelos.
   - Balance final: $40 descontados en lugar de $10.`,
  },
  idor_uuid: {
    title: 'Metodología: IDOR en Identificadores UUID v4 o No-Secuenciales',
    keywords: ['uuid', 'idor uuid', 'identificador no secuencial', 'guid', 'segundo orden'],
    answer: `### Playbook: IDOR con UUID v4 (Identificadores Complejos)

1. **Mito frecuente**: "Si usa UUID v4, no puede ser IDOR".
   - **Falso**: La seguridad no debe basarse en la no-predictibilidad del identificador. Si la autorización (\`WHERE user_id = current_user.id\`) no existe, sigue siendo una vulnerabilidad BOLA / IDOR.

2. **Estrategia de Obtención de UUIDs de Víctima**:
   - **Endpoints públicos**: Foros, comentarios, perfiles compartidos, webhooks, exportaciones de logs.
   - **Fugas en respuestas de otros endpoints**: \`GET /api/public/team-members\` o \`GET /search/users?query=*\` a menudo devuelven los UUIDs internos.
   - **Parámetros en WebSocket**: Inspecciona el handshake inicial de Socket.IO o GraphQL subscriptions.

3. **Demostración de Impacto en Dos Cuentas**:
   - Cuenta A (Atacante) y Cuenta B (Víctima legítima).
   - Registra ambas cuentas en tu cuaderno.
   - Obtén el UUID de la Cuenta B.
   - Envía la petición desde la Cuenta A con el UUID de la Cuenta B en la URL o body.
   - Si recibes HTTP 200 con los datos de B, **el IDOR está confirmado al 100%**.`,
  },
  jwt_attacks: {
    title: 'Metodología: Explotación y Verificación de JWT (JSON Web Tokens)',
    keywords: ['jwt', 'token', 'auth', 'autenticacion', 'alg none', 'jwks', 'jku'],
    answer: `### Playbook: Verificación de JWT en Triage de Bug Bounty

1. **Ataque Alg None**:
   - Cambia el header \`{"alg": "none", "typ": "JWT"}\`.
   - Modifica el payload (ej. \`{"role": "admin", "user_id": 1}\`).
   - Elimina la firma (dejando el punto final: \`eyJhbGci... . eyJyb2xl... .\`).

2. **Confusión de Claves (RS256 a HS256)**:
   - Si el servidor usa RS256 con clave pública expuesta (ej. en \`/.well-known/jwks.json\`), cambia \`alg\` a \`HS256\` y firma el token usando la clave pública PEM como secreto HMAC simétrico.

3. **Inyección en Cabeceras (jku / kid)**:
   - Parámetro \`kid\`: Comprueba inyección SQL o path traversal (\`"kid": "../../../dev/null"\` o firma con byte nulo).
   - Parámetro \`jku\`: Comprueba si el servidor descarga y confía en tu propio JWKS remoto sin validar el dominio.`,
  },
  forbidden_bypass: {
    title: 'Metodología: Técnicas de Bypass para 403 Forbidden / 401 Unauthorized',
    keywords: ['403', 'bypass', 'forbidden', '401', 'waf', 'waf bypass', 'reverse proxy'],
    answer: `### Playbook: Checklist de Bypasses para HTTP 403 / 401

1. **Manipulación de Cabeceras de Proxy Reverso**:
\`\`\`http
X-Original-URL: /admin/users
X-Rewrite-URL: /admin/users
X-Forwarded-For: 127.0.0.1
X-Custom-IP-Authorization: 127.0.0.1
X-Real-IP: 127.0.0.1
X-Client-IP: 127.0.0.1
\`\`\`

2. **Normalización de Path & URL Encoding**:
   - \`/api/v1/users/..;/admin\`
   - \`/api/v1/users/%2e%2e/admin\`
   - \`/admin/\` vs \`/admin/.\` vs \`/ADMIN\`
   - Parámetro de extensión: \`/admin.json\`, \`/admin.html\`, \`/admin;foo=bar\`

3. **Sustitución de Verbos HTTP**:
   - Si \`GET /api/internal\` devuelve 403, prueba \`POST\`, \`PUT\`, o \`HEAD\`.
   - Utiliza cabecera de override: \`X-HTTP-Method-Override: GET\`.`,
  },
  ssrf_bypass: {
    title: 'Metodología: SSRF & Evasión de Filtros de Red Local / Metadatos',
    keywords: ['ssrf', 'metadatos', '169.254.169.254', 'aws', 'metadata', 'cloud'],
    answer: `### Playbook: SSRF & Cloud Metadata Extraction

1. **Endpoints de Metadatos Cloud**:
   - **AWS / GCP / OpenStack**: \`http://169.254.169.254/latest/meta-data/\`
   - **Azure**: \`http://169.254.169.254/metadata/instance?api-version=2021-02-01\` (requiere header \`Metadata: true\`).
   - **GCP**: Requiere header \`Metadata-Flavor: Google\`.

2. **Evasión de Listas Negras (127.0.0.1 / 169.254.169.254)**:
   - Representación Decimal: \`http://2852039166/\` (169.254.169.254)
   - Representación Hexadecimal: \`http://0xa9fea9fe/\`
   - Representación Octal: \`http://0251.0376.0251.0376/\`
   - Notación IPv6: \`http://[::ffff:a9fe:a9fe]/\`
   - DNS Rebinding: Servicios como \`169.254.169.254.nip.io\` o servidor propio con TTL 0.`,
  },
};

export function queryOfflineExpert(query: string, currentReport?: Partial<ReportDraft>): string {
  const normalizedQuery = query.toLowerCase().trim();

  // If query is asking about the current report quality / triage acceptance:
  if (
    normalizedQuery.includes('reporte') ||
    normalizedQuery.includes('triage') ||
    normalizedQuery.includes('claridad') ||
    normalizedQuery.includes('rechace') ||
    normalizedQuery.includes('analizar') ||
    normalizedQuery.includes('calidad') ||
    normalizedQuery.includes('especulativo')
  ) {
    if (!currentReport || (!currentReport.title && !currentReport.reproductionSteps)) {
      return `### ⚡ Diagnóstico del Motor de Reglas Offline (Un Fantasma en el Sistema)

No hay un reporte activo seleccionado o con contenido en el Generador de Reportes. 
Para auditar tu reporte:
1. Abre la pestaña **Generador de Reportes**.
2. Rellena el Título, Resumen de Impacto, Pasos Numerados y la Petición HTTP cruda.
3. Vuelve a consultar aquí y analizaré automáticamente:
   - Detección de lenguaje especulativo (*"podría", "quizás"*).
   - Ausencia de pasos de reproducción secuenciales.
   - Peticiones HTTP en formato raw para Burp Suite.
   - Longitud y foco del resumen de impacto.
   - Cálculo del score de calidad para triage.`;
    }

    const analysis = analyzeReportLocally(currentReport);
    let response = `### ⚡ Auditoría de Triage Offline — Score: ${analysis.qualityScore}/100\n`;
    response += `**Veredicto de Triage**: **${analysis.verdict}**\n\n`;

    response += `#### Puntos Clave Evaluados:\n`;
    for (const point of analysis.feedbackPoints) {
      const icon = point.type === 'success' ? '✅' : point.type === 'warning' ? '⚠️' : '❌';
      response += `- ${icon} **${point.title}**: ${point.description}\n`;
    }

    response += `\n#### Recomendaciones de Alta Conversión:\n`;
    if (analysis.speculativePhrasesFound.length > 0) {
      response += `- 🎯 **Elimina supuestos**: Sustituye hipótesis por pruebas de lectura/escritura confirmadas.\n`;
    }
    if (!analysis.hasNumberedSteps) {
      response += `- 📋 **Numera los pasos**: El triager debe ejecutar exactamente tus pasos sin adivinar nada.\n`;
    }
    if (!analysis.hasRawHttp) {
      response += `- 🌐 **Adjunta la petición cruda**: Agrega los headers y body tal cual salen de Burp Repeater.\n`;
    }
    response += `\n*(Motor Experto Offline operativo — Reglas de Un Fantasma en el Sistema: https://www.unfantasmaenelsistema.com/)*`;
    return response;
  }

  // Check matching methodology playbooks:
  for (const key of Object.keys(METHODOLOGY_PLAYBOOKS)) {
    const playbook = METHODOLOGY_PLAYBOOKS[key];
    const match = playbook.keywords.some(kw => normalizedQuery.includes(kw));
    if (match) {
      return `### ⚡ Playbook de Metodología Offline: ${playbook.title}\n\n${playbook.answer}\n\n*(Generado con base de conocimiento local de Un Fantasma en el Sistema — https://www.unfantasmaenelsistema.com/)*`;
    }
  }

  // Fallback general guidance for any bug bounty query:
  return `### ⚡ Motor Experto Offline (Un Fantasma en el Sistema)

He analizado tu consulta sobre: **"${query}"**.

En modo offline, puedo brindarte playbooks exactos y auditoría de reportes. Aquí tienes el marco de referencia estándar para esta categoría:

1. **Regla de Oro en Triage**: Los analistas manejan cientos de tickets al día. Un reporte se acepta si y solo si:
   - El impacto no es teórico: demuestras acceso indebido a datos sensibles o cambio de estado no autorizado.
   - La reproducción toma menos de 3 minutos siguiendo tus pasos exactos.
   - Se incluye el vector CVSS v3.1 oficial para fijar la severidad objetiva.

2. **Preguntas rápidas disponibles en la base local**:
   - *"¿Cómo pruebo race conditions en un endpoint de canje de cupón?"*
   - *"¿Cómo probar IDOR si los IDs son UUID v4?"*
   - *"Verificación y ataques a JWT (JSON Web Tokens)"*
   - *"Checklist de bypass para 403 Forbidden"*
   - *"Evasión de SSRF hacia metadatos de AWS"*
   - *"¿Esto es lo bastante claro para que triage no lo rechace?"* (audita tu reporte actual)

Visita https://www.unfantasmaenelsistema.com/ para más playbooks o configura tu \`GEMINI_API_KEY\` para análisis multimodal en tiempo real.`;
}
