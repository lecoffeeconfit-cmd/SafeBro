import { AnalysisEvent, AudioSignalSample, TranscriptSegment } from '../types/models';

export interface TranscriptionRequest {
  audioUri: string;
  language?: string;
}

export interface TranscriptionProvider {
  readonly id: string;
  readonly local: boolean;
  isAvailable(): Promise<boolean>;
  transcribe(request: TranscriptionRequest): Promise<TranscriptSegment[]>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly local: boolean;
  isAvailable(): Promise<boolean>;
  embed(text: string): Promise<number[]>;
}

export interface SemanticSearchProvider {
  readonly id: string;
  readonly local: boolean;
  search(query: string, limit?: number): Promise<SemanticSearchResult[]>;
}

export interface SummaryProvider {
  readonly id: string;
  readonly local: boolean;
  summarize(text: string): Promise<string>;
}

export interface AdvancedAnalysisProvider extends SummaryProvider {
  readonly providerType: 'openai' | 'anthropic' | 'gemini' | 'local_llm';
  analyze(text: string, instruction: string): Promise<string>;
}

export interface SemanticSearchResult {
  sessionId: string;
  timestampMs: number;
  snippet: string;
  score: number;
}

export interface LocalAnalysisResult {
  signalSamples: AudioSignalSample[];
  events: AnalysisEvent[];
  keywords: string[];
  fillerWords: Record<string, number>;
  speakingTimeMs: number;
  silenceTimeMs: number;
  speechRateWpm?: number;
}
