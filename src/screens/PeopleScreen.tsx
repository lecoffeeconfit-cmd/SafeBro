import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, Chip, Label, SearchField, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { useApp } from '../context/AppContext';
import { getJson, setJson } from '../services/storage/LocalStore';
import { colors, commonStyles, radii, spacing, typography } from '../theme';

type SourceFilter = 'all' | 'audio' | 'camera' | 'linked' | 'unknown';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type ProfileSource = 'audio' | 'camera' | 'linked' | 'unknown';

interface Interaction { id: string; date: string; title: string; source: 'audio' | 'camera'; detail: string }

interface LocalProfile {
  id: string;
  displayName: string;
  initials: string;
  color: string;
  source: ProfileSource;
  confirmed: boolean;
  confidence: number;
  audioAppearances: number;
  cameraAppearances: number;
  conversations: number;
  speakingTimeSeconds: number;
  commonTopics: string[];
  rate: string;
  change: string;
  firstAppearance: string;
  lastAppearance: string;
  interactions: Interaction[];
}

const seedProfiles: LocalProfile[] = [
  { id: 'alex', displayName: 'Alex', initials: 'A', color: colors.purple, source: 'linked', confirmed: true, confidence: 0.94, audioAppearances: 8, cameraAppearances: 4, conversations: 8, speakingTimeSeconds: 3890, commonTopics: ['work', 'rent', 'plans'], rate: '142 wpm', change: '-21.8%', firstAppearance: '2026-09-05T14:30:00.000Z', lastAppearance: '2026-09-28T16:40:00.000Z', interactions: [
    { id: 'alex-1', date: '2026-09-28T16:40:00.000Z', title: 'Conversation audio', source: 'audio', detail: 'Work and next steps · 42 min' },
    { id: 'alex-2', date: '2026-09-25T12:15:00.000Z', title: 'Room Guard', source: 'camera', detail: 'Face cluster observed · 18 min' },
    { id: 'alex-3', date: '2026-09-18T19:05:00.000Z', title: 'Podcast mode', source: 'audio', detail: 'Planning discussion · 1 hr 06 min' },
  ] },
  { id: 'voice-01', displayName: 'Voice 01', initials: 'V', color: colors.accent, source: 'audio', confirmed: true, confidence: 0.82, audioAppearances: 5, cameraAppearances: 0, conversations: 5, speakingTimeSeconds: 1640, commonTopics: ['timing', 'vehicle'], rate: '—', change: 'stable', firstAppearance: '2026-09-10T09:10:00.000Z', lastAppearance: '2026-09-27T08:45:00.000Z', interactions: [
    { id: 'voice-1', date: '2026-09-27T08:45:00.000Z', title: 'Conversation audio', source: 'audio', detail: 'Voice cluster · 14 min' },
    { id: 'voice-2', date: '2026-09-20T10:20:00.000Z', title: 'Drive mode audio', source: 'audio', detail: 'Voice cluster · 27 min' },
  ] },
  { id: 'face-01', displayName: 'Face 01', initials: 'F', color: colors.blue, source: 'camera', confirmed: false, confidence: 0.76, audioAppearances: 0, cameraAppearances: 3, conversations: 0, speakingTimeSeconds: 0, commonTopics: ['entryway', 'vehicle'], rate: '—', change: 'needs review', firstAppearance: '2026-09-15T18:20:00.000Z', lastAppearance: '2026-09-26T17:05:00.000Z', interactions: [
    { id: 'face-1', date: '2026-09-26T17:05:00.000Z', title: 'Room Guard', source: 'camera', detail: 'Face cluster · 11 min' },
    { id: 'face-2', date: '2026-09-15T18:20:00.000Z', title: 'Door / Entry', source: 'camera', detail: 'Face cluster · 3 min' },
  ] },
  { id: 'person-01', displayName: 'Person 01', initials: '?', color: colors.orange, source: 'unknown', confirmed: false, confidence: 0.61, audioAppearances: 0, cameraAppearances: 1, conversations: 0, speakingTimeSeconds: 0, commonTopics: ['unknown'], rate: '—', change: 'needs review', firstAppearance: '2026-09-22T21:10:00.000Z', lastAppearance: '2026-09-22T21:10:00.000Z', interactions: [
    { id: 'person-1', date: '2026-09-22T21:10:00.000Z', title: 'Motion event', source: 'camera', detail: 'Unconfirmed person cluster · 2 min' },
  ] },
];

