import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, Chip, Label, SectionHeader } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { useApp } from '../../context/AppContext';
import { colors, radii, spacing, typography } from '../../theme';
import { CustomCaptureConfig, getUseCaseMode, modeSets, useCaseModes } from './modeSets';

export function CaptureModeSetsView({ onStart, onOpenAudioGuard }: { onStart: () => void; onOpenAudioGuard: () => void }) {
  const { selectedUseCaseModeId, selectUseCaseMode, cameraOptions, setCameraOptions, customCaptureConfig, setCustomCaptureConfig, capabilities } = useApp();
  const selected = getUseCaseMode(selectedUseCaseModeId);
  const [setId, setSetId] = useState(selected?.set ?? 'vehicle');
  const visibleModes = useMemo(() => useCaseModes.filter((mode) => mode.set === setId), [setId]);

  useEffect(() => { if (selected) setSetId(selected.set); }, [selected?.id]);

  return <>
    <SectionHeader title="Mode sets" action={`${useCaseModes.length} PRESETS · 3 CONTROLS`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setRow}>
      {modeSets.map((set) => <Pressable key={set.id} onPress={() => setSetId(set.id)} accessibilityRole="tab" accessibilityState={{ selected: setId === set.id }} style={({ pressed }) => [styles.setChip, setId === set.id && styles.setChipActive, pressed && styles.choicePressed]}><FuturisticIcon name={set.icon} size={34} framed color={setId === set.id ? colors.accent : colors.textMuted} accent={setId === set.id ? colors.yellow : colors.aqua} /><Text style={[styles.setName, setId === set.id && styles.setNameActive]}>{set.title}</Text></Pressable>)}
    </ScrollView>
    <Text style={styles.setDetail}>{modeSets.find((set) => set.id === setId)?.detail}</Text>
    <View style={styles.modeGrid}>{visibleModes.map((mode) => <Pressable key={mode.id} onPress={mode.id === 'audio_guard' ? onOpenAudioGuard : () => selectUseCaseMode(mode.id)} accessibilityRole="button" accessibilityState={{ selected: selectedUseCaseModeId === mode.id }} style={({ pressed }) => [styles.modeCard, selectedUseCaseModeId === mode.id && styles.modeCardActive, pressed && styles.choicePressed]}><FuturisticIcon name={mode.icon} size={42} framed color={selectedUseCaseModeId === mode.id ? colors.accent : colors.text} accent={mode.planned.length ? colors.yellow : colors.aqua} /><Text style={styles.modeName}>{mode.label}</Text><Text style={styles.modeDetail}>{mode.detail}</Text><View style={styles.modeFooter}><Text style={[styles.modeStatus, { color: mode.planned.length ? colors.orange : colors.accent }]}>{mode.id === 'audio_guard' ? 'OPEN AUDIO' : mode.planned.length ? 'BASE CAPTURE READY' : 'READY'}</Text><Text style={styles.modeArrow}>›</Text></View></Pressable>)}</View>

    {selected ? <Card style={styles.selectedCard}>
      <View style={styles.selectedTop}><View style={{ flex: 1 }}><Label color={colors.accent}>SELECTED PRESET</Label><View style={styles.selectedTitleRow}><FuturisticIcon name={selected.icon} size={38} framed color={colors.accent} accent={colors.yellow} /><Text style={styles.selectedTitle}>{selected.label}</Text></View><Text style={styles.selectedDetail}>{selected.detail}</Text></View><Badge color={selected.planned.length ? colors.orange : colors.accent}>{selected.planned.length ? 'PARTIAL' : 'READY'}</Badge></View>
      <Text style={styles.subLabel}>AVAILABLE IN THIS BUILD</Text>
      <View style={styles.featureList}>{selected.available.map((feature) => <Text key={feature} style={styles.availableFeature}>✓ {feature}</Text>)}</View>
      {selected.planned.length ? <><Text style={styles.subLabel}>REQUIRES MORE DEVICE WORK</Text><View style={styles.featureList}>{selected.planned.map((feature) => <Text key={feature} style={styles.plannedFeature}>◌ {feature}</Text>)}</View></> : null}
      {selected.note ? <Text style={styles.presetNote}>{selected.note}</Text> : null}
      <View style={styles.recipe}><Text style={styles.recipeText}>{(selected.id === 'custom' ? customCaptureConfig.lens : selected.lens).toUpperCase()} LENS  ·  {(selected.id === 'custom' ? customCaptureConfig.quality : selected.quality).toUpperCase()}  ·  {selected.id === 'custom' ? customCaptureConfig.fps : selected.fps} FPS  ·  {selected.power.replaceAll('_', ' ').toUpperCase()}</Text></View>
      <Button label={selected.id === 'remote' ? 'START LOCAL CAMERA' : `START ${selected.label.toUpperCase()}`} icon="●" onPress={onStart} />
    </Card> : null}

    <SectionHeader title="Across camera modes" action="OPTIONAL" />
    <Card style={styles.optionsCard}>
      <Text style={styles.optionsDetail}>These controls also work with your existing camera modes. They apply to the next recording; Evidence can lock the current one immediately.</Text>
      <View style={styles.optionRow}><Chip label={cameraOptions.dualCamera ? 'DUAL CAMERA ON' : 'DUAL CAMERA'} selected={cameraOptions.dualCamera} onPress={capabilities?.dualCameraSupported ? () => setCameraOptions({ dualCamera: !cameraOptions.dualCamera }) : undefined} color={colors.purple} /><Chip label={cameraOptions.night ? 'NIGHT PRESET ON' : 'NIGHT PRESET'} selected={cameraOptions.night} onPress={() => setCameraOptions({ night: !cameraOptions.night })} color={colors.blue} /><Chip label={cameraOptions.evidence ? 'EVIDENCE ON' : 'EVIDENCE'} selected={cameraOptions.evidence} onPress={() => setCameraOptions({ evidence: !cameraOptions.evidence })} color={colors.orange} /></View>
      {!capabilities?.dualCameraSupported ? <Text style={styles.optionsFootnote}>Dual camera needs an iPhone with supported simultaneous front and rear capture.</Text> : null}
      {cameraOptions.night ? <Text style={styles.optionsFootnote}>Night preset starts at 720p with a 24 fps target. Exposure, noise processing and night vision are not available yet.</Text> : null}
      {cameraOptions.evidence ? <Text style={styles.optionsFootnote}>Evidence locks the current and future sessions against archive unlock and automatic retention cleanup. Saved files receive an MD5 checksum. This is not a forensic chain of custody.</Text> : null}
    </Card>

    {selected?.id === 'custom' ? <CustomControls config={customCaptureConfig} onChange={setCustomCaptureConfig} /> : null}
  </>;
}

