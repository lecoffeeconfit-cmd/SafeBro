import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleProp, View, ViewStyle } from 'react-native';

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
  const pulse = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!active || lowPower || reducedMotion) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 760, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 760, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [active, lowPower, pulse, reducedMotion]);
  const getSpectrumColor = (height: number) => {
    if (height >= 31) return '#FF6F78';
    if (height >= 25) return '#F39B63';
    if (height >= 19) return '#F0C875';
    if (height >= 13) return '#8DDE9A';
    return '#62D9C2';
  };
  return <View style={[styles.wave, style]} accessibilityLabel={active ? 'Recording signal activity' : 'Audio waveform'}>
    <View pointerEvents="none" style={styles.waveBaseline} />
    {Array.from({ length: 29 }).map((_, index) => {
    const height = 7 + ((index * 11) % 26);
    const scaleY = pulse.interpolate({ inputRange: [0, 1], outputRange: index % 3 === 0 ? [0.74, 1.42] : index % 3 === 1 ? [1.2, 0.68] : [0.9, 1.12] });
    return <Animated.View key={index} style={{ width: 3, height, borderRadius: 3, backgroundColor: spectrum ? getSpectrumColor(height) : color, opacity: active ? 0.92 : 0.52, transform: [{ scaleY }] }} />;
  })}</View>;
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
};
