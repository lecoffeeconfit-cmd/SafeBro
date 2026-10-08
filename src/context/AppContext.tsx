import * as Haptics from 'expo-haptics';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getDeviceCapabilities } from '../services/device/DeviceCapabilities';
import { getJson, setJson } from '../services/storage/LocalStore';
import { AudioRecorder } from '../features/capture/AudioRecorder';
import { defaultCaptureSettings } from '../features/capture/sessionDefaults';
import { AudioEnhancementSettings, AudioQuality, CapabilitySnapshot, CaptureMode, CapturePolicy, CaptureSession, ConversationTemplateId, IntelligenceMode, LocationSample, Marker, PowerMode, RecordingSegment, SessionAttachment, SessionNote, TranscriptSegment } from '../types/models';
import { defaultVoiceCommands, QuickCaptureMode, VoiceCommandMap } from '../features/quickCapture/config';
import { voiceTrigger } from '../native/voiceTrigger';
import { pruneExpiredSessions } from '../services/storage/RetentionService';
import { archiveMedia } from '../services/storage/MediaArchive';
import { CameraOptions, CustomCaptureConfig, defaultCameraOptions, defaultCustomCaptureConfig, getUseCaseMode } from '../features/capture/modeSets';
import { defaultAudioEnhancements } from '../features/audio/conversationTemplates';
import { defaultDrivePreferences, DrivePreferences } from '../features/capture/drivePreferences';
import { defaultRoomPreferences, RoomPreferences } from '../features/capture/roomPreferences';
import { transcription } from '../native/transcription';

export type VoiceTriggerStatus = 'idle' | 'requesting' | 'listening' | 'paused' | 'unavailable' | 'error';

interface VideoPart { uri: string; startedAt: string; endedAt: string; durationMs: number }
interface CaptureMedia { uri?: string; durationMs?: number; frontUri?: string; rearUri?: string; videoParts?: VideoPart[]; interrupted?: boolean }

