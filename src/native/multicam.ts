import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface NativeDualRecordingResult {
  frontUri?: string;
  rearUri?: string;
  startedAt?: string;
}

interface NativeMulticamModule {
  isSupportedAsync(): Promise<boolean>;
  startRecording(sessionId: string, quality: string, fps: number, microphone: boolean): Promise<{ frontUri?: string; rearUri?: string }>;
  stopRecording(): Promise<NativeDualRecordingResult>;
}

const nativeModule = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeMulticamModule>('SentinelMulticam') : null;

export const multicam = {
  isNativeAvailable: Boolean(nativeModule),
  async isSupportedAsync(): Promise<boolean> {
    return nativeModule ? nativeModule.isSupportedAsync() : false;
  },
  async startRecording(sessionId: string, quality: string, fps: number, microphone: boolean) {
    if (!nativeModule) throw new Error('MULTICAM_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.startRecording(sessionId, quality, fps, microphone);
  },
  async stopRecording() {
    if (!nativeModule) throw new Error('MULTICAM_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.stopRecording();
  },
};
