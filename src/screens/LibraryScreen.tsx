import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useApp } from '../context/AppContext';
import { Badge, Button, Card, Chip, IconButton, Label, SearchField, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { colors, commonStyles, spacing, typography } from '../theme';
import { getUseCaseMode } from '../features/capture/modeSets';
import { CaptureSession } from '../types/models';
import { SessionDetailSheet } from '../features/audio/SessionDetailSheet';
import { tripDistanceKm } from '../features/capture/tripMetrics';

export function LibraryScreen() {
  const { sessions, toggleProtected, importMediaSession } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'drives' | 'rooms' | 'protected'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sessions.find((session) => session.id === selectedId) ?? null;
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      if (filter === 'drives' && session.useCaseModeId !== 'drive' && session.mode !== 'dashcam') return false;
      if (filter === 'rooms' && session.useCaseModeId !== 'room') return false;
      if (filter === 'protected' && !session.protected) return false;
      return !needle || [session.title, session.mode, getUseCaseMode(session.useCaseModeId)?.label, session.conversationTemplateId, ...(session.notes ?? []).map((note) => note.text), ...(session.transcript ?? []).map((line) => `${line.speakerId ?? ''} ${line.text}`)].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [filter, query, sessions]);
  const importRecording = async () => {
    setImportMessage(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'video/*'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    try { await importMediaSession(asset.uri, asset.name, asset.mimeType); setImportMessage(`${asset.name} imported to your local library.`); }
    catch (error) { setImportMessage(error instanceof Error ? error.message : 'The recording could not be imported.'); }
  };
  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="ARCHIVE / PRIVATE BY DEFAULT" title="Library" detail={`${sessions.length} local session${sessions.length === 1 ? '' : 's'} · original media stays unchanged`} action={<Badge>LOCAL</Badge>} />
    <SearchField placeholder="Search recordings & notes" value={query} onChangeText={setQuery} />
    <Card style={styles.importCard}><View style={{ flex: 1 }}><Label color={colors.blue}>IMPORT RECORDING</Label><Text style={styles.importTitle}>Bring in audio or video</Text><Text style={styles.importDetail}>MP3, M4A, WAV, MP4, MOV, Voice Memos and Files stay local.</Text></View><Button label="IMPORT" icon="＋" compact variant="secondary" onPress={() => { void importRecording(); }} /></Card>
    {importMessage ? <Text style={styles.importMessage}>{importMessage}</Text> : null}
    <View style={styles.filterRow}><Chip label="ALL" selected={filter === 'all'} onPress={() => setFilter('all')} /><Chip label="DRIVES" selected={filter === 'drives'} onPress={() => setFilter('drives')} color={colors.blue} /><Chip label="ROOMS" selected={filter === 'rooms'} onPress={() => setFilter('rooms')} color={colors.purple} /><Chip label="PROTECTED" selected={filter === 'protected'} onPress={() => setFilter('protected')} color={colors.orange} /></View>
    <SectionHeader title="Recent" action="Sort · Newest" />
    {sessions.length === 0 ? <Card style={styles.empty}><FuturisticIcon name="library" size={52} framed color={colors.accent} accent={colors.aqua} /><Text style={styles.emptyTitle}>Your archive is quiet.</Text><Text style={styles.emptyDetail}>Captured sessions will appear here with their original file, checksum, markers, and analysis state.</Text></Card> : filtered.length === 0 ? <Card style={styles.empty}><FuturisticIcon name="search" size={52} framed color={colors.accent} accent={colors.yellow} /><Text style={styles.emptyTitle}>No local matches</Text><Text style={styles.emptyDetail}>Try a speaker, phrase, note, title or recording type.</Text></Card> : filtered.map((session) => <SessionCard key={session.id} session={session} onOpen={() => setSelectedId(session.id)} onToggle={() => toggleProtected(session.id)} query={query} />)}
    <SectionHeader title="Archive states" />
    <View style={styles.stateGrid}><Card style={styles.state}><Text style={styles.stateNumber}>{sessions.filter((session) => session.protected).length}</Text><Label>PROTECTED</Label></Card><Card style={styles.state}><Text style={styles.stateNumber}>{sessions.filter((session) => session.mode === 'security').length}</Text><Label>SECURITY</Label></Card><Card style={styles.state}><Text style={styles.stateNumber}>0</Text><Label>ANALYZED</Label></Card></View>
  </ScrollView><SessionDetailSheet session={selected} visible={Boolean(selected)} onClose={() => setSelectedId(null)} /></View>;
}

function SessionCard({ session, onToggle, onOpen, query }: { session: CaptureSession; onToggle: () => void; onOpen: () => void; query: string }) {
  const title = session.title ?? getUseCaseMode(session.useCaseModeId)?.label ?? `${session.mode.replaceAll('_', ' ')} session`;
  const hashCount = session.segments.reduce((count, segment) => count + Number(Boolean(segment.checksum)) + Number(Boolean(segment.frontChecksum)), 0);
  const hit = query.trim() ? session.transcript?.find((line) => `${line.speakerId ?? ''} ${line.text}`.toLowerCase().includes(query.toLowerCase())) : undefined;
  return <Card style={styles.sessionCard}>
    <View style={styles.sessionTop}>
      <View style={styles.thumbnail}><FuturisticIcon name={session.mode === 'security' || session.useCaseModeId ? 'security' : 'capture'} size={25} color={colors.accent} accent={colors.purple} /></View>
      <View style={{ flex: 1 }}>
        <View style={commonStyles.spread}><Text style={styles.sessionTitle}>{title}</Text><Text style={styles.sessionTime}>{new Date(session.startedAt).toLocaleDateString()}</Text></View>
        <Text style={styles.sessionMeta}>{session.id} · {session.segments.length} segment{session.segments.length === 1 ? '' : 's'}</Text>
        <View style={styles.badges}><Badge color={colors.accent}>ORIGINAL</Badge>{session.evidenceLocked ? <Badge color={colors.orange}>EVIDENCE</Badge> : session.protected ? <Badge color={colors.orange}>PROTECTED</Badge> : null}{hashCount ? <Badge color={colors.blue}>HASH {hashCount}</Badge> : null}{session.status === 'interrupted' ? <Badge color={colors.red}>INCOMPLETE</Badge> : null}</View>
      </View>
    </View>
    <View style={styles.divider} />
    <View style={styles.sessionBottom}><Text style={styles.sessionDetail}>{session.mode.replaceAll('_', ' ')} · {session.settings.audioQuality.replaceAll('_', ' ')}</Text><IconButton label={session.protected ? '🔒' : '☆'} onPress={session.evidenceLocked ? undefined : onToggle} active={session.protected} /></View>
    {hit ? <View style={styles.searchHit}><FuturisticIcon name="search" size={14} color={colors.accent} accent={colors.purple} /><Text style={styles.searchHitText}>{Math.floor(hit.startTimeMs / 60000)}:{String(Math.floor((hit.startTimeMs % 60000) / 1000)).padStart(2, '0')} · {hit.text}</Text></View> : null}
    {session.locationSamples?.length ? <Text style={styles.locationSummary}>⌖  {session.locationSamples.length} GPS point{session.locationSamples.length === 1 ? '' : 's'} · approximately {(tripDistanceKm(session.locationSamples) * 0.621371).toFixed(1)} mi</Text> : null}
    {session.markers.length ? <View style={styles.timeline}><Text style={styles.timelineLabel}>EVENT TIMELINE</Text>{session.markers.slice(0, 3).map((marker) => <View key={marker.id} style={styles.timelineRow}><Text style={styles.timelineTime}>{Math.floor(marker.timestampMs / 60000).toString().padStart(2, '0')}:{Math.floor((marker.timestampMs % 60000) / 1000).toString().padStart(2, '0')}</Text><Text style={styles.timelineEvent}>{marker.label.replaceAll('_', ' ')}</Text></View>)}</View> : null}
    <Button label="OPEN RECORDING" icon="›" variant="secondary" onPress={onOpen} style={styles.openButton} />
  </Card>;
}

const styles = StyleSheet.create({
  importCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  importTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 5 },
  importDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 3 },
  importMessage: { ...typography.caption, color: colors.accent, marginTop: 9 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: spacing.lg, flexWrap: 'wrap' },
  filter: { ...typography.label, color: colors.textSubtle },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, marginBottom: spacing.xs },
  emptyTitle: { ...typography.title, color: colors.text, marginTop: 12 },
  emptyDetail: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 290 },
  sessionCard: { marginBottom: spacing.md },
  sessionTop: { flexDirection: 'row', gap: 12 },
  thumbnail: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { ...typography.bodyMedium, color: colors.text, textTransform: 'capitalize', flex: 1 },
  sessionTime: { ...typography.caption, color: colors.textSubtle },
  sessionMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  sessionBottom: { ...commonStyles.spread },
  sessionDetail: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize', flex: 1, marginRight: 12 },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  state: { flexGrow: 1, flexBasis: '28%', minWidth: 90, minHeight: 92, padding: 12 },
  stateNumber: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 6 },
  timeline: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 10, gap: 7 },
  timelineLabel: { ...typography.label, color: colors.textSubtle, marginBottom: 2 },
  timelineRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  timelineTime: { ...typography.caption, color: colors.accent, fontVariant: ['tabular-nums'] },
  timelineEvent: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  locationSummary: { ...typography.caption, color: colors.blue, marginTop: 10 },
  searchHit: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: colors.accentMuted },
  searchHitText: { ...typography.caption, color: colors.accent, lineHeight: 17, flex: 1 },
  openButton: { marginTop: 12 },
});
