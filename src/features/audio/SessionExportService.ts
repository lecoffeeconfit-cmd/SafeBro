import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { CaptureSession, TranscriptSegment } from '../../types/models';
import { tripDistanceKm } from '../capture/tripMetrics';

export type SessionExportFormat = 'original' | 'txt' | 'markdown' | 'csv' | 'srt' | 'vtt' | 'pdf' | 'incident_pdf' | 'json' | 'summary';

const safeName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'sentryward-recording';
const timecode = (milliseconds: number, vtt = false) => {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const millis = Math.floor(milliseconds % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${vtt ? '.' : ','}${String(millis).padStart(3, '0')}`;
};
const transcriptText = (segments: TranscriptSegment[] = []) => segments.map((segment) => `[${timecode(segment.startTimeMs, true)}] ${segment.speakerId ? `${segment.speakerId}: ` : ''}${segment.text}`).join('\n');
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function buildText(session: CaptureSession) {
  const transcript = transcriptText(session.transcript);
  const notes = (session.notes ?? []).map((note) => `[${timecode(note.timestampMs, true)}] ${note.text}`).join('\n');
  return `${session.title ?? 'SafeBro recording'}\n${new Date(session.startedAt).toLocaleString()}\n\nTRANSCRIPT\n${transcript || 'No transcript available.'}\n\nNOTES & MOMENTS\n${notes || 'No notes.'}`;
}

export async function exportSession(session: CaptureSession, format: SessionExportFormat): Promise<string | null> {
  const title = session.title ?? session.conversationTemplateId?.replaceAll('_', ' ') ?? 'SafeBro recording';
  const root = FileSystem.cacheDirectory;
  if (format === 'original') {
    const uri = session.segments.find((segment) => segment.filePath)?.filePath;
    if (!uri) throw new Error('No original media file is available.');
    await Share.share({ title, url: uri, message: title });
    return uri;
  }

  if (format === 'incident_pdf') {
    if (session.useCaseModeId !== 'drive' && session.mode !== 'dashcam') throw new Error('Incident reports are available for driving sessions.');
    const route = session.locationSamples ?? [];
    const maxSpeed = route.reduce((maximum, point) => Math.max(maximum, point.speedMps ?? 0), 0);
    const events = session.markers.map((marker) => {
      const eventTime = Date.parse(session.startedAt) + marker.timestampMs;
      const closest = route.reduce<{ point: typeof route[number]; difference: number } | null>((best, point) => {
        const difference = Math.abs(Date.parse(point.timestamp) - eventTime);
        return !best || difference < best.difference ? { point, difference } : best;
      }, null);
      const location = closest && closest.difference < 30000 ? ` · GPS ${closest.point.latitude.toFixed(5)}, ${closest.point.longitude.toFixed(5)}` : '';
      return `<li>${escapeHtml(timecode(marker.timestampMs, true))} · ${escapeHtml(marker.label)}${marker.note ? ` · ${escapeHtml(marker.note)}` : ''}${location}</li>`;
    }).join('') || '<li>No event markers</li>';
    const notes = (session.notes ?? []).map((note) => `<li>${escapeHtml(timecode(note.timestampMs, true))} · ${escapeHtml(note.text)}</li>`).join('') || '<li>No written notes</li>';
    const media = session.segments.map((segment) => `<li>${escapeHtml(segment.filePath?.split('/').pop() ?? 'Unavailable')} · checksum ${escapeHtml(segment.checksum ?? 'unavailable')}</li>`).join('');
    const distanceText = route.length > 1 ? `approximately ${(tripDistanceKm(route) * 0.621371).toFixed(1)} miles` : 'Unavailable';
    const speedText = route.some((point) => point.speedMps != null && point.speedMps >= 0) ? `${Math.round(maxSpeed * 2.23694)} mph` : 'Unavailable';
    const startLocation = route[0] ? `${route[0].latitude.toFixed(5)}, ${route[0].longitude.toFixed(5)}` : 'Unavailable';
    const endLocation = route.length ? `${route[route.length - 1].latitude.toFixed(5)}, ${route[route.length - 1].longitude.toFixed(5)}` : 'Unavailable';
    const html = `<html><body style="font-family:-apple-system;padding:32px;color:#0E2A52"><h1>SafeBro incident report</h1><p>Local record · ${escapeHtml(session.id)}</p><h2>Trip</h2><p>Started: ${escapeHtml(new Date(session.startedAt).toLocaleString())}<br/>Ended: ${escapeHtml(session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Not saved')}<br/>Distance: ${distanceText}<br/>Maximum recorded GPS speed: ${speedText}<br/>Start GPS: ${startLocation}<br/>End GPS: ${endLocation}<br/>GPS points: ${route.length}<br/>Protected: ${session.protected ? 'Yes' : 'No'}</p><h2>Event timeline</h2><ul>${events}</ul><h2>Driver notes</h2><ul>${notes}</ul><h2>Original media references</h2><ul>${media}</ul><p>GPS estimates depend on signal accuracy. This report lists media references; export original video separately from the recording's Export page.</p></body></html>`;
    const result = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Export incident report' });
    return result.uri;
  }

  if (format === 'pdf') {
    const body = escapeHtml(buildText(session)).replaceAll('\n', '<br/>');
    const result = await Print.printToFileAsync({ html: `<html><body style="font-family:-apple-system;padding:32px;color:#17202a"><h1>${escapeHtml(title)}</h1><p>${body}</p></body></html>` });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: `Export ${title}` });
    return result.uri;
  }

  if (!root) throw new Error('Export storage is unavailable.');
  let extension = format === 'markdown' ? 'md' : format;
  let body = buildText(session);
  if (format === 'summary') { extension = 'txt'; body = session.summary?.quick ?? session.summary?.detailed ?? 'No summary has been generated.'; }
  if (format === 'csv') body = ['start_ms,end_ms,speaker,text', ...(session.transcript ?? []).map((segment) => `${segment.startTimeMs},${segment.endTimeMs},"${(segment.speakerId ?? '').replaceAll('"', '""')}","${segment.text.replaceAll('"', '""')}"`)].join('\n');
  if (format === 'srt') body = (session.transcript ?? []).map((segment, index) => `${index + 1}\n${timecode(segment.startTimeMs)} --> ${timecode(segment.endTimeMs)}\n${segment.speakerId ? `${segment.speakerId}: ` : ''}${segment.text}`).join('\n\n');
  if (format === 'vtt') body = `WEBVTT\n\n${(session.transcript ?? []).map((segment) => `${timecode(segment.startTimeMs, true)} --> ${timecode(segment.endTimeMs, true)}\n${segment.speakerId ? `${segment.speakerId}: ` : ''}${segment.text}`).join('\n\n')}`;
  if (format === 'json') body = JSON.stringify(session, null, 2);
  if (format === 'markdown') body = `# ${title}\n\n${buildText(session).replace('TRANSCRIPT', '## Transcript').replace('NOTES & MOMENTS', '## Notes & moments')}`;
  const uri = `${root}${safeName(title)}-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri, body, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: `Export ${title}` });
  return uri;
}