function CustomControls({ config, onChange }: { config: CustomCaptureConfig; onChange: (patch: Partial<CustomCaptureConfig>) => void }) {
  return <><SectionHeader title="Custom mode builder" /><Card style={styles.customCard}>
    <ChoiceRow title="CAMERA" choices={['rear', 'front']} current={config.lens} onSelect={(value) => onChange({ lens: value as CustomCaptureConfig['lens'] })} />
    <ChoiceRow title="RESOLUTION" choices={['480p', '720p', '1080p', '2160p']} current={config.quality} onSelect={(value) => onChange({ quality: value as CustomCaptureConfig['quality'] })} />
    <ChoiceRow title="FRAME RATE" choices={['15', '24', '30', '60']} current={String(config.fps)} onSelect={(value) => onChange({ fps: Number(value) as CustomCaptureConfig['fps'] })} />
    <ChoiceRow title="MICROPHONE" choices={['on', 'off']} current={config.microphone ? 'on' : 'off'} onSelect={(value) => onChange({ microphone: value === 'on' })} />
    <Text style={styles.subLabel}>EVENTS & LIMITS · CONFIGURATION ONLY</Text>
    <ChoiceRow title="MOTION" choices={['on', 'off']} current={config.motionDetection ? 'on' : 'off'} onSelect={(value) => onChange({ motionDetection: value === 'on' })} />
    <ChoiceRow title="SOUND" choices={['on', 'off']} current={config.soundDetection ? 'on' : 'off'} onSelect={(value) => onChange({ soundDetection: value === 'on' })} />
    <ChoiceRow title="BATTERY STOP" choices={['10', '20', '30']} current={String(config.batteryThreshold)} onSelect={(value) => onChange({ batteryThreshold: Number(value) as CustomCaptureConfig['batteryThreshold'] })} />
    <ChoiceRow title="STORAGE LIMIT (GB)" choices={['1', '5', '10']} current={String(config.storageLimitGB)} onSelect={(value) => onChange({ storageLimitGB: Number(value) as CustomCaptureConfig['storageLimitGB'] })} />
    <ChoiceRow title="NOTIFICATIONS" choices={['on', 'off']} current={config.notifications ? 'on' : 'off'} onSelect={(value) => onChange({ notifications: value === 'on' })} />
    <Text style={styles.optionsFootnote}>Lens, resolution and mic settings apply to recording now. Frame rate is saved as a target for single camera capture. Event detection, battery stop, storage limits and notifications need the native monitoring service.</Text>
  </Card></>;
}

