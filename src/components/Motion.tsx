import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleProp, Text, View, ViewStyle } from 'react-native';

import { colors } from '../theme';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function FadeIn({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) { opacity.setValue(1); translateY.setValue(0); return; }
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 310, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, damping: 19, stiffness: 170, mass: 0.7, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY, reducedMotion]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function PressScale({ children, onPressIn, onPressOut, style }: PropsWithChildren<{ onPressIn?: () => void; onPressOut?: () => void; style?: StyleProp<ViewStyle> }>) {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const pressIn = () => {
    if (!reducedMotion) Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 16, stiffness: 280 }).start();
    onPressIn?.();
  };
  const pressOut = () => {
    if (!reducedMotion) Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 240 }).start();
    onPressOut?.();
  };
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

export function AmbientOrbs({ enabled = true }: { enabled?: boolean }) {
  const drift = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled || reducedMotion) { drift.stopAnimation(); drift.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 11000, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 11000, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift, enabled, reducedMotion]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 20] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 28] });
  return <>
    <Animated.View pointerEvents="none" style={[styles.orb, styles.orbBlue, { transform: [{ translateX }, { translateY }] }]} />
    <Animated.View pointerEvents="none" style={[styles.orb, styles.orbViolet, { transform: [{ translateX: translateY }, { translateY: translateX }] }]} />
    <Animated.View pointerEvents="none" style={[styles.orb, styles.orbAmber, { transform: [{ translateX: translateY }] }]} />
  </>;
}

export function SignalWave({ active, lowPower = false, color = '#2F9CF4', spectrum = false, style }: { active: boolean; lowPower?: boolean; color?: string; spectrum?: boolean; style?: StyleProp<ViewStyle> }) {
  const [pulseGroups] = useState(() => Array.from({ length: 7 }, () => new Animated.Value(0)));
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!active || lowPower || reducedMotion) {
      pulseGroups.forEach((pulse) => { pulse.stopAnimation(); pulse.setValue(0); });
      return;
    }
    const animations = pulseGroups.map((pulse, group) => Animated.loop(Animated.sequence([
      Animated.delay(group * 85),
      Animated.timing(pulse, { toValue: 1, duration: 540 + (group % 3) * 70, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 470 + (group % 2) * 90, useNativeDriver: true }),
    ])));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [active, lowPower, pulseGroups, reducedMotion]);
  const barCount = 49;
  const getBarHeight = (index: number) => {
    const distance = Math.abs(index - (barCount - 1) / 2) / ((barCount - 1) / 2);
    const envelope = 0.22 + 0.78 * Math.pow(1 - distance, 0.72);
    const texture = 0.32 + 0.68 * Math.abs(Math.sin(index * 1.31) * Math.cos(index * 0.53));
    return Math.round(5 + envelope * texture * 37);
  };
  const getSpectrumColor = (height: number, index: number) => {
    if (height >= 32) return '#D9FAFF';
    const palette = ['#55E4D0', '#54DDF6', '#65B9FF', '#9A8BFF'];
    return palette[Math.min(palette.length - 1, Math.floor(index / 13))];
  };
  return <View style={[styles.wave, style]} accessibilityLabel={active ? 'Recording signal activity' : 'Audio waveform'}>
    <View pointerEvents="none" style={[styles.waveBaseline, { backgroundColor: active ? '#66DFFF88' : '#63B8DF44' }]} />
    {Array.from({ length: barCount }).map((_, index) => {
    const height = getBarHeight(index);
    const pulse = pulseGroups[index % pulseGroups.length];
    const lowScale = 0.66 + (index % 4) * 0.045;
    const highScale = 0.82 + (height / 42) * 0.78;
    const scaleY = pulse.interpolate({ inputRange: [0, 1], outputRange: index % 5 === 0 ? [highScale, lowScale] : [lowScale, highScale] });
    const barColor = spectrum ? getSpectrumColor(height, index) : color;
    return <Animated.View key={index} style={{ width: 3, height, borderRadius: 4, backgroundColor: barColor, opacity: active ? 1 : 0.62, shadowColor: barColor, shadowOpacity: active ? 0.76 : 0.2, shadowRadius: active ? 5 : 2, shadowOffset: { width: 0, height: 0 }, transform: [{ scaleY }] }} />;
  })}</View>;
}

