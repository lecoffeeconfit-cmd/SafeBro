import { AudioQuality } from '../../types/models';

export interface AudioPreset {
  id: AudioQuality;
  label: string;
  detail: string;
  sampleRate: number;
  bitrate: number;
  channels: 1 | 2;
}

export const audioPresets: AudioPreset[] = [
  { id: 'ultra_low_power', label: 'ULTRA LOW POWER', detail: 'Speech-first · smallest files', sampleRate: 16000, bitrate: 24000, channels: 1 },
  { id: 'voice', label: 'VOICE', detail: 'Clear spoken word', sampleRate: 24000, bitrate: 48000, channels: 1 },
  { id: 'standard', label: 'STANDARD', detail: 'Balanced capture', sampleRate: 44100, bitrate: 96000, channels: 1 },
  { id: 'high_quality', label: 'HIGH QUALITY', detail: 'Fuller dynamic range', sampleRate: 48000, bitrate: 128000, channels: 2 },
  { id: 'podcast', label: 'PODCAST', detail: 'Voice quality · headroom', sampleRate: 48000, bitrate: 192000, channels: 2 },
];

export const getAudioPreset = (id: AudioQuality): AudioPreset => audioPresets.find((preset) => preset.id === id) ?? audioPresets[1];
