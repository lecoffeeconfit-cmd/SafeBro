import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

import { Badge, Button, Card, Chip, Label, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { SignalBeacon, SignalSweep, SignalWave } from '../components/Motion';
import { useApp } from '../context/AppContext';
import { audioPresets, getAudioPreset } from '../features/capture/audioPresets';
import { isAudioQuickCaptureMode, quickCaptureModes } from '../features/quickCapture/config';
import { CaptureMode } from '../types/models';
import { colors, commonStyles, radii, spacing, typography } from '../theme';
import { conversationTemplates, getConversationTemplate } from '../features/audio/conversationTemplates';

export type AudioPageMode = 'audio' | 'low_power_audio' | 'conversation_audio' | 'audio_guard';

const audioModes: { id: AudioPageMode; title: string; icon: string; detail: string }[] = [
  { id: 'audio', title: 'Microphone', icon: '◉', detail: 'Record a full local audio session.' },
  { id: 'low_power_audio', title: 'Low power', icon: '◌', detail: 'Battery-conscious audio recording.' },
  { id: 'conversation_audio', title: 'Conversation', icon: '◒', detail: 'Record speech-focused audio.' },
  { id: 'audio_guard', title: 'Audio Guard', icon: '⌁', detail: 'Sound-monitoring preset with manual markers.' },
];

const isAudioSession = (mode: CaptureMode) => mode === 'audio' || mode === 'low_power_audio' || mode === 'conversation_audio';

export function AudioScreen({ mode, onModeChange, onOpenCapture }: { mode: AudioPageMode; onModeChange: (mode: AudioPageMode) => void; onOpenCapture: () => void }) {
  const { activeSession, audioQuality, setAudioQuality, audioCapturePolicy, setAudioCapturePolicy, conversationTemplateId, setConversationTemplateId, intelligenceMode, setIntelligenceMode, audioEnhancements, setAudioEnhancements, recordingConsentConfirmed, setRecordingConsentConfirmed, audibleConsentAnnouncement, setAudibleConsentAnnouncement, quickCaptureRequest, clearQuickCaptureRequest, isReady, startCapture, stopCapture, pauseCapture, resumeCapture, addMarker, addSessionNote, addSessionAttachment, lockActiveSession, voiceCommands, setVoiceCommand, voiceTriggerArmed, voiceTriggerStatus, voiceTriggerError, armVoiceTrigger, disarmVoiceTrigger } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [plusMessage, setPlusMessage] = useState<string | null>(null);
  const selected = audioModes.find((item) => item.id === mode) ?? audioModes[0];
  const preset = useMemo(() => getAudioPreset(audioQuality), [audioQuality]);
  const activeAudio = Boolean(activeSession && isAudioSession(activeSession.mode));
  const paused = activeAudio && activeSession?.status === 'paused';
  const otherCaptureActive = Boolean(activeSession && !activeAudio);
  const activeTitle = activeSession?.useCaseModeId === 'audio_guard' ? 'Audio Guard' : audioModes.find((item) => item.id === activeSession?.mode)?.title ?? 'Audio';

  useEffect(() => {
    if (!activeSession || !activeAudio) { setElapsedMs(0); return; }
    const tick = () => {
      const end = activeSession.status === 'paused' && activeSession.pausedAt ? new Date(activeSession.pausedAt).getTime() : Date.now();
      setElapsedMs(Math.max(0, end - new Date(activeSession.startedAt).getTime() - (activeSession.pausedDurationMs ?? 0)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.id, activeAudio]);

  const beginAudio = async (nextMode: AudioPageMode) => {
    if (activeSession || busy) return;
    if (!recordingConsentConfirmed) { setError('Confirm that everyone who needs to consent has agreed before recording.'); return; }
    setBusy(true);
    setError(null);
    try {
      if (audibleConsentAnnouncement) {
        Speech.speak('This conversation is being recorded.', { rate: 0.95, pitch: 1 });
      }
      await startCapture(nextMode === 'audio_guard' ? 'conversation_audio' : nextMode, undefined, nextMode === 'audio_guard' ? 'audio_guard' : undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio recording could not start.');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = () => {
    if (!noteText.trim()) return;
    addSessionNote(noteText);
    setNoteText('');
  };

  const markImportant = () => {
    addMarker('important', 'Preserve the previous 30 seconds');
    addSessionNote('Important moment · review the previous 30 seconds', 'important');
  };

  const attachPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    addSessionAttachment({ type: 'image', uri: asset.uri, name: asset.fileName ?? `Photo ${new Date().toLocaleTimeString()}`, mimeType: asset.mimeType });
  };

  const endAudio = async () => {
    if (!activeAudio || busy) return;
    setBusy(true);
    setError(null);
    try { await stopCapture(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Audio recording could not be saved.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!isReady || !quickCaptureRequest || !isAudioQuickCaptureMode(quickCaptureRequest.mode) || activeSession || busy) return;
    const requested = quickCaptureRequest.mode;
    onModeChange(requested);
    clearQuickCaptureRequest(quickCaptureRequest.token);
    void beginAudio(requested);
  }, [isReady, quickCaptureRequest?.token, activeSession?.id, busy]);

  const formattedElapsed = [Math.floor(elapsedMs / 3600000), Math.floor((elapsedMs % 3600000) / 60000), Math.floor((elapsedMs % 60000) / 1000)].map((part) => String(part).padStart(2, '0')).join(':');
  const estimatedMegabytes = (((preset?.bitrate ?? 48000) * elapsedMs) / 8 / 1024 / 1024).toFixed(1);
  const selectedTemplate = getConversationTemplate(conversationTemplateId);

  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="SAFEBRO" title={activeAudio ? 'Listening locally.' : 'Audio & voice'} detail="Microphone recording, sound options, and voice shortcuts in one place." action={<Badge color={activeAudio ? colors.red : colors.accent}>{activeAudio ? 'LIVE' : 'LOCAL'}</Badge>} />

    {otherCaptureActive ? <Card style={styles.otherSession}><Label color={colors.orange}>CAMERA SESSION ACTIVE</Label><Text style={styles.cardTitle}>Keep recording in Capture</Text><Text style={styles.detail}>Finish the camera session before starting audio. Switching tabs does not stop your recording.</Text><Button label="OPEN CAPTURE" variant="secondary" onPress={onOpenCapture} /></Card> : <>
      <Card style={styles.recordCard}>
        <View style={styles.recordHeader}><View style={styles.recordHeading}><View style={styles.statusLine}><SignalBeacon active={activeAudio && !paused} color={activeAudio ? paused ? colors.orange : colors.red : colors.accent} /><Label color={activeAudio ? paused ? colors.orange : colors.red : colors.accent}>{activeAudio ? paused ? 'PAUSED' : 'RECORDING' : 'READY TO RECORD'}</Label></View><Text style={styles.recordTitle}>{activeAudio ? activeTitle : selectedTemplate.label}</Text></View><View style={styles.timerBlock}><Text style={styles.timer}>{activeAudio ? formattedElapsed : '00:00:00'}</Text><Text style={styles.timerCaption}>{activeAudio ? 'ELAPSED' : 'READY'}</Text></View></View>
        <View style={styles.signalArea}><SignalSweep active={activeAudio && !paused} color={activeAudio ? paused ? colors.orange : colors.red : colors.accent} /><SignalWave active={activeAudio && !paused} lowPower={activeSession?.mode === 'low_power_audio'} spectrum color={activeAudio ? paused ? colors.orange : colors.red : colors.accent} style={styles.signalWave} /></View>
        <View style={styles.recordStats}><Text style={styles.detail}>{activeAudio ? `${activeSession?.notes?.length ?? 0} notes · ${activeSession?.attachments?.length ?? 0} attachments` : selected.detail}</Text><Text style={styles.storageEstimate}>{activeAudio ? `≈ ${estimatedMegabytes} MB` : 'DEVICE ONLY'}</Text></View>
        {activeAudio ? <View style={styles.activeControls}><Button label={paused ? 'RESUME' : 'PAUSE'} icon={paused ? '▶' : 'Ⅱ'} variant="secondary" onPress={() => { void (paused ? resumeCapture() : pauseCapture()); }} style={styles.activeControl} /><Button label="STOP & SAVE" icon="■" variant="danger" disabled={busy} onPress={() => { void endAudio(); }} style={styles.activeControl} /></View> : <Button label={`START ${selectedTemplate.label.toUpperCase()}`} icon="●" variant="primary" disabled={busy} onPress={() => { void beginAudio(mode); }} style={styles.startButton} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>
      {activeAudio ? <>
        <Card style={styles.liveTools}>
          <View style={commonStyles.spread}><View><Label color={colors.accent}>LIVE NOTES</Label><Text style={styles.cardTitle}>Capture context as it happens</Text></View><Badge>{activeSession?.conversationTemplateId?.replaceAll('_', ' ').toUpperCase() ?? 'GENERAL'}</Badge></View>
          <View style={styles.noteRow}><TextInput value={noteText} onChangeText={setNoteText} onSubmitEditing={saveNote} placeholder="Type a note or chapter title…" placeholderTextColor={colors.textSubtle} style={styles.noteInput} /><Button label="SAVE" compact disabled={!noteText.trim()} onPress={saveNote} /></View>
          <View style={styles.liveActionGrid}><Button label="IMPORTANT · 30S" icon="★" compact variant="secondary" onPress={markImportant} style={styles.liveAction} /><Button label="ADD PHOTO" icon="▧" compact variant="secondary" onPress={() => { void attachPhoto(); }} style={styles.liveAction} /><Button label="BOOKMARK" icon="◆" compact variant="secondary" onPress={() => addMarker('custom')} style={styles.liveAction} /><Button label="LOCK" icon="⌑" compact variant="secondary" onPress={lockActiveSession} style={styles.liveAction} /></View>
          <Text style={styles.footnote}>Audio continues with the screen locked or app minimized where iOS background-audio rules allow. Notes and attachments stay local.</Text>
        </Card>
      </> : <>
        <SectionHeader title="Conversation type" action="SMART PRESETS" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>{conversationTemplates.map((template) => <Pressable key={template.id} onPress={() => setConversationTemplateId(template.id)} style={({ pressed }) => [styles.templateCard, conversationTemplateId === template.id && styles.templateCardSelected, pressed && styles.optionPressed]}><FuturisticIcon name={template.icon} size={38} framed color={colors.accent} accent={conversationTemplateId === template.id ? colors.yellow : colors.aqua} /><Text style={[styles.templateTitle, conversationTemplateId === template.id && { color: colors.accent }]}>{template.label}</Text><Text style={styles.templateDetail}>{template.detail}</Text></Pressable>)}</ScrollView>
        <Card style={styles.templateSummary}><View style={commonStyles.spread}><View style={{ flex: 1 }}><Label color={colors.accent}>{selectedTemplate.label.toUpperCase()}</Label><Text style={styles.cardTitle}>{selectedTemplate.detail}</Text></View><Badge color={colors.accent}>LOCAL READY</Badge></View><Text style={styles.featureLine}>Included: {selectedTemplate.localOutputs.join(' · ')}</Text><Text style={styles.plusLine}>Plus later: {selectedTemplate.plusOutputs.join(' · ')}</Text>{selectedTemplate.privacyNote ? <Text style={styles.privacyNote}>{selectedTemplate.privacyNote}</Text> : null}</Card>
        <SectionHeader title="Recording consent" action={recordingConsentConfirmed ? 'CONFIRMED' : 'REQUIRED'} />
        <Card style={[styles.consentCard, recordingConsentConfirmed && styles.consentCardConfirmed]}><Text style={styles.cardTitle}>Make sure everyone has agreed</Text><Text style={styles.detail}>Recording laws vary by place and context. SafeBro is designed for visible, consented recording.</Text><View style={styles.chips}><Chip label="CONSENT CONFIRMED" selected={recordingConsentConfirmed} onPress={() => setRecordingConsentConfirmed(!recordingConsentConfirmed)} color={colors.accent} /><Chip label="AUDIBLE ANNOUNCEMENT" selected={audibleConsentAnnouncement} onPress={() => setAudibleConsentAnnouncement(!audibleConsentAnnouncement)} color={colors.orange} /></View></Card>
        <SectionHeader title="Recording modes" action="AUDIO ONLY" />
        <View style={styles.modeGrid}>{audioModes.map((item) => <Pressable key={item.id} onPress={() => onModeChange(item.id)} accessibilityRole="button" accessibilityState={{ selected: mode === item.id }} style={({ pressed }) => [styles.modeCard, mode === item.id && styles.modeCardSelected, pressed && styles.optionPressed]}><FuturisticIcon name={item.icon} size={40} framed color={mode === item.id ? colors.accent : colors.text} accent={mode === item.id ? colors.yellow : colors.aqua} /><Text style={styles.modeTitle}>{item.title}</Text><Text style={styles.modeDetail}>{item.detail}</Text></Pressable>)}</View>
        {mode === 'conversation_audio' || mode === 'audio_guard' ? <Card style={styles.notice}><Label color={colors.orange}>{mode === 'audio_guard' ? 'AUDIO GUARD' : 'CONVERSATION MODE'}</Label><Text style={styles.detail}>Recording works now. Automatic speech or selected-sound detection, pre-event buffering, and clip-only saving still require the native audio event pipeline. Use Mark Moment to bookmark an event today.</Text></Card> : null}
        <SectionHeader title="Audio quality" />
        <Card><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qualityRow}>{audioPresets.map((item) => <Pressable key={item.id} onPress={() => setAudioQuality(item.id)} style={[styles.qualityOption, audioQuality === item.id && styles.qualitySelected]}><Text style={[styles.qualityTitle, audioQuality === item.id && { color: colors.accent }]}>{item.label}</Text><Text style={styles.qualityDetail}>{item.detail}</Text></Pressable>)}</ScrollView><Text style={styles.spec}>{preset?.sampleRate / 1000} kHz · {preset?.channels === 1 ? 'Mono' : 'Stereo'} · {Math.round((preset?.bitrate ?? 0) / 1000)} kbps</Text></Card>
        <SectionHeader title="Audio processing" action="SAVED PER SESSION" />
        <Card style={styles.optionsCard}><Text style={styles.cardTitle}>Speech profile</Text><Text style={styles.detail}>These preferences are saved with each recording. Quality and gain are applied now; advanced cleanup uses the native audio processor when installed.</Text><View style={styles.chips}><Chip label="NOISE REDUCTION" selected={audioEnhancements.noiseSuppression} onPress={() => setAudioEnhancements({ noiseSuppression: !audioEnhancements.noiseSuppression })} /><Chip label="VOICE ENHANCE" selected={audioEnhancements.voiceEnhancement} onPress={() => setAudioEnhancements({ voiceEnhancement: !audioEnhancements.voiceEnhancement })} color={colors.blue} /><Chip label="AUTO GAIN" selected={audioEnhancements.automaticGain} onPress={() => setAudioEnhancements({ automaticGain: !audioEnhancements.automaticGain })} color={colors.purple} /><Chip label="ECHO REDUCTION" selected={audioEnhancements.echoReduction} onPress={() => setAudioEnhancements({ echoReduction: !audioEnhancements.echoReduction })} color={colors.orange} /><Chip label="SKIP SILENCE" selected={audioEnhancements.skipSilence} onPress={() => setAudioEnhancements({ skipSilence: !audioEnhancements.skipSilence })} color={colors.orange} /></View></Card>
        <SectionHeader title="Sound options" />
        <Card style={styles.optionsCard}><Text style={styles.cardTitle}>Keep the audio you need</Text><Text style={styles.detail}>Audio defaults are separate from camera defaults and saved with each session. Sound-triggered clipping and event buffers are not active in this build.</Text><Label color={colors.textMuted}>SAVE MODE · EVENT CLIPS PLANNED</Label><View style={styles.chips}><Chip label="FULL RECORD" selected={audioCapturePolicy.saveMode === 'full_record'} onPress={() => setAudioCapturePolicy({ saveMode: 'full_record' })} /><Chip label="SOUND CLIPS" selected={audioCapturePolicy.saveMode === 'sound_only'} onPress={() => setAudioCapturePolicy({ saveMode: 'sound_only' })} color={colors.blue} /><Chip label="CONVERSATION" selected={audioCapturePolicy.saveMode === 'conversation_only'} onPress={() => setAudioCapturePolicy({ saveMode: 'conversation_only' })} color={colors.purple} /></View><Label color={colors.textMuted}>AUTO DELETE UNPROTECTED AUDIO</Label><View style={styles.chips}><Chip label="OFF" selected={!audioCapturePolicy.autoDelete} onPress={() => setAudioCapturePolicy({ autoDelete: false })} /><Chip label="ON" selected={audioCapturePolicy.autoDelete} onPress={() => setAudioCapturePolicy({ autoDelete: true })} color={colors.orange} /></View><Label color={colors.textMuted}>RETENTION</Label><View style={styles.chips}>{([3, 5, 7] as const).map((days) => <Chip key={days} label={`${days} DAYS`} selected={audioCapturePolicy.retentionDays === days} onPress={() => setAudioCapturePolicy({ retentionDays: days })} />)}</View><Label color={colors.textMuted}>SOUND SENSITIVITY · FUTURE TRIGGERS</Label><View style={styles.chips}>{(['low', 'medium', 'high'] as const).map((level) => <Chip key={level} label={level.toUpperCase()} selected={audioCapturePolicy.soundSensitivity === level} onPress={() => setAudioCapturePolicy({ soundSensitivity: level })} />)}</View></Card>
      </>}
    </>}

    {!activeAudio ? <><SectionHeader title="Intelligence" action="AI OPTIONAL" /><Card style={styles.intelligenceCard}><View style={styles.intelligenceHeader}><View style={styles.intelligenceIcon}><FuturisticIcon name="spark" size={23} color={colors.purple} accent={colors.accent} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Works completely without AI</Text><Text style={styles.detail}>Recording, notes, markers, imports, search and exports remain available with intelligence off.</Text></View></View><View style={styles.chips}><Chip label="AI OFF" selected={intelligenceMode === 'off'} onPress={() => setIntelligenceMode('off')} /><Chip label="LOCAL TOOLS" selected={intelligenceMode === 'local'} onPress={() => setIntelligenceMode('local')} color={colors.accent} /><Chip label="PLUS · LATER" selected={false} onPress={() => setPlusMessage('Plus will unlock generative summaries, Ask SafeBro, speaker memory, translation, automatic chapters and advanced templates. Core recording stays free.')} color={colors.purple} /></View>{plusMessage ? <Text style={styles.plusMessage}>{plusMessage}</Text> : null}<View style={styles.tierGrid}><View style={styles.tier}><Label color={colors.accent}>FREE / LOCAL</Label><Text style={styles.tierText}>Audio · notes · imports · bookmarks · local transcript when available · exports · search</Text></View><View style={styles.tier}><Label color={colors.purple}>PLUS LATER</Label><Text style={styles.tierText}>AI summaries · Q&A · speaker memory · translation · auto chapters · generated documents</Text></View></View></Card></> : null}

    <SectionHeader title="Voice trigger" action="FOREGROUND ONLY" />
    <Card style={styles.optionsCard}><View style={commonStyles.spread}><Text style={styles.cardTitle}>Start with a phrase</Text><Badge color={voiceTriggerStatus === 'listening' ? colors.accent : voiceTriggerStatus === 'error' ? colors.red : colors.textMuted}>{voiceTriggerStatus === 'listening' ? 'ARMED' : voiceTriggerStatus === 'unavailable' ? 'BUILD' : voiceTriggerStatus.toUpperCase()}</Badge></View><Text style={styles.detail}>When armed, on-device listening starts the matching audio or camera mode once, then stops. It pauses when SafeBro leaves the foreground.</Text><Button label={voiceTriggerArmed ? 'DISARM VOICE TRIGGER' : 'ARM VOICE TRIGGER'} icon={voiceTriggerArmed ? '■' : '✦'} variant={voiceTriggerArmed ? 'danger' : 'primary'} disabled={!voiceTriggerArmed && voiceTriggerStatus === 'unavailable'} onPress={() => { void (voiceTriggerArmed ? disarmVoiceTrigger() : armVoiceTrigger()); }} />{voiceTriggerError ? <Text style={styles.error}>{voiceTriggerError}</Text> : <Text style={styles.footnote}>Requires Microphone and Speech Recognition permission in an iOS development build.</Text>}</Card>

    <SectionHeader title="Voice commands" action="SIRI / SHORTCUTS" />
    <Card style={styles.optionsCard}><Text style={styles.cardTitle}>Choose your phrases</Text><Text style={styles.detail}>Each phrase can also name an iOS Shortcut that opens its mode’s SafeBro link. Siri handles the wake phrase; SafeBro cannot listen while other apps are in front.</Text>{quickCaptureModes.map((item) => <View key={item.id} style={styles.voiceRow}><View style={styles.voiceModeRow}><FuturisticIcon name={item.icon} size={18} color={colors.accent} accent={colors.purple} /><Text style={styles.voiceMode}>{item.label}</Text></View><TextInput value={voiceCommands[item.id]} onChangeText={(phrase) => setVoiceCommand(item.id, phrase)} placeholder="Shortcut phrase" placeholderTextColor={colors.textSubtle} autoCapitalize="sentences" style={styles.voiceInput} /><Text selectable style={styles.deepLink}>{`sentinel://quick-capture?mode=${item.id}`}</Text></View>)}</Card>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  recordCard: { gap: 15, borderColor: `${colors.accent}66`, backgroundColor: `${colors.accent}0D`, marginBottom: spacing.xs, overflow: 'hidden', shadowColor: colors.accent, shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
  recordHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  recordHeading: { flex: 1, minWidth: 140 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerBlock: { alignItems: 'flex-end', paddingTop: 2 },
  recordTitle: { ...typography.title, color: colors.text, marginTop: 6 },
  timer: { color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerCaption: { ...typography.label, color: colors.textSubtle, marginTop: 3 },
  signalArea: { height: 58, justifyContent: 'center', position: 'relative', borderTopWidth: 1, borderBottomWidth: 1, borderColor: `${colors.accent}18`, marginHorizontal: -4 },
  signalWave: { marginHorizontal: 4 },
  detail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, flexShrink: 1 },
  error: { ...typography.caption, color: colors.red, lineHeight: 18 },
  otherSession: { gap: 13, marginBottom: spacing.xs },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  recordStats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  storageEstimate: { ...typography.label, color: colors.accent },
  activeControls: { flexDirection: 'row', gap: 8 },
  startButton: { minHeight: 58, borderRadius: radii.lg, shadowColor: colors.accent, shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 9 } },
  activeControl: { flex: 1, paddingHorizontal: 8 },
  liveTools: { gap: 13, marginBottom: spacing.xs, borderColor: `${colors.accent}55` },
  noteRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  noteInput: { flex: 1, minHeight: 44, color: colors.text, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, ...typography.body },
  liveActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liveAction: { flexBasis: '45%', flexGrow: 1 },
  templateRow: { gap: 12, paddingBottom: spacing.md },
  templateCard: { width: 166, minHeight: 166, padding: 16, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  templateCardSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  templateTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 12 },
  templateDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 16, marginTop: 4 },
  templateSummary: { gap: 10, marginBottom: spacing.xs },
  featureLine: { ...typography.caption, color: colors.accent, lineHeight: 18 },
  plusLine: { ...typography.caption, color: colors.purple, lineHeight: 18 },
  privacyNote: { ...typography.caption, color: colors.orange, lineHeight: 18 },
  consentCard: { gap: 11, marginBottom: spacing.xs, borderColor: `${colors.orange}55` },
  consentCardConfirmed: { borderColor: `${colors.accent}66`, backgroundColor: `${colors.accent}0A` },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.xs },
  modeCard: { flexBasis: '45%', flexGrow: 1, minWidth: 0, minHeight: 166, padding: 16, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  modeCardSelected: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  modeTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 12 },
  modeDetail: { ...typography.caption, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  notice: { gap: 8, marginBottom: spacing.xs, borderColor: `${colors.orange}55`, backgroundColor: `${colors.orange}0D` },
  qualityRow: { gap: 8 },
  qualityOption: { width: 145, minHeight: 75, padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  qualitySelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  qualityTitle: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  qualityDetail: { ...typography.caption, color: colors.textSubtle, marginTop: 8 },
  spec: { ...typography.caption, color: colors.textMuted, marginTop: 13 },
  optionsCard: { gap: 16, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  footnote: { ...typography.caption, color: colors.textSubtle, lineHeight: 18 },
  voiceRow: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  voiceModeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceMode: { ...typography.bodyMedium, color: colors.text },
  voiceInput: { minHeight: 44, color: colors.text, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, ...typography.body },
  deepLink: { ...typography.caption, color: colors.accent },
  intelligenceCard: { gap: 13, marginBottom: spacing.xs },
  intelligenceHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  intelligenceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.purple}18` },
  plusMessage: { ...typography.caption, color: colors.purple, lineHeight: 18, padding: 10, backgroundColor: `${colors.purple}10`, borderRadius: 10 },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tier: { flexGrow: 1, flexBasis: '45%', minWidth: 120, padding: 14, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  tierText: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 7 },
  optionPressed: { opacity: 0.8, transform: [{ scale: 0.97 }, { rotate: '-0.5deg' }] },
});
