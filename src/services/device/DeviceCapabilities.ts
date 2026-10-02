import * as Battery from 'expo-battery';
import { Camera } from 'expo-camera/legacy';
import { Platform } from 'react-native';

import { CapabilitySnapshot } from '../../types/models';
import { multicam } from '../../native/multicam';

export async function getDeviceCapabilities(): Promise<CapabilitySnapshot> {
  const cameraTypes: string[] = await Camera.getAvailableCameraTypesAsync().catch(() => [] as string[]);
  const batteryLevel = await Battery.getBatteryLevelAsync().catch(() => undefined);
  const hasFrontCamera = cameraTypes.includes('front');
  const hasRearCamera = cameraTypes.includes('back');
  const dualCameraSupported = Platform.OS === 'ios' ? await multicam.isSupportedAsync().catch(() => false) : false;

  return {
    hasFrontCamera,
    hasRearCamera,
    // Expo managed workflow cannot safely infer simultaneous multi-camera hardware.
    // Native camera capability probing belongs behind this service when prebuild is enabled.
    dualCameraSupported,
    torchSupported: hasRearCamera,
    stabilizationSupported: hasRearCamera,
    backgroundAudioSupported: Platform.OS === 'ios' || Platform.OS === 'android',
    backgroundVideoSupported: false,
    biometricsAvailable: false,
    storageAvailableBytes: undefined,
    batteryLevel: batteryLevel ?? undefined,
    thermalState: Platform.OS === 'ios' || Platform.OS === 'android' ? 'unknown' : undefined,
  };
}