const sourceLabel: Record<ProfileSource, string> = { audio: 'AUDIO VOICE', camera: 'CAMERA FACE', linked: 'LINKED PROFILE', unknown: 'NEEDS REVIEW' };
const sourceColor: Record<ProfileSource, string> = { audio: colors.accent, camera: colors.blue, linked: colors.purple, unknown: colors.orange };
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const isInDateRange = (value: string, range: DateFilter) => range === 'all' || Date.now() - new Date(value).getTime() <= (range === 'today' ? 1 : range === 'week' ? 7 : 31) * 24 * 60 * 60 * 1000;

export function PeopleScreen() {
  const { sessions } = useApp();
  const [profiles, setProfiles] = useState<LocalProfile[]>(seedProfiles);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<LocalProfile | null>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => { void getJson<LocalProfile[]>('people_profiles', seedProfiles).then(setProfiles); }, []);

  const visibleProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const sourceMatch = sourceFilter === 'all' || (sourceFilter === 'audio' && profile.audioAppearances > 0) || (sourceFilter === 'camera' && profile.cameraAppearances > 0) || (sourceFilter === 'linked' && profile.source === 'linked') || (sourceFilter === 'unknown' && !profile.confirmed);
      const text = [profile.displayName, ...profile.commonTopics, ...profile.interactions.map((item) => `${item.title} ${item.detail}`)].join(' ').toLowerCase();
      return sourceMatch && (!needle || text.includes(needle)) && isInDateRange(profile.lastAppearance, dateFilter);
    });
  }, [dateFilter, profiles, query, sourceFilter]);

  const openProfile = (profile: LocalProfile) => { setProfileName(profile.confirmed ? profile.displayName : ''); setSelectedProfile(profile); };
  const saveProfile = () => {
    if (!selectedProfile) return;
    const next = profiles.map((profile) => profile.id === selectedProfile.id ? { ...profile, displayName: profileName.trim() || profile.displayName, initials: (profileName.trim() || profile.displayName).slice(0, 1).toUpperCase(), source: 'linked' as ProfileSource, confirmed: true } : profile);
    setProfiles(next); void setJson('people_profiles', next); setSelectedProfile(next.find((profile) => profile.id === selectedProfile.id) ?? null);
  };

  const audioProfiles = visibleProfiles.filter((profile) => profile.audioAppearances > 0 && profile.source !== 'linked');
  const cameraProfiles = visibleProfiles.filter((profile) => profile.cameraAppearances > 0 && profile.source !== 'linked');
  const linkedProfiles = visibleProfiles.filter((profile) => profile.source === 'linked');
  const reviewProfiles = visibleProfiles.filter((profile) => !profile.confirmed);

  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="LOCAL GROUPING / USER CONTROLLED" title="People" detail="Voices and faces are kept separate until you explicitly confirm they belong to the same person." />
    <SearchField placeholder="Search people, topics, notes" value={query} onChangeText={setQuery} />
    <View style={styles.localBanner}><FuturisticIcon name="people" size={24} color={colors.accent} accent={colors.purple} /><View style={{ flex: 1 }}><Text style={styles.localTitle}>LOCAL MATCHING ONLY</Text><Text style={styles.localDetail}>No identity databases. Audio and camera groups remain private, reviewable, and unlinkable until you confirm them.</Text></View></View>
    <SectionHeader title="View by source" action={`${visibleProfiles.length} GROUPS`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{(['all', 'audio', 'camera', 'linked', 'unknown'] as SourceFilter[]).map((item) => <Chip key={item} label={item === 'all' ? 'ALL' : item === 'audio' ? 'AUDIO VOICES' : item === 'camera' ? 'CAMERA FACES' : item === 'linked' ? 'LINKED' : 'NEEDS REVIEW'} selected={sourceFilter === item} onPress={() => setSourceFilter(item)} color={item === 'camera' ? colors.blue : item === 'unknown' ? colors.orange : item === 'linked' ? colors.purple : colors.accent} />)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{(['all', 'today', 'week', 'month'] as DateFilter[]).map((item) => <Chip key={item} label={item === 'all' ? 'ALL DATES' : item === 'today' ? 'TODAY' : item === 'week' ? 'THIS WEEK' : 'THIS MONTH'} selected={dateFilter === item} onPress={() => setDateFilter(item)} color={colors.blue} />)}</ScrollView>
    {reviewProfiles.length ? <><SectionHeader title="Needs review" action="CONFIRM BEFORE LINKING" />{reviewProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onPress={() => openProfile(profile)} onSave={() => openProfile(profile)} />)}</> : null}
    {linkedProfiles.length ? <><SectionHeader title="Linked profiles" action="USER CONFIRMED" />{linkedProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onPress={() => openProfile(profile)} />)}</> : null}
    {audioProfiles.length ? <><SectionHeader title="Audio voices" action="SPEAKER GROUPS" />{audioProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onPress={() => openProfile(profile)} />)}</> : null}
    {cameraProfiles.length ? <><SectionHeader title="Camera faces" action="FACE GROUPS" />{cameraProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} onPress={() => openProfile(profile)} />)}</> : null}
    {!visibleProfiles.length ? <Card style={styles.empty}><FuturisticIcon name="search" size={32} color={colors.textSubtle} accent={colors.accent} /><Text style={styles.emptyTitle}>No matching groups</Text><Text style={styles.emptyDetail}>Try another source, date range, or search term.</Text></Card> : null}
    <SectionHeader title="Recording coverage" action={`${sessions.length} LOCAL SESSIONS`} />
    <Card style={styles.coverageCard}><View style={styles.coverageRow}><View style={styles.coverageIcon}><FuturisticIcon name="audio" size={18} color={colors.accent} accent={colors.accent} /></View><View style={{ flex: 1 }}><Text style={styles.coverageTitle}>Audio identity</Text><Text style={styles.coverageDetail}>Speaker groups can be linked to a profile after review.</Text></View><Badge color={colors.accent}>LOCAL</Badge></View><View style={styles.coverageRow}><View style={[styles.coverageIcon, { backgroundColor: `${colors.blue}18` }]}><FuturisticIcon name="camera" size={18} color={colors.blue} accent={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.coverageTitle}>Camera identity</Text><Text style={styles.coverageDetail}>Face groups stay separate from voices by default.</Text></View><Badge color={colors.blue}>LOCAL</Badge></View><Text style={styles.disclaimer}>A voice match and a face match are suggestions, not proof of identity. SafeBro only creates a linked profile after your confirmation.</Text></Card>
  </ScrollView><ProfileSheet profile={selectedProfile} profileName={profileName} onChangeName={setProfileName} onSave={saveProfile} onClose={() => setSelectedProfile(null)} /></View>;
}