export function AudioSignalConsole({ active, paused = false }: { active: boolean; paused?: boolean }) {
  const reducedMotion = useReducedMotion();
  const dialPulse = useRef(new Animated.Value(0)).current;
  const traceGroups = useState(() => Array.from({ length: 5 }, () => new Animated.Value(0)))[0];
  const playhead = useRef(new Animated.Value(0)).current;
  const signalColor = paused ? colors.orange : active ? colors.aqua : colors.accent;

  useEffect(() => {
    if (!active || paused || reducedMotion) {
      dialPulse.stopAnimation();
      dialPulse.setValue(0.24);
      traceGroups.forEach((pulse) => { pulse.stopAnimation(); pulse.setValue(0); });
      playhead.stopAnimation();
      playhead.setValue(0);
      return;
    }
    const dialAnimation = Animated.loop(Animated.sequence([
      Animated.timing(dialPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(dialPulse, { toValue: 0.16, duration: 900, useNativeDriver: true }),
    ]));
    const traceAnimations = traceGroups.map((pulse, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 80),
      Animated.timing(pulse, { toValue: 1, duration: 430 + index * 55, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 470 + index * 35, useNativeDriver: true }),
    ])));
    const playheadAnimation = Animated.loop(Animated.timing(playhead, { toValue: 1, duration: 3400, useNativeDriver: true }));
    dialAnimation.start();
    traceAnimations.forEach((animation) => animation.start());
    playheadAnimation.start();
    return () => {
      dialAnimation.stop();
      traceAnimations.forEach((animation) => animation.stop());
      playheadAnimation.stop();
    };
  }, [active, dialPulse, paused, playhead, reducedMotion, traceGroups]);

  const dialRotation = dialPulse.interpolate({ inputRange: [0, 1], outputRange: ['-48deg', '48deg'] });
  const dialGlow = dialPulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.95] });
  const playheadX = playhead.interpolate({ inputRange: [0, 1], outputRange: [0, 270] });
  const ticks = Array.from({ length: 28 }, (_, index) => {
    const angle = (index / 28) * Math.PI * 2 - Math.PI / 2;
    const radius = 87;
    return { left: 99 + Math.cos(angle) * radius - 1, top: 99 + Math.sin(angle) * radius - 5, angle: (index / 28) * 360 };
  });
  const traceBars = Array.from({ length: 31 }, (_, index) => {
    const texture = Math.abs(Math.sin(index * 1.47) * Math.cos(index * 0.67));
    const envelope = 0.22 + 0.78 * Math.abs(Math.sin((index / 30) * Math.PI));
    return Math.round(12 + texture * envelope * 45);
  });

  return <View style={styles.consoleShell} accessibilityLabel={active ? 'Live audio level dial and waveform' : 'Audio level dial and waveform'}>
    <View style={styles.consoleMeta}><View><View style={styles.consoleLabelRow}><View style={[styles.consoleStatusDot, { backgroundColor: signalColor }]} /><Animated.Text style={[styles.consoleLabel, { color: signalColor, opacity: active && !paused ? dialGlow : 1 }]}>{paused ? 'PAUSED LEVEL' : active ? 'LIVE INPUT LEVEL' : 'INPUT LEVEL'}</Animated.Text></View><View style={styles.consoleSubLabel}>SAFE BRO · LOCAL SIGNAL</View></View><View style={styles.consoleChip}><View style={[styles.consoleChipDot, { backgroundColor: signalColor }]} /><Animated.Text style={styles.consoleChipText}>{active && !paused ? 'MONITORING' : paused ? 'HOLD' : 'READY'}</Animated.Text></View></View>

    <View style={styles.dialStage}>
      <View style={[styles.dialOuter, { borderColor: `${signalColor}66` }]} />
      <View style={styles.dialMiddle} />
      <View style={styles.dialInner} />
      {ticks.map((tick, index) => <View key={index} style={[styles.dialTick, index % 4 === 0 && styles.dialTickMajor, { left: tick.left, top: tick.top, backgroundColor: index % 4 === 0 ? signalColor : '#8BA4B6', transform: [{ rotate: `${tick.angle}deg` }] }]} />)}
      <Animated.View style={[styles.dialNeedle, { backgroundColor: signalColor, shadowColor: signalColor, opacity: dialGlow, transform: [{ rotate: dialRotation }] }]} />
      <View style={[styles.dialHub, { borderColor: signalColor }]}><View style={[styles.dialHubCore, { backgroundColor: signalColor }]} /></View>
      <View style={styles.dialReadout}><Animated.Text style={[styles.dialValue, { color: signalColor }]}>{active ? paused ? '−18.0' : '−12.0' : '—'}</Animated.Text><View style={[styles.dialUnderline, { backgroundColor: signalColor }]} /><Text style={styles.dialCaption}>PEAK dB</Text></View>
    </View>

    <View style={styles.traceHeader}><View><Text style={styles.traceTitle}>SOUND TRACE / LIVE</Text><Text style={styles.traceSubTitle}>{active && !paused ? 'MOVING AIR · LOCAL ONLY' : paused ? 'SIGNAL HOLD' : 'READY FOR INPUT'}</Text></View><View style={styles.traceIcon}><View style={[styles.traceIconBar, { backgroundColor: colors.orange, transform: [{ rotate: '-38deg' }] }]} /><View style={[styles.traceIconBar, { backgroundColor: colors.aqua, transform: [{ rotate: '38deg' }] }]} /></View></View>
    <View style={styles.traceGraph}>
      {[0, 1, 2, 3].map((line) => <View key={`h-${line}`} style={[styles.traceGridLine, { top: `${18 + line * 23}%` }]} />)}
      {[0, 1, 2, 3, 4].map((line) => <View key={`v-${line}`} style={[styles.traceGridVertical, { left: `${line * 25}%` }]} />)}
      <Animated.View style={[styles.tracePlayhead, { backgroundColor: signalColor, opacity: active ? 0.6 : 0.18, transform: [{ translateX: playheadX }] }]} />
      <View style={styles.traceBars}>{traceBars.map((height, index) => { const pulse = traceGroups[index % traceGroups.length]; const low = 0.56 + (index % 3) * 0.08; const high = 0.86 + (height / 58) * 0.4; const scaleY = pulse.interpolate({ inputRange: [0, 1], outputRange: [low, high] }); const barColor = index % 7 === 0 ? colors.orange : index % 3 === 0 ? colors.blue : signalColor; return <Animated.View key={index} style={[styles.traceBar, { height, backgroundColor: barColor, opacity: active ? 0.92 : 0.56, transform: [{ scaleY }] }]} />; })}</View>
      <View style={styles.traceBaseline} />
      <View style={styles.traceAxis}><View style={styles.axisLabels}><Text style={styles.axisLabel}>00</Text><Text style={styles.axisLabel}>15</Text><Text style={styles.axisLabel}>30</Text></View><Text style={styles.axisUnit}>SECONDS</Text></View>
    </View>

    <View style={styles.waveStrip}><SignalSweep active={active && !paused} color={signalColor} /><SignalWave active={active && !paused} color={signalColor} spectrum style={styles.consoleWave} /></View>
  </View>;
}

