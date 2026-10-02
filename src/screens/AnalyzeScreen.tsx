import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Label, SearchField, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { colors, commonStyles, spacing, typography } from '../theme';

const events = [
  { time: '14:32', type: 'LONG PAUSE', value: '2.7 sec', detail: 'baseline 0.9 sec · +1.8 sec', color: colors.orange },
  { time: '15:04', type: 'VOLUME SPIKE', value: '+18 dB', detail: 'high confidence signal change', color: colors.red },
  { time: '15:47', type: 'SPEAKING RATE', value: '111 wpm', detail: 'current · baseline 142 wpm', color: colors.blue },
];

export function AnalyzeScreen() {
  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="LOCAL-FIRST INTELLIGENCE" title="Analyze" detail="Signal measurements, transcripts, and conservative interpretations — without a cloud key." />
    <View style={styles.engine}><View style={styles.engineMark}><FuturisticIcon name="analyze" size={24} color={colors.accent} accent={colors.purple} /></View><View style={{ flex: 1 }}><Text style={styles.engineTitle}>LOCAL ANALYSIS ENGINE</Text><Text style={styles.engineDetail}>Ready · on-device processing</Text></View><Text style={styles.engineState}>ON</Text></View>
    <SearchField placeholder="Ask your recordings · e.g. rent discussion" />
    <View style={styles.chips}><Chip label="All signals" selected /><Chip label="Pauses" /><Chip label="Speech" /><Chip label="Topics" /></View>
    <SectionHeader title="What local analysis can do" />
    <Card style={styles.capabilityCard}><Capability label="✓" title="Signal analysis" detail="RMS, peaks, silence, pitch, speech activity, pause and interruption events" /><Capability label="✓" title="Local text processing" detail="Keywords, dates, names, repeated phrases, topics, questions, commitments" /><Capability label="✓" title="Provider interfaces" detail="Transcription, embeddings, semantic search, and optional advanced AI stay swappable" /></Card>
    <SectionHeader title="Recent signal events" action="All events" />
    {events.map((event) => <Card key={event.time} style={styles.eventCard}><View style={[styles.eventRail, { backgroundColor: event.color }]} /><View style={{ flex: 1 }}><View style={commonStyles.spread}><Text style={styles.eventTime}>{event.time}</Text><Label color={event.color}>{event.type}</Label></View><Text style={styles.eventValue}>{event.value}</Text><Text style={styles.eventDetail}>{event.detail}</Text></View><Text style={styles.eventArrow}>›</Text></Card>)}
    <Card style={styles.notice}><Text style={styles.noticeTitle}>ADVANCED AI OPTIONAL</Text><Text style={styles.noticeDetail}>Cloud providers can be added later for summaries or nuanced Q&A. Recording and basic analysis remain fully usable offline.</Text></Card>
  </ScrollView></View>;
}

function Capability({ label, title, detail }: { label: string; title: string; detail: string }) {
  return <View style={styles.capability}><Text style={styles.capabilityCheck}>{label}</Text><View style={{ flex: 1 }}><Text style={styles.capabilityTitle}>{title}</Text><Text style={styles.capabilityDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  engine: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: 18, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: `${colors.accent}44`, marginBottom: spacing.md },
  engineMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: `${colors.accent}18`, alignItems: 'center', justifyContent: 'center' },
  engineTitle: { ...typography.label, color: colors.accent },
  engineDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  engineState: { ...typography.label, color: colors.accent },
  chips: { flexDirection: 'row', gap: 10, marginTop: spacing.md, flexWrap: 'wrap' },
  capabilityCard: { gap: 16 },
  capability: { flexDirection: 'row', gap: 12 },
  capabilityCheck: { color: colors.accent, fontSize: 18, marginTop: -2 },
  capabilityTitle: { ...typography.bodyMedium, color: colors.text },
  capabilityDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
  eventCard: { flexDirection: 'row', gap: 14, marginBottom: spacing.md, padding: spacing.panel },
  eventRail: { width: 3, borderRadius: 3 },
  eventTime: { ...typography.caption, color: colors.textMuted },
  eventValue: { ...typography.title, color: colors.text, marginTop: 7 },
  eventDetail: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  eventArrow: { color: colors.textSubtle, fontSize: 24, alignSelf: 'center' },
  notice: { backgroundColor: colors.surfaceMuted, marginTop: spacing.md },
  noticeTitle: { ...typography.label, color: colors.purple },
  noticeDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 8 },
});
