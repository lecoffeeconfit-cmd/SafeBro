import * as FileSystem from 'expo-file-system';

import { CaptureSession } from '../../types/models';

const mediaPathsFor = (session: CaptureSession) => Array.from(new Set(session.segments.flatMap((segment) => [segment.filePath, segment.frontFilePath, segment.rearFilePath].filter((path): path is string => Boolean(path)))));

/**
 * Removes unprotected, completed sessions after their per-session retention window.
 * The archive record and its local media are treated as one unit so cleanup does
 * not leave stale library entries behind.
 */
export async function pruneExpiredSessions(sessions: CaptureSession[], now = Date.now()): Promise<{ sessions: CaptureSession[]; removed: number }> {
  const survivors: CaptureSession[] = [];
  let removed = 0;

  for (const session of sessions) {
    const retentionDays = session.settings.capturePolicy?.retentionDays ?? 5;
    const reference = Date.parse(session.endedAt ?? session.startedAt);
    const expired = session.status === 'complete' && session.settings.capturePolicy?.autoDelete === true && !session.protected && Number.isFinite(reference) && now - reference >= retentionDays * 24 * 60 * 60 * 1000;

    if (!expired) {
      survivors.push(session);
      continue;
    }

    const deletions = await Promise.all(mediaPathsFor(session).map((path) => FileSystem.deleteAsync(path, { idempotent: true }).then(() => true).catch(() => false)));
    if (deletions.every(Boolean)) removed += 1;
    else survivors.push(session);
  }

  return { sessions: survivors, removed };
}