function ProfileCard({ profile, onPress, onSave }: { profile: LocalProfile; onPress: () => void; onSave?: () => void }) {
  const color = sourceColor[profile.source];
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}><View style={styles.personTop}><View style={[styles.avatar, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}><Text style={[styles.avatarText, { color }]}>{profile.initials}</Text></View><View style={{ flex: 1, minWidth: 0 }}><View style={styles.nameLine}><Text style={styles.personName}>{profile.displayName}</Text><Badge color={color}>{sourceLabel[profile.source]}</Badge></View><Text style={styles.personMeta}>{profile.audioAppearances} audio · {profile.cameraAppearances} camera · last {dateLabel(profile.lastAppearance)}</Text></View><Text style={styles.chevron}>›</Text></View><View style={styles.divider} /><View style={styles.profileGrid}><View style={styles.metric}><Label>EVENTS</Label><Text style={styles.profileValue}>{profile.interactions.length}</Text></View><View style={styles.metric}><Label>MATCH</Label><Text style={styles.profileValue}>{Math.round(profile.confidence * 100)}%</Text></View><View style={styles.metric}><Label>TOPICS</Label><Text style={styles.profileValue} numberOfLines={1}>{profile.commonTopics.join(' · ')}</Text></View></View>{onSave ? <Button label="SAVE AS PROFILE" compact variant="secondary" icon="＋" onPress={onSave} style={styles.saveButton} /> : null}</Pressable>;
}

