import { TranscriptSegment } from '../../types/models';
import { TranscriptionProvider, TranscriptionRequest } from '../types';

/**
 * Native speech recognition / Whisper adapters plug into this boundary.
 * The fallback intentionally returns no transcript instead of pretending audio was transcribed.
 */
export class LocalTranscriptionProvider implements TranscriptionProvider {
  readonly id = 'local-transcription';
  readonly local = true;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async transcribe(_request: TranscriptionRequest): Promise<TranscriptSegment[]> {
    return [];
  }
}
