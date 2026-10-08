import React, { useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';

import { Badge, Button, Chip, IconButton, Label } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { PermissionComicPrompt } from '../../components/PermissionComicPrompt';
import { CapabilitySnapshot, CaptureMode } from '../../types/models';
import { colors, commonStyles, radii, spacing, typography } from '../../theme';
import { useApp } from '../../context/AppContext';
import { multicam } from '../../native/multicam';
import { getUseCaseMode } from './modeSets';

interface Props {
  mode: CaptureMode;
  capabilities: CapabilitySnapshot | null;
  quickStartToken?: number;
  onQuickStartConsumed?: (token: number) => void;
}

type CameraLayout = 'split' | 'pip' | 'front_dominant' | 'rear_dominant' | 'podcast' | 'speaker_focus' | 'host_focus' | 'guest_focus';
type CameraPreset = 'standard' | 'cinematic' | 'action' | 'low_light' | 'portrait';
type ControlSectionId = 'preset' | 'layout' | 'quality' | 'fps';

export function CameraWorkspace({ mode, capabilities, quickStartToken = 0, onQuickStartConsumed }: Props) {
  const { activeSession, startCapture, stopCapture, addMarker, addLocationSample, lockActiveSession, clearQuickCaptureRequest, selectedUseCaseModeId, cameraOptions, customCaptureConfig, drivePreferences, roomPreferences } = useApp();
  const useCase = getUseCaseMode(selectedUseCaseModeId);
  const isDrive = useCase?.id === 'drive';
  const isRoom = useCase?.id === 'room';
  const custom = useCase?.id === 'custom';
  const defaultLens = (isDrive && drivePreferences.view === 'cabin') || (isRoom && roomPreferences.lens === 'front') ? 'front' : custom ? customCaptureConfig.lens : useCase?.lens ?? (mode === 'front_video' ? 'front' : 'rear');
  const defaultQuality = isDrive ? drivePreferences.quality : isRoom ? roomPreferences.quality : cameraOptions.night ? '720p' : custom ? customCaptureConfig.quality : useCase?.quality ?? '1080p';
  const defaultFps = isDrive ? drivePreferences.fps : cameraOptions.night ? 24 : custom ? customCaptureConfig.fps : useCase?.fps ?? 30;
  const microphone = isDrive ? drivePreferences.microphone : isRoom ? roomPreferences.microphone : custom ? customCaptureConfig.microphone : true;
  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState<'camera' | 'microphone' | null>(null);
  const permissionRequestInFlight = React.useRef(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const cameraRef = React.useRef<CameraView>(null);
  const recordingRef = React.useRef(false);
  const interruptedRef = React.useRef(false);
  const nativeMediaRef = React.useRef<{ frontUri?: string; rearUri?: string } | null>(null);
  const locationSubscriptionRef = React.useRef<Location.LocationSubscription | null>(null);
  const [tripLocation, setTripLocation] = useState<{ state: 'off' | 'acquiring' | 'active' | 'denied'; speedMps?: number; accuracyMeters?: number }>({ state: 'off' });
  const [activeCamera, setActiveCamera] = useState<'rear' | 'front'>(defaultLens);
  const [layout, setLayout] = useState<CameraLayout>(mode === 'podcast' ? 'podcast' : mode === 'dual_camera' || mode === 'double_surveillance' || (isDrive && drivePreferences.view === 'dual') ? 'pip' : 'rear_dominant');
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [recording, setRecording] = useState(false);
  const [quality, setQuality] = useState<'480p' | '720p' | '1080p' | '2160p'>(defaultQuality);
  const [fps, setFps] = useState(String(defaultFps));
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('standard');
  const [openControl, setOpenControl] = useState<ControlSectionId | null>('preset');
  const [loopRecording, setLoopRecording] = useState(true);
  const [loopWindow, setLoopWindow] = useState('5 min');
  const [eventTrigger, setEventTrigger] = useState<'manual' | 'motion' | 'sound'>('manual');
  const dualRequested = mode === 'dual_camera' || mode === 'double_surveillance';
  const dualAvailable = Boolean(capabilities?.dualCameraSupported);
  const podcastDual = mode === 'podcast' && dualAvailable;
  const useNativeDual = dualRequested || podcastDual || (isDrive ? drivePreferences.view === 'dual' && dualAvailable : isRoom ? roomPreferences.lens === 'dual' && dualAvailable : cameraOptions.dualCamera && dualAvailable);
  const isDualView = useNativeDual && dualAvailable;
  const trackTrip = Boolean(useCase && ['drive', 'bike', 'adventure', 'incident'].includes(useCase.id));

  const stopTripLocation = () => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
  };

  const startTripLocation = async () => {
    if (!trackTrip || (isDrive && !drivePreferences.gps)) return;
    setTripLocation({ state: 'acquiring' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setTripLocation({ state: 'denied' }); return; }
      if (!recordingRef.current) return;
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, (sample) => {
        const speedMps = sample.coords.speed != null && sample.coords.speed >= 0 ? sample.coords.speed : undefined;
        setTripLocation({ state: 'active', speedMps, accuracyMeters: sample.coords.accuracy ?? undefined });
        addLocationSample({ timestamp: new Date(sample.timestamp).toISOString(), latitude: sample.coords.latitude, longitude: sample.coords.longitude, speedMps, accuracyMeters: sample.coords.accuracy ?? undefined });
      });
      if (recordingRef.current) locationSubscriptionRef.current = subscription;
      else subscription.remove();
    } catch { setTripLocation({ state: 'denied' }); }
  };

  const changeCamera = (lens: 'rear' | 'front') => {
    if (lens === activeCamera) return;
    setCameraReady(false);
    setActiveCamera(lens);
  };

  const showPermissionSettings = (device: 'camera' | 'microphone') => {
    Alert.alert(`${device === 'camera' ? 'Camera' : 'Microphone'} access needed`, `Allow SafeBro to use your ${device} in your device’s Settings, then try again.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
    ]);
  };

  const requestCameraAccess = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      setCaptureError('Camera access is needed to record.');
      if (!result.canAskAgain) showPermissionSettings('camera');
      return false;
    }
    setCaptureError(null);
    return true;
  };

  const requestVideoMicrophoneAccess = async () => {
    const result = await requestMicrophonePermission();
    if (!result.granted) {
      setCaptureError('Microphone access is needed for video with sound. Turn the mic off in Custom Mode to record silent video.');
      if (!result.canAskAgain) showPermissionSettings('microphone');
      return false;
    }
    setCaptureError(null);
    return true;
  };

  React.useEffect(() => {
    if (recording) return;
    setActiveCamera(defaultLens);
    setQuality(defaultQuality);
    setFps(String(defaultFps));
  }, [defaultLens, defaultQuality, defaultFps]);

  React.useEffect(() => {
    if (isDrive && !recording) setLayout(drivePreferences.view === 'dual' ? 'pip' : 'rear_dominant');
  }, [drivePreferences.view, isDrive, recording]);

  const beginRecording = async () => {
    if (recordingRef.current) return;
    if (!permission?.granted) {
      setPendingStart(true);
      setPermissionPrompt('camera');
      return;
    }
    if (!useNativeDual && !cameraReady) { setPendingStart(true); return; }
    if (microphone && !microphonePermission?.granted) {
      setPendingStart(true);
      setPermissionPrompt('microphone');
      return;
    }
    if (useNativeDual && !isDualView) return;
    setCaptureError(null);
    interruptedRef.current = false;
    const parts: { uri: string; startedAt: string; endedAt: string; durationMs: number }[] = [];
    try {
      const sessionId = await startCapture(undefined, { lens: useNativeDual ? 'dual' : activeCamera, quality, fps: Number(fps), microphone, night: cameraOptions.night });
      recordingRef.current = true;
      setRecording(true);
      void startTripLocation();
      if (useNativeDual) {
        nativeMediaRef.current = await multicam.startRecording(sessionId, quality, Number(fps), microphone);
      } else {
        const segmented = (isDrive || isRoom || loopRecording) && (Boolean(useCase && ['drive', 'room', 'park', 'continuous', 'low_power', 'smart_sentry'].includes(useCase.id)) || mode === 'security' || mode === 'dashcam' || mode === 'event_camera');
        while (recordingRef.current) {
          const startedAt = new Date();
          const result = await cameraRef.current?.recordAsync(segmented ? { maxDuration: (isDrive ? drivePreferences.segmentMinutes : isRoom ? roomPreferences.segmentMinutes : Number(loopWindow.split(' ')[0])) * 60 } : undefined);
          const endedAt = new Date();
          if (result?.uri) parts.push({ uri: result.uri, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), durationMs: endedAt.getTime() - startedAt.getTime() });
          if (!segmented || !result?.uri) break;
        }
        await stopCapture({ videoParts: parts, interrupted: interruptedRef.current });
      }
    } catch (error) {
      recordingRef.current = false;
      await stopCapture(useNativeDual ? { ...nativeMediaRef.current, interrupted: true } : { videoParts: parts, interrupted: true });
      setRecording(false);
      setCaptureError(error instanceof Error ? error.message : 'Recording stopped before it could be saved.');
    } finally {
      if (!useNativeDual) {
        recordingRef.current = false;
        stopTripLocation();
        setRecording(false);
      }
    }
  };

  React.useEffect(() => {
    if (!pendingStart || !permission?.granted || (!useNativeDual && !cameraReady)) return;
    setPendingStart(false);
    void beginRecording();
  }, [pendingStart, permission?.granted, microphonePermission?.granted, cameraReady, useNativeDual]);

  const continuePermissionRequest = async () => {
    if (permissionRequestInFlight.current) return;
    const device = permissionPrompt;
    setPermissionPrompt(null);
    if (!device) return;
    permissionRequestInFlight.current = true;
    try {
      const granted = device === 'camera' ? await requestCameraAccess() : await requestVideoMicrophoneAccess();
      if (!granted) setPendingStart(false);
    } catch {
      setCaptureError(`Could not request ${device} access. Check your device’s Settings and try again.`);
      setPendingStart(false);
    } finally {
      permissionRequestInFlight.current = false;
    }
  };

  const cancelPermissionRequest = () => {
    setPermissionPrompt(null);
    setPendingStart(false);
  };

  const endRecording = async () => {
    recordingRef.current = false;
    stopTripLocation();
    if (useNativeDual) {
      try {
        const result = await multicam.stopRecording();
        await stopCapture({ ...result, interrupted: interruptedRef.current });
      } catch {
        await stopCapture({ ...nativeMediaRef.current, interrupted: true });
      } finally {
        nativeMediaRef.current = null;
        setRecording(false);
      }
      return;
    }
    cameraRef.current?.stopRecording();
  };

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || !recordingRef.current) return;
      interruptedRef.current = true;
      if (useNativeDual) void endRecording();
      else {
        recordingRef.current = false;
        cameraRef.current?.stopRecording();
      }
    });
    return () => subscription.remove();
  }, [useNativeDual, stopCapture]);

  React.useEffect(() => () => locationSubscriptionRef.current?.remove(), []);

  const applyPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === 'cinematic') { setQuality('2160p'); setFps('24'); setTorch(false); setZoom(0); }
    if (preset === 'action') { setQuality('1080p'); setFps('60'); setTorch(false); setZoom(0); }
    if (preset === 'low_light') { setQuality('720p'); setFps('24'); setTorch(true); setZoom(0); }
    if (preset === 'portrait') { setQuality('1080p'); setFps('30'); setTorch(false); setZoom(0.25); }
    if (preset === 'standard') { setQuality('1080p'); setFps('30'); setTorch(false); setZoom(0); }
  };

  const lastQuickStartToken = React.useRef(0);
  React.useEffect(() => {
    if (quickStartToken <= 0 || quickStartToken === lastQuickStartToken.current || recording) return;
    lastQuickStartToken.current = quickStartToken;
    clearQuickCaptureRequest(quickStartToken);
    onQuickStartConsumed?.(quickStartToken);
    void beginRecording();
  }, [clearQuickCaptureRequest, quickStartToken]);

  return <View style={styles.wrapper}>
    <View style={styles.workspaceHeader}><View style={styles.workspaceHeading}><Label color={colors.blue}>{isRoom ? 'ROOM WATCH CAMERA' : 'CAMERA WORKSPACE'}</Label><Text style={styles.title}>{isRoom ? 'Your room view' : dualRequested ? 'Dual camera' : 'Camera capture'}</Text></View><Badge color={isDualView ? colors.accent : colors.orange}>{isDualView ? 'DUAL READY' : 'PREVIEW'}</Badge></View>
    <View style={styles.previewFrame}>
      {permission?.granted && !useNativeDual ? <CameraView key={activeCamera} ref={cameraRef} style={styles.cameraView} facing={activeCamera === 'rear' ? 'back' : 'front'} mode="video" videoQuality={quality} videoStabilizationMode={useCase?.id === 'bike' || useCase?.id === 'sports' ? 'cinematic' : 'auto'} mute={!microphone} enableTorch={torch} zoom={zoom} onCameraReady={() => setCameraReady(true)} /> : null}
      <View style={[styles.feed, permission?.granted && !useNativeDual && styles.feedBehindCamera, (isDualView || dualRequested) && styles.feedRear, layout === 'front_dominant' && styles.feedSmall]}><FuturisticIcon name={permission?.granted && !useNativeDual ? 'capture' : 'signal'} size={34} color="#8DB7D8" accent={colors.accent} style={styles.feedIcon} /><Text style={styles.feedName}>{permission?.granted && !useNativeDual ? `${activeCamera.toUpperCase()} CAMERA` : useNativeDual && isDualView ? 'FRONT + REAR CAMERA' : 'CAMERA PREVIEW'}</Text><Text style={styles.feedState}>{permission?.granted && !useNativeDual ? 'LIVE' : useNativeDual && isDualView ? 'NATIVE MULTICAM READY' : 'READY TO ENABLE'}</Text></View>
      {useNativeDual && isDualView ? <View style={[styles.feed, styles.feedFront, layout === 'split' && styles.feedSplit, layout === 'front_dominant' && styles.feedFrontDominant, layout === 'rear_dominant' && styles.feedHidden]}><FuturisticIcon name="lens" size={34} color="#8DB7D8" accent={colors.accent} style={styles.feedIcon} /><Text style={styles.feedName}>FRONT CAMERA</Text><Text style={styles.feedState}>LIVE</Text></View> : null}
      <View style={styles.previewOverlay}><Text style={styles.previewOverlayText}>LIVE PREVIEW</Text><Text style={styles.previewOverlaySub}>Tap below to allow camera access</Text></View>
      {!isDualView && dualRequested ? <View style={styles.unsupportedOverlay}><Text style={styles.unsupportedTitle}>{mode === 'double_surveillance' ? 'DOUBLE SURVEILLANCE UNAVAILABLE' : 'DUAL CAMERA NOT SUPPORTED'}</Text><Text style={styles.unsupportedDetail}>This device does not expose simultaneous front + rear capture. No feed is simulated.</Text></View> : null}
      {!permission?.granted && !useNativeDual ? <Pressable onPress={() => setPermissionPrompt('camera')} style={styles.enableButton}><Text style={styles.enableButtonText}>ALLOW CAMERA ACCESS</Text></Pressable> : null}
    </View>
    {captureError ? <Text style={styles.captureError}>{captureError}</Text> : null}

    {isDrive || isRoom ? <View style={styles.driveControls}><Text style={styles.driveLive}>{recording ? isDrive ? '● DRIVE RECORDING' : '● ROOM WATCH LIVE' : isDrive ? '● DRIVE CAMERA READY' : '● ROOM CAMERA READY'}</Text><Button label={recording ? isDrive ? 'STOP & SAVE DRIVE' : 'STOP & SAVE ROOM' : isDrive ? 'START DRIVE' : 'START ROOM WATCH'} icon={recording ? '■' : '●'} variant={recording ? 'danger' : 'primary'} onPress={() => { void (recording ? endRecording() : beginRecording()); }} style={styles.driveStop} /></View> : <View style={styles.cameraControls}><IconButton label="↺" onPress={() => changeCamera(activeCamera === 'rear' ? 'front' : 'rear')} active /><View style={styles.activeCamera}><Text style={styles.activeCameraLabel}>ACTIVE FEED</Text><Text style={styles.activeCameraValue}>{activeCamera.toUpperCase()}</Text></View><IconButton label="ϟ" onPress={() => setTorch(!torch)} active={torch} /><IconButton label={recording ? '■' : '●'} onPress={recording ? endRecording : beginRecording} danger={recording} active={!recording} /></View>}
    {!isDrive && !isRoom ? <><View style={styles.controlRow}><Chip label="REAR" selected={activeCamera === 'rear'} onPress={() => changeCamera('rear')} color={colors.blue} /><Chip label="FRONT" selected={activeCamera === 'front'} onPress={() => changeCamera('front')} color={colors.purple} /><Chip label={torch ? 'TORCH ON' : 'TORCH'} selected={torch} onPress={() => setTorch(!torch)} color={colors.orange} /><Chip label={`ZOOM ${zoom === 0 ? '1×' : zoom === 0.5 ? '2×' : '4×'}`} onPress={() => setZoom(zoom === 0 ? 0.5 : zoom === 0.5 ? 1 : 0)} /></View>
    <ControlDropdown title="CAMERA PRESET" value={cameraPreset.replace('_', ' ').toUpperCase()} open={openControl === 'preset'} onPress={() => setOpenControl(openControl === 'preset' ? null : 'preset')}>
      <View style={styles.controlRow}><Chip label="STANDARD" selected={cameraPreset === 'standard'} onPress={() => applyPreset('standard')} /><Chip label="CINEMATIC" selected={cameraPreset === 'cinematic'} onPress={() => applyPreset('cinematic')} color={colors.purple} /><Chip label="ACTION" selected={cameraPreset === 'action'} onPress={() => applyPreset('action')} color={colors.blue} /><Chip label="LOW LIGHT" selected={cameraPreset === 'low_light'} onPress={() => applyPreset('low_light')} color={colors.orange} /><Chip label="PORTRAIT" selected={cameraPreset === 'portrait'} onPress={() => applyPreset('portrait')} color={colors.purple} /></View>
    </ControlDropdown>
    <ControlDropdown title={mode === 'podcast' ? 'PODCAST CAMERA LAYOUT' : 'LAYOUT'} value={layout === 'pip' ? 'PICTURE IN PICTURE' : layout.replace('_', ' ').toUpperCase()} open={openControl === 'layout'} onPress={() => setOpenControl(openControl === 'layout' ? null : 'layout')}>
      <View style={styles.controlRow}>{(mode === 'podcast' ? [['split', 'Split'], ['pip', 'Picture in Picture'], ['speaker_focus', 'Speaker Focus'], ['host_focus', 'Host Focus'], ['guest_focus', 'Guest Focus']] : [['split', 'Split'], ['pip', 'Picture in Picture'], ['front_dominant', 'Front dominant'], ['rear_dominant', 'Rear dominant']]).map(([id, label]) => <Chip key={id} label={label} selected={layout === id} onPress={() => setLayout(id as CameraLayout)} />)}</View>
    </ControlDropdown>
    </> : null}
    <View style={styles.specGrid}><Spec label="QUALITY" value={quality === '2160p' ? '4K' : quality.toUpperCase()} /><Spec label="FPS TARGET" value={fps} /><Spec label="MIC" value={microphone ? 'ON' : 'OFF'} /><Spec label="STABILIZATION" value={capabilities?.stabilizationSupported ? 'AUTO' : '—'} /></View>
    {trackTrip ? <View style={styles.tripPanel}><View><Label color={colors.blue}>TRIP LOCATION</Label><Text style={styles.tripStatus}>{tripLocation.state === 'active' ? `GPS ±${Math.round(tripLocation.accuracyMeters ?? 0)}m` : tripLocation.state === 'denied' ? 'Location unavailable' : tripLocation.state === 'acquiring' ? 'Finding location…' : 'Starts with recording'}</Text></View><View style={styles.tripSpeed}><Text style={styles.tripSpeedValue}>{tripLocation.speedMps == null ? '—' : Math.round(tripLocation.speedMps * 2.23694)}</Text><Text style={styles.tripSpeedUnit}>MPH</Text></View></View> : null}
    {!isDrive && !isRoom ? <><ControlDropdown title="VIDEO QUALITY" value={quality === '2160p' ? '4K / MAX' : quality.toUpperCase()} open={openControl === 'quality'} onPress={() => setOpenControl(openControl === 'quality' ? null : 'quality')}>
      <View style={styles.controlRow}><Chip label="480P" selected={quality === '480p'} onPress={() => setQuality('480p')} /><Chip label="720P" selected={quality === '720p'} onPress={() => setQuality('720p')} /><Chip label="1080P" selected={quality === '1080p'} onPress={() => setQuality('1080p')} /><Chip label="4K / MAX" selected={quality === '2160p'} onPress={() => setQuality('2160p')} color={colors.purple} /></View>
    </ControlDropdown>
    <ControlDropdown title="FRAME RATE" value={`${fps} FPS`} open={openControl === 'fps'} onPress={() => setOpenControl(openControl === 'fps' ? null : 'fps')}>
      <View style={styles.controlRow}><Chip label="15 FPS" selected={fps === '15'} onPress={() => setFps('15')} /><Chip label="24 FPS" selected={fps === '24'} onPress={() => setFps('24')} /><Chip label="30 FPS" selected={fps === '30'} onPress={() => setFps('30')} /><Chip label="60 FPS" selected={fps === '60'} onPress={() => setFps('60')} color={colors.purple} /></View>
    </ControlDropdown>
    <Text style={styles.securityFootnote}>Frame rate selection applies to native dual capture. Single camera uses the rate provided by iOS for its chosen quality.</Text></> : null}
    {mode === 'podcast' ? <View style={styles.modeNotice}><FuturisticIcon name="podcast" size={24} color={colors.purple} accent={colors.accent} /><View style={{ flex: 1 }}><Text style={styles.modeNoticeTitle}>PODCAST STUDIO CAMERA</Text><Text style={styles.modeNoticeDetail}>Mic capture, speaker layouts, captions, chapter markers, and camera switching stay in one session. Multi-camera layouts activate only when the device exposes both feeds.</Text></View></View> : null}
    {!isDrive && !isRoom && (mode === 'security' || mode === 'double_surveillance' || mode === 'dashcam' || mode === 'event_camera') ? <View style={styles.securityPanel}>
      <View style={styles.securityHeader}><View style={styles.securityHeading}><Label color={colors.orange}>{useCase?.label.toUpperCase() ?? (mode === 'double_surveillance' ? 'DOUBLE SURVEILLANCE' : mode === 'dashcam' ? 'DASHBOARD CAMERA' : mode === 'event_camera' ? 'MOTION EVENTS' : 'SECURITY CAMERA')}</Label><Text style={styles.securityTitle}>{useCase?.detail ?? (mode === 'double_surveillance' ? 'Two-lens event capture' : 'Single-camera capture')}</Text></View><Badge color={loopRecording ? colors.orange : colors.textMuted}>{loopRecording ? 'CHUNKS ON' : 'CHUNKS OFF'}</Badge></View>
      <View style={styles.securityActions}><Button label="MARK EVENT" icon="◆" variant="secondary" onPress={() => addMarker('incident')} style={styles.securityButton} /><Button label="LOCK EVENT" icon="⌑" variant="danger" onPress={lockActiveSession} style={styles.securityButton} /></View>
      <View style={styles.controlRow}><Chip label="CHUNKED RECORD" selected={loopRecording} onPress={() => setLoopRecording(!loopRecording)} color={colors.orange} /><Chip label="2 MIN" selected={loopWindow === '2 min'} onPress={() => setLoopWindow('2 min')} color={colors.orange} /><Chip label="5 MIN" selected={loopWindow === '5 min'} onPress={() => setLoopWindow('5 min')} color={colors.orange} /><Chip label="10 MIN" selected={loopWindow === '10 min'} onPress={() => setLoopWindow('10 min')} color={colors.orange} /></View>
      <View style={styles.controlRow}><Chip label="MOTION SETUP" selected={eventTrigger === 'motion'} onPress={() => setEventTrigger('motion')} /><Chip label="SOUND SETUP" selected={eventTrigger === 'sound'} onPress={() => setEventTrigger('sound')} /><Chip label="MANUAL" selected={eventTrigger === 'manual'} onPress={() => setEventTrigger('manual')} /></View>
      <Text style={styles.securityFootnote}>Recording is split into consecutive files while SafeBro is open. Automatic motion and sound triggers, pre-event buffers and in-session overwrite still need the native event recorder. Mark and Lock Event work now. iOS pauses the camera when the app is backgrounded.</Text>
    </View> : null}
    {!dualRequested && !isDrive && !isRoom ? <Pressable style={styles.switchBanner} onPress={() => changeCamera(activeCamera === 'rear' ? 'front' : 'rear')}><FuturisticIcon name="dual" size={24} color={colors.blue} accent={colors.accent} /><View style={{ flex: 1 }}><Text style={styles.switchTitle}>SWITCH FRONT / REAR CAMERA</Text><Text style={styles.switchDetail}>The active feed changes without pretending both cameras are recording.</Text></View><FuturisticIcon name="arrow" size={20} color={colors.textMuted} accent={colors.accent} /></Pressable> : null}
    <PermissionComicPrompt device={permissionPrompt} visible={permissionPrompt !== null} onContinue={continuePermissionRequest} onCancel={cancelPermissionRequest} />
  </View>;
}

function Spec({ label, value }: { label: string; value: string }) {
  return <View style={styles.spec}><Text style={styles.specLabel}>{label}</Text><Text style={styles.specValue}>{value}</Text></View>;
}

function ControlDropdown({ title, value, open, onPress, children }: React.PropsWithChildren<{ title: string; value: string; open: boolean; onPress: () => void }>) {
  return <View style={styles.dropdown}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={({ pressed }) => [styles.dropdownHeader, pressed && styles.dropdownHeaderPressed]}>
      <View style={styles.dropdownCopy}><Text style={styles.dropdownTitle}>{title}</Text><Text style={styles.dropdownValue}>{value}</Text></View>
      <Text style={styles.dropdownChevron}>{open ? '⌃' : '⌄'}</Text>
    </Pressable>
    {open ? <View style={styles.dropdownContent}>{children}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  driveControls: { gap: 12, marginTop: 16 }, driveLive: { ...typography.label, color: colors.red }, driveStop: { minHeight: 68 },
  wrapper: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.panel, marginBottom: spacing.lg },
  workspaceHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 },
  workspaceHeading: { flex: 1, minWidth: 140 },
  title: { ...typography.title, color: colors.text, marginTop: 5 },
  previewFrame: { height: 230, borderRadius: 18, overflow: 'hidden', backgroundColor: '#07090D', borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, position: 'relative' },
  feed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C1420', borderWidth: 1, borderColor: `${colors.blue}44` },
  feedRear: { backgroundColor: '#0C1420' },
  feedBehindCamera: { opacity: 0 },
  feedSmall: { width: '43%', height: '38%', right: 10, bottom: 10, left: undefined, top: undefined, borderRadius: 10, zIndex: 3 },
  feedFront: { backgroundColor: '#161126', borderColor: `${colors.purple}55`, width: '43%', height: '38%', right: 10, bottom: 10, left: undefined, top: undefined, borderRadius: 10, zIndex: 3 },
  feedSplit: { width: '50%', height: '100%', right: 0, bottom: undefined, borderRadius: 0 },
  feedFrontDominant: { width: '100%', height: '100%', right: 0, bottom: undefined, borderRadius: 0, zIndex: 2 },
  feedHidden: { display: 'none' },
  feedIcon: { color: '#8DB7D8', fontSize: 34, marginBottom: 8 },
  feedName: { ...typography.label, color: '#F7FBFF' },
  feedState: { ...typography.caption, color: '#AFC5D7', marginTop: 5 },
  previewOverlay: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 5 },
  previewOverlayText: { ...typography.label, color: colors.red },
  previewOverlaySub: { ...typography.caption, color: '#B7C9D8', marginTop: 4 },
  cameraView: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  enableButton: { position: 'absolute', alignSelf: 'center', bottom: 22, zIndex: 10, backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11 },
  enableButtonText: { ...typography.label, color: colors.white },
  unsupportedOverlay: { position: 'absolute', left: 14, right: 14, bottom: 14, padding: 12, borderRadius: 12, backgroundColor: '#080A0FCC', borderWidth: 1, borderColor: `${colors.orange}77`, zIndex: 8 },
  unsupportedTitle: { ...typography.label, color: colors.orange },
  unsupportedDetail: { ...typography.caption, color: '#D6E2EB', lineHeight: 17, marginTop: 4 },
  cameraControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  activeCamera: { flex: 1, alignItems: 'center' },
  activeCameraLabel: { ...typography.label, color: colors.textSubtle, fontSize: 9 },
  activeCameraValue: { ...typography.bodyMedium, color: colors.text, marginTop: 4 },
  controlRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  dropdown: { marginTop: 16, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  dropdownHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  dropdownHeaderPressed: { backgroundColor: colors.surfaceElevated },
  dropdownCopy: { flex: 1, minWidth: 0 },
  dropdownTitle: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  dropdownValue: { ...typography.bodyMedium, color: colors.text, marginTop: 4, flexShrink: 1 },
  dropdownChevron: { color: colors.accent, fontSize: 22, marginLeft: 10, lineHeight: 22 },
  dropdownContent: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: spacing.md, paddingVertical: 16 },
  spec: { flexBasis: '42%', flexGrow: 1, minWidth: 100 },
  specLabel: { ...typography.label, color: colors.textMuted, fontSize: 10, lineHeight: 14, flexShrink: 1 },
  specValue: { ...typography.caption, color: colors.text, marginTop: 4 },
  switchBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md, padding: 11, borderRadius: 12, backgroundColor: colors.surfaceElevated },
  switchTitle: { ...typography.label, color: colors.blue, fontSize: 9 },
  switchDetail: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  modeNotice: { flexDirection: 'row', gap: 10, marginTop: spacing.md, padding: 12, borderRadius: 14, backgroundColor: `${colors.purple}12`, borderWidth: 1, borderColor: `${colors.purple}44` },
  modeNoticeTitle: { ...typography.label, color: colors.purple, fontSize: 9 },
  modeNoticeDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 17, marginTop: 4 },
  securityHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 },
  securityHeading: { flex: 1, minWidth: 140 },
  securityPanel: { marginTop: spacing.lg, padding: 16, borderRadius: 16, backgroundColor: `${colors.orange}0D`, borderWidth: 1, borderColor: `${colors.orange}44` },
  securityTitle: { ...typography.bodyMedium, color: colors.text, marginTop: 5 },
  securityActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  securityButton: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
  securityFootnote: { ...typography.caption, color: colors.textSubtle, lineHeight: 17, marginTop: 11 },
  captureError: { ...typography.caption, color: colors.red, lineHeight: 17, marginTop: 10 },
  tripPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: `${colors.blue}44`, backgroundColor: `${colors.blue}0D` },
  tripStatus: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  tripSpeed: { alignItems: 'flex-end' },
  tripSpeedValue: { ...typography.title, color: colors.text },
  tripSpeedUnit: { ...typography.label, color: colors.blue },
});
