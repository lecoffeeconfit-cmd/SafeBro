import { CaptureSession } from '../types/models';
import { deviceIntelligence } from '../native/intelligence';
import { SummaryProvider } from './types';

export type SummarySource = 'device' | 'local' | 'cloud';

export interface SummaryResult {
  text: string;
  source: SummarySource;
  partial: boolean;
}

/** Cloud use requires a configured provider and an explicit opt-in from the caller. */
export interface SummaryOptions {
  cloudProvider?: SummaryProvider;
  allowCloud?: boolean;
  useDeviceAI?: boolean;
}

export async function summarizeDeviceFirst(session: CaptureSession, options: SummaryOptions = {}): Promise<SummaryResult> {
  const notes = (session.notes ?? []).map((note) => note.text.trim()).filter(Boolean);
  const transcript = (session.transcript ?? []).map((line) => line.text.trim()).filter(Boolean);
  if (!notes.length && !transcript.length) throw new Error('Add a note or create a transcript before making a summary.');

  const source = [notes.length ? `Notes:\n${notes.join('\n')}` : '', transcript.length ? `Transcript:\n${transcript.join(' ')}` : ''].filter(Boolean).join('\n\n');
  const partial = source.length > 6000;
  const input = partial ? `${source.slice(0, 3100)}\n\n[Middle of recording omitted]\n\n${source.slice(-2800)}` : source;

  if (options.useDeviceAI !== false) {
    try {
      const capability = await deviceIntelligence.availabilityAsync();
      if (capability.available) {
        const text = (await deviceIntelligence.summarizeAsync(input)).trim();
        if (text) return { text, source: 'device', partial };
      }
    } catch {
      // A model can become unavailable during generation. Keep a usable local recap.
    }
  }

  if (options.allowCloud && options.cloudProvider && !options.cloudProvider.local) {
    try {
      const text = (await options.cloudProvider.summarize(input)).trim();
      if (text) return { text, source: 'cloud', partial };
    } catch {
      // Recording, notes, and the offline recap remain usable without the service.
    }
  }

  const noteExcerpt = notes.slice(0, 3).join(' · ');
  const fullTranscript = transcript.join(' ');
  const speechExcerpt = fullTranscript.slice(0, 360);
  const text = [noteExcerpt ? `Notes: ${noteExcerpt}` : '', speechExcerpt ? `Transcript excerpt: ${speechExcerpt}` : ''].filter(Boolean).join('\n');
  return { text, source: 'local', partial: notes.length > 3 || fullTranscript.length > 360 };
}