function ProfileSheet({ profile, profileName, onChangeName, onSave, onClose }: { profile: LocalProfile | null; profileName: string; onChangeName: (value: string) => void; onSave: () => void; onClose: () => void }) {
  if (!profile) return null;
  const color = sourceColor[profile.source];
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.sheet}><View style={commonStyles.spread}><View style={{ flex: 1 }}><Label color={color}>{sourceLabel[profile.source]}</Label><Text style={styles.sheetTitle}>{profile.displayName}</Text><Text style={styles.sheetMeta}>{profile.confirmed ? 'User-confirmed local profile' : 'Unconfirmed local group · review before linking'}</Text></View><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}><View style={styles.sheetStats}><Stat label="FIRST SEEN" value={dateLabel(profile.firstAppearance)} /><Stat label="LAST SEEN" value={dateLabel(profile.lastAppearance)} /><Stat label="CONFIDENCE" value={`${Math.round(profile.confidence * 100)}%`} /></View><Card style={styles.sourceCard}><View style={styles.coverageRow}><View style={[styles.coverageIcon, { backgroundColor: `${color}18` }]}><FuturisticIcon name={profile.cameraAppearances > 0 && profile.audioAppearances === 0 ? 'camera' : 'audio'} size={18} color={color} accent={color} /></View><View style={{ flex: 1 }}><Text style={styles.coverageTitle}>{profile.audioAppearances > 0 ? `${profile.audioAppearances} audio appearances` : 'No audio appearances'} · {profile.cameraAppearances > 0 ? `${profile.cameraAppearances} camera appearances` : 'No camera appearances'}</Text><Text style={styles.coverageDetail}>Sources remain separate unless you confirm a link.</Text></View></View></Card>{!profile.confirmed ? <Card style={styles.reviewCard}><Label color={colors.orange}>CONFIRM IDENTITY LINK</Label><Text style={styles.coverageDetail}>If you recognize this group, save a name to turn it into a profile. This does not claim biometric certainty.</Text><TextInput value={profileName} onChangeText={onChangeName} placeholder="Profile name" placeholderTextColor={colors.textSubtle} style={styles.profileInput} /><Button label="SAVE PROFILE" icon="✓" onPress={onSave} /></Card> : null}<SectionHeader title="Interaction timeline" action={`${profile.interactions.length} EVENTS`} />{profile.interactions.length ? <View style={styles.timeline}>{profile.interactions.map((interaction) => <View key={interaction.id} style={styles.timelineItem}><View style={[styles.timelineDot, { backgroundColor: interaction.source === 'audio' ? colors.accent : colors.blue }]} /><View style={styles.timelineLine}><View style={commonStyles.spread}><Text style={styles.timelineTitle}>{interaction.title}</Text><Text style={styles.timelineDate}>{dateLabel(interaction.date)}</Text></View><Text style={styles.timelineDetail}>{interaction.detail}</Text><Text style={styles.timelineAction}>OPEN RECORDING ›</Text></View></View>)}</View> : <Text style={styles.emptyDetail}>No linked interactions yet.</Text>}<Text style={styles.disclaimer}>Interaction history becomes meaningful when native voice/face grouping is connected to saved sessions. Unknown groups can always be renamed, unlinked, or forgotten.</Text></ScrollView></View></View></Modal>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Label>{label}</Label></View>; }

const styles = StyleSheet.create({
  localBanner: { flexDirection: 'row', gap: 12, marginTop: spacing.lg, marginBottom: spacing.xs, padding: spacing.panel, borderRadius: 16, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: `${colors.accent}44` }, localTitle: { ...typography.label, color: colors.accent }, localDetail: { ...typography.caption, color: colors.textMuted, marginTop: 5, lineHeight: 18 },
  chipRow: { gap: 10, paddingBottom: 12 }, profileCard: { marginBottom: spacing.md, padding: spacing.panel, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, personTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 21, fontWeight: '700' }, personName: { ...typography.title, fontSize: 18, color: colors.text, flexShrink: 1 }, personMeta: { ...typography.caption, color: colors.textMuted, marginTop: 5 }, chevron: { color: colors.textMuted, fontSize: 26 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 }, profileGrid: { flexDirection: 'row', gap: 12 }, metric: { flex: 1, minWidth: 0 }, profileValue: { ...typography.body, color: colors.text, marginTop: 4, textTransform: 'capitalize', flexShrink: 1 }, saveButton: { marginTop: 13 }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  empty: { alignItems: 'center', gap: 9, paddingVertical: spacing.xl, marginVertical: spacing.sm }, emptyTitle: { ...typography.bodyMedium, color: colors.text }, emptyDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, textAlign: 'center' }, coverageCard: { gap: 13, marginBottom: spacing.lg }, coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, coverageIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center' }, coverageTitle: { ...typography.bodyMedium, color: colors.text }, coverageDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 3 }, disclaimer: { ...typography.caption, color: colors.textSubtle, lineHeight: 18, marginTop: 4 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000BB' }, sheet: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingBottom: 28 }, sheetTitle: { ...typography.title, color: colors.text, marginTop: 5 }, sheetMeta: { ...typography.caption, color: colors.textMuted, marginTop: 5, lineHeight: 18 }, close: { color: colors.textMuted, fontSize: 30, lineHeight: 30, paddingLeft: 12 }, sheetContent: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md }, sheetStats: { flexDirection: 'row', gap: 7 }, stat: { flex: 1, minWidth: 0, padding: 10, borderRadius: 12, backgroundColor: colors.surface }, statValue: { ...typography.caption, color: colors.text, marginBottom: 5 }, sourceCard: { gap: 10 }, reviewCard: { gap: 11, borderColor: `${colors.orange}55` }, profileInput: { minHeight: 46, color: colors.text, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, ...typography.body }, timeline: { gap: 2 }, timelineItem: { flexDirection: 'row', gap: 11 }, timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 }, timelineLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13, marginBottom: 11 }, timelineTitle: { ...typography.bodyMedium, color: colors.text, flex: 1, marginRight: 10 }, timelineDate: { ...typography.caption, color: colors.textSubtle }, timelineDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4 }, timelineAction: { ...typography.label, color: colors.accent, fontSize: 9, marginTop: 8 },
});
