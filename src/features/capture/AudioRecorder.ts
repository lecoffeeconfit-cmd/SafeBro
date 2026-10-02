import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { AudioQuality } from '../../types/models';
import { getAudioPreset } from './audioPresets';

export interface AudioRecordingResult {
  uri: string;
  durationMs: number;
}

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private pausedDurationMs = 0;

  async requestPermission(): Promise<boolean> {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
  }

  async start(quality: AudioQuality): Promise<void> {
    if (this.recording) return;
    const permitted = await this.requestPermission();
    if (!permitted) throw new Error('MICROPHONE_PERMISSION_DENIED');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    const preset = getAudioPreset(quality);
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: preset.sampleRate,
        numberOfChannels: preset.channels,
        bitRate: preset.bitrate,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: preset.sampleRate,
        numberOfChannels: preset.channels,
        bitRate: preset.bitrate,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {},
    });
    this.startedAt = Date.now();
    this.pausedAt = 0;
    this.pausedDurationMs = 0;
    this.recording = recording;
    await recording.startAsync();
  }

  async stop(): Promise<AudioRecordingResult | null> {
    if (!this.recording) return null;
    const active = this.recording;
    await active.stopAndUnloadAsync();
    const uri = active.getURI();
    const activePauseMs = this.pausedAt ? Date.now() - this.pausedAt : 0;
    const durationMs = Date.now() - this.startedAt - this.pausedDurationMs - activePauseMs;
    this.recording = null;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.pausedDurationMs = 0;
    if (!uri) return null;

    const info = await FileSystem.getInfoAsync(uri);
    return { uri, durationMs };
  }

  async pause(): Promise<void> {
    await this.recording?.pauseAsync();
    this.pausedAt = Date.now();
  }

  async resume(): Promise<void> {
    await this.recording?.startAsync();
    if (this.pausedAt) {
      this.pausedDurationMs += Date.now() - this.pausedAt;
      this.pausedAt = 0;
    }
  }

  async getStatus(): Promise<Audio.RecordingStatus | null> {
    return this.recording?.getStatusAsync() ?? null;
  }
}
