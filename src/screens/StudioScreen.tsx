import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Chip, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { createEmptyProject, saveProject, socialPresets } from '../features/editor';
import { DoubleSurveillanceEditor } from '../features/editor/DoubleSurveillanceEditor';
import { useApp } from '../context/AppContext';
import { colors, commonStyles, spacing, typography } from '../theme';

const actions = [
  { icon: '◉', title: 'Create From Recording', detail: 'Turn a long capture into a clip' },
  { icon: '✦', title: 'Create Social Clip', detail: 'TikTok · Reel · Short' },
  { icon: '◒', title: 'Create Podcast Clip', detail: 'Captions + speaker focus' },
  { icon: '⌁', title: 'Create Highlights', detail: 'Local signal-based picks' },
];

export function StudioScreen() {
  const { sessions } = useApp();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [surveillanceEditorOpen, setSurveillanceEditorOpen] = useState(false);
  const [formatId, setFormatId] = useState('tiktok');
  const surveillanceSession = sessions.find((session) => session.mode === 'double_surveillance' || session.segments.some((segment) => segment.type === 'dual_camera'));
  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="STUDIO / NONDESTRUCTIVE" title="Make it shareable." detail="A quick path from long recording to a polished social cut. Originals stay untouched." action={<Badge color={colors.purple}>DRAFTS 0</Badge>} />
    <Card style={styles.createCard}><View style={{ flex: 1 }}><Text style={styles.createEyebrow}>QUICK CREATE</Text><Text style={styles.createTitle}>What do you want to create?</Text><Text style={styles.createDetail}>Choose a goal and SafeBro will build an editable draft.</Text></View><Button label="CREATE" icon="✦" onPress={() => setQuickCreateOpen(true)} /></Card>
    <SectionHeader title="Start with" />
    <View style={styles.actionGrid}>{actions.map((action) => <Card key={action.title} style={styles.actionCard}><FuturisticIcon name={action.icon} size={42} framed color={colors.purple} accent={colors.aqua} /><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionDetail}>{action.detail}</Text></Card>)}</View>
    <SectionHeader title="Format" action="Presets" />
    <View style={styles.chips}><Chip label="9:16 Vertical" selected={socialPresets.find((preset) => preset.id === formatId)?.aspectRatio === '9:16'} onPress={() => setFormatId('tiktok')} /><Chip label="16:9 Landscape" selected={socialPresets.find((preset) => preset.id === formatId)?.aspectRatio === '16:9'} onPress={() => setFormatId('youtube')} /><Chip label="1:1 Square" selected={false} onPress={() => setFormatId('instagram_feed')} /><Chip label="4:5 Portrait" selected={socialPresets.find((preset) => preset.id === formatId)?.aspectRatio === '4:5'} onPress={() => setFormatId('instagram_feed')} /></View>
    <SectionHeader title="Your projects" action="See all" />
    <Card style={styles.emptyProject}><FuturisticIcon name="spark" size={38} framed color={colors.textSubtle} accent={colors.yellow} /><View style={{ flex: 1 }}><Text style={styles.projectTitle}>No drafts yet</Text><Text style={styles.projectDetail}>Your Quick Create and Advanced Editor projects will appear here.</Text></View><FuturisticIcon name="arrow" size={20} color={colors.textMuted} accent={colors.accent} /></Card>
    <SectionHeader title="Surveillance editing" action="Synced" />
    <Card style={styles.syncCard}><View style={styles.syncHeader}><View style={styles.syncIcon}><FuturisticIcon name="dual" size={23} color={colors.accent} accent={colors.purple} /></View><View style={{ flex: 1 }}><Text style={styles.syncTitle}>Double-camera sync editor</Text><Text style={styles.syncDetail}>{surveillanceSession ? 'Trim, split, blur, caption, and export both feeds together.' : 'Record a Double Surveillance session to unlock linked front + rear editing.'}</Text></View><Badge color={surveillanceSession ? colors.accent : colors.textMuted}>{surveillanceSession ? 'READY' : 'WAITING'}</Badge></View><View style={styles.syncActions}><Button label="OPEN SYNC EDITOR" icon="✂" disabled={!surveillanceSession} onPress={() => setSurveillanceEditorOpen(true)} style={styles.syncButton} /><Text style={styles.syncHint}>Every cut stays aligned</Text></View></Card>
    <View style={styles.architecture}><Text style={styles.architectureTitle}>CAPCUT-STYLE ARCHITECTURE</Text><Text style={styles.architectureDetail}>Timeline tracks, captions, overlays, audio, keyframes, and render outputs are modeled as separate nondestructive project data.</Text></View>
  </ScrollView><QuickCreateSheet visible={quickCreateOpen} formatId={formatId} onClose={() => setQuickCreateOpen(false)} onCreated={() => setQuickCreateOpen(false)} />{surveillanceSession ? <DoubleSurveillanceEditor visible={surveillanceEditorOpen} session={surveillanceSession} onClose={() => setSurveillanceEditorOpen(false)} /> : null}</View>;
}

