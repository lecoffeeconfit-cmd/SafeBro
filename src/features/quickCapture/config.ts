import { CaptureMode } from '../../types/models';

export type QuickCaptureMode = Extract<CaptureMode, 'audio' | 'low_power_audio' | 'rear_video' | 'front_video' | 'double_surveillance' | 'podcast' | 'security' | 'dashcam' | 'event_camera' | 'conversation_audio'>;
export type QuickCaptureTrigger = 'widget' | 'lock_screen' | 'siri_shortcut' | 'action_button' | 'back_tap' | 'app_button';
export type VoiceCommandMap = Record<QuickCaptureMode, string>;

export function isAudioQuickCaptureMode(mode: QuickCaptureMode): mode is Extract<QuickCaptureMode, 'audio' | 'low_power_audio' | 'conversation_audio'> {
  return mode === 'audio' || mode === 'low_power_audio' || mode === 'conversation_audio';
}

export const quickCaptureModes: { id: QuickCaptureMode; label: string; detail: string; icon: string }[] = [
  { id: 'audio', label: 'Microphone', detail: 'Audio-only capture', icon: 'microphone' },
  { id: 'low_power_audio', label: 'Low-power audio', detail: 'Battery-conscious audio capture', icon: 'battery' },
  { id: 'rear_video', label: 'Rear camera', detail: 'Single-camera video', icon: 'rear-camera' },
  { id: 'front_video', label: 'Front camera', detail: 'Self-facing video', icon: 'front-camera' },
  { id: 'double_surveillance', label: 'Double surveillance', detail: 'Front + rear cameras', icon: '⇄' },
  { id: 'podcast', label: 'Podcast', detail: 'Mic + camera layout', icon: 'podcast' },
  { id: 'security', label: 'Security', detail: 'Single-camera event mode', icon: 'security' },
  { id: 'dashcam', label: 'Dashboard camera', detail: 'Rear lens facing forward', icon: 'dashcam' },
  { id: 'event_camera', label: 'Motion events', detail: 'Save movement-triggered clips', icon: 'motion' },
  { id: 'conversation_audio', label: 'Conversation audio', detail: 'Save when speech begins', icon: 'conversation' },
];

export const quickCaptureTriggers: { id: QuickCaptureTrigger; label: string; detail: string }[] = [
  { id: 'widget', label: 'Home Screen widget', detail: 'One-tap mode buttons' },
  { id: 'lock_screen', label: 'Lock Screen widget', detail: 'Fast access from Lock Screen' },
  { id: 'siri_shortcut', label: 'Siri Shortcut', detail: 'Voice or Shortcuts app' },
  { id: 'action_button', label: 'Action Button', detail: 'Assign a Shortcut on supported iPhones' },
  { id: 'back_tap', label: 'Back Tap', detail: 'Double or triple tap via iOS settings' },
  { id: 'app_button', label: 'In-app quick button', detail: 'Available in Capture or Audio' },
];

export const defaultVoiceCommands: VoiceCommandMap = {
  audio: 'Start SafeBro microphone',
  low_power_audio: 'Start SafeBro low power audio',
  rear_video: 'Start SafeBro rear camera',
  front_video: 'Start SafeBro front camera',
  double_surveillance: 'Start SafeBro double surveillance',
  podcast: 'Start SafeBro podcast',
  security: 'Start SafeBro security camera',
  dashcam: 'Start SafeBro dashboard camera',
  event_camera: 'Start SafeBro motion events',
  conversation_audio: 'Start SafeBro conversation audio',
};

export function parseQuickCaptureUrl(url: string): QuickCaptureMode | null {
  if (!url.startsWith('sentinel://')) return null;
  const mode = url.match(/[?&]mode=([^&]+)/)?.[1];
  const decoded = mode ? decodeURIComponent(mode) : '';
  return quickCaptureModes.some((item) => item.id === decoded) ? decoded as QuickCaptureMode : null;
}
