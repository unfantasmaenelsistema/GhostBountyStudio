import { ReportDraft } from '../types';
import { queryOfflineExpert } from './expertEngine';

export interface CopilotResponse {
  reply: string;
  source: 'gemini' | 'offline_expert';
  errorNotice?: string;
}

export async function checkServerHealth(): Promise<{ isOnline: boolean; hasGeminiKey: boolean }> {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      return { isOnline: false, hasGeminiKey: false };
    }
    const data = await res.json();
    return {
      isOnline: true,
      hasGeminiKey: Boolean(data.hasGeminiKey),
    };
  } catch {
    return { isOnline: false, hasGeminiKey: false };
  }
}

export async function queryCopilot(
  prompt: string,
  reportContext?: Partial<ReportDraft>,
  forceOffline = false
): Promise<CopilotResponse> {
  if (forceOffline) {
    const offlineReply = queryOfflineExpert(prompt, reportContext);
    return {
      reply: offlineReply,
      source: 'offline_expert',
    };
  }

  try {
    const contextString = reportContext
      ? `Título: ${reportContext.title || 'Sin título'}
Resumen de Impacto: ${reportContext.impactSummary || 'Sin resumen'}
Pasos de Reproducción: ${reportContext.reproductionSteps || 'Sin pasos'}
Petición/Respuesta HTTP: ${reportContext.rawHttp || 'Sin HTTP cruda'}
Prueba de Impacto: ${reportContext.concreteImpactProof || 'Sin prueba'}
Vector CVSS: ${reportContext.cvssVector || 'No especificado'} (Score: ${reportContext.cvssScore || 0})
Remediación: ${reportContext.suggestedRemediation || 'No especificada'}`
      : '';

    const systemInstruction = `Eres el Mentor y Analista Senior de Triage de Ghost Academy para cazadores de bug bounty.
Tu objetivo es ayudar al investigador a maximizar su tasa de aceptación en HackerOne, Bugcrowd e Intigriti.
Evalúa con rigor técnico:
1. Claridad absoluta y reproducibilidad 1:1.
2. Detección y eliminación tajante de lenguaje especulativo ("podría", "quizás", "en teoría").
3. Impacto cuantificable demostrado (confidencialidad, integridad, transacciones fraudulentas).
4. Estructura del reporte y justificación del vector CVSS v3.1 oficial.
Sé conciso, directo, pragmático y utiliza terminología de seguridad ofensiva moderna.`;

    const response = await fetch('/api/copilot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        reportContext: contextString,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Degrades gracefully to local rules engine
      const errorData = await response.json().catch(() => ({}));
      const offlineReply = queryOfflineExpert(prompt, reportContext);
      return {
        reply: `${offlineReply}\n\n*(Nota: El servidor no tiene GEMINI_API_KEY configurada o respondió con error. Se activó automáticamente el Motor Experto Offline de Ghost Academy)*`,
        source: 'offline_expert',
        errorNotice: errorData.error,
      };
    }

    const data = await response.json();
    return {
      reply: data.reply || 'Sin respuesta',
      source: 'gemini',
    };
  } catch {
    // Complete offline degradation on any network error
    const offlineReply = queryOfflineExpert(prompt, reportContext);
    return {
      reply: offlineReply,
      source: 'offline_expert',
    };
  }
}