function QuickCreateSheet({ visible, formatId, onClose, onCreated }: { visible: boolean; formatId: string; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('Best Highlight');
  const [length, setLength] = useState('30 sec');
  const [style, setStyle] = useState('Clean');
  const selectedFormat = socialPresets.find((preset) => preset.id === formatId) ?? socialPresets[0];
  const goals = ['Best Highlight', 'Make a Short', 'Make Multiple Shorts', 'Podcast Clip', 'Quote Clip', 'Manual Selection'];
  const lengths = ['15 sec', '30 sec', '45 sec', '60 sec', '90 sec'];
  const styleOptions = ['Clean', 'Bold', 'Podcast', 'Minimal', 'Documentary', 'Security'];
  const createDraft = async () => {
    const project = createEmptyProject(`${goal} · ${length}`, [], selectedFormat);
    project.captionStyleId = style.toLowerCase();
    await saveProject(project);
    onCreated();
    setStep(1);
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={commonStyles.spread}><View><Text style={styles.sheetEyebrow}>QUICK CREATE · {step}/6</Text><Text style={styles.sheetTitle}>{['Select source', 'Choose goal', 'Choose length', 'Choose style', 'Auto build', 'Preview & export'][step - 1]}</Text></View><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><View style={styles.progress}>{Array.from({ length: 6 }).map((_, index) => <View key={index} style={[styles.progressSegment, index < step && styles.progressSegmentActive]} />)}</View>
    {step === 1 ? <><Text style={styles.sheetDetail}>Start from a local recording or imported media. The original source is never modified.</Text><View style={styles.sheetOptions}><QuickOption icon="◉" title="One recording" detail="Choose from Library" /><QuickOption icon="▤" title="Multiple recordings" detail="Build from a selection" /><QuickOption icon="◒" title="Podcast session" detail="Speaker-aware layout" /><QuickOption icon="＋" title="Import media" detail="Camera footage or audio" /></View></> : null}
    {step === 2 ? <><Text style={styles.sheetDetail}>Local signals, transcript facts, and markers guide the first draft.</Text><View style={styles.optionChips}>{goals.map((item) => <Chip key={item} label={item} selected={goal === item} onPress={() => setGoal(item)} color={colors.purple} />)}</View></> : null}
    {step === 3 ? <><Text style={styles.sheetDetail}>Pick a target length. Every cut remains editable in Advanced Editor.</Text><View style={styles.optionChips}>{lengths.map((item) => <Chip key={item} label={item} selected={length === item} onPress={() => setLength(item)} />)}</View></> : null}
    {step === 4 ? <><Text style={styles.sheetDetail}>Choose a starting style. Templates are data-driven and can be changed later.</Text><View style={styles.optionChips}>{styleOptions.map((item) => <Chip key={item} label={item} selected={style === item} onPress={() => setStyle(item)} color={colors.purple} />)}</View></> : null}
    {step === 5 ? <><View style={styles.buildState}><FuturisticIcon name="spark" size={52} framed color={colors.accent} accent={colors.yellow} /><Text style={styles.buildTitle}>Building an editable draft</Text><Text style={styles.buildDetail}>Ranking local highlights · preparing {selectedFormat.label} canvas · reserving caption safe zones</Text></View></> : null}
    {step === 6 ? <><View style={styles.preview}><Text style={styles.previewLabel}>{selectedFormat.label.toUpperCase()} · {selectedFormat.width}×{selectedFormat.height}</Text><Text style={styles.previewTitle}>{goal}</Text><Text style={styles.previewCaption}>Captions, trims, layout and audio stay editable.</Text></View><Text style={styles.sheetDetail}>Original recording remains unchanged. This creates a DERIVED SOCIAL PROJECT.</Text></> : null}
    <View style={styles.sheetFooter}>{step > 1 ? <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} /> : <Button label="Cancel" variant="ghost" onPress={onClose} />}<Button label={step === 5 ? 'Build draft' : step === 6 ? 'Save draft' : 'Continue'} onPress={step === 5 ? createDraft : step === 6 ? createDraft : () => setStep(step + 1)} /></View>
  </View></View></Modal>;
}

function QuickOption({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <View style={styles.quickOption}><FuturisticIcon name={icon} size={36} framed color={colors.purple} accent={colors.aqua} /><View style={{ flex: 1 }}><Text style={styles.quickOptionTitle}>{title}</Text><Text style={styles.quickOptionDetail}>{detail}</Text></View><FuturisticIcon name="arrow" size={18} color={colors.textMuted} accent={colors.accent} /></View>;
}

const styles = StyleSheet.create({
  createCard: { backgroundColor: colors.accentMuted, borderColor: `${colors.accent}44`, gap: 18, marginBottom: spacing.xs },
  createEyebrow: { ...typography.label, color: colors.accent },
  createTitle: { ...typography.title, color: colors.text, marginTop: 8 },
  createDetail: { ...typography.body, color: colors.textMuted, marginTop: 5 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.xs },
  actionCard: { flexBasis: '45%', flexGrow: 1, minHeight: 160, padding: 16 },
  actionTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 12 },
  actionDetail: { ...typography.caption, color: colors.textMuted, marginTop: 5, lineHeight: 17 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: spacing.lg },
  emptyProject: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectTitle: { ...typography.bodyMedium, color: colors.text },
  projectDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  chevron: { color: colors.textMuted, fontSize: 26 },
  architecture: { marginTop: spacing.lg, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.purple },
  architectureTitle: { ...typography.label, color: colors.purple },
  architectureDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 7 },
  syncCard: { marginTop: spacing.sm, borderColor: `${colors.accent}44`, backgroundColor: `${colors.accent}0A` },
  syncHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  syncIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  syncTitle: { ...typography.bodyMedium, color: colors.text },
  syncDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
  syncActions: { alignItems: 'stretch', gap: 12, marginTop: 18 },
  syncButton: { minHeight: 50 },
  syncHint: { ...typography.caption, color: colors.accent, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingBottom: 32, minHeight: 470 },
  sheetEyebrow: { ...typography.label, color: colors.accent },
  sheetTitle: { ...typography.title, color: colors.text, marginTop: 7 },
  close: { color: colors.textMuted, fontSize: 30, lineHeight: 30 },
  progress: { flexDirection: 'row', gap: 5, marginVertical: spacing.lg },
  progressSegment: { height: 3, flex: 1, borderRadius: 3, backgroundColor: colors.border },
  progressSegmentActive: { backgroundColor: colors.accent },
  sheetDetail: { ...typography.body, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  sheetOptions: { gap: 12 },
  quickOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  quickOptionTitle: { ...typography.bodyMedium, color: colors.text },
  quickOptionDetail: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  optionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buildState: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  buildIcon: { marginBottom: 14 },
  buildTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  buildDetail: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  preview: { minHeight: 205, borderRadius: 18, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'flex-end', padding: 18, marginBottom: spacing.lg },
  previewLabel: { ...typography.label, color: colors.accent },
  previewTitle: { ...typography.title, color: colors.text, marginTop: 8 },
  previewCaption: { ...typography.caption, color: colors.textMuted, marginTop: 5 },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
});
