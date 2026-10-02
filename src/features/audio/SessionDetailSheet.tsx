import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';

import { Badge, Button, Card, Chip, Label, SectionHeader } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { CaptureSession } from '../../types/models';
import { colors, commonStyles, radii, spacing, typography } from '../../theme';
import { exportSession, SessionExportFormat } from './SessionExportService';
import { getConversationTemplate } from './conversationTemplates';
import { tripDistanceKm } from '../capture/tripMetrics';
import { useApp } from '../../context/AppContext';

type DetailTab = 'overview' | 'transcript' | 'create' | 'export';
const formats: { id: SessionExportFormat; label: string; icon: string }[] = [
  { id: 'original', label: 'Original audio', icon: '◉' }, { id: 'txt', label: 'TXT', icon: 'T' }, { id: 'markdown', label: 'Markdown', icon: 'M' },
  { id: 'pdf', label: 'PDF', icon: 'P' }, { id: 'srt', label: 'SRT subtitles', icon: 'S' }, { id: 'vtt', label: 'VTT subtitles', icon: 'V' },
  { id: 'csv', label: 'CSV', icon: 'C' }, { id: 'summary', label: 'Summary', icon: '≡' }, { id: 'json', label: 'Data package', icon: '{}' },
];
const formatTime = (milliseconds: number) => `${Math.floor(milliseconds / 60000)}:${String(Math.floor((milliseconds % 60000) / 1000)).padStart(2, '0')}`;