interface AppContextValue {
  sessions: CaptureSession[];
  activeSession: CaptureSession | null;
  capabilities: CapabilitySnapshot | null;
  isReady: boolean;
  selectedMode: CaptureMode;
  setSelectedMode: (mode: CaptureMode) => void;
  selectedUseCaseModeId: string | null;
  selectUseCaseMode: (id: string) => void;
  cameraOptions: CameraOptions;
  drivePreferences: DrivePreferences;
  setDrivePreferences: (patch: Partial<DrivePreferences>) => void;
  roomPreferences: RoomPreferences;
  setRoomPreferences: (patch: Partial<RoomPreferences>) => void;
  setCameraOptions: (patch: Partial<CameraOptions>) => void;
  customCaptureConfig: CustomCaptureConfig;
  setCustomCaptureConfig: (patch: Partial<CustomCaptureConfig>) => void;
  audioQuality: AudioQuality;
  setAudioQuality: (quality: AudioQuality) => void;
  powerMode: PowerMode;
  setPowerMode: (mode: PowerMode) => void;
  capturePolicy: CapturePolicy;
  setCapturePolicy: (patch: Partial<CapturePolicy>) => void;
  audioCapturePolicy: CapturePolicy;
  setAudioCapturePolicy: (patch: Partial<CapturePolicy>) => void;
  conversationTemplateId: ConversationTemplateId;
  setConversationTemplateId: (id: ConversationTemplateId) => void;
  intelligenceMode: IntelligenceMode;
  setIntelligenceMode: (mode: IntelligenceMode) => void;
  audioEnhancements: AudioEnhancementSettings;
  setAudioEnhancements: (patch: Partial<AudioEnhancementSettings>) => void;
  quickCaptureMode: QuickCaptureMode;
  setQuickCaptureMode: (mode: QuickCaptureMode) => void;
  quickCaptureRequest: { mode: QuickCaptureMode; token: number } | null;
  requestQuickCapture: (mode: QuickCaptureMode) => void;
  clearQuickCaptureRequest: (token?: number) => void;
  voiceCommands: VoiceCommandMap;
  setVoiceCommand: (mode: QuickCaptureMode, phrase: string) => void;
  voiceTriggerArmed: boolean;
  voiceTriggerStatus: VoiceTriggerStatus;
  voiceTriggerError: string | null;
  armVoiceTrigger: () => Promise<boolean>;
  disarmVoiceTrigger: () => Promise<void>;
  startCapture: (modeOverride?: CaptureMode, cameraConfig?: CaptureSession['settings']['cameraConfig'], useCaseOverrideId?: string) => Promise<string>;
  stopCapture: (media?: CaptureMedia) => Promise<void>;
  pauseCapture: () => Promise<void>;
  resumeCapture: () => Promise<void>;
  addMarker: (label: Marker['label'], note?: string) => void;
  addSessionNote: (text: string, kind?: SessionNote['kind']) => void;
  addSessionAttachment: (attachment: Omit<SessionAttachment, 'id' | 'timestampMs'>) => void;
  importMediaSession: (uri: string, name: string, mimeType?: string) => Promise<string>;
  updateSession: (sessionId: string, patch: Partial<CaptureSession>) => void;
  addLocationSample: (sample: LocationSample) => void;
  lockActiveSession: () => void;
  toggleProtected: (sessionId: string) => void;
  refreshCapabilities: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const makeId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function AppProvider({ children }: PropsWithChildren) {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [activeSession, setActiveSession] = useState<CaptureSession | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilitySnapshot | null>(null);
  const [selectedMode, setSelectedModeState] = useState<CaptureMode>('rear_video');
  const [selectedUseCaseModeId, setSelectedUseCaseModeId] = useState<string | null>(null);
  const [cameraOptions, setCameraOptionsState] = useState<CameraOptions>(defaultCameraOptions);
  const [drivePreferences, setDrivePreferencesState] = useState<DrivePreferences>(defaultDrivePreferences);
  const [roomPreferences, setRoomPreferencesState] = useState<RoomPreferences>(defaultRoomPreferences);
  const [customCaptureConfig, setCustomCaptureConfigState] = useState<CustomCaptureConfig>(defaultCustomCaptureConfig);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('voice');
  const [powerMode, setPowerMode] = useState<PowerMode>('standard');
  const [capturePolicy, setCapturePolicyState] = useState<CapturePolicy>(defaultCaptureSettings.capturePolicy);
  const [audioCapturePolicy, setAudioCapturePolicyState] = useState<CapturePolicy>(defaultCaptureSettings.capturePolicy);
  const [conversationTemplateId, setConversationTemplateIdState] = useState<ConversationTemplateId>('general');
  const [intelligenceMode, setIntelligenceModeState] = useState<IntelligenceMode>('local');
  const [audioEnhancements, setAudioEnhancementsState] = useState<AudioEnhancementSettings>(defaultAudioEnhancements);
  const [quickCaptureMode, setQuickCaptureModeState] = useState<QuickCaptureMode>('audio');
  const [quickCaptureRequest, setQuickCaptureRequest] = useState<{ mode: QuickCaptureMode; token: number } | null>(null);
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommandMap>(defaultVoiceCommands);
  const [voiceTriggerArmed, setVoiceTriggerArmed] = useState(false);
  const [voiceTriggerStatus, setVoiceTriggerStatus] = useState<VoiceTriggerStatus>(voiceTrigger.isNativeAvailable ? 'idle' : 'unavailable');
  const [voiceTriggerError, setVoiceTriggerError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const recorder = useRef(new AudioRecorder()).current;
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const quickCaptureToken = useRef(0);
  const voiceCommandsRef = useRef(voiceCommands);
  const activeSessionRef = useRef(activeSession);
  const voiceTriggerArmedRef = useRef(false);

  useEffect(() => { voiceCommandsRef.current = voiceCommands; }, [voiceCommands]);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getJson<CaptureSession[]>('sessions', []), getJson<QuickCaptureMode>('quick_capture_mode', 'audio'), getJson<Partial<VoiceCommandMap>>('voice_commands', {}), getJson<Partial<CapturePolicy>>('capture_policy', {}), getJson<Partial<CapturePolicy>>('audio_capture_policy', {}), getJson<string | null>('use_case_mode_id', null), getJson<Partial<CameraOptions>>('camera_options', {}), getJson<Partial<CustomCaptureConfig>>('custom_capture_config', {}), getJson<Partial<DrivePreferences>>('drive_preferences', {}), getJson<Partial<RoomPreferences>>('room_preferences', {}), getDeviceCapabilities()]).then(async ([stored, configuredMode, storedVoiceCommands, storedPolicy, storedAudioPolicy, storedUseCaseId, storedCameraOptions, storedCustomConfig, storedDrivePreferences, storedRoomPreferences, device]) => {
      const cleaned = await pruneExpiredSessions(stored);
      if (!mounted) return;
      setSessions(cleaned.sessions.filter((session) => session.status !== 'recording'));
      if (cleaned.removed > 0) void setJson('sessions', cleaned.sessions);
      setQuickCaptureModeState(configuredMode);
      setVoiceCommands({ ...defaultVoiceCommands, ...storedVoiceCommands });
      setCapturePolicyState({ ...defaultCaptureSettings.capturePolicy, ...storedPolicy });
      setAudioCapturePolicyState({ ...defaultCaptureSettings.capturePolicy, ...storedPolicy, ...storedAudioPolicy });
      const storedUseCase = getUseCaseMode(storedUseCaseId);
      setSelectedUseCaseModeId(storedUseCase?.id ?? null);
      if (storedUseCase) setSelectedModeState(storedUseCase.captureMode);
      setCameraOptionsState({ ...defaultCameraOptions, ...storedCameraOptions });
      setCustomCaptureConfigState({ ...defaultCustomCaptureConfig, ...storedCustomConfig });
      setDrivePreferencesState({ ...defaultDrivePreferences, ...storedDrivePreferences });
      setRoomPreferencesState({ ...defaultRoomPreferences, ...storedRoomPreferences });
      setCapabilities(device);
      setIsReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getJson<ConversationTemplateId>('conversation_template', 'general'),
      getJson<IntelligenceMode>('intelligence_mode', 'local'),
      getJson<Partial<AudioEnhancementSettings>>('audio_enhancements', {}),
    ]).then(([template, intelligence, enhancements]) => {
      if (!mounted) return;
      setConversationTemplateIdState(template);
      setIntelligenceModeState(intelligence === 'plus' ? 'local' : intelligence);
      setAudioEnhancementsState({ ...defaultAudioEnhancements, ...enhancements });
    });
    return () => { mounted = false; };
  }, []);

  const refreshCapabilities = useCallback(async () => {
    setCapabilities(await getDeviceCapabilities());
  }, []);

  const setQuickCaptureMode = useCallback((mode: QuickCaptureMode) => {
    setQuickCaptureModeState(mode);
    void setJson('quick_capture_mode', mode);
  }, []);

  const setSelectedMode = useCallback((mode: CaptureMode) => {
    setSelectedModeState(mode);
    setSelectedUseCaseModeId(null);
    void setJson('use_case_mode_id', null);
  }, []);

  const selectUseCaseMode = useCallback((id: string) => {
    const preset = getUseCaseMode(id);
    if (!preset) return;
    setSelectedUseCaseModeId(preset.id);
    setSelectedModeState(preset.captureMode);
    void setJson('use_case_mode_id', preset.id);
  }, []);

  const setCameraOptions = useCallback((patch: Partial<CameraOptions>) => {
    if (patch.evidence) {
      setActiveSession((current) => {
        const source = activeSessionRef.current ?? current;
        const next = source ? { ...source, protected: true, evidenceLocked: true } : null;
        activeSessionRef.current = next;
        return next;
      });
    }
    setCameraOptionsState((current) => {
      const next = { ...current, ...patch };
      void setJson('camera_options', next);
      return next;
    });
  }, []);

  const setDrivePreferences = useCallback((patch: Partial<DrivePreferences>) => {
    setDrivePreferencesState((current) => {
      const next = { ...current, ...patch };
      void setJson('drive_preferences', next);
      return next;
    });
  }, []);

  const setRoomPreferences = useCallback((patch: Partial<RoomPreferences>) => {
    setRoomPreferencesState((current) => {
      const next = { ...current, ...patch };
      void setJson('room_preferences', next);
      return next;
    });
  }, []);

  const setCustomCaptureConfig = useCallback((patch: Partial<CustomCaptureConfig>) => {
    setCustomCaptureConfigState((current) => {
      const next = { ...current, ...patch };
      void setJson('custom_capture_config', next);
      return next;
    });
  }, []);

  const setCapturePolicy = useCallback((patch: Partial<CapturePolicy>) => {
    setCapturePolicyState((current) => {
      const next = { ...current, ...patch };
      void setJson('capture_policy', next);
      return next;
    });
  }, []);

  const setAudioCapturePolicy = useCallback((patch: Partial<CapturePolicy>) => {
    setAudioCapturePolicyState((current) => {
      const next = { ...current, ...patch };
      void setJson('audio_capture_policy', next);
      return next;
    });
  }, []);

  const setConversationTemplateId = useCallback((id: ConversationTemplateId) => {
    setConversationTemplateIdState(id);
    void setJson('conversation_template', id);
  }, []);

  const setIntelligenceMode = useCallback((mode: IntelligenceMode) => {
    const availableMode = mode === 'plus' ? 'local' : mode;
    setIntelligenceModeState(availableMode);
    void setJson('intelligence_mode', availableMode);
  }, []);

  const setAudioEnhancements = useCallback((patch: Partial<AudioEnhancementSettings>) => {
    setAudioEnhancementsState((current) => {
      const next = { ...current, ...patch };
      void setJson('audio_enhancements', next);
      return next;
    });
  }, []);

  const setVoiceCommand = useCallback((mode: QuickCaptureMode, phrase: string) => {
    setVoiceCommands((current) => {
      const next = { ...current, [mode]: phrase };
      void setJson('voice_commands', next);
      return next;
    });
  }, []);

  const requestQuickCapture = useCallback((mode: QuickCaptureMode) => {
    quickCaptureToken.current += 1;
    setQuickCaptureRequest({ mode, token: quickCaptureToken.current });
  }, []);

  const clearQuickCaptureRequest = useCallback((token?: number) => {
    setQuickCaptureRequest((current) => current && (!token || current.token === token) ? null : current);
  }, []);

  const disarmVoiceTrigger = useCallback(async () => {
    voiceTriggerArmedRef.current = false;
    setVoiceTriggerArmed(false);
    setVoiceTriggerStatus('idle');
    setVoiceTriggerError(null);
    await voiceTrigger.stopListening();
  }, []);

  const armVoiceTrigger = useCallback(async () => {
    if (!voiceTrigger.isNativeAvailable) {
      setVoiceTriggerStatus('unavailable');
      setVoiceTriggerError('Voice Trigger requires an iOS development build with the SafeBro native module.');
      return false;
    }
    const phrases = [...new Set(Object.values(voiceCommandsRef.current).map((phrase) => phrase.trim()).filter(Boolean))];
    if (!phrases.length) {
      setVoiceTriggerStatus('error');
      setVoiceTriggerError('Add at least one phrase before arming Voice Trigger.');
      return false;
    }
    setVoiceTriggerStatus('requesting');
    setVoiceTriggerError(null);
    try {
      const authorization = await voiceTrigger.requestAuthorizationAsync();
      if (authorization.speech !== 'granted' || authorization.microphone !== 'granted') {
        setVoiceTriggerStatus('error');
        setVoiceTriggerError('Allow Speech Recognition and Microphone access in iOS Settings, then try again.');
        return false;
      }
      await voiceTrigger.startListening(phrases, 'en-US');
      voiceTriggerArmedRef.current = true;
      setVoiceTriggerArmed(true);
      setVoiceTriggerStatus('listening');
      return true;
    } catch (error) {
      setVoiceTriggerStatus('error');
      setVoiceTriggerError(error instanceof Error ? error.message : 'Voice Trigger could not start.');
      return false;
    }
  }, []);

  useEffect(() => {
    const phraseSubscription = voiceTrigger.addPhraseListener(({ phrase }) => {
      if (!voiceTriggerArmedRef.current || activeSessionRef.current) return;
      const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const match = (Object.entries(voiceCommandsRef.current) as [QuickCaptureMode, string][]).find(([, configuredPhrase]) => normalize(configuredPhrase) === normalize(phrase));
      if (!match) return;
      voiceTriggerArmedRef.current = false;
      setVoiceTriggerArmed(false);
      setVoiceTriggerStatus('paused');
      requestQuickCapture(match[0]);
      void voiceTrigger.stopListening();
    });
    const stateSubscription = voiceTrigger.addStateListener(({ state }) => {
      if (state === 'listening') setVoiceTriggerStatus('listening');
      if (state === 'idle' && voiceTriggerArmedRef.current) setVoiceTriggerStatus('paused');
    });
    return () => {
      phraseSubscription?.remove();
      stateSubscription?.remove();
    };
  }, [requestQuickCapture]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && voiceTriggerArmedRef.current) {
        voiceTriggerArmedRef.current = false;
        setVoiceTriggerArmed(false);
        setVoiceTriggerStatus('paused');
        void voiceTrigger.stopListening();
      }
    });
    return () => subscription.remove();
  }, []);

  const startCapture = useCallback(async (modeOverride?: CaptureMode, cameraConfig?: CaptureSession['settings']['cameraConfig'], useCaseOverrideId?: string) => {
    if (activeSessionRef.current || startingRef.current) throw new Error('A recording is already active.');
    startingRef.current = true;
    try {
    const mode = modeOverride ?? selectedMode;
    const useCase = getUseCaseMode(useCaseOverrideId ?? (modeOverride ? null : selectedUseCaseModeId));
    const isCamera = mode === 'rear_video' || mode === 'front_video' || mode === 'video_audio' || mode === 'dual_camera' || mode === 'double_surveillance' || mode === 'podcast' || mode === 'security' || mode === 'dashcam' || mode === 'event_camera';
    const nativeDual = mode === 'dual_camera' || mode === 'double_surveillance' || (mode === 'podcast' && capabilities?.dualCameraSupported) || (isCamera && (useCase?.id === 'drive' || useCase?.id === 'room' ? cameraConfig?.lens === 'dual' : cameraOptions.dualCamera) && Boolean(capabilities?.dualCameraSupported));
    const isAudio = mode === 'audio' || mode === 'low_power_audio' || mode === 'video_audio' || (mode === 'podcast' && !nativeDual) || mode === 'interview' || mode === 'security' || mode === 'conversation_audio';
    const nextPowerMode = mode === 'low_power_audio' ? 'low_power' : useCase?.power ?? powerMode;
    const basePolicy = mode === 'audio' || mode === 'low_power_audio' || mode === 'conversation_audio' ? audioCapturePolicy : capturePolicy;
    const sessionPolicy = useCase ? {
      ...basePolicy,
      saveMode: useCase.save,
      autoDelete: useCase.id === 'audio_guard' ? basePolicy.autoDelete : ['vehicle', 'sentry', 'monitor', 'endurance', 'smart'].includes(useCase.set),
      ...(useCase.id === 'room' ? { retentionDays: roomPreferences.retentionDays } : {}),
    } : { ...basePolicy };
    const session: CaptureSession = {
      id: makeId('SEC'),
      mode,
      startedAt: new Date().toISOString(),
      status: 'recording',
      useCaseModeId: useCase?.id,
      protected: mode === 'security' || Boolean(useCase?.protect) || cameraOptions.evidence,
      evidenceLocked: Boolean(useCase?.protect) || cameraOptions.evidence,
      powerMode: nextPowerMode,
      settings: { ...defaultCaptureSettings, audioQuality, powerMode: nextPowerMode, capturePolicy: sessionPolicy, cameraConfig, driveConfig: useCase?.id === 'drive' ? { view: drivePreferences.view, gps: drivePreferences.gps, segmentMinutes: drivePreferences.segmentMinutes } : undefined, roomConfig: useCase?.id === 'room' ? { lens: roomPreferences.lens, segmentMinutes: roomPreferences.segmentMinutes } : undefined },
      segments: [
        ...(isAudio ? [{ id: makeId('SEG'), sessionId: makeId('SESSION_REF'), type: 'audio' as const, startedAt: new Date().toISOString() }] : []),
      ...(isCamera ? [{ id: makeId('SEG'), sessionId: makeId('SESSION_REF'), type: (nativeDual ? 'dual_camera' : 'video') as 'dual_camera' | 'video', camera: cameraConfig?.lens === 'front' || mode === 'front_video' ? 'front' as const : 'rear' as const, startedAt: new Date().toISOString() }] : []),
      ],
      markers: [],
      conversationTemplateId: isAudio ? conversationTemplateId : undefined,
      intelligenceMode,
      audioEnhancements: isAudio ? audioEnhancements : undefined,
      notes: [],
      attachments: [],
      pausedDurationMs: 0,
    };

    session.segments = session.segments.map((segment) => ({ ...segment, sessionId: session.id }));

    if (isAudio) {
      await recorder.start(audioQuality);
    }

    activeSessionRef.current = session;
    setActiveSession(session);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return session.id;
    } finally {
      startingRef.current = false;
    }
  }, [audioCapturePolicy, audioEnhancements, audioQuality, cameraOptions, capabilities?.dualCameraSupported, capturePolicy, conversationTemplateId, drivePreferences, roomPreferences, intelligenceMode, powerMode, recorder, selectedMode, selectedUseCaseModeId]);

  const stopCapture = useCallback(async (media?: CaptureMedia) => {
    const session = activeSessionRef.current;
    if (!session || stoppingRef.current) return;
    stoppingRef.current = true;
    try {
    const result = await recorder.stop();
    const endedAt = new Date().toISOString();
    const segments: RecordingSegment[] = await Promise.all(session.segments.map(async (segment) => {
      const mainSource = segment.type === 'audio' ? result?.uri : media?.videoParts?.[0]?.uri ?? media?.rearUri ?? media?.uri;
      const main = mainSource ? await archiveMedia(mainSource, session.id, `${segment.id}-main`) : null;
      const front = segment.type === 'dual_camera' && media?.frontUri ? await archiveMedia(media.frontUri, session.id, `${segment.id}-front`) : null;
      return {
        ...segment,
        startedAt: segment.type === 'video' ? media?.videoParts?.[0]?.startedAt ?? segment.startedAt : segment.startedAt,
        endedAt: segment.type === 'video' ? media?.videoParts?.[0]?.endedAt ?? endedAt : endedAt,
        durationMs: segment.type === 'audio' ? result?.durationMs : media?.videoParts?.[0]?.durationMs ?? media?.durationMs,
        filePath: main?.uri,
        checksum: main?.md5,
        frontFilePath: front?.uri,
        frontChecksum: front?.md5,
        rearFilePath: segment.type === 'dual_camera' ? main?.uri : undefined,
      };
    }));
    const firstVideo = session.segments.find((segment) => segment.type === 'video');
    const laterParts = firstVideo && media?.videoParts?.length ? await Promise.all(media.videoParts.slice(1).map(async (part, index) => {
      const id = makeId('SEG');
      const saved = await archiveMedia(part.uri, session.id, `${id}-${index}`);
      return { id, sessionId: session.id, type: 'video' as const, camera: firstVideo.camera, startedAt: part.startedAt, endedAt: part.endedAt, durationMs: part.durationMs, filePath: saved.uri, checksum: saved.md5 };
    })) : [];
    segments.push(...laterParts);
    let updated: CaptureSession = {
      ...session,
      endedAt,
      status: !media?.interrupted && segments.some((segment) => segment.filePath || segment.frontFilePath) ? 'complete' : 'interrupted',
      segments,
    };
    const transcriptSource = segments.find((segment) => segment.type === 'audio' && segment.filePath);
    if (session.intelligenceMode === 'local' && transcriptSource?.filePath && transcription.isNativeAvailable) {
      try {
        const authorization = await transcription.requestAuthorizationAsync();
        if (authorization.speech === 'granted') {
          const localTranscript = await transcription.transcribeVideo(transcriptSource.filePath, 'en-US');
          const transcript: TranscriptSegment[] = localTranscript.segments.map((item, index) => ({ id: makeId('TEXT'), recordingSegmentId: transcriptSource.id, speakerId: 'Speaker 1', startTimeMs: item.timestampMs, endTimeMs: item.timestampMs + item.durationMs, text: item.text }));
          updated = { ...updated, transcript };
        }
      } catch { /* Original media remains available when local transcription is unavailable. */ }
    }
    const next = [updated, ...sessions];
    const cleaned = await pruneExpiredSessions(next);
    setSessions(cleaned.sessions);
    await setJson('sessions', cleaned.sessions);
    activeSessionRef.current = null;
    setActiveSession(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } finally {
      stoppingRef.current = false;
    }
  }, [recorder, sessions]);

  const pauseCapture = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current || !['audio', 'low_power_audio', 'conversation_audio'].includes(current.mode) || current.status !== 'recording') return;
    await recorder.pause();
    const next: CaptureSession = { ...current, status: 'paused', pausedAt: new Date().toISOString() };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, [recorder]);

  const resumeCapture = useCallback(async () => {
    const current = activeSessionRef.current;
    if (!current || current.status !== 'paused') return;
    await recorder.resume();
    const pausedFor = current.pausedAt ? Date.now() - new Date(current.pausedAt).getTime() : 0;
    const next: CaptureSession = { ...current, status: 'recording', pausedAt: undefined, pausedDurationMs: (current.pausedDurationMs ?? 0) + pausedFor };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, [recorder]);

  const addMarker = useCallback((label: Marker['label'], note?: string) => {
    const current = activeSessionRef.current;
    if (!current) return;
    const marker: Marker = { id: makeId('MARK'), sessionId: current.id, label, note, timestampMs: Date.now() - new Date(current.startedAt).getTime() - (current.pausedDurationMs ?? 0) };
    const next = { ...current, markers: [...current.markers, marker] };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, []);

  const addSessionNote = useCallback((text: string, kind: SessionNote['kind'] = 'typed') => {
    const current = activeSessionRef.current;
    const clean = text.trim();
    if (!current || !clean) return;
    const note: SessionNote = { id: makeId('NOTE'), timestampMs: Date.now() - new Date(current.startedAt).getTime() - (current.pausedDurationMs ?? 0), text: clean, kind, createdAt: new Date().toISOString() };
    const next = { ...current, notes: [...(current.notes ?? []), note] };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, []);

  const addSessionAttachment = useCallback((attachment: Omit<SessionAttachment, 'id' | 'timestampMs'>) => {
    const current = activeSessionRef.current;
    if (!current) return;
    const nextAttachment: SessionAttachment = { ...attachment, id: makeId('ATTACH'), timestampMs: Date.now() - new Date(current.startedAt).getTime() - (current.pausedDurationMs ?? 0) };
    const next = { ...current, attachments: [...(current.attachments ?? []), nextAttachment] };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, []);

  const updateSession = useCallback((sessionId: string, patch: Partial<CaptureSession>) => {
    setSessions((current) => {
      const next = current.map((session) => session.id === sessionId ? { ...session, ...patch } : session);
      void setJson('sessions', next);
      return next;
    });
  }, []);

  const importMediaSession = useCallback(async (uri: string, name: string, mimeType?: string) => {
    const sessionId = makeId('IMPORT');
    const saved = await archiveMedia(uri, sessionId, 'original');
    const video = mimeType?.startsWith('video/') || /\.(mp4|mov)$/i.test(name);
    const startedAt = new Date().toISOString();
    const session: CaptureSession = {
      id: sessionId,
      mode: video ? 'video_audio' : 'audio',
      startedAt,
      endedAt: startedAt,
      status: saved.uri ? 'complete' : 'interrupted',
      protected: false,
      powerMode: 'standard',
      title: name.replace(/\.[^.]+$/, ''),
      conversationTemplateId,
      intelligenceMode,
      audioEnhancements,
      consentConfirmed: true,
      settings: { ...defaultCaptureSettings, audioQuality, powerMode: 'standard', capturePolicy: { ...audioCapturePolicy } },
      segments: [{ id: makeId('SEG'), sessionId, type: video ? 'video' : 'audio', startedAt, endedAt: startedAt, filePath: saved.uri, checksum: saved.md5 }],
      markers: [], notes: [], attachments: [],
    };
    setSessions((current) => {
      const next = [session, ...current];
      void setJson('sessions', next);
      return next;
    });
    return sessionId;
  }, [audioCapturePolicy, audioEnhancements, audioQuality, conversationTemplateId, intelligenceMode]);

  const addLocationSample = useCallback((sample: LocationSample) => {
    const current = activeSessionRef.current;
    if (!current) return;
    const next = { ...current, locationSamples: [...(current.locationSamples ?? []), sample] };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, []);

  const lockActiveSession = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current) return;
    const next = { ...current, protected: true, evidenceLocked: true };
    activeSessionRef.current = next;
    setActiveSession(next);
  }, []);

  const toggleProtected = useCallback((sessionId: string) => {
    const next = sessions.map((session) => session.id === sessionId && !session.evidenceLocked ? { ...session, protected: !session.protected } : session);
    setSessions(next);
    void setJson('sessions', next);
  }, [sessions]);

  const value = useMemo(() => ({ sessions, activeSession, capabilities, isReady, selectedMode, setSelectedMode, selectedUseCaseModeId, selectUseCaseMode, cameraOptions, setCameraOptions, drivePreferences, setDrivePreferences, roomPreferences, setRoomPreferences, customCaptureConfig, setCustomCaptureConfig, audioQuality, setAudioQuality, powerMode, setPowerMode, capturePolicy, setCapturePolicy, audioCapturePolicy, setAudioCapturePolicy, conversationTemplateId, setConversationTemplateId, intelligenceMode, setIntelligenceMode, audioEnhancements, setAudioEnhancements, quickCaptureMode, setQuickCaptureMode, quickCaptureRequest, requestQuickCapture, clearQuickCaptureRequest, voiceCommands, setVoiceCommand, voiceTriggerArmed, voiceTriggerStatus, voiceTriggerError, armVoiceTrigger, disarmVoiceTrigger, startCapture, stopCapture, pauseCapture, resumeCapture, addMarker, addSessionNote, addSessionAttachment, importMediaSession, updateSession, addLocationSample, lockActiveSession, toggleProtected, refreshCapabilities }), [sessions, activeSession, capabilities, isReady, selectedMode, setSelectedMode, selectedUseCaseModeId, selectUseCaseMode, cameraOptions, setCameraOptions, drivePreferences, setDrivePreferences, roomPreferences, setRoomPreferences, customCaptureConfig, setCustomCaptureConfig, audioQuality, powerMode, capturePolicy, setCapturePolicy, audioCapturePolicy, setAudioCapturePolicy, conversationTemplateId, setConversationTemplateId, intelligenceMode, setIntelligenceMode, audioEnhancements, setAudioEnhancements, quickCaptureMode, setQuickCaptureMode, quickCaptureRequest, requestQuickCapture, clearQuickCaptureRequest, voiceCommands, setVoiceCommand, voiceTriggerArmed, voiceTriggerStatus, voiceTriggerError, armVoiceTrigger, disarmVoiceTrigger, startCapture, stopCapture, pauseCapture, resumeCapture, addMarker, addSessionNote, addSessionAttachment, importMediaSession, updateSession, addLocationSample, lockActiveSession, toggleProtected, refreshCapabilities]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
