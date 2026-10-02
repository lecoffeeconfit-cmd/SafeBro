import { CaptureSession } from '../../types/models';
import { getJson, setJson } from '../../services/storage/LocalStore';

export async function loadSessions(): Promise<CaptureSession[]> {
  return getJson<CaptureSession[]>('sessions', []);
}

export async function saveSession(session: CaptureSession): Promise<void> {
  const sessions = await loadSessions();
  await setJson('sessions', [session, ...sessions.filter((item) => item.id !== session.id)]);
}

export async function saveRecoveryState(state: { sessionId: string; segmentId?: string; latestSafeWritePoint: number; capturedAt: string }): Promise<void> {
  await setJson('recovery_state', state);
}

export async function clearRecoveryState(): Promise<void> {
  await setJson('recovery_state', null);
}
