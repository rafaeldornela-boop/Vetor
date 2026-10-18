/**
 * Arquitetura de Preparação para IA Local On-Device (Gemma / Google AI Edge / LiteRT)
 *
 * Esta camada desacopla o aplicativo de qualquer backend ou serviço de nuvem.
 * O aplicativo funciona 100% de forma autônoma e manual por padrão.
 *
 * Em uma etapa futura, quando um modelo Gemma for embarcado localmente no Android
 * via Google AI Edge (LiteRT / MediaPipe GenAI), basta registrar uma implementação
 * desta interface sem alterar as regras de negócio ou componentes de interface.
 */

export interface LocalAiStatus {
  available: boolean;
  modelLoaded: boolean;
  provider: 'none' | 'google-ai-edge' | 'mediapipe-genai';
  modelName?: string;
  details: string;
}

export interface ThoughtReflectionInput {
  situation?: string;
  automaticThought: string;
  emotion: string;
  intensity: number;
  evidenceFor?: string;
  evidenceAgainst?: string;
}

export interface ThoughtReflectionOutput {
  distortions: Array<{ name: string; explanation: string }>;
  socraticQuestion: string;
  balancedPerspective: string;
  nextSmallStep: string;
}

export interface WorryTriageInput {
  worryText: string;
}

export interface WorryTriageOutput {
  worryType: 'actionable' | 'hypothetical' | 'ambiguous';
  explanation: string;
  suggestedAction?: {
    task: string;
    whyItHelps: string;
  };
  mindsetNote?: string;
}

export interface LocalAiDriver {
  checkAvailability(): Promise<LocalAiStatus>;
  reflectOnThought?(input: ThoughtReflectionInput): Promise<ThoughtReflectionOutput>;
  triageWorry?(input: WorryTriageInput): Promise<WorryTriageOutput>;
}

/**
 * Driver padrão Offline (sem IA externa).
 * Garante que nenhuma requisição de rede seja feita e o app opere com total segurança e privacidade.
 */
class OfflineLocalAiDriver implements LocalAiDriver {
  async checkAvailability(): Promise<LocalAiStatus> {
    return {
      available: false,
      modelLoaded: false,
      provider: 'none',
      details: 'IA local não configurada nesta versão. O aplicativo opera 100% de forma manual e offline.',
    };
  }
}

let activeDriver: LocalAiDriver = new OfflineLocalAiDriver();

export function setLocalAiDriver(driver: LocalAiDriver): void {
  activeDriver = driver;
}

export function getLocalAiDriver(): LocalAiDriver {
  return activeDriver;
}

export async function checkLocalAiStatus(): Promise<LocalAiStatus> {
  return activeDriver.checkAvailability();
}
