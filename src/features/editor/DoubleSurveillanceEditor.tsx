import { ResizeMode, Video as ExpoVideo } from 'expo-av';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DimensionValue, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, Chip, IconButton, Label } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { colors, commonStyles, radii, spacing, typography } from '../../theme';
import { CaptureSession } from '../../types/models';
import { createDualSurveillanceProject, splitSynchronizedProject, trimSynchronizedProject } from './dualSurveillance';
import { saveProject } from './projectRepository';
import { EditorProject, socialPresets, TimelineClip } from './types';
import { transcription } from '../../native/transcription';

interface Props {
  visible: boolean;
  session: CaptureSession;
  onClose: () => void;
}

const formatTime = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export function DoubleSurveillanceEditor({ visible, session, onClose }: Props) {
  const projectFormat = socialPresets.find((preset) => preset.id === 'youtube') ?? socialPresets[0];
  const [project, setProject] = useState<EditorProject>(() => createDualSurveillanceProject(session, projectFormat));
  const [playheadMs, setPlayheadMs] = useState(0);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(project.durationMs);
  const [syncLocked, setSyncLocked] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transcriptMessage, setTranscriptMessage] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState('');
  const rearVideo = useRef<ExpoVideo>(null);
  const frontVideo = useRef<ExpoVideo>(null);
  const segment = session.segments.find((item) => item.type === 'dual_camera');
  const rearUri = segment?.rearFilePath ?? segment?.filePath;
  const frontUri = segment?.frontFilePath;

  useEffect(() => {
    if (!visible) return;
    const fresh = createDualSurveillanceProject(session, projectFormat);
    setProject(fresh);
    setPlayheadMs(0);
    setTrimStartMs(0);
    setTrimEndMs(fresh.durationMs);
    setSaved(false);
    setTranscribing(false);
    setExporting(false);
    setTranscriptMessage(null);
    setOverlayText('');
  }, [projectFormat, session, visible]);

  useEffect(() => {
    if (!isPlaying || !rearUri || !frontUri) return;
    const interval = setInterval(async () => {
      const [rearStatus, frontStatus] = await Promise.all([rearVideo.current?.getStatusAsync(), frontVideo.current?.getStatusAsync()]);
      if (rearStatus?.isLoaded && frontStatus?.isLoaded) {
        const rearPosition = rearStatus.positionMillis;
        const frontPosition = frontStatus.positionMillis;
        setPlayheadMs(rearPosition);
        if (Math.abs(rearPosition - frontPosition) > 40) await frontVideo.current?.setPositionAsync(rearPosition);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [frontUri, isPlaying, rearUri]);

  const seekBoth = async (positionMs: number) => {
    const next = Math.max(0, Math.min(project.durationMs, positionMs));
    setPlayheadMs(next);
    await Promise.all([rearVideo.current?.setPositionAsync(next), frontVideo.current?.setPositionAsync(next)]);
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await Promise.all([rearVideo.current?.pauseAsync(), frontVideo.current?.pauseAsync()]);
      setIsPlaying(false);
      return;
    }
    await Promise.all([rearVideo.current?.setPositionAsync(playheadMs), frontVideo.current?.setPositionAsync(playheadMs)]);
    await Promise.all([rearVideo.current?.playAsync(), frontVideo.current?.playAsync()]);
    setIsPlaying(true);
  };

  const splitAtPlayhead = () => setProject((current) => splitSynchronizedProject(current, playheadMs));
  const trimToSelection = () => {
    const next = trimSynchronizedProject(project, trimStartMs, trimEndMs);
    setProject(next);
    setPlayheadMs(Math.max(0, Math.min(playheadMs - trimStartMs, next.durationMs)));
  };
  const save = async () => {
    await saveProject(project);
    setSaved(true);
  };

  const addTextOverlay = () => {
    const text = overlayText.trim();
    if (!text) return;
    const startMs = Math.min(playheadMs, Math.max(0, project.durationMs - 1));
    const endMs = Math.min(project.durationMs, startMs + 4_000);
    const clip: TimelineClip = { id: `TXT_${Date.now()}`, type: 'text', startMs, endMs, timelineStartMs: startMs, text, label: 'TEXT OVERLAY', volume: 1, opacity: 1, speed: 1 };
    setProject((current) => ({ ...current, tracks: { ...current.tracks, text: [...current.tracks.text, clip] }, operations: [...current.operations, { id: `TEXT_${Date.now()}`, type: 'text', createdAt: new Date().toISOString(), payload: { text, startMs, endMs } }] }));
    setOverlayText('');
  };

  const transcribeLocally = async () => {
    const source = rearUri ?? frontUri;
    if (!source) return;
    setTranscribing(true);
    setTranscriptMessage(null);
    try {
      const authorization = await transcription.requestAuthorizationAsync();
      if (authorization.speech !== 'granted') throw new Error('Allow Speech Recognition in iOS Settings, then try again.');
      const result = await transcription.transcribeVideo(source);
      const clips: TimelineClip[] = result.segments.filter((segment) => segment.text.trim()).map((segment, index) => ({ id: `CAP_${Date.now()}_${index}`, type: 'captions', sourceUri: source, startMs: segment.timestampMs, endMs: segment.timestampMs + Math.max(250, segment.durationMs), timelineStartMs: segment.timestampMs, text: segment.text, label: 'LOCAL CAPTION', volume: 1, opacity: 1, speed: 1 }));
      setProject((current) => ({ ...current, tracks: { ...current.tracks, captions: [...current.tracks.captions, ...clips] }, operations: [...current.operations, { id: `CAPTION_${Date.now()}`, type: 'caption', createdAt: new Date().toISOString(), payload: { source: 'on_device_speech', videoUri: source, segmentCount: clips.length } }] }));
      setTranscriptMessage(clips.length ? `${clips.length} local caption segments added.` : 'No speech was found in this video.');
    } catch (error) {
      setTranscriptMessage(error instanceof Error ? error.message : 'Local transcription could not start.');
    } finally {
      setTranscribing(false);
    }
  };

  const exportDerivedCopy = async () => {
    const sources = [rearUri, frontUri].filter((uri): uri is string => Boolean(uri));
    if (!sources.length) return;
    setExporting(true);
    try {
      const overlays = [...project.tracks.captions, ...project.tracks.text].filter((clip) => Boolean(clip.text)).map((clip) => ({ text: clip.text ?? '', startMs: clip.timelineStartMs, endMs: clip.timelineStartMs + (clip.endMs - clip.startMs) }));
      const outputs = await Promise.all(sources.map((source) => transcription.renderTextOverlay(source, overlays)));
      setProject((current) => ({ ...current, status: 'exported', derivedOutputs: [...current.derivedOutputs, ...outputs.map((output) => ({ uri: output.uri, createdAt: new Date().toISOString(), formatId: current.format.id }))] }));
      setTranscriptMessage(`${outputs.length} derived video${outputs.length === 1 ? '' : 's'} exported with text overlays.`);
    } catch (error) {
      setTranscriptMessage(error instanceof Error ? error.message : 'Video export could not start.');
    } finally {
      setExporting(false);
    }
  };

  const playheadPercent = `${Math.min(100, (playheadMs / Math.max(1, project.durationMs)) * 100)}%` as DimensionValue;
  const hasBothFiles = Boolean(rearUri && frontUri);
  const canTranscribe = Boolean(rearUri || frontUri);
  const activeCaption = project.tracks.captions.find((clip) => playheadMs >= clip.timelineStartMs && playheadMs < clip.timelineStartMs + (clip.endMs - clip.startMs));
  const activeText = project.tracks.text.find((clip) => playheadMs >= clip.timelineStartMs && playheadMs < clip.timelineStartMs + (clip.endMs - clip.startMs));
  const previewText = activeCaption?.text ?? activeText?.text;

  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.editor}><View style={commonStyles.spread}><View><Label color={colors.accent}>QUICK EDIT · SYNCED</Label><Text style={styles.title}>Double Surveillance Edit</Text></View><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><View style={styles.headerMeta}><Badge color={colors.accent}>NONDESTRUCTIVE</Badge><Text style={styles.source}>{session.id} · originals preserved</Text></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.previewGrid}><PreviewPane label="REAR CAMERA" uri={rearUri} videoRef={rearVideo} tint={colors.blue} overlayText={previewText} /><PreviewPane label="FRONT CAMERA" uri={frontUri} videoRef={frontVideo} tint={colors.purple} overlayText={previewText} /></View>
      {!hasBothFiles ? <View style={styles.nativeNotice}><Text style={styles.noticeTitle}>NATIVE DUAL FILES NOT AVAILABLE IN THIS SESSION</Text><Text style={styles.noticeDetail}>The synced editor is ready. Record a Double Surveillance session in the iOS development build to populate both source feeds.</Text></View> : null}
      <View style={styles.transport}><IconButton label="−10" onPress={() => { void seekBoth(playheadMs - 10000); }} /><Pressable onPress={() => { void togglePlayback(); }} style={styles.playButton}><FuturisticIcon name={isPlaying ? 'pause' : 'play'} size={20} color={colors.text} accent={colors.accent} /></Pressable><IconButton label="+10" onPress={() => { void seekBoth(playheadMs + 10000); }} /><View style={styles.time}><Text style={styles.timeValue}>{formatTime(playheadMs)}</Text><Text style={styles.timeDetail}>of {formatTime(project.durationMs)}</Text></View></View>
      <View style={styles.timelineCard}><View style={commonStyles.spread}><Text style={styles.timelineTitle}>SYNCED TIMELINE</Text><Chip label={syncLocked ? 'SYNC LOCKED' : 'UNLINKED'} selected={syncLocked} onPress={() => setSyncLocked(!syncLocked)} color={syncLocked ? colors.accent : colors.orange} /></View><View style={styles.ruler}><Text>00:00</Text><Text>{formatTime(project.durationMs / 2)}</Text><Text>{formatTime(project.durationMs)}</Text></View><Track label="REAR" color={colors.blue} clips={project.tracks.video} durationMs={project.durationMs} /><Track label="FRONT" color={colors.purple} clips={project.tracks.video_overlay} durationMs={project.durationMs} /><Track label="TEXT" color={colors.orange} clips={project.tracks.text} durationMs={project.durationMs} /><Track label="CAPT" color={colors.accent} clips={project.tracks.captions} durationMs={project.durationMs} /><Pressable onPress={(event) => { const width = 320; const x = event.nativeEvent.locationX; void seekBoth((x / width) * project.durationMs); }} style={styles.timelineTap}><View style={[styles.playhead, { left: playheadPercent }]} /></Pressable></View>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text><View style={styles.actionRow}><Button label="SPLIT BOTH" icon="✂" onPress={splitAtPlayhead} style={styles.actionButton} /><Button label="TRIM TO RANGE" icon="⌁" onPress={trimToSelection} variant="secondary" style={styles.actionButton} /></View><View style={styles.actionRow}><Button label={transcribing ? 'TRANSCRIBING' : 'TRANSCRIBE LOCALLY'} icon="T" variant="secondary" disabled={transcribing || !canTranscribe} onPress={() => { void transcribeLocally(); }} style={styles.actionButton} /><Button label="BLUR AREA" icon="◌" variant="secondary" onPress={() => setProject((current) => ({ ...current, operations: [...current.operations, { id: `BLUR_${Date.now()}`, type: 'blur', createdAt: new Date().toISOString(), payload: { requiresUserPlacement: true } }] }))} style={styles.actionButton} /></View>
      <View style={styles.textEditor}><Text style={styles.sectionLabel}>TEXT OVERLAY</Text><View style={styles.textInputRow}><TextInput value={overlayText} onChangeText={setOverlayText} placeholder="Add text to the video" placeholderTextColor={colors.textSubtle} style={styles.textInput} /><Button label="ADD" icon="＋" disabled={!overlayText.trim()} onPress={addTextOverlay} style={styles.addTextButton} /></View><Text style={styles.textHint}>Text is placed at the current playhead for four seconds and stays editable.</Text>{transcriptMessage ? <Text style={styles.transcriptMessage}>{transcriptMessage}</Text> : null}</View>
      <Text style={styles.sectionLabel}>TRIM RANGE · LINKED TO BOTH CAMERAS</Text><View style={styles.rangeRow}><Chip label={`IN ${formatTime(trimStartMs)}`} onPress={() => setTrimStartMs(Math.max(0, playheadMs - 5000))} color={colors.blue} /><Chip label={`OUT ${formatTime(trimEndMs)}`} onPress={() => setTrimEndMs(Math.min(project.durationMs, playheadMs + 5000))} color={colors.purple} /><Text style={styles.rangeHint}>Tap IN or OUT at the playhead</Text></View>
      <View style={styles.footer}><Button label={saved ? 'SAVED' : 'SAVE DRAFT'} icon={saved ? '✓' : '□'} onPress={() => { void save(); }} /><Button label={exporting ? 'EXPORTING' : 'EXPORT DERIVED COPY'} disabled={exporting || !canTranscribe} variant="secondary" onPress={() => { void exportDerivedCopy(); }} /></View>
    </ScrollView>
  </View></View></Modal>;
}

