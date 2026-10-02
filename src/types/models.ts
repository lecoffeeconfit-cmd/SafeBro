export type CaptureMode =
  | 'audio'
  | 'low_power_audio'
  | 'rear_video'
  | 'front_video'
  | 'video_audio'
  | 'dual_camera'
  | 'double_surveillance'
  | 'podcast'
  | 'interview'
  | 'security'
  | 'dashcam'
  | 'event_camera'
  | 'conversation_audio';

export type PowerMode = 'standard' | 'low_power' | 'low_profile';
export type SessionStatus = 'ready' | 'recording' | 'paused' | 'finalizing' | 'complete' | 'interrupted';
export type AudioQuality = 'ultra_low_power' | 'voice' | 'standard' | 'high_quality' | 'podcast';
export type CaptureSaveMode = 'full_record' | 'motion_only' | 'sound_only' | 'conversation_only';
export type IntelligenceMode = 'off' | 'local' | 'plus';
export type ConversationTemplateId = 'general' | 'meeting' | 'interview' | 'lecture' | 'doctor' | 'therapy' | 'business' | 'sales' | 'brainstorm' | 'journal' | 'voice_memo' | 'conference' | 'podcast' | 'legal' | 'research' | 'customer_interview' | 'project_planning';

export interface AudioEnhancementSettings {
  noiseSuppression: boolean;
  voiceEnhancement: boolean;
  automaticGain: boolean;
  echoReduction: boolean;
  skipSilence: boolean;
}

export interface SessionNote {
  id: string;
  timestampMs: number;
  text: string;
  kind: 'typed' | 'important' | 'chapter';
  createdAt: string;
}

export interface SessionAttachment {
  id: string;
  timestampMs: number;
  type: 'image' | 'file';
  uri: string;
  name: string;
  mimeType?: string;
}

export interface SessionChapter {
  id: string;
  timestampMs: number;
  title: string;
}

export interface SessionSummary {
  quick?: string;
  detailed?: string;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: string[];
  questions?: string[];
  followUps?: string[];
}

export interface CapturePolicy {
  saveMode: CaptureSaveMode;
  autoDelete?: boolean;
  retentionDays: 3 | 5 | 7;
  preRollSeconds: 5 | 10 | 20;
  postRollSeconds: 10 | 30 | 60;
  motionSensitivity: 'low' | 'medium' | 'high';
  soundSensitivity: 'low' | 'medium' | 'high';
}

export interface CaptureSettings {
  audioQuality: AudioQuality;
  sampleRate: number;
  channels: 1 | 2;
  bitrate: number;
  powerMode: PowerMode;
  silentUi: boolean;
  capturePolicy: CapturePolicy;
  cameraConfig?: {
    lens: 'rear' | 'front' | 'dual';
    quality: '480p' | '720p' | '1080p' | '2160p';
    fps: number;
    microphone: boolean;
    night: boolean;
  };
  driveConfig?: {
    view: 'road' | 'cabin' | 'dual';
    gps: boolean;
    segmentMinutes: 1 | 3 | 5 | 10;
  };
  roomConfig?: {
    lens: 'rear' | 'front' | 'dual';
    segmentMinutes: 2 | 5 | 10;
  };
}

export interface RecordingSegment {
  id: string;
  sessionId: string;
  type: 'audio' | 'video' | 'dual_camera';
  camera?: 'front' | 'rear';
  startedAt: string;
  endedAt?: string;
  filePath?: string;
  frontFilePath?: string;
  rearFilePath?: string;
  durationMs?: number;
  quality?: string;
  checksum?: string;
  frontChecksum?: string;
}

export interface Marker {
  id: string;
  sessionId: string;
  label: 'important' | 'person' | 'vehicle' | 'statement' | 'noise' | 'movement' | 'incident' | 'question' | 'custom';
  timestampMs: number;
  note?: string;
}

export interface CaptureSession {
  id: string;
  mode: CaptureMode;
  useCaseModeId?: string;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  protected: boolean;
  evidenceLocked?: boolean;
  powerMode: PowerMode;
  settings: CaptureSettings;
  segments: RecordingSegment[];
  markers: Marker[];
  locationSamples?: LocationSample[];
  title?: string;
  conversationTemplateId?: ConversationTemplateId;
  intelligenceMode?: IntelligenceMode;
  audioEnhancements?: AudioEnhancementSettings;
  consentConfirmed?: boolean;
  audibleConsentAnnouncement?: boolean;
  notes?: SessionNote[];
  attachments?: SessionAttachment[];
  transcript?: TranscriptSegment[];
  chapters?: SessionChapter[];
  summary?: SessionSummary;
  pausedAt?: string;
  pausedDurationMs?: number;
}

export interface LocationSample {
  timestamp: string;
  latitude: number;
  longitude: number;
  speedMps?: number;
  accuracyMeters?: number;
}

export interface CapabilitySnapshot {
  hasFrontCamera: boolean;
  hasRearCamera: boolean;
  dualCameraSupported: boolean;
  torchSupported: boolean;
  stabilizationSupported: boolean;
  backgroundAudioSupported: boolean;
  backgroundVideoSupported: boolean;
  biometricsAvailable: boolean;
  storageAvailableBytes?: number;
  batteryLevel?: number;
  thermalState?: string;
}

export interface AudioSignalSample {
  timestampMs: number;
  rms: number;
  peak: number;
  isSilent: boolean;
  speechProbability?: number;
  estimatedPitchHz?: number;
}

export interface AnalysisEvent {
  id: string;
  sessionId: string;
  type: 'LONG_PAUSE' | 'VOLUME_SPIKE' | 'VOLUME_DROP' | 'PITCH_CHANGE' | 'EXTENDED_SILENCE' | 'SPEECH_ACTIVITY';
  startTimeMs: number;
  endTimeMs: number;
  observation: string;
  possibleInterpretations?: string[];
  confidence: 'low' | 'moderate' | 'high';
  modelVersion: string;
}

export interface TranscriptSegment {
  id: string;
  recordingSegmentId: string;
  speakerId?: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  confidence?: number;
}

export interface PersonProfile {
  id: string;
  displayName: string;
  firstAppearance?: string;
  lastAppearance?: string;
  conversationCount: number;
  speakingTimeSeconds: number;
  commonTopics: string[];
  userNotes?: string;
}
