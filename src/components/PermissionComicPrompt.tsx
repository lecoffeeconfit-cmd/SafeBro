import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FuturisticIcon } from './FuturisticIcon';
import { Button } from './UI';
import { useReducedMotion } from './Motion';
import { colors, radii, spacing, typography } from '../theme';

type PermissionDevice = 'camera' | 'microphone';

const copy: Record<PermissionDevice, { icon: string; color: string; title: string; detail: string; note: string; action: string }> = {
  camera: {
    icon: 'rear-camera', color: colors.blue, title: 'Let’s open the lens',
    detail: 'SafeBro uses your camera only when you start a camera recording. Your clips stay on this device.',
    note: 'Your device will show its own camera access prompt next.', action: 'CONTINUE TO CAMERA ACCESS',
  },
  microphone: {
    icon: 'microphone', color: colors.aqua, title: 'Give sound a voice',
    detail: 'SafeBro uses your microphone for audio recordings and video sound when you choose to record.',
    note: 'Your device will show its own microphone access prompt next.', action: 'CONTINUE TO MICROPHONE',
  },
};

export function PermissionComicPrompt({ device, visible, onContinue, onCancel }: { device: PermissionDevice | null; visible: boolean; onContinue: () => void | Promise<void>; onCancel: () => void }) {
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const selected = device ? copy[device] : null;

  useEffect(() => {
    if (!visible || reducedMotion) {
      entrance.setValue(visible ? 1 : 0);
      burst.setValue(0);
      return;
    }
    const appear = Animated.spring(entrance, { toValue: 1, damping: 14, stiffness: 190, mass: 0.72, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(burst, { toValue: 1, duration: 760, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 0, duration: 920, useNativeDriver: true }),
      Animated.delay(480),
    ]));
    appear.start(); loop.start();
    return () => { appear.stop(); loop.stop(); };
  }, [burst, entrance, reducedMotion, visible]);

  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const sparkleScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1.18] });
  const sparkleRotate = burst.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '14deg'] });

  return <Modal visible={visible && Boolean(selected)} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
    <View style={styles.scrim}>
      {selected ? <Animated.View style={[styles.card, { opacity: entrance, transform: [{ scale }] }]}>
        <View style={[styles.colorWash, { backgroundColor: `${selected.color}13` }]} />
        <View style={styles.topline}><View style={styles.comicTag}><Text style={styles.comicTagText}>SAFEBRO · LOCAL</Text></View><View style={styles.panelDots}><View style={[styles.panelDot, { backgroundColor: colors.red }]} /><View style={[styles.panelDot, { backgroundColor: colors.yellow }]} /><View style={[styles.panelDot, { backgroundColor: colors.aqua }]} /></View></View>
        <View style={styles.heroRow}>
          <View style={[styles.iconFrame, { borderColor: selected.color, backgroundColor: `${selected.color}20` }]}><FuturisticIcon name={selected.icon} size={43} color={selected.color} accent={colors.yellow} animated /></View>
          <View style={styles.heroCopy}><Text style={styles.eyebrow}>ONE QUICK PERMISSION</Text><Text style={styles.title}>{selected.title}</Text></View>
          <Animated.View style={[styles.sparkle, { transform: [{ scale: sparkleScale }, { rotate: sparkleRotate }] }]}><Text style={styles.sparkleText}>✦</Text></Animated.View>
        </View>
        <View style={styles.speechBox}><Text style={styles.detail}>{selected.detail}</Text><View style={styles.speechTail} /></View>
        <View style={styles.privacyNote}><View style={[styles.noteDot, { backgroundColor: selected.color }]} /><Text style={styles.noteText}>{selected.note}</Text></View>
        <Button label={selected.action} icon={selected.icon} variant="primary" onPress={onContinue} style={styles.continueButton} />
        <Pressable onPress={onCancel} accessibilityRole="button" style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}><Text style={styles.cancelText}>Maybe later</Text></Pressable>
      </Animated.View> : null}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#07182CCC' },
  card: { width: '100%', maxWidth: 430, overflow: 'hidden', padding: spacing.lg, borderRadius: 25, borderWidth: 2.5, borderColor: colors.navy, borderBottomRightRadius: 12, backgroundColor: colors.cream, shadowColor: colors.navy, shadowOpacity: 0.35, shadowRadius: 0, shadowOffset: { width: 5, height: 6 }, elevation: 9 },
  colorWash: { position: 'absolute', top: -56, right: -48, width: 190, height: 190, borderRadius: 95 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 19 },
  comicTag: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1.5, borderColor: colors.navy, borderBottomLeftRadius: 2, backgroundColor: '#FFE57C', transform: [{ rotate: '-2deg' }] },
  comicTagText: { ...typography.label, color: colors.navy, fontSize: 9, letterSpacing: 0.8 },
  panelDots: { flexDirection: 'row', gap: 4 },
  panelDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.navy },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 13, minWidth: 0 },
  iconFrame: { width: 68, height: 68, flexShrink: 0, borderWidth: 2.5, borderRadius: 20, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  title: { ...typography.title, color: colors.navy, fontSize: 21, lineHeight: 26, marginTop: 3 },
  sparkle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  sparkleText: { color: '#F1B916', fontSize: 28, fontWeight: '900' },
  speechBox: { position: 'relative', marginTop: 19, padding: 14, borderRadius: 15, borderWidth: 1.5, borderColor: '#B8CFDD', backgroundColor: colors.white },
  detail: { ...typography.body, color: colors.text, lineHeight: 21 },
  speechTail: { position: 'absolute', width: 12, height: 12, top: -7, left: 27, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#B8CFDD', backgroundColor: colors.white, transform: [{ rotate: '45deg' }] },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, marginBottom: 18, paddingHorizontal: 2 },
  noteDot: { width: 8, height: 8, flexShrink: 0, borderRadius: 4 },
  noteText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 17 },
  continueButton: { minHeight: 54, borderRadius: 15, borderBottomRightRadius: 6 },
  cancel: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, marginTop: 2 },
  cancelPressed: { opacity: 0.6 },
  cancelText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
});
