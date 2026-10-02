import { EventEmitter, requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface VoiceTriggerAuthorization {
  speech: 'granted' | 'denied';
  microphone: 'granted' | 'denied';
}

export interface VoicePhraseEvent {
  phrase: string;
  transcript: string;
}

interface NativeVoiceTriggerModule {
  __expo_module_name__?: string;
  requestAuthorizationAsync(): Promise<VoiceTriggerAuthorization>;
  startListening(phrases: string[], localeIdentifier: string): Promise<{ locale: string; onDevice: string }>;
  stopListening(): Promise<void>;
}

const nativeModule = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeVoiceTriggerModule>('SentinelVoiceTrigger') : null;
const emitter = nativeModule ? new EventEmitter(nativeModule) : null;

export const voiceTrigger = {
  isNativeAvailable: Boolean(nativeModule),
  async requestAuthorizationAsync(): Promise<VoiceTriggerAuthorization> {
    if (!nativeModule) throw new Error('VOICE_TRIGGER_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.requestAuthorizationAsync();
  },
  async startListening(phrases: string[], localeIdentifier = 'en-US') {
    if (!nativeModule) throw new Error('VOICE_TRIGGER_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.startListening(phrases, localeIdentifier);
  },
  async stopListening() {
    if (!nativeModule) return;
    await nativeModule.stopListening();
  },
  addPhraseListener(listener: (event: VoicePhraseEvent) => void) {
    return emitter?.addListener('onPhraseDetected', listener);
  },
  addStateListener(listener: (event: { state: string }) => void) {
    return emitter?.addListener('onVoiceTriggerState', listener);
  },
};