function ChoiceRow({ title, choices, current, onSelect }: { title: string; choices: string[]; current: string; onSelect: (value: string) => void }) {
  return <View style={styles.choiceRow}><Text style={styles.choiceTitle}>{title}</Text><View style={styles.choiceChips}>{choices.map((choice) => <Chip key={choice} label={choice.toUpperCase()} selected={current === choice} onPress={() => onSelect(choice)} />)}</View></View>;
}

const styles = StyleSheet.create({
  setRow: { gap: 12, paddingBottom: spacing.md, paddingTop: 3 },
  setChip: { minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  setChipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  setName: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  setNameActive: { color: colors.accent },
  setDetail: { ...typography.caption, color: colors.textSubtle, marginBottom: spacing.md },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.xs },
  modeCard: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 180, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, padding: 16, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 3 } },
  modeCardActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  modeName: { ...typography.bodyMedium, color: colors.text, marginTop: 12, flexShrink: 1 },
  modeDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4, lineHeight: 16, flex: 1, flexShrink: 1 },
  modeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  modeStatus: { ...typography.label, fontSize: 8, lineHeight: 11, flexShrink: 1 },
  modeArrow: { color: colors.textMuted, fontSize: 19 },
  selectedCard: { gap: 12, marginBottom: spacing.xs, borderColor: `${colors.accent}66` },
  selectedTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  selectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  selectedTitle: { ...typography.title, color: colors.text, fontSize: 20, flex: 1, minWidth: 0 },
  selectedDetail: { ...typography.body, color: colors.textMuted, marginTop: 5 },
  subLabel: { ...typography.label, color: colors.textSubtle, marginTop: 2 },
  featureList: { gap: 5 },
  availableFeature: { ...typography.caption, color: colors.accent },
  plannedFeature: { ...typography.caption, color: colors.orange },
  presetNote: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },
  recipe: { padding: 10, borderRadius: 11, backgroundColor: colors.surfaceMuted },
  recipeText: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  optionsCard: { gap: 12, marginBottom: spacing.xs },
  optionsDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionsFootnote: { ...typography.caption, color: colors.textSubtle, lineHeight: 17 },
  customCard: { gap: 13, marginBottom: spacing.xs },
  choiceRow: { gap: 7 },
  choiceTitle: { ...typography.label, color: colors.textMuted },
  choiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choicePressed: { opacity: 0.78, transform: [{ scale: 0.97 }, { rotate: '-0.5deg' }] },
});
