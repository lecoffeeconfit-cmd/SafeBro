import { CaptureMode, CaptureSettings } from '../../types/models';

export const defaultCaptureSettings: CaptureSettings = {
  audioQuality: 'voice',
  sampleRate: 24000,
  channels: 1,
  bitrate: 48000,
  powerMode: 'standard',
  silentUi: false,
  capturePolicy: {
    saveMode: 'full_record',
    autoDelete: false,
    retentionDays: 5,
    preRollSeconds: 10,
    postRollSeconds: 30,
    motionSensitivity: 'medium',
    soundSensitivity: 'medium',
  },
};

export const modeLabels: Record<CaptureMode, string> = {
  audio: 'Audio Only',
  low_power_audio: 'Low Power Audio',
  rear_video: 'Rear Video',
  front_video: 'Front Video',
  video_audio: 'Video + Audio',
  dual_camera: 'Dual Camera',
  double_surveillance: 'Double Surveillance',
  podcast: 'Podcast',
  interview: 'Interview',
  security: 'Security',
  dashcam: 'Dashboard Camera',
  event_camera: 'Motion Event Camera',
  conversation_audio: 'Conversation Audio',
};
