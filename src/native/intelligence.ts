import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface NativeIntelligenceModule {
  availabilityAsync(): Promise<{ available: boolean; reason: string }>;
  summarizeAsync(text: string): Promise<string>;
}

const nativeModule = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeIntelligenceModule>('SentinelIntelligence') : null;

export const deviceIntelligence = {
  async availabilityAsync() {
    return nativeModule?.availabilityAsync() ?? { available: false, reason: 'On-device language model support is unavailable in this build.' };
  },
  async summarizeAsync(text: string) {
    if (!nativeModule) throw new Error('INTELLIGENCE_NATIVE_MODULE_UNAVAILABLE');
    return nativeModule.summarizeAsync(text);
  },
};
