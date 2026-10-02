import { AnalysisEvent, CaptureSession, TranscriptSegment } from '../../types/models';

export interface HighlightCandidate {
  id: string;
  sessionId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  title: string;
  transcriptPreview: string;
  score: number;
  reasons: string[];
}

/** Heuristic ranking only. It uses local transcript/signal facts and never claims editorial certainty. */
export function generateLocalHighlights(session: CaptureSession, transcript: TranscriptSegment[] = [], events: AnalysisEvent[] = [], targetDurationMs = 45000): HighlightCandidate[] {
  const candidates: HighlightCandidate[] = [];
  const signalTimes = events.filter((event) => event.type === 'VOLUME_SPIKE' || event.type === 'PITCH_CHANGE').map((event) => event.startTimeMs);
  for (let index = 0; index < transcript.length; index += 1) {
    const item = transcript[index];
    const startMs = Math.max(0, item.startTimeMs - 7000);
    const endMs = Math.max(item.endTimeMs + 7000, startMs + targetDurationMs);
    const context = transcript.filter((segment) => segment.startTimeMs >= startMs && segment.endTimeMs <= endMs);
    const text = context.map((segment) => segment.text).join(' ');
    const hasQuestion = /\?/.test(text);
    const hasSignal = signalTimes.some((time) => time >= startMs && time <= endMs);
    const score = (hasQuestion ? 0.3 : 0) + (hasSignal ? 0.3 : 0) + Math.min(0.4, text.length / 800);
    if (score > 0.15) candidates.push({ id: `${session.id}_clip_${item.id}`, sessionId: session.id, startMs, endMs, durationMs: endMs - startMs, title: hasQuestion ? 'QUESTION + ANSWER' : 'BEST MOMENT', transcriptPreview: text.slice(0, 160), score, reasons: [hasQuestion ? 'question detected' : 'coherent speech', ...(hasSignal ? ['signal change'] : [])] });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 10);
}
