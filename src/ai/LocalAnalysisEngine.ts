import { AnalysisEvent, AudioSignalSample } from '../types/models';
import { LocalAnalysisResult } from './types';

const fillerVocabulary = ['um', 'uh', 'erm', 'you know', 'like'];
const stopWords = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'were', 'have', 'what', 'your', 'about', 'into', 'they', 'then', 'just', 'for', 'are', 'was']);

export interface TextAnalysisResult {
  keywords: string[];
  fillerWords: Record<string, number>;
  questions: string[];
  commitments: string[];
}

/**
 * Pure TypeScript, local-first signal and text analysis.
 * Native DSP / speech models can replace individual methods without changing the UI.
 */
export class LocalAnalysisEngine {
  readonly modelVersion = 'local-rules-0.1';

  analyzeSignalSamples(samples: AudioSignalSample[], sessionId: string): LocalAnalysisResult {
    const events: AnalysisEvent[] = [];
    let silenceTimeMs = 0;
    let speakingTimeMs = 0;
    let silenceStartedAt: number | null = null;
    let previousRms: number | null = null;

    samples.forEach((sample, index) => {
      const next = samples[index + 1];
      const duration = Math.max(0, (next?.timestampMs ?? sample.timestampMs) - sample.timestampMs);
      if (sample.isSilent) {
        silenceTimeMs += duration;
        silenceStartedAt ??= sample.timestampMs;
      } else {
        speakingTimeMs += duration;
        if (silenceStartedAt !== null) {
          const silenceDuration = sample.timestampMs - silenceStartedAt;
          if (silenceDuration >= 1200) {
            events.push({ id: `${sessionId}_pause_${sample.timestampMs}`, sessionId, type: silenceDuration >= 2500 ? 'EXTENDED_SILENCE' : 'LONG_PAUSE', startTimeMs: silenceStartedAt, endTimeMs: sample.timestampMs, observation: `Silence lasted ${(silenceDuration / 1000).toFixed(1)} seconds.`, possibleInterpretations: ['thinking time', 'turn transition', 'uncertainty'], confidence: 'moderate', modelVersion: this.modelVersion });
          }
          silenceStartedAt = null;
        }
      }

      if (previousRms !== null && sample.rms - previousRms > 0.35) {
        events.push({ id: `${sessionId}_spike_${sample.timestampMs}`, sessionId, type: 'VOLUME_SPIKE', startTimeMs: sample.timestampMs, endTimeMs: sample.timestampMs, observation: 'RMS amplitude increased sharply.', possibleInterpretations: ['emphasis', 'environmental noise'], confidence: 'low', modelVersion: this.modelVersion });
      }
      previousRms = sample.rms;
    });

    return { signalSamples: samples, events, keywords: [], fillerWords: {}, speakingTimeMs, silenceTimeMs };
  }

  analyzeText(text: string): TextAnalysisResult {
    const normalized = text.toLowerCase();
    const words = normalized.match(/[a-z0-9']+/g) ?? [];
    const counts = new Map<string, number>();
    words.filter((word) => word.length > 3 && !stopWords.has(word)).forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
    const keywords = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([word]) => word);
    const fillerWords = Object.fromEntries(fillerVocabulary.map((filler): [string, number] => [filler, this.countPhrase(normalized, filler)]).filter((entry) => entry[1] > 0));
    const questions = text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.endsWith('?'));
    const commitments = text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter((sentence) => /\b(i will|we will|i'll|we'll|plan to|going to)\b/i.test(sentence));
    return { keywords, fillerWords, questions, commitments };
  }

  buildBaselineComparison(current: { responseLatencyMs?: number; speakingRateWpm?: number; volume?: number }, baseline: { responseLatencyMs?: number; speakingRateWpm?: number; volume?: number }) {
    const percent = (value?: number, base?: number) => value !== undefined && base ? Math.round(((value - base) / base) * 1000) / 10 : undefined;
    return { responseLatencyChange: percent(current.responseLatencyMs, baseline.responseLatencyMs), speakingRateChange: percent(current.speakingRateWpm, baseline.speakingRateWpm), volumeChange: percent(current.volume, baseline.volume) };
  }

  private countPhrase(text: string, phrase: string): number {
    return text.split(phrase).length - 1;
  }
}