function PreviewPane({ label, uri, videoRef, tint, overlayText }: { label: string; uri?: string; videoRef: React.RefObject<ExpoVideo>; tint: string; overlayText?: string }) {
  return <View style={[styles.previewPane, { borderColor: `${tint}66` }]}>{uri ? <ExpoVideo ref={videoRef} source={{ uri }} style={styles.video} resizeMode={ResizeMode.COVER} shouldPlay={false} isLooping={false} /> : <><FuturisticIcon name="signal" size={30} color={tint} accent={colors.accent} /><Text style={styles.previewLabel}>{label}</Text><Text style={styles.previewMissing}>WAITING FOR SOURCE</Text></>}{overlayText ? <View style={styles.captionOverlay}><Text style={styles.captionOverlayText}>{overlayText}</Text></View> : null}<View style={styles.previewBadge}><Text style={[styles.previewBadgeText, { color: tint }]}>{label}</Text></View></View>;
}

function Track({ label, color, clips, durationMs }: { label: string; color: string; clips: EditorProject['tracks']['video']; durationMs: number }) {
  return <View style={styles.trackRow}><Text style={[styles.trackLabel, { color }]}>{label}</Text><View style={styles.track}><View style={[styles.trackLine, { backgroundColor: `${color}22` }]} />{clips.map((clip) => { const left = `${(clip.timelineStartMs / durationMs) * 100}%` as DimensionValue; const width = `${Math.max(2, ((clip.endMs - clip.startMs) / durationMs) * 100)}%` as DimensionValue; return <View key={clip.id} style={[styles.clip, { left, width, backgroundColor: `${color}66`, borderColor: `${color}AA` }]}><Text style={styles.clipText}>{clip.label}</Text></View>; })}</View></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000BB', justifyContent: 'flex-end' },
  editor: { maxHeight: '94%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingBottom: 30 },
  title: { ...typography.title, color: colors.text, marginTop: 6 },
  close: { color: colors.textMuted, fontSize: 30 },
  headerMeta: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  source: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  previewGrid: { flexDirection: 'row', gap: 8 },
  previewPane: { flex: 1, height: 150, borderRadius: 15, backgroundColor: colors.surfaceMuted, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  video: { ...StyleSheet.absoluteFillObject },
  previewIcon: { fontSize: 32, marginBottom: 8 },
  previewLabel: { ...typography.label, color: colors.text },
  previewMissing: { ...typography.caption, color: colors.textSubtle, marginTop: 5 },
  captionOverlay: { position: 'absolute', left: 8, right: 8, bottom: 14, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#000000CC' },
  captionOverlayText: { ...typography.caption, color: colors.white, textAlign: 'center', fontWeight: '700' },
  previewBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: '#080B14CC' },
  previewBadgeText: { ...typography.label, fontSize: 8 },
  nativeNotice: { marginTop: 10, padding: 11, borderRadius: 12, backgroundColor: `${colors.orange}0D`, borderWidth: 1, borderColor: `${colors.orange}44` },
  noticeTitle: { ...typography.label, color: colors.orange, fontSize: 9 },
  noticeDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
  transport: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: spacing.md },
  playButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: colors.background, fontSize: 20, fontWeight: '800' },
  time: { marginLeft: 'auto', alignItems: 'flex-end' },
  timeValue: { ...typography.bodyMedium, color: colors.text },
  timeDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  timelineCard: { padding: 13, backgroundColor: colors.surfaceMuted, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  timelineTitle: { ...typography.label, color: colors.textMuted },
  ruler: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginLeft: 42, marginBottom: 5 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  trackLabel: { ...typography.label, width: 34, fontSize: 9 },
  track: { flex: 1, height: 32, borderRadius: 7, overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  trackLine: { position: 'absolute', left: 0, right: 0, height: 5, borderRadius: 5 },
  clip: { position: 'absolute', top: 2, bottom: 2, borderRadius: 6, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 7 },
  clipText: { ...typography.label, color: colors.text, fontSize: 8 },
  timelineTap: { position: 'absolute', top: 38, bottom: 0, left: 43, right: 0 },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.accent },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionButton: { flex: 1, minHeight: 45, paddingHorizontal: 6 },
  textEditor: { marginTop: spacing.sm },
  textInputRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  textInput: { flex: 1, minHeight: 45, color: colors.text, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, ...typography.body },
  addTextButton: { minHeight: 45, paddingHorizontal: 12, minWidth: 72 },
  textHint: { ...typography.caption, color: colors.textSubtle, marginTop: 7 },
  transcriptMessage: { ...typography.caption, color: colors.accent, marginTop: 7 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  rangeHint: { ...typography.caption, color: colors.textSubtle, flex: 1, minWidth: 120 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
});
