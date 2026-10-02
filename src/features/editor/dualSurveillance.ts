import { CaptureSession } from '../../types/models';
import { EditOperation, EditorProject, TimelineClip } from './types';

const clipId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function createDualSurveillanceProject(session: CaptureSession, format: EditorProject['format']): EditorProject {
  const segment = session.segments.find((item) => item.type === 'dual_camera');
  const durationMs = segment?.durationMs ?? 180000;
  const syncGroupId = `SYNC_${session.id}`;
  const base = { sessionId: session.id, startMs: 0, endMs: durationMs, timelineStartMs: 0, volume: 1, opacity: 1, speed: 1, syncGroupId };
  const project: EditorProject = {
    id: `PRJ_${session.id}`,
    name: 'Double Surveillance · Synced Edit',
    status: 'draft',
    sourceSessionIds: [session.id],
    format,
    durationMs,
    tracks: { video: [], video_overlay: [], audio: [], music: [], voiceover: [], text: [], captions: [], graphics: [] },
    operations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    derivedOutputs: [],
  };
  project.tracks.video = [{ id: clipId('REAR'), type: 'video', sourceSessionId: session.id, sourceUri: segment?.rearFilePath ?? segment?.filePath, label: 'REAR CAMERA', ...base }];
  project.tracks.video_overlay = [{ id: clipId('FRONT'), type: 'video_overlay', sourceSessionId: session.id, sourceUri: segment?.frontFilePath, label: 'FRONT CAMERA', ...base }];
  return project;
}

export function splitSynchronizedProject(project: EditorProject, splitAtMs: number): EditorProject {
  const splitAt = Math.max(1, Math.min(project.durationMs - 1, splitAtMs));
  const next = JSON.parse(JSON.stringify(project)) as EditorProject;
  (['video', 'video_overlay'] as const).forEach((trackType) => {
    next.tracks[trackType] = next.tracks[trackType].flatMap((clip) => {
      if (splitAt <= clip.timelineStartMs || splitAt >= clip.timelineStartMs + (clip.endMs - clip.startMs)) return [clip];
      const elapsed = splitAt - clip.timelineStartMs;
      return [
        { ...clip, id: clipId(`${trackType}_A`), endMs: clip.startMs + elapsed },
        { ...clip, id: clipId(`${trackType}_B`), startMs: clip.startMs + elapsed, timelineStartMs: splitAt },
      ];
    });
  });
  const operation: EditOperation = { id: clipId('SPLIT'), type: 'split', createdAt: new Date().toISOString(), payload: { splitAtMs: splitAt, synchronized: true, tracks: ['video', 'video_overlay'] } };
  next.operations = [...next.operations, operation];
  next.updatedAt = new Date().toISOString();
  return next;
}

export function trimSynchronizedProject(project: EditorProject, startMs: number, endMs: number): EditorProject {
  const start = Math.max(0, Math.min(startMs, endMs - 1));
  const end = Math.min(project.durationMs, Math.max(endMs, start + 1));
  const next = JSON.parse(JSON.stringify(project)) as EditorProject;
  (['video', 'video_overlay'] as const).forEach((trackType) => {
    next.tracks[trackType] = next.tracks[trackType].flatMap((clip) => {
      const clipEnd = clip.timelineStartMs + (clip.endMs - clip.startMs);
      if (clipEnd <= start || clip.timelineStartMs >= end) return [];
      const visibleStart = Math.max(clip.timelineStartMs, start);
      const visibleEnd = Math.min(clipEnd, end);
      return [{ ...clip, startMs: clip.startMs + (visibleStart - clip.timelineStartMs), endMs: clip.startMs + (visibleEnd - clip.timelineStartMs), timelineStartMs: visibleStart - start }];
    });
  });
  next.durationMs = end - start;
  next.operations = [...next.operations, { id: clipId('TRIM'), type: 'trim', createdAt: new Date().toISOString(), payload: { startMs: start, endMs: end, synchronized: true, tracks: ['video', 'video_overlay'] } }];
  next.updatedAt = new Date().toISOString();
  return next;
}
