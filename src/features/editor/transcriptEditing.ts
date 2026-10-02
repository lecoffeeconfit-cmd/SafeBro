import { EditOperation, TimelineClip } from './types';

export function removeTranscriptRange(clip: TimelineClip, startMs: number, endMs: number): { clips: TimelineClip[]; operation: EditOperation } {
  const operation: EditOperation = { id: `EDIT_${Date.now().toString(36)}`, type: 'delete', createdAt: new Date().toISOString(), payload: { sourceClipId: clip.id, startMs, endMs } };
  const clips: TimelineClip[] = [];
  if (startMs > clip.startMs) clips.push({ ...clip, id: `${clip.id}_before`, endMs: startMs });
  if (endMs < clip.endMs) clips.push({ ...clip, id: `${clip.id}_after`, startMs: endMs, timelineStartMs: clip.timelineStartMs + (endMs - clip.startMs) });
  return { clips, operation };
}

export function removeFillerWords(text: string, mode: 'conservative' | 'normal' | 'aggressive' = 'normal'): { text: string; removed: string[] } {
  const patterns = mode === 'conservative' ? [/\b(um|uh|erm)\b/gi] : mode === 'aggressive' ? [/\b(um|uh|erm|you know|like)\b/gi] : [/\b(um|uh|erm|you know)\b/gi];
  const removed: string[] = [];
  let next = text;
  patterns.forEach((pattern) => { next = next.replace(pattern, (match) => { removed.push(match); return ''; }); });
  return { text: next.replace(/\s{2,}/g, ' ').trim(), removed };
}