export function SignalBeacon({ active, color = '#2F9CF4', size = 18 }: { active: boolean; color?: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!active || reducedMotion) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1050, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1050, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [active, pulse, reducedMotion]);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.85] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return <View pointerEvents="none" style={[styles.beacon, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={active ? 'Recording active' : 'Recording ready'}>
    <Animated.View style={[styles.beaconRing, { width: size, height: size, borderRadius: size / 2, borderColor: color, opacity: active ? ringOpacity : 0, transform: [{ scale: ringScale }] }]} />
    <View style={[styles.beaconCore, { width: size * 0.46, height: size * 0.46, borderRadius: size, backgroundColor: color, shadowColor: color }]} />
  </View>;
}

export function SignalSweep({ active, color = '#2F9CF4' }: { active: boolean; color?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!active || reducedMotion) { progress.stopAnimation(); progress.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(progress, { toValue: 1, duration: 2400, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [active, progress, reducedMotion]);
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-90, 360] });
  return <View pointerEvents="none" style={styles.sweepViewport}>
    <Animated.View style={[styles.sweep, { backgroundColor: color, opacity: active ? 0.12 : 0.045, transform: [{ translateX }, { skewX: '-18deg' }] }]} />
  </View>;
}

const styles = {
  orb: { position: 'absolute' as const, borderRadius: 999, opacity: 0.2 },
  orbBlue: { width: 310, height: 310, top: -120, right: -120, backgroundColor: '#8FD7FF' },
  orbViolet: { width: 240, height: 240, bottom: 58, left: -150, backgroundColor: '#7FEBDD' },
  orbAmber: { width: 180, height: 180, bottom: 270, right: -122, backgroundColor: '#FFD83D', opacity: 0.14 },
  wave: { height: 52, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  waveBaseline: { position: 'absolute' as const, left: 0, right: 0, top: 25, height: 1, backgroundColor: '#2F9CF433' },
  beacon: { alignItems: 'center' as const, justifyContent: 'center' as const },
  beaconRing: { position: 'absolute' as const, borderWidth: 1.5 },
  beaconCore: { shadowOpacity: 0.7, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  sweepViewport: { ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' as const }) },
  sweep: { position: 'absolute' as const, top: -12, bottom: -12, width: 56 },
  consoleShell: { borderRadius: 20, borderWidth: 2, borderColor: '#65D9D055', backgroundColor: '#0E2A52', padding: 14, overflow: 'hidden' as const },
  consoleMeta: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, gap: 10, marginBottom: 5 },
  consoleLabelRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7 },
  consoleStatusDot: { width: 7, height: 7, borderRadius: 4 },
  consoleLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900' as const, letterSpacing: 1.2 },
  consoleSubLabel: { color: '#A9C0D0', fontSize: 9, lineHeight: 13, fontWeight: '700' as const, letterSpacing: 0.7, marginTop: 4 },
  consoleChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, borderWidth: 1, borderColor: '#A9C0D055', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFFFFF0A' },
  consoleChipDot: { width: 5, height: 5, borderRadius: 3 },
  consoleChipText: { color: '#E9F4F4', fontSize: 8, lineHeight: 10, fontWeight: '900' as const, letterSpacing: 0.7 },
  dialStage: { width: 198, height: 198, alignSelf: 'center' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 2, marginBottom: 5 },
  dialOuter: { position: 'absolute' as const, width: 192, height: 192, borderRadius: 96, borderWidth: 2, backgroundColor: '#0A2340' },
  dialMiddle: { position: 'absolute' as const, width: 166, height: 166, borderRadius: 83, borderWidth: 2, borderColor: '#8BA4B666' },
  dialInner: { position: 'absolute' as const, width: 136, height: 136, borderRadius: 68, borderWidth: 1.5, borderColor: '#8BA4B644', backgroundColor: '#0E2A52' },
  dialTick: { position: 'absolute' as const, width: 2, height: 9, borderRadius: 2, opacity: 0.8 },
  dialTickMajor: { width: 3, height: 13, opacity: 1 },
  dialNeedle: { position: 'absolute' as const, width: 3, height: 72, borderRadius: 3, top: 63, shadowOpacity: 0.85, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  dialHub: { position: 'absolute' as const, width: 27, height: 27, borderRadius: 14, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#0E2A52' },
  dialHubCore: { width: 9, height: 9, borderRadius: 5 },
  dialReadout: { position: 'absolute' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 1 },
  dialValue: { fontSize: 31, lineHeight: 36, fontWeight: '900' as const, letterSpacing: -0.7 },
  dialUnderline: { width: 40, height: 4, borderRadius: 3, marginTop: 5, marginBottom: 7 },
  dialCaption: { color: '#B8C9D2', fontSize: 10, lineHeight: 12, fontWeight: '900' as const, letterSpacing: 1.6 },
  traceHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, borderTopWidth: 1, borderTopColor: '#A9C0D033', paddingTop: 11, marginTop: 1, marginBottom: 8 },
  traceTitle: { color: '#E9F4F4', fontSize: 10, lineHeight: 13, fontWeight: '900' as const, letterSpacing: 1.3 },
  traceSubTitle: { color: '#A9C0D0', fontSize: 8, lineHeight: 11, fontWeight: '700' as const, letterSpacing: 0.5, marginTop: 3 },
  traceIcon: { width: 25, height: 22, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: 3 },
  traceIconBar: { width: 3, height: 16, borderRadius: 2 },
  traceGraph: { height: 116, position: 'relative' as const, overflow: 'hidden' as const, borderRadius: 11, borderWidth: 1, borderColor: '#A9C0D033', backgroundColor: '#09203A' },
  traceGridLine: { position: 'absolute' as const, left: 7, right: 7, height: 1, borderTopWidth: 1, borderStyle: 'dashed' as const, borderColor: '#8BA4B61C' },
  traceGridVertical: { position: 'absolute' as const, top: 7, bottom: 26, width: 1, backgroundColor: '#8BA4B614' },
  tracePlayhead: { position: 'absolute' as const, top: 7, bottom: 26, left: 7, width: 2, borderRadius: 2 },
  traceBars: { position: 'absolute' as const, left: 8, right: 8, top: 12, bottom: 26, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  traceBar: { width: 3, minHeight: 5, borderRadius: 3 },
  traceBaseline: { position: 'absolute' as const, left: 8, right: 8, bottom: 25, height: 1, backgroundColor: '#B7D4DB55' },
  traceAxis: { position: 'absolute' as const, left: 8, right: 8, bottom: 6, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  axisLabels: { flex: 1, flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginRight: 10 },
  axisLabel: { color: '#8BA4B6', fontSize: 9, lineHeight: 11, fontWeight: '800' as const },
  axisUnit: { color: '#8BA4B6', fontSize: 7, lineHeight: 10, fontWeight: '800' as const, letterSpacing: 0.5 },
  waveStrip: { height: 46, justifyContent: 'center' as const, position: 'relative' as const, overflow: 'hidden' as const, marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#A9C0D033' },
  consoleWave: { height: 42 },
};