export function SessionDetailSheet({ session, visible, onClose }: { session: CaptureSession | null; visible: boolean; onClose: () => void }) {
  const { updateSession } = useApp();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [tripNote, setTripNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<SessionExportFormat | null>(null);
  useEffect(() => { setTab('overview'); setMessage(null); setTripNote(''); }, [session?.id]);
  const template = getConversationTemplate(session?.conversationTemplateId);
  const recap = useMemo(() => {
    if (!session) return '';
    if (session.summary?.quick) return session.summary.quick;
    const notes = (session.notes ?? []).slice(0, 5).map((note) => note.text).join('. ');
    return notes || `${template.label} recording from ${new Date(session.startedAt).toLocaleDateString()}. It contains ${session.markers.length} bookmarked moments.`;
  }, [session]);
  if (!session) return null;

  const runExport = async (format: SessionExportFormat) => {
    setExporting(format); setMessage(null);
    try { const uri = await exportSession(session, format); setMessage(uri ? `${format === 'incident_pdf' ? 'Incident report' : formats.find((item) => item.id === format)?.label ?? 'Export'} prepared.` : 'Export cancelled.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Export could not be created.'); }
    finally { setExporting(null); }
  };
  const isDrive = session.useCaseModeId === 'drive' || session.mode === 'dashcam';
  const route = session.locationSamples ?? [];
  const driveMedia = isDrive ? session.segments.flatMap((segment, index) => [
    ...(segment.filePath ? [{ label: `CLIP ${index + 1} · ${segment.type === 'dual_camera' ? 'ROAD' : (segment.camera ?? 'VIDEO').toUpperCase()}`, uri: segment.filePath }] : []),
    ...(segment.frontFilePath ? [{ label: `CLIP ${index + 1} · CABIN`, uri: segment.frontFilePath }] : []),
  ]) : [];
  const shareDriveMedia = async (uri: string, label: string) => {
    setMessage(null);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable on this device.');
      await Sharing.shareAsync(uri, { dialogTitle: `Export ${label}` });
      setMessage(`${label} ready to share.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Original clip could not be shared.'); }
  };
  const addTripNote = () => {
    const text = tripNote.trim();
    if (!text) return;
    const timestampMs = Math.max(0, Date.parse(session.endedAt ?? session.startedAt) - Date.parse(session.startedAt));
    updateSession(session.id, { notes: [...(session.notes ?? []), { id: `NOTE_${Date.now()}`, timestampMs, text, kind: 'typed', createdAt: new Date().toISOString() }] });
    setTripNote('');
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.sheet}>
    <View style={commonStyles.spread}><View style={{ flex: 1 }}><Label color={colors.accent}>RECORDING WORKSPACE</Label><Text style={styles.title}>{session.title ?? (isDrive ? 'Driving trip' : template.label)}</Text><Text style={styles.meta}>{new Date(session.startedAt).toLocaleString()} · {session.settings.audioQuality.replaceAll('_', ' ')}</Text></View><Pressable onPress={onClose} accessibilityLabel="Close recording"><Text style={styles.close}>×</Text></Pressable></View>
    <View style={styles.tabs}>{(isDrive ? ['overview', 'export'] as DetailTab[] : ['overview', 'transcript', 'create', 'export'] as DetailTab[]).map((item) => <Chip key={item} label={item.toUpperCase()} selected={tab === item} onPress={() => setTab(item)} color={item === 'create' ? colors.purple : colors.accent} />)}</View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {tab === 'overview' ? <>
        {isDrive ? <Card style={styles.tripCard}><Label color={colors.blue}>DRIVING TRIP</Label><Text style={styles.tripSummary}>{(tripDistanceKm(route) * 0.621371).toFixed(1)} mi approx. · {route.length} GPS points · {session.markers.filter((marker) => marker.label === 'incident').length} incidents</Text><Text style={styles.help}>Started {new Date(session.startedAt).toLocaleString()}{session.endedAt ? ` · Ended ${new Date(session.endedAt).toLocaleTimeString()}` : ''}</Text><Text style={styles.help}>GPS speed and distance depend on permission and signal accuracy. Event markers show their position in the recording below.</Text><View style={styles.noteRow}><TextInput value={tripNote} onChangeText={setTripNote} placeholder="Add an incident note" placeholderTextColor={colors.textSubtle} style={styles.noteInput} /><Button label="ADD NOTE" compact onPress={addTripNote} /></View><Button label="EXPORT INCIDENT REPORT" icon="▤" variant="secondary" onPress={() => { void runExport('incident_pdf'); }} /></Card> : null}
        {!isDrive ? <Card style={styles.recapCard}><View style={commonStyles.spread}><Label color={colors.accent}>QUICK RECAP</Label><Badge color={session.summary?.quick ? colors.purple : colors.accent}>{session.summary?.quick ? 'PLUS' : 'LOCAL'}</Badge></View><Text style={styles.recap}>{recap}</Text><Button label="LISTEN TO RECAP" icon="▶" variant="secondary" onPress={() => Speech.speak(recap, { rate: 0.95 })} /></Card> : null}
        <View style={styles.stats}><Stat label="DURATION" value={formatTime(session.segments.reduce((sum, segment) => sum + (segment.durationMs ?? 0), 0))} /><Stat label="MOMENTS" value={String(session.markers.length)} /><Stat label="NOTES" value={String(session.notes?.length ?? 0)} /><Stat label="FILES" value={String(session.attachments?.length ?? 0)} /></View>
        <SectionHeader title="Moments & notes" />
        {!(session.notes?.length || session.markers.length) ? <Text style={styles.empty}>No notes or moments were added.</Text> : <View style={styles.list}>{(session.notes ?? []).map((note) => <View key={note.id} style={styles.item}><Text style={styles.itemTime}>{formatTime(note.timestampMs)}</Text><Text style={styles.itemText}>{note.text}</Text></View>)}{session.markers.map((marker) => <View key={marker.id} style={styles.item}><Text style={styles.itemTime}>{formatTime(marker.timestampMs)}</Text><Text style={styles.itemText}>{marker.label.replaceAll('_', ' ')}{marker.note ? ` · ${marker.note}` : ''}</Text></View>)}</View>}
      </> : null}
      {tab === 'transcript' ? <>
        <Card style={styles.transcriptStatus}><View style={commonStyles.spread}><Label color={colors.accent}>LOCAL TRANSCRIPT</Label><Badge color={session.transcript?.length ? colors.accent : colors.orange}>{session.transcript?.length ? 'READY' : 'PENDING'}</Badge></View><Text style={styles.help}>Timestamped transcript lines remain usable without Plus. Speaker memory, translation and generative cleanup are optional Plus tools.</Text></Card>
        {session.transcript?.length ? <View style={styles.transcript}>{session.transcript.map((line) => <Pressable key={line.id} style={styles.transcriptLine}><Text style={styles.itemTime}>{formatTime(line.startTimeMs)}</Text><View style={{ flex: 1 }}><Text style={styles.speaker}>{line.speakerId ?? 'Speaker'}</Text><Text style={styles.transcriptText}>{line.text}</Text></View></Pressable>)}</View> : <Text style={styles.empty}>Local transcription runs after save when the native speech module is available. The original audio and every note remain accessible either way.</Text>}
      </> : null}
      {tab === 'create' ? <><Text style={styles.help}>Turn this recording into another useful format. Manual exports remain free; generative versions will be part of Plus.</Text><View style={styles.createGrid}>{['Summary', 'Meeting minutes', 'To-do list', 'Follow-up email', 'Study guide', 'Flashcards', 'Quiz', 'Blog post', 'Report', 'Journal entry', 'Podcast recap', 'FAQ'].map((item) => <Pressable key={item} onPress={() => setMessage(`${item} is a future Plus generation tool. Your original recording remains fully usable without it.`)} style={styles.createCard}><FuturisticIcon name="spark" size={21} color={colors.purple} accent={colors.accent} /><Text style={styles.createTitle}>{item}</Text><Badge color={colors.purple}>PLUS</Badge></Pressable>)}</View></> : null}
      {tab === 'export' ? <><Text style={styles.help}>{isDrive ? 'Share each original clip, a separate incident report, or the local metadata record.' : 'Exports are created locally and open the iOS share sheet. Subtitle exports use timestamped transcript lines when available.'}</Text><View style={styles.exportGrid}>{isDrive ? <Button label="INCIDENT REPORT PDF" icon="▤" compact variant="secondary" disabled={Boolean(exporting)} onPress={() => { void runExport('incident_pdf'); }} style={styles.exportButton} /> : null}{formats.filter((format) => !isDrive || ['pdf', 'json'].includes(format.id)).map((format) => <Button key={format.id} label={exporting === format.id ? 'PREPARING…' : format.label.toUpperCase()} icon={format.icon} compact variant="secondary" disabled={Boolean(exporting)} onPress={() => { void runExport(format.id); }} style={styles.exportButton} />)}</View>{isDrive ? <><SectionHeader title="Original video files" /><View style={styles.exportGrid}>{driveMedia.length ? driveMedia.map((media) => <Button key={`${media.label}:${media.uri}`} label={media.label} icon="◉" compact variant="secondary" onPress={() => { void shareDriveMedia(media.uri, media.label); }} style={styles.exportButton} />) : <Text style={styles.help}>No video file was saved for this trip.</Text>}</View></> : <Card style={styles.exportNote}><Label color={colors.orange}>WORD EXPORT</Label><Text style={styles.help}>DOCX is reserved for the document-rendering module; TXT, Markdown and PDF work now without AI or a subscription.</Text></Card>}</> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  </View></View></Modal>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Label>{label}</Label></View>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000BB' },
  sheet: { maxHeight: '94%', backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingBottom: 28 },
  title: { ...typography.title, color: colors.text, marginTop: 5, textTransform: 'capitalize' }, meta: { ...typography.caption, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' }, close: { color: colors.textMuted, fontSize: 30, lineHeight: 30, paddingLeft: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md }, content: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  recapCard: { gap: 12, borderColor: `${colors.accent}55` }, recap: { ...typography.body, color: colors.text, lineHeight: 22 },
  tripCard: { gap: 10, marginBottom: spacing.md, backgroundColor: '#E2F4FF' }, tripSummary: { ...typography.bodyMedium, color: colors.text }, noteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, noteInput: { flexGrow: 1, minWidth: 130, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.text },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: spacing.md }, stat: { flexGrow: 1, flexBasis: '42%', minWidth: 100, padding: 14, borderRadius: 12, backgroundColor: colors.surface }, statValue: { ...typography.title, color: colors.text, marginBottom: 5 },
  list: { gap: 8 }, item: { flexDirection: 'row', gap: 10, padding: 11, borderRadius: 12, backgroundColor: colors.surface }, itemTime: { ...typography.caption, color: colors.accent, fontVariant: ['tabular-nums'] }, itemText: { ...typography.caption, color: colors.text, flex: 1, textTransform: 'capitalize' },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.lg, lineHeight: 21 }, transcriptStatus: { gap: 9, marginBottom: spacing.md }, help: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  transcript: { gap: 8 }, transcriptLine: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surface }, speaker: { ...typography.label, color: colors.blue }, transcriptText: { ...typography.body, color: colors.text, marginTop: 4 },
  createGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.md }, createCard: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 132, padding: 16, borderRadius: radii.md, borderWidth: 1, borderColor: `${colors.purple}44`, backgroundColor: `${colors.purple}0C`, justifyContent: 'space-between' }, createTitle: { ...typography.bodyMedium, color: colors.text, marginVertical: 8 },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.md }, exportButton: { flexBasis: '45%', flexGrow: 1 }, exportNote: { gap: 8, marginTop: spacing.md }, message: { ...typography.caption, color: colors.accent, lineHeight: 18, marginTop: spacing.md, padding: 11, borderRadius: 11, backgroundColor: colors.accentMuted },
});
