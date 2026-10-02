import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '../context/AppContext';
import { CameraWorkspace } from '../features/capture/CameraWorkspace';
import { DrivePanel } from '../features/capture/DrivePanel';
import { RoomPanel } from '../features/capture/RoomPanel';
import { CaptureModeSetsView } from '../features/capture/CaptureModeSetsView';
import { getUseCaseMode } from '../features/capture/modeSets';
import { modeLabels } from '../features/capture/sessionDefaults';
import { isAudioQuickCaptureMode, QuickCaptureMode, quickCaptureModes } from '../features/quickCapture/config';
import { Badge, Button, Card, Chip, IconButton, Label, Metric, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { CaptureMode } from '../types/models';
import { colors, commonStyles, spacing, typography } from '../theme';
import { AudioPageMode } from './AudioScreen';

const modes: CaptureMode[] = ['rear_video', 'front_video', 'video_audio', 'dual_camera', 'double_surveillance', 'podcast', 'security', 'dashcam', 'event_camera'];

export function CaptureScreen({ onOpenAudio }: { onOpenAudio: (mode?: AudioPageMode) => void }) {
  const { activeSession, capabilities, selectedMode, setSelectedMode, selectedUseCaseModeId, selectUseCaseMode, drivePreferences, roomPreferences, powerMode, setPowerMode, quickCaptureMode, quickCaptureRequest, requestQuickCapture, isReady, addMarker, lockActiveSession, capturePolicy } = useApp();
  const isRecording = activeSession?.status === 'recording';
  const audioSessionActive = Boolean(activeSession && isAudioQuickCaptureMode(activeSession.mode as QuickCaptureMode));
  const isCameraMode = ['rear_video', 'front_video', 'video_audio', 'dual_camera', 'double_surveillance', 'podcast', 'security', 'dashcam', 'event_camera'].includes(selectedMode);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [presetStartRequest, setPresetStartRequest] = useState<{ id: string; token: number } | null>(null);
  const presetToken = useRef(0);
  const lastQuickRequestToken = useRef(0);
  const selectedQuickMode = useMemo(() => quickCaptureModes.find((mode) => mode.id === quickCaptureMode) ?? quickCaptureModes[0], [quickCaptureMode]);
  const selectedUseCase = getUseCaseMode(selectedUseCaseModeId);
  const activeUseCase = getUseCaseMode(activeSession?.useCaseModeId);
  const displayMode = isRecording ? activeUseCase?.label ?? modeLabels[activeSession.mode] : selectedUseCase?.label ?? modeLabels[selectedMode];
  const driveSelected = (isRecording ? activeSession?.useCaseModeId : selectedUseCaseModeId) === 'drive';
  const roomSelected = (isRecording ? activeSession?.useCaseModeId : selectedUseCaseModeId) === 'room';
  const driveView = isRecording ? activeSession?.settings.driveConfig?.view ?? drivePreferences.view : drivePreferences.view;
  const displayQuality = driveSelected ? `${(isRecording ? activeSession?.settings.cameraConfig?.quality : drivePreferences.quality) === '2160p' ? '4K' : (isRecording ? activeSession?.settings.cameraConfig?.quality : drivePreferences.quality)?.toUpperCase()} · ${isRecording ? activeSession?.settings.cameraConfig?.fps ?? drivePreferences.fps : drivePreferences.fps}` : roomSelected ? `${(isRecording ? activeSession?.settings.cameraConfig?.quality : roomPreferences.quality)?.toUpperCase()} · ROOM` : '1080P · 30';

  useEffect(() => {
    if (!isReady || !quickCaptureRequest || isAudioQuickCaptureMode(quickCaptureRequest.mode) || quickCaptureRequest.token === lastQuickRequestToken.current || isRecording) return;
    lastQuickRequestToken.current = quickCaptureRequest.token;
    setSelectedMode(quickCaptureRequest.mode);
  }, [isReady, isRecording, quickCaptureRequest, setSelectedMode]);

  const triggerQuickRecordFor = (mode: QuickCaptureMode) => requestQuickCapture(mode);

  const triggerQuickRecord = () => triggerQuickRecordFor(quickCaptureMode);

  const startSelectedPreset = () => {
    if (selectedUseCaseModeId === 'audio_guard') {
      onOpenAudio('audio_guard');
      return;
    }
    if (!selectedUseCaseModeId) return;
    presetToken.current += 1;
    setPresetStartRequest({ id: selectedUseCaseModeId, token: presetToken.current });
  };

  const quickStartPreset = (id: string) => {
    selectUseCaseMode(id);
    presetToken.current += 1;
    setPresetStartRequest({ id, token: presetToken.current });
  };

  useEffect(() => {
    if (!activeSession || !isRecording) { setElapsedMs(0); return; }
    const tick = () => setElapsedMs(Date.now() - new Date(activeSession.startedAt).getTime());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession, isRecording]);

  const formattedElapsed = [Math.floor(elapsedMs / 3600000), Math.floor((elapsedMs % 3600000) / 60000), Math.floor((elapsedMs % 60000) / 1000)].map((part) => String(part).padStart(2, '0')).join(':');

  if (audioSessionActive) return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content}><ScreenHeader eyebrow="SAFEBRO" title="Audio is recording" detail="Your recording continues while you browse the app." action={<Badge color={colors.red}>LIVE</Badge>} /><Card style={styles.liveCard}><Label color={colors.red}>AUDIO SESSION ACTIVE</Label><Text style={styles.liveDetail}>Open Audio to add markers, lock the session, or stop and save safely.</Text><Button label="OPEN AUDIO" icon="♫" onPress={() => onOpenAudio()} /></Card></ScrollView></View>;

  return <View style={commonStyles.screen}>
    <ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="SAFEBRO" title={isRecording ? 'Recording' : 'Ready when you are.'} detail={isRecording ? `${displayMode} · local capture in progress` : 'Easygoing capture. Serious privacy.'} action={<Badge color={isRecording ? colors.red : colors.accent}>{isRecording ? 'LIVE' : 'LOCAL'}</Badge>} />

      {(!isRecording || activeSession?.useCaseModeId === 'drive') ? <DrivePanel onOpen={() => selectUseCaseMode('drive')} onStart={() => quickStartPreset('drive')} /> : null}
      {(!isRecording || activeSession?.useCaseModeId === 'room') ? <RoomPanel onOpen={() => selectUseCaseMode('room')} onStart={() => quickStartPreset('room')} onOpenAudio={() => onOpenAudio('audio_guard')} /> : null}

      <Card style={styles.captureCard}>
        <View style={styles.captureHeader}>
          <View style={styles.captureHeading}><Label color={isRecording ? colors.red : colors.textMuted}>{isRecording ? 'ACTIVE SESSION' : 'CAPTURE MODE'}</Label><Text style={styles.captureMode}>{displayMode}</Text></View>
          <View style={styles.timer}><Text style={styles.timerValue}>{isRecording ? formattedElapsed : '00:00:00'}</Text><Text style={styles.timerLabel}>DURATION</Text></View>
        </View>
        <LinearGradient colors={['#173A60', '#0B203A']} style={styles.cameraViewfinder}>
          <View style={styles.viewfinderTop}><Text style={styles.viewfinderStatus}>{isRecording ? '●  RECORDING' : '●  CAMERA READY'}</Text><Text style={styles.viewfinderQuality}>{displayQuality}</Text></View>
          <View style={styles.viewfinderGrid}>
            <View style={styles.rearPreview}><View style={styles.focusFrame}><View style={styles.focusDot} /></View><Text style={styles.previewEyebrow}>{driveSelected ? 'DRIVE VIEW' : roomSelected ? 'ROOM VIEW' : 'MAIN LENS'}</Text><Text style={styles.previewTitle}>{driveSelected ? driveView === 'cabin' ? 'Cabin camera' : 'Road camera' : roomSelected ? roomPreferences.lens === 'front' ? 'Front camera' : 'Room camera' : 'Rear camera'}</Text></View>
            <View style={styles.frontPreview}><View style={styles.frontLens}><FuturisticIcon name="lens" size={27} color={colors.accent} accent={colors.purple} /></View><Text style={styles.previewEyebrow}>{driveSelected ? 'SECOND VIEW' : 'SELFIE LENS'}</Text><Text style={styles.frontPreviewTitle}>{driveSelected ? driveView === 'dual' ? 'Cabin active' : 'Optional lens' : 'Front camera'}</Text></View>
          </View>
          <View style={styles.viewfinderFooter}><Text style={styles.viewfinderFooterText}>{driveSelected ? driveView === 'dual' ? 'ROAD + CABIN' : 'DRIVE WORKSPACE' : 'FRONT + REAR WORKSPACE'}</Text><Text style={styles.localText}>LOCAL ONLY</Text></View>
        </LinearGradient>
        {!isRecording ? <View style={styles.cameraLaunchRow}>
          <Button label="REAR REC" icon="◉" compact variant={selectedMode === 'rear_video' ? 'primary' : 'secondary'} onPress={() => triggerQuickRecordFor('rear_video')} style={styles.cameraLaunchButton} />
          <Button label="FRONT REC" icon="◎" compact variant={selectedMode === 'front_video' ? 'primary' : 'secondary'} onPress={() => triggerQuickRecordFor('front_video')} style={styles.cameraLaunchButton} />
          <Button label="DUAL REC" icon="⇄" compact variant={selectedMode === 'double_surveillance' ? 'primary' : 'secondary'} disabled={!capabilities?.dualCameraSupported} onPress={() => triggerQuickRecordFor('double_surveillance')} style={styles.cameraLaunchButton} />
        </View> : <Text style={styles.recordHint}>Use the camera controls below to stop and save this session.</Text>}
      </Card>

      {isRecording ? <View style={styles.quickActions}><IconButton label="MARK" onPress={() => addMarker('important')} active /><IconButton label="NOTE" onPress={() => addMarker('statement')} /><IconButton label="EVENT" onPress={() => addMarker('incident')} /><IconButton label="LOCK" onPress={lockActiveSession} /></View> : null}

      {isCameraMode ? <CameraWorkspace key={`${selectedMode}:${selectedUseCaseModeId ?? 'classic'}`} mode={selectedMode} capabilities={capabilities} quickStartToken={quickCaptureRequest?.mode === selectedMode ? quickCaptureRequest.token : selectedUseCaseModeId && presetStartRequest?.id === selectedUseCaseModeId ? 1000000 + presetStartRequest.token : 0} onQuickStartConsumed={(token) => { if (token >= 1000000) setPresetStartRequest(null); }} /> : null}

      {!isRecording ? <>
        <Card style={styles.quickRecordCard}>
          <View style={styles.quickRecordHeader}><View style={styles.quickRecordIcon}><FuturisticIcon name={selectedQuickMode.icon} size={24} color={colors.accent} accent={colors.purple} /></View><View style={{ flex: 1 }}><Label color={colors.accent}>QUICK RECORD</Label><Text style={styles.quickRecordTitle}>{selectedQuickMode.label}</Text><Text style={styles.quickRecordDetail}>{selectedQuickMode.detail} · configured in Settings</Text></View></View>
          <Button label={`START ${selectedQuickMode.label.toUpperCase()}`} icon="●" onPress={triggerQuickRecord} style={styles.quickRecordButton} />
          <Text style={styles.quickLaunchLabel}>QUICK LAUNCH PALETTE</Text>
          <View style={styles.quickLaunchGrid}>
            <Button label="AUDIO MODES" icon="♫" variant="secondary" onPress={() => onOpenAudio()} style={styles.quickLaunchButton} />
            <Button label="REAR CAMERA" icon="◈" variant="secondary" onPress={() => triggerQuickRecordFor('rear_video')} style={styles.quickLaunchButton} />
            <Button label="FRONT CAMERA" icon="◎" variant="secondary" onPress={() => triggerQuickRecordFor('front_video')} style={styles.quickLaunchButton} />
            <Button label="DOUBLE CAMERA" icon="⇄" variant="secondary" onPress={() => triggerQuickRecordFor('double_surveillance')} style={styles.quickLaunchButton} />
            <Button label="DRIVE MODE" icon="🚘" variant="secondary" onPress={() => quickStartPreset('drive')} style={styles.quickLaunchButton} />
            <Button label="ROOM GUARD" icon="⌂" variant="secondary" onPress={() => quickStartPreset('room')} style={styles.quickLaunchButton} />
          </View>
        </Card>
        <CaptureModeSetsView onStart={startSelectedPreset} onOpenAudioGuard={() => onOpenAudio('audio_guard')} />
        <Card style={styles.instantCard}><View style={commonStyles.spread}><View><Label color={colors.blue}>INSTANT CAMERA</Label><Text style={styles.instantTitle}>Choose a lens and go.</Text><Text style={styles.instantDetail}>Blink-style access with visible system camera indicators.</Text></View><FuturisticIcon name="capture" size={28} color={colors.blue} accent={colors.accent} /></View><View style={styles.instantButtons}><Button label="REAR CAMERA" icon="◉" variant={selectedMode === 'rear_video' ? 'primary' : 'secondary'} onPress={() => setSelectedMode('rear_video')} style={styles.instantButton} /><Button label="FRONT CAMERA" icon="◎" variant={selectedMode === 'front_video' ? 'primary' : 'secondary'} onPress={() => setSelectedMode('front_video')} style={styles.instantButton} /></View><View style={styles.instantFooter}><Chip label="DUAL CAMERA" selected={selectedMode === 'dual_camera'} onPress={() => setSelectedMode('dual_camera')} color={colors.purple} /><Chip label="DOUBLE SURVEILLANCE" selected={selectedMode === 'double_surveillance'} onPress={() => setSelectedMode('double_surveillance')} color={colors.orange} /><Text style={styles.instantFooterText}>Two-lens security capture on supported iPhones</Text></View></Card>
        <SectionHeader title="Capture mode" action="Swipe to explore" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{modes.map((mode) => <Chip key={mode} label={modeLabels[mode]} selected={selectedMode === mode} onPress={() => setSelectedMode(mode)} color={mode === 'security' ? colors.orange : colors.accent} />)}</ScrollView>
        {(selectedMode === 'dual_camera' || selectedMode === 'double_surveillance') && capabilities && !capabilities.dualCameraSupported && <Card style={styles.warningCard}><FuturisticIcon name="dual" size={23} color={colors.orange} accent={colors.red} /><View style={{ flex: 1 }}><Text style={styles.warningTitle}>TWO-LENS CAPTURE NOT SUPPORTED ON THIS DEVICE</Text><Text style={styles.warningDetail}>SafeBro will never simulate simultaneous capture. Use a single-camera mode or an iPhone with native multicamera support.</Text></View></Card>}

        {!isCameraMode ? <Card style={styles.comingSoon}><Label color={colors.blue}>OPEN AUDIO</Label><Text style={styles.comingTitle}>{modeLabels[selectedMode]}</Text><Button label="OPEN AUDIO MODES" onPress={() => onOpenAudio()} /></Card> : null}

        {!selectedUseCase && (selectedMode === 'dashcam' || selectedMode === 'event_camera') ? <Card style={styles.eventNotice}><Label color={colors.orange}>{selectedMode === 'dashcam' ? 'DASHBOARD PROFILE' : 'EVENT PROFILE'}</Label><Text style={styles.eventNoticeTitle}>{selectedMode === 'dashcam' ? 'Rear camera dashboard view.' : 'Movement and sound settings are ready to configure.'}</Text><Text style={styles.eventNoticeDetail}>Keep SafeBro in the foreground for camera capture on standard iOS. Use the event controls to mark or lock moments; automatic event clipping needs the native motion recorder.</Text><View style={styles.policySummary}><Text style={styles.policySummaryText}>{capturePolicy.saveMode.replaceAll('_', ' ').toUpperCase()} · KEEP {capturePolicy.retentionDays} DAYS · PRE {capturePolicy.preRollSeconds}s / POST {capturePolicy.postRollSeconds}s</Text></View></Card> : null}

        <SectionHeader title="Power profile" />
        <View style={styles.powerRow}><Chip label="STANDARD" selected={powerMode === 'standard'} onPress={() => setPowerMode('standard')} /><Chip label="LOW POWER" selected={powerMode === 'low_power'} onPress={() => setPowerMode('low_power')} color={colors.orange} /><Chip label="LOW PROFILE" selected={powerMode === 'low_profile'} onPress={() => setPowerMode('low_profile')} color={colors.purple} /></View>
        <Card style={styles.statusCard}><View style={styles.statusHeader}><Text style={styles.statusTitle}>Device readiness</Text><Badge color={capabilities?.hasRearCamera ? colors.accent : colors.orange}>{capabilities?.hasRearCamera ? 'READY' : 'CHECK DEVICE'}</Badge></View><View style={styles.metricRow}><Metric label="MIC" value="READY" detail="permission gated" accent={colors.accent} /><Metric label="CAM A" value={capabilities?.hasRearCamera ? 'REAR' : '—'} detail="capability detected" accent={colors.blue} /><Metric label="CAM B" value={capabilities?.dualCameraSupported ? 'READY' : '—'} detail="not supported" accent={colors.textMuted} /><Metric label="POWER" value={powerMode === 'low_power' ? 'LOW' : 'NORMAL'} detail="capture profile" accent={powerMode === 'low_power' ? colors.orange : colors.text} /></View></Card>
      </> : <Card style={styles.liveCard}><Label color={colors.red}>LIVE CAPTURE</Label><Text style={styles.liveTitle}>Session {activeSession?.id.replace('SEC_', '').toUpperCase()}</Text><Text style={styles.liveDetail}>{activeSession?.markers.length ?? 0} markers · {activeSession?.segments.length ?? 0} segment · {activeSession?.powerMode.replace('_', ' ')}</Text><Text style={styles.liveDetail}>Stop from the camera controls to save the video file.</Text></Card>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  captureHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  captureHeading: { flex: 1, minWidth: 130 },
  captureCard: { alignItems: 'stretch', padding: spacing.panel, marginBottom: spacing.lg },
  quickRecordCard: { marginBottom: spacing.lg, backgroundColor: `${colors.accent}0D`, borderColor: `${colors.accent}55`, gap: 14 },
  quickRecordHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickRecordIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: `${colors.accent}66`, alignItems: 'center', justifyContent: 'center' },
  quickRecordTitle: { ...typography.title, color: colors.text, fontSize: 18, marginTop: 3 },
  quickRecordDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  quickRecordButton: { marginTop: 2 },
  quickLaunchLabel: { ...typography.label, color: colors.textMuted, marginTop: 2 },
  quickLaunchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLaunchButton: { flexBasis: '45%', flexGrow: 1, minHeight: 54, paddingHorizontal: 10 },
  instantCard: { marginBottom: spacing.xs, backgroundColor: colors.surfaceElevated, borderColor: `${colors.blue}44` },
  instantTitle: { ...typography.title, color: colors.text, marginTop: 6, fontSize: 18 },
  instantDetail: { ...typography.caption, color: colors.textMuted, marginTop: 5 },
  instantButtons: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  instantButton: { flex: 1, paddingHorizontal: 8 },
  instantFooter: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  instantFooterText: { ...typography.caption, color: colors.textSubtle, width: '100%' },
  captureMode: { ...typography.title, color: colors.text, marginTop: 6 },
  timer: { alignItems: 'flex-end' },
  timerValue: { color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerLabel: { ...typography.label, color: colors.textSubtle, marginTop: 3 },
  cameraViewfinder: { marginTop: spacing.lg, minHeight: 190, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: `${colors.accent}38`, overflow: 'hidden' },
  viewfinderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  viewfinderStatus: { ...typography.label, color: colors.accent, fontSize: 9 },
  viewfinderQuality: { ...typography.label, color: '#B7C9D8', fontSize: 9 },
  viewfinderGrid: { flexDirection: 'row', gap: 8, flex: 1 },
  rearPreview: { flex: 1.45, minHeight: 118, borderRadius: 14, borderWidth: 1, borderColor: `${colors.blue}55`, backgroundColor: `${colors.blue}0C`, padding: 11, justifyContent: 'flex-end', overflow: 'hidden' },
  frontPreview: { flex: 0.8, minHeight: 118, borderRadius: 14, borderWidth: 1, borderColor: `${colors.purple}55`, backgroundColor: `${colors.purple}0C`, padding: 10, justifyContent: 'flex-end', alignItems: 'center' },
  focusFrame: { position: 'absolute', width: 46, height: 46, borderWidth: 1, borderColor: `${colors.accent}99`, borderRadius: 9, top: 24, left: '50%', marginLeft: -23, alignItems: 'center', justifyContent: 'center' },
  focusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  frontLens: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: `${colors.purple}77`, backgroundColor: `${colors.purple}14`, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  previewEyebrow: { ...typography.label, color: '#9BBAD1', fontSize: 8, lineHeight: 11 },
  previewTitle: { ...typography.bodyMedium, color: '#F7FBFF', marginTop: 3 },
  frontPreviewTitle: { ...typography.caption, color: '#F7FBFF', marginTop: 3, textAlign: 'center' },
  viewfinderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  viewfinderFooterText: { ...typography.label, color: '#AFC5D7', fontSize: 8 },
  localText: { ...typography.label, color: colors.accent, fontSize: 8 },
  cameraLaunchRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cameraLaunchButton: { flex: 1, minHeight: 66, flexDirection: 'column', gap: 7, paddingHorizontal: 4 },
  recordHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  chips: { gap: 10, paddingBottom: spacing.xs },
  warningCard: { flexDirection: 'row', gap: 12, borderColor: `${colors.orange}55`, backgroundColor: `${colors.orange}0D`, marginBottom: spacing.lg },
  warningTitle: { ...typography.label, color: colors.orange, marginBottom: 5 },
  warningDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  comingSoon: { marginBottom: spacing.lg },
  comingTitle: { ...typography.title, color: colors.text, marginTop: 8 },
  comingDetail: { ...typography.body, color: colors.textMuted, marginTop: 8 },
  eventNotice: { marginTop: spacing.md, borderColor: `${colors.orange}44`, backgroundColor: `${colors.orange}0D`, gap: 6 },
  eventNoticeTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 3 },
  eventNoticeDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  policySummary: { marginTop: 6, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceMuted },
  policySummaryText: { ...typography.label, color: colors.orange, fontSize: 9 },
  powerRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg, flexWrap: 'wrap' },
  statusCard: { marginBottom: spacing.lg },
  statusHeader: { ...commonStyles.spread, flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  statusTitle: { ...typography.bodyMedium, color: colors.text },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  liveCard: { borderColor: `${colors.red}55`, backgroundColor: `${colors.red}0D`, gap: 10, marginTop: spacing.lg },
  liveTitle: { ...typography.title, color: colors.text },
  liveDetail: { ...typography.body, color: colors.textMuted, marginBottom: 8 },
});
