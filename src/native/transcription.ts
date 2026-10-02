import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface TranscriptionSegment {
  text: string;
  timestampMs: number;
  durationMs: number;
}

export interface VideoTranscription {
  text: string;
  segments: TranscriptionSegment[];
}

interface NativeTranscriptionModule {
  requestAuthorizationAsync(): Promise<{ speech: 'granted' | 'denied' }>;
  transcribeVideo(videoPath: string, localeIdentifier: string): Promise<VideoTranscription>;
  renderTextOverlay(videoPath: string, overlays: Array<{ text: string; startMs: number; endMs: number }>): Promise<{ uri: string }>;
}

const nativeModule = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeTranscriptionModule>('SentinelTranscription') : null;

export const transcription = {
  isNativeAvailable: Boolean(nativeModule),
  async requestAuthorizationAsync() {
    if (!nativeModule) throw new Error('TRANSCRIPTION_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.requestAuthorizationAsync();
  },
  async transcribeVideo(videoPath: string, localeIdentifier = 'en-US') {
    if (!nativeModule) throw new Error('TRANSCRIPTION_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.transcribeVideo(videoPath, localeIdentifier);
  },
  async renderTextOverlay(videoPath: string, overlays: Array<{ text: string; startMs: number; endMs: number }>) {
    if (!nativeModule) throw new Error('TRANSCRIPTION_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.renderTextOverlay(videoPath, overlays);
  },
};
