import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors } from '../theme';
import { useReducedMotion } from './Motion';

export type FuturisticIconName = string;

type Props = {
  name: FuturisticIconName;
  size?: number;
  color?: string;
  accent?: string;
  framed?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
};

const iconAliases: Record<string, string> = {
  '◉': 'capture', '●': 'capture', '◈': 'lens', '◎': 'lens', '◌': 'signal',
  '♫': 'audio', '◒': 'podcast', '⌁': 'analyze', '▤': 'library', '▦': 'library',
  '▣': 'grid', '▥': 'grid', '◫': 'grid', '⇄': 'dual', '✦': 'spark', '✨': 'spark',
  '⌂': 'security', '🛡': 'security', '👁': 'monitor', '🎥': 'camera', '🎬': 'studio',
  '🚗': 'vehicle', '🚘': 'vehicle', '⏱': 'timer', '◔': 'timer', '∞': 'signal',
  '⚙': 'settings', 'ϟ': 'bolt', '★': 'spark', '◆': 'bookmark', '⌑': 'lock',
  '▧': 'image', '✂': 'edit', '＋': 'plus', '↗': 'arrow', '→': 'arrow', '›': 'arrow', '↺': 'dual',
  '⌕': 'search', '⚖': 'balance', '△': 'motion', 'T': 'document', 'M': 'document',
  'P': 'document', 'S': 'document', 'V': 'document', 'C': 'document', '{}': 'data',
  '≡': 'document', '▶': 'play', 'Ⅱ': 'pause', '■': 'stop', '🔒': 'lock', '☆': 'bookmark', '✓': 'check', '□': 'check', '⌖': 'target',
};

const iconTypes = new Set([
  'camera', 'capture', 'lens', 'record', 'rear-camera', 'front-camera', 'switch-camera',
  'microphone', 'voice-trigger', 'low-power-audio', 'audio-guard', 'audio', 'conversation',
  'meeting', 'interview', 'lecture', 'doctor-notes', 'reflection', 'business-call',
  'sales-call', 'idea', 'journal', 'conference', 'planning', 'battery', 'room',
  'import', 'export', 'save', 'library', 'grid', 'document', 'data', 'image', 'edit',
  'check', 'people', 'analyze', 'signal', 'studio', 'spark', 'settings', 'dual',
  'security', 'monitor', 'podcast', 'vehicle', 'timer', 'motion', 'search', 'target',
  'lock', 'bookmark', 'bolt', 'plus', 'play', 'pause', 'stop', 'arrow', 'balance',
]);

function resolveIcon(name: string) {
  const normalized = name.trim().toLowerCase();
  if (iconAliases[name]) return iconAliases[name];
  if (iconTypes.has(normalized)) return normalized;
  if (normalized.includes('front-camera') || normalized.includes('selfie')) return 'front-camera';
  if (normalized.includes('rear-camera')) return 'rear-camera';
  if (normalized.includes('switch-camera') || normalized.includes('flip-camera')) return 'switch-camera';
  if (normalized.includes('microphone') || normalized === 'mic') return 'microphone';
  if (normalized.includes('conversation') || normalized.includes('chat')) return 'conversation';
  if (normalized.includes('battery') || normalized.includes('low-power')) return 'battery';
  if (normalized.includes('room') || normalized.includes('home')) return 'room';
  if (normalized.includes('dashcam')) return 'vehicle';
  if (normalized.includes('export') || normalized.includes('share')) return 'export';
  if (normalized.includes('import') || normalized.includes('download')) return 'import';
  if (normalized.includes('save')) return 'save';
  if (normalized.includes('transcript') || normalized.includes('caption')) return 'document';
  if (normalized.includes('photo')) return 'image';
  if (normalized.includes('split') || normalized.includes('trim') || normalized.includes('blur')) return 'edit';
  if (normalized.includes('capture') || normalized.includes('camera') || normalized.includes('record')) return 'capture';
  if (normalized.includes('audio') || normalized.includes('voice')) return 'audio';
  if (normalized.includes('library') || normalized.includes('archive') || normalized.includes('folder')) return 'library';
  if (normalized.includes('people') || normalized.includes('person') || normalized.includes('speaker')) return 'people';
  if (normalized.includes('analy') || normalized.includes('signal') || normalized.includes('wave')) return 'analyze';
  if (normalized.includes('studio') || normalized.includes('create') || normalized.includes('edit')) return 'studio';
  if (normalized.includes('setting') || normalized.includes('gear')) return 'settings';
  if (normalized.includes('security') || normalized.includes('guard') || normalized.includes('shield')) return 'security';
  if (normalized.includes('monitor') || normalized.includes('watch')) return 'monitor';
  if (normalized.includes('podcast')) return 'podcast';
  if (normalized.includes('vehicle') || normalized.includes('drive') || normalized.includes('bike')) return 'vehicle';
  if (normalized.includes('timer') || normalized.includes('time') || normalized.includes('endurance')) return 'timer';
  if (normalized.includes('motion') || normalized.includes('event')) return 'motion';
  if (normalized.includes('search')) return 'search';
  if (normalized.includes('lock') || normalized.includes('protect')) return 'lock';
  if (normalized.includes('bookmark') || normalized.includes('mark')) return 'bookmark';
  if (normalized.includes('import') || normalized.includes('add')) return 'plus';
  if (normalized.includes('play')) return 'play';
  if (normalized.includes('pause')) return 'pause';
  if (normalized.includes('stop')) return 'stop';
  if (normalized.includes('spark') || normalized.includes('smart') || normalized.includes('ai')) return 'spark';
  return 'signal';
}

function Dot({ size, color, style }: { size: number; color: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color }, style]} />;
}

function Bar({ width, height, color, style }: { width: number; height: number; color: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.bar, { width, height, backgroundColor: color, borderRadius: Math.min(width, height) / 2, shadowColor: color }, style]} />;
}

function Ring({ size, color, width = 1.5, style }: { size: number; color: string; width?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: width, borderColor: color, backgroundColor: `${color}1F` }, style]} />;
}

function Line({ width, color, rotate = 0, top, left, opacity = 1 }: { width: number; color: string; rotate?: number; top?: number; left?: number; opacity?: number }) {
  const thickness = Math.max(2.2, Math.min(4, width * 0.11));
  return <View style={[styles.line, { width, height: thickness, borderRadius: thickness / 2, backgroundColor: color, shadowColor: color, opacity, top, left, transform: [{ rotate: `${rotate}deg` }] }]} />;
}

export function FuturisticIcon({ name, size = 24, color = colors.accent, accent = colors.purple, framed = false, animated, style }: Props) {
  const emoji = name.startsWith('emoji:') ? name.slice('emoji:'.length) : null;
  const type = emoji ? 'emoji' : resolveIcon(name);
  const reducedMotion = useReducedMotion();
  const motion = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const shouldAnimate = animated ?? framed;
  const phase = useMemo(() => Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0) % 360, [name]);
  const unit = size / 32;
  const stroke = Math.max(1.8, unit * 2.45);
  const inner = size * 0.4;
  const center = size / 2;

  useEffect(() => {
    if (!shouldAnimate || reducedMotion) {
      motion.setValue(0);
      shimmer.setValue(0);
      return;
    }
    const motionLoop = Animated.loop(Animated.sequence([
      Animated.delay(420 + phase),
      Animated.timing(motion, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 980, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
    ]));
    const shimmerLoop = Animated.loop(Animated.sequence([
      Animated.delay(700 + phase),
      Animated.timing(shimmer, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(1350),
    ]));
    motionLoop.start();
    shimmerLoop.start();
    return () => { motionLoop.stop(); shimmerLoop.stop(); };
  }, [motion, phase, reducedMotion, shouldAnimate, shimmer]);

  const glyphScale = motion.interpolate({ inputRange: [0, 1], outputRange: [framed ? 0.82 : 1, framed ? 0.9 : 1.09] });
  const glyphLift = motion.interpolate({ inputRange: [0, 1], outputRange: [0, type === 'record' ? 0 : -Math.max(1, size * 0.045)] });
  const glyphTilt = motion.interpolate({ inputRange: [0, 1], outputRange: type === 'microphone' || type === 'voice-trigger' || type === 'podcast' ? ['-4deg', '4deg'] : type === 'record' ? ['0deg', '0deg'] : ['-2deg', '2deg'] });
  const glintOpacity = shimmer.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.25, 0.82, 0.2] });
  const glintX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.12, size * 0.34] });
  const pulseScale = motion.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.13] });
  const soundOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  let glyph: React.ReactNode;
  switch (type) {
    case 'emoji':
      glyph = <Text allowFontScaling={false} style={[styles.emojiGlyph, { width: size, height: size, fontSize: size * 0.61, lineHeight: size * 0.9 }]}>{emoji}</Text>;
      break;
    case 'record':
      glyph = <>
        <Ring size={size * 0.78} color={color} width={stroke} style={{ left: size * 0.11, top: size * 0.11 }} />
        <Animated.View style={[styles.recordDot, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, left: size * 0.29, top: size * 0.29, backgroundColor: accent, transform: [{ scale: pulseScale }] }]} />
        <Dot size={size * 0.1} color={colors.white} style={{ left: size * 0.36, top: size * 0.35 }} />
      </>;
      break;
    case 'camera':
    case 'capture':
    case 'lens':
      glyph = <>
        <Ring size={size * 0.84} color={color} width={stroke} style={{ left: size * 0.08, top: size * 0.08 }} />
        <Ring size={size * 0.58} color={accent} width={Math.max(1.5, stroke * 0.78)} style={{ left: size * 0.21, top: size * 0.21 }} />
        <View style={[styles.diamond, { width: inner, height: inner, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}B8`, left: center - inner / 2, top: center - inner / 2 }]} />
        <Dot size={size * 0.14} color={colors.white} style={{ left: center - size * 0.07, top: center - size * 0.07 }} />
        <Line width={size * 0.18} color={accent} rotate={-45} top={size * 0.1} left={size * 0.68} />
      </>;
      break;
    case 'rear-camera':
      glyph = <>
        <View style={[styles.cameraBody, { width: size * 0.75, height: size * 0.54, left: size * 0.08, top: size * 0.27, borderColor: color, borderWidth: stroke, backgroundColor: `${color}42` }]} />
        <View style={[styles.cameraTop, { width: size * 0.29, height: size * 0.14, left: size * 0.18, top: size * 0.17, borderColor: color, borderWidth: stroke, backgroundColor: `${color}42` }]} />
        <Ring size={size * 0.32} color={accent} width={stroke} style={{ left: size * 0.3, top: size * 0.38 }} />
        <Dot size={size * 0.09} color={accent} style={{ left: size * 0.68, top: size * 0.36 }} />
        <Line width={size * 0.2} color={accent} top={size * 0.54} left={size * 0.76} />
      </>;
      break;
    case 'front-camera':
      glyph = <>
        <View style={[styles.phone, { width: size * 0.58, height: size * 0.82, left: size * 0.21, top: size * 0.08, borderColor: color, borderWidth: stroke, backgroundColor: `${color}30` }]} />
        <Dot size={size * 0.2} color={accent} style={{ left: size * 0.4, top: size * 0.25 }} />
        <View style={[styles.shoulder, { width: size * 0.38, height: size * 0.2, left: size * 0.31, top: size * 0.5, borderColor: accent, backgroundColor: `${accent}80`, borderWidth: stroke, borderRadius: size * 0.2 }]} />
        <Dot size={size * 0.06} color={colors.white} style={{ left: size * 0.47, top: size * 0.14 }} />
      </>;
      break;
    case 'switch-camera':
      glyph = <>
        <Ring size={size * 0.43} color={color} width={stroke} style={{ left: size * 0.28, top: size * 0.28 }} />
        <Line width={size * 0.43} color={accent} top={size * 0.18} left={size * 0.16} />
        <Line width={size * 0.18} color={accent} rotate={42} top={size * 0.13} left={size * 0.49} />
        <Line width={size * 0.43} color={color} top={size * 0.75} left={size * 0.41} />
        <Line width={size * 0.18} color={color} rotate={42} top={size * 0.68} left={size * 0.32} />
      </>;
      break;
    case 'microphone':
      glyph = <>
        <View style={[styles.microphone, { width: size * 0.34, height: size * 0.58, left: size * 0.33, top: size * 0.08, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}75` }]} />
        <View style={[styles.micCradle, { width: size * 0.62, height: size * 0.48, left: size * 0.19, top: size * 0.3, borderColor: accent, borderWidth: stroke }]} />
        <Line width={size * 0.3} color={color} rotate={90} top={size * 0.7} left={size * 0.35} />
        <Line width={size * 0.46} color={color} top={size * 0.83} left={size * 0.27} />
      </>;
      break;
    case 'voice-trigger':
      glyph = <>
        <View style={[styles.microphone, { width: size * 0.3, height: size * 0.48, left: size * 0.35, top: size * 0.18, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}75` }]} />
        <View style={[styles.micCradle, { width: size * 0.5, height: size * 0.37, left: size * 0.25, top: size * 0.37, borderColor: color, borderWidth: stroke }]} />
        <Line width={size * 0.37} color={color} top={size * 0.82} left={size * 0.32} />
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: soundOpacity }]}>
          <Bar width={size * 0.08} height={size * 0.23} color={accent} style={{ left: size * 0.09, top: size * 0.35 }} />
          <Bar width={size * 0.08} height={size * 0.38} color={accent} style={{ left: size * 0.83, top: size * 0.27 }} />
        </Animated.View>
      </>;
      break;
    case 'low-power-audio':
      glyph = <>
        <View style={[styles.battery, { width: size * 0.76, height: size * 0.54, left: size * 0.07, top: size * 0.24, borderColor: color, borderWidth: stroke, backgroundColor: `${color}20` }]} />
        <View style={[styles.batteryTip, { width: size * 0.08, height: size * 0.22, left: size * 0.84, top: size * 0.4, backgroundColor: color }]} />
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: soundOpacity }]}>
          <Bar width={size * 0.1} height={size * 0.18} color={accent} style={{ left: size * 0.23, top: size * 0.43 }} />
          <Bar width={size * 0.1} height={size * 0.34} color={accent} style={{ left: size * 0.4, top: size * 0.35 }} />
          <Bar width={size * 0.1} height={size * 0.24} color={accent} style={{ left: size * 0.57, top: size * 0.4 }} />
        </Animated.View>
      </>;
      break;
    case 'audio-guard':
      glyph = <>
        <View style={[styles.audioGuardBadge, { width: size * 0.64, height: size * 0.68, left: size * 0.18, top: size * 0.12, borderColor: color, borderWidth: stroke, backgroundColor: `${color}25` }]} />
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: soundOpacity }]}>
          <Bar width={size * 0.08} height={size * 0.17} color={accent} style={{ left: size * 0.31, top: size * 0.43 }} />
          <Bar width={size * 0.08} height={size * 0.31} color={accent} style={{ left: size * 0.46, top: size * 0.36 }} />
          <Bar width={size * 0.08} height={size * 0.2} color={accent} style={{ left: size * 0.61, top: size * 0.41 }} />
        </Animated.View>
      </>;
      break;
    case 'conversation':
      glyph = <>
        <View style={[styles.chatBubble, { width: size * 0.76, height: size * 0.56, left: size * 0.1, top: size * 0.18, borderColor: color, borderWidth: stroke, backgroundColor: `${color}35` }]} />
        {[0.23, 0.42, 0.61].map((left, index) => <Dot key={left} size={size * (index === 1 ? 0.13 : 0.1)} color={index === 1 ? accent : color} style={{ left: size * left, top: size * 0.39 }} />)}
        <View style={[styles.chatTail, { left: size * 0.2, top: size * 0.65, borderTopColor: color, borderTopWidth: size * 0.18, borderRightWidth: size * 0.18 }]} />
      </>;
      break;
    case 'meeting':
      glyph = <>
        <Dot size={size * 0.21} color={color} style={{ left: size * 0.17, top: size * 0.16 }} />
        <Dot size={size * 0.21} color={accent} style={{ left: size * 0.62, top: size * 0.16 }} />
        <View style={[styles.cardShape, { width: size * 0.76, height: size * 0.24, left: size * 0.12, top: size * 0.56, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}45` }]} />
        <Line width={size * 0.18} color={color} top={size * 0.43} left={size * 0.19} />
        <Line width={size * 0.18} color={accent} top={size * 0.43} left={size * 0.64} />
        <Animated.View style={[styles.meetingNote, { width: size * 0.2, height: size * 0.17, left: size * 0.4, top: size * 0.42, backgroundColor: accent, transform: [{ translateY: glyphLift }] }]} />
      </>;
      break;
    case 'interview':
      glyph = <>
        <View style={[styles.chatBubble, { width: size * 0.55, height: size * 0.42, left: size * 0.08, top: size * 0.16, borderColor: color, borderWidth: stroke, backgroundColor: `${color}30` }]} />
        <View style={[styles.chatBubble, { width: size * 0.55, height: size * 0.42, left: size * 0.38, top: size * 0.43, borderColor: accent, borderWidth: stroke, backgroundColor: `${accent}55` }]} />
        <Dot size={size * 0.1} color={accent} style={{ left: size * 0.28, top: size * 0.31 }} />
        <Dot size={size * 0.1} color={color} style={{ left: size * 0.63, top: size * 0.58 }} />
      </>;
      break;
    case 'lecture':
      glyph = <>
        <View style={[styles.bookPage, { width: size * 0.36, height: size * 0.57, left: size * 0.14, top: size * 0.23, borderColor: color, borderWidth: stroke, backgroundColor: `${color}2B` }]} />
        <View style={[styles.bookPage, { width: size * 0.36, height: size * 0.57, left: size * 0.5, top: size * 0.23, borderColor: accent, borderWidth: stroke, backgroundColor: `${accent}35` }]} />
        <Line width={size * 0.18} color={color} top={size * 0.43} left={size * 0.23} />
        <Line width={size * 0.18} color={accent} top={size * 0.52} left={size * 0.58} />
        <Dot size={size * 0.1} color={accent} style={{ left: size * 0.44, top: size * 0.07 }} />
      </>;
      break;
    case 'doctor-notes':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.62, height: size * 0.72, left: size * 0.19, top: size * 0.17, borderColor: color, borderWidth: stroke, backgroundColor: `${color}2B` }]} />
        <View style={[styles.meetingNote, { width: size * 0.3, height: size * 0.12, left: size * 0.35, top: size * 0.11, backgroundColor: accent }]} />
        <Line width={size * 0.32} color={accent} top={size * 0.39} left={size * 0.34} />
        <Line width={size * 0.32} color={color} top={size * 0.53} left={size * 0.34} />
        <Line width={size * 0.24} color={color} top={size * 0.67} left={size * 0.34} />
      </>;
      break;
    case 'reflection':
      glyph = <>
        <View style={[styles.chatBubble, { width: size * 0.72, height: size * 0.61, left: size * 0.14, top: size * 0.12, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}3A` }]} />
        <Ring size={size * 0.29} color={accent} width={stroke} style={{ left: size * 0.36, top: size * 0.28 }} />
        <Dot size={size * 0.1} color={accent} style={{ left: size * 0.17, top: size * 0.76 }} />
        <Dot size={size * 0.06} color={color} style={{ left: size * 0.31, top: size * 0.69 }} />
      </>;
      break;
    case 'business-call':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.76, height: size * 0.52, left: size * 0.12, top: size * 0.35, borderColor: color, borderWidth: stroke, backgroundColor: `${color}27` }]} />
        <View style={[styles.cardShape, { width: size * 0.3, height: size * 0.18, left: size * 0.35, top: size * 0.21, borderColor: color, borderWidth: stroke }]} />
        <Line width={size * 0.45} color={accent} top={size * 0.55} left={size * 0.28} />
        <Dot size={size * 0.11} color={accent} style={{ left: size * 0.21, top: size * 0.5 }} />
        <Dot size={size * 0.11} color={accent} style={{ left: size * 0.69, top: size * 0.5 }} />
      </>;
      break;
    case 'sales-call':
      glyph = <>
        <View style={[styles.chatBubble, { width: size * 0.76, height: size * 0.65, left: size * 0.12, top: size * 0.12, borderColor: color, borderWidth: stroke, backgroundColor: `${color}27` }]} />
        <Line width={size * 0.22} color={accent} rotate={-35} top={size * 0.55} left={size * 0.27} />
        <Line width={size * 0.23} color={accent} rotate={-52} top={size * 0.42} left={size * 0.47} />
        <Dot size={size * 0.1} color={accent} style={{ left: size * 0.7, top: size * 0.25 }} />
      </>;
      break;
    case 'idea':
      glyph = <>
        <Ring size={size * 0.55} color={color} width={stroke} style={{ left: size * 0.23, top: size * 0.1 }} />
        <Bar width={size * 0.28} height={size * 0.1} color={accent} style={{ left: size * 0.36, top: size * 0.71 }} />
        <Bar width={size * 0.2} height={size * 0.08} color={color} style={{ left: size * 0.4, top: size * 0.84 }} />
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: soundOpacity }]}>
          <Dot size={size * 0.09} color={accent} style={{ left: size * 0.08, top: size * 0.29 }} />
          <Dot size={size * 0.09} color={accent} style={{ left: size * 0.84, top: size * 0.24 }} />
          <Dot size={size * 0.08} color={accent} style={{ left: size * 0.47, top: size * 0.01 }} />
        </Animated.View>
      </>;
      break;
    case 'journal':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.62, height: size * 0.72, left: size * 0.13, top: size * 0.13, borderColor: color, borderWidth: stroke, backgroundColor: `${color}2B` }]} />
        <Bar width={size * 0.07} height={size * 0.55} color={accent} style={{ left: size * 0.24, top: size * 0.22 }} />
        <Line width={size * 0.27} color={color} top={size * 0.35} left={size * 0.37} />
        <Line width={size * 0.21} color={color} top={size * 0.51} left={size * 0.37} />
        <Line width={size * 0.34} color={accent} rotate={-55} top={size * 0.64} left={size * 0.59} />
      </>;
      break;
    case 'conference':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.38, height: size * 0.35, left: size * 0.31, top: size * 0.37, borderColor: color, borderWidth: stroke, backgroundColor: `${color}35` }]} />
        <Line width={size * 0.25} color={accent} rotate={-58} top={size * 0.21} left={size * 0.49} />
        <Dot size={size * 0.12} color={accent} style={{ left: size * 0.63, top: size * 0.1 }} />
        {[0.16, 0.43, 0.7].map((left) => <Dot key={left} size={size * 0.13} color={left === 0.43 ? accent : color} style={{ left: size * left, top: size * 0.78 }} />)}
      </>;
      break;
    case 'planning':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.7, height: size * 0.74, left: size * 0.15, top: size * 0.12, borderColor: color, borderWidth: stroke, backgroundColor: `${color}25` }]} />
        {[0.31, 0.5, 0.69].map((top) => <React.Fragment key={top}><Dot size={size * 0.08} color={accent} style={{ left: size * 0.25, top: size * top }} /><Line width={size * 0.32} color={color} top={size * top} left={size * 0.41} /></React.Fragment>)}
      </>;
      break;
    case 'battery':
      glyph = <>
        <View style={[styles.battery, { width: size * 0.72, height: size * 0.42, left: size * 0.09, top: size * 0.3, borderColor: color, borderWidth: stroke }]} />
        <View style={[styles.batteryTip, { width: size * 0.09, height: size * 0.2, left: size * 0.82, top: size * 0.41, backgroundColor: color }]} />
        <View style={[styles.batteryFill, { width: size * 0.42, height: size * 0.22, left: size * 0.19, top: size * 0.4, backgroundColor: accent }]} />
        <View style={[styles.bolt, { width: size * 0.13, height: size * 0.3, left: size * 0.47, top: size * 0.35, backgroundColor: colors.white }]} />
      </>;
      break;
    case 'room':
      glyph = <>
        <View style={[styles.houseRoof, { left: size * 0.13, top: size * 0.05, borderBottomColor: color, borderBottomWidth: size * 0.38, borderLeftWidth: size * 0.37, borderRightWidth: size * 0.37 }]} />
        <View style={[styles.houseBody, { width: size * 0.64, height: size * 0.43, left: size * 0.18, top: size * 0.43, borderColor: color, borderWidth: stroke, backgroundColor: `${color}45` }]} />
        <View style={[styles.houseDoor, { width: size * 0.18, height: size * 0.27, left: size * 0.41, top: size * 0.59, backgroundColor: accent }]} />
        <Dot size={size * 0.08} color={colors.white} style={{ left: size * 0.51, top: size * 0.68 }} />
      </>;
      break;
    case 'import':
    case 'export': {
      const exporting = type === 'export';
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.62, height: size * 0.68, left: exporting ? size * 0.08 : size * 0.3, top: size * 0.2, borderColor: color, borderWidth: stroke, backgroundColor: `${color}30` }]} />
        <Line width={size * 0.48} color={accent} top={size * 0.42} left={exporting ? size * 0.42 : size * 0.1} />
        <Line width={size * 0.2} color={accent} rotate={45} top={size * 0.3} left={exporting ? size * 0.72 : size * 0.08} />
        <Line width={size * 0.2} color={accent} rotate={-45} top={size * 0.52} left={exporting ? size * 0.72 : size * 0.08} />
      </>;
      break;
    }
    case 'save':
      glyph = <>
        <View style={[styles.saveBody, { width: size * 0.7, height: size * 0.7, left: size * 0.15, top: size * 0.15, borderColor: color, borderWidth: stroke, backgroundColor: `${color}35` }]} />
        <View style={[styles.saveSlot, { width: size * 0.38, height: size * 0.22, left: size * 0.31, top: size * 0.2, backgroundColor: accent }]} />
        <Ring size={size * 0.28} color={accent} width={stroke} style={{ left: size * 0.36, top: size * 0.49 }} />
      </>;
      break;
    case 'audio':
      glyph = <View style={styles.barGroup}>{[0.5, 0.8, 1, 0.7, 0.42].map((height, index) => <Bar key={index} width={size * 0.13} height={size * height * 0.7} color={index === 2 ? accent : color} />)}</View>;
      break;
    case 'library':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.39, height: size * 0.18, left: size * 0.12, top: size * 0.18, borderColor: color, borderWidth: stroke, backgroundColor: `${color}30` }]} />
        <View style={[styles.folderBody, { width: size * 0.78, height: size * 0.54, left: size * 0.11, top: size * 0.33, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}35` }]} />
        <Line width={size * 0.4} color={accent} top={size * 0.58} left={size * 0.3} />
        <Dot size={size * 0.09} color={accent} style={{ left: size * 0.71, top: size * 0.44 }} />
      </>;
      break;
    case 'grid':
      glyph = <>
        {[[0.14, 0.14], [0.54, 0.14], [0.14, 0.54], [0.54, 0.54]].map(([left, top], index) => <View key={index} style={[styles.gridTile, { width: size * 0.3, height: size * 0.3, left: size * left, top: size * top, borderColor: index === 1 ? accent : color, borderWidth: stroke, backgroundColor: `${index === 1 ? accent : color}40` }]} />)}
      </>;
      break;
    case 'document':
    case 'data':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.62, height: size * 0.72, left: size * 0.15, top: size * 0.18, borderColor: color, borderWidth: stroke, backgroundColor: `${color}55` }]} />
        <View style={[styles.cardShape, { width: size * 0.62, height: size * 0.72, left: size * 0.27, top: size * 0.08, borderColor: color, borderWidth: stroke, backgroundColor: `${accent}35` }]} />
        <Line width={size * 0.28} color={accent} top={size * 0.35} left={size * 0.42} />
        <Line width={size * 0.2} color={accent} top={size * 0.5} left={size * 0.42} />
        <Dot size={size * 0.1} color={accent} style={{ left: size * 0.75, top: size * 0.13 }} />
      </>;
      break;
    case 'image':
      glyph = <><View style={[styles.cardShape, { width: size * 0.7, height: size * 0.58, left: size * 0.15, top: size * 0.2, borderColor: color, borderWidth: stroke }]} /><Dot size={size * 0.12} color={accent} style={{ left: size * 0.61, top: size * 0.3 }} /><Line width={size * 0.36} color={color} rotate={-42} top={size * 0.59} left={size * 0.2} /><Line width={size * 0.23} color={accent} rotate={42} top={size * 0.55} left={size * 0.51} /></>;
      break;
    case 'edit':
      glyph = <><Line width={size * 0.64} color={color} rotate={-45} top={size * 0.46} left={size * 0.17} /><Line width={size * 0.23} color={accent} rotate={-45} top={size * 0.23} left={size * 0.58} /><Dot size={size * 0.1} color={accent} style={{ left: size * 0.17, top: size * 0.7 }} /></>;
      break;
    case 'check':
      glyph = <><Line width={size * 0.25} color={color} rotate={45} top={size * 0.55} left={size * 0.18} /><Line width={size * 0.48} color={accent} rotate={-45} top={size * 0.38} left={size * 0.4} /></>;
      break;
    case 'people':
      glyph = <>
        <Dot size={size * 0.29} color={color} style={{ left: size * 0.16, top: size * 0.13 }} />
        <Dot size={size * 0.24} color={accent} style={{ left: size * 0.59, top: size * 0.2 }} />
        <View style={[styles.shoulder, { width: size * 0.53, height: size * 0.28, left: size * 0.04, top: size * 0.54, borderColor: color, backgroundColor: `${color}A8`, borderWidth: stroke, borderRadius: size * 0.2 }]} />
        <View style={[styles.shoulder, { width: size * 0.4, height: size * 0.24, left: size * 0.51, top: size * 0.58, borderColor: accent, backgroundColor: `${accent}A8`, borderWidth: stroke, borderRadius: size * 0.18 }]} />
      </>;
      break;
    case 'analyze':
    case 'signal':
      glyph = <>
        <Line width={size * 0.65} color={`${color}66`} top={center} left={size * 0.17} />
        <Line width={size * 0.23} color={color} rotate={-38} top={size * 0.42} left={size * 0.2} />
        <Line width={size * 0.23} color={color} rotate={38} top={size * 0.3} left={size * 0.39} />
        <Line width={size * 0.24} color={accent} rotate={-42} top={size * 0.43} left={size * 0.58} />
        <Dot size={size * 0.12} color={accent} style={{ left: size * 0.77, top: size * 0.18 }} />
      </>;
      break;
    case 'studio':
      glyph = <>
        <View style={[styles.cardShape, { width: size * 0.76, height: size * 0.5, left: size * 0.12, top: size * 0.36, borderColor: color, borderWidth: stroke, backgroundColor: `${color}30` }]} />
        <View style={[styles.clapperTop, { width: size * 0.76, height: size * 0.19, left: size * 0.12, top: size * 0.17, borderColor: accent, borderWidth: stroke, backgroundColor: `${accent}55` }]} />
        <View style={[styles.play, { left: size * 0.42, top: size * 0.48, borderLeftColor: accent, borderLeftWidth: size * 0.19, borderTopWidth: size * 0.14, borderBottomWidth: size * 0.14 }]} />
        <Line width={size * 0.13} color={color} rotate={-45} top={size * 0.22} left={size * 0.27} />
        <Line width={size * 0.13} color={color} rotate={-45} top={size * 0.22} left={size * 0.59} />
      </>;
      break;
    case 'spark':
      glyph = <>
        <View style={[styles.spark, { width: size * 0.52, height: size * 0.52, left: center - size * 0.26, top: center - size * 0.26, backgroundColor: `${color}88`, borderColor: color, borderWidth: stroke }]} />
        <View style={[styles.sparkSmall, { width: size * 0.18, height: size * 0.18, left: size * 0.68, top: size * 0.12, backgroundColor: accent }]} />
        <Dot size={size * 0.11} color={accent} style={{ left: size * 0.16, top: size * 0.74 }} />
      </>;
      break;
    case 'settings':
      glyph = <>
        {[0.26, 0.5, 0.74].map((top) => <Line key={top} width={size * 0.72} color={color} top={size * top} left={size * 0.14} />)}
        <Dot size={size * 0.19} color={accent} style={{ left: size * 0.27, top: size * 0.21 }} />
        <Dot size={size * 0.19} color={accent} style={{ left: size * 0.64, top: size * 0.45 }} />
        <Dot size={size * 0.19} color={accent} style={{ left: size * 0.4, top: size * 0.69 }} />
      </>;
      break;
    case 'dual':
      glyph = <><Ring size={size * 0.58} color={color} width={stroke} style={{ left: size * 0.03, top: size * 0.21 }} /><Ring size={size * 0.58} color={accent} width={stroke} style={{ left: size * 0.39, top: size * 0.21 }} /><Line width={size * 0.31} color={colors.white} top={center - size * 0.03} left={size * 0.35} /></>;
      break;
    case 'security':
      glyph = <><View style={[styles.shield, { width: size * 0.6, height: size * 0.7, left: size * 0.2, top: size * 0.13, borderColor: color, borderWidth: stroke, backgroundColor: `${color}58` }]} /><Ring size={size * 0.27} color={accent} width={stroke} style={{ left: size * 0.37, top: size * 0.34 }} /><Dot size={size * 0.09} color={colors.white} style={{ left: size * 0.46, top: size * 0.43 }} /></>;
      break;
    case 'monitor':
      glyph = <><View style={[styles.eye, { width: size * 0.82, height: size * 0.54, left: size * 0.09, top: size * 0.23, borderColor: color, borderWidth: stroke, backgroundColor: `${color}42` }]} /><Ring size={size * 0.3} color={accent} width={stroke} style={{ left: size * 0.35, top: size * 0.35 }} /><Dot size={size * 0.12} color={colors.white} style={{ left: center - size * 0.06, top: center - size * 0.06 }} /></>;
      break;
    case 'podcast':
      glyph = <><Ring size={size * 0.6} color={color} width={stroke} style={{ left: size * 0.2, top: size * 0.1 }} /><Bar width={size * 0.15} height={size * 0.47} color={accent} style={{ left: size * 0.425, top: size * 0.27 }} /><Line width={size * 0.64} color={color} top={size * 0.78} left={size * 0.18} /><Dot size={size * 0.12} color={colors.white} style={{ left: size * 0.74, top: size * 0.1 }} /></>;
      break;
    case 'vehicle':
      glyph = <><View style={[styles.vehicle, { width: size * 0.78, height: size * 0.4, left: size * 0.11, top: size * 0.37, borderColor: color, borderWidth: stroke, backgroundColor: `${color}7A` }]} /><Line width={size * 0.32} color={accent} rotate={-28} top={size * 0.25} left={size * 0.24} /><Line width={size * 0.27} color={accent} rotate={28} top={size * 0.25} left={size * 0.48} /><Dot size={size * 0.16} color={accent} style={{ left: size * 0.2, top: size * 0.67 }} /><Dot size={size * 0.16} color={accent} style={{ left: size * 0.64, top: size * 0.67 }} /></>;
      break;
    case 'timer':
      glyph = <><Ring size={size * 0.7} color={color} width={stroke} style={{ left: size * 0.15, top: size * 0.15 }} /><Line width={size * 0.25} color={accent} rotate={-50} top={size * 0.43} left={size * 0.49} /><Line width={size * 0.24} color={color} rotate={90} top={size * 0.45} left={size * 0.45} /><Dot size={size * 0.1} color={accent} style={{ left: center - size * 0.05, top: center - size * 0.05 }} /></>;
      break;
    case 'motion':
      glyph = <><Line width={size * 0.25} color={color} rotate={-45} top={size * 0.56} left={size * 0.1} /><Line width={size * 0.25} color={color} rotate={-45} top={size * 0.46} left={size * 0.3} /><Line width={size * 0.25} color={accent} rotate={-45} top={size * 0.36} left={size * 0.5} /><Dot size={size * 0.12} color={accent} style={{ left: size * 0.75, top: size * 0.18 }} /></>;
      break;
    case 'search':
      glyph = <><Ring size={size * 0.5} color={color} width={stroke} style={{ left: size * 0.12, top: size * 0.12 }} /><Line width={size * 0.35} color={accent} rotate={45} top={size * 0.63} left={size * 0.56} /></>;
      break;
    case 'target':
      glyph = <><Ring size={size * 0.7} color={color} width={stroke} style={{ left: size * 0.15, top: size * 0.15 }} /><Line width={size * 0.3} color={accent} rotate={-45} top={size * 0.53} left={size * 0.5} /><Dot size={size * 0.12} color={accent} style={{ left: center - size * 0.06, top: center - size * 0.06 }} /></>;
      break;
    case 'lock':
      glyph = <><View style={[styles.lockBody, { width: size * 0.52, height: size * 0.4, left: size * 0.24, top: size * 0.4, borderColor: color, borderWidth: stroke }]} /><View style={[styles.lockShackle, { width: size * 0.3, height: size * 0.3, left: size * 0.35, top: size * 0.18, borderColor: accent, borderWidth: stroke }]} /><Dot size={size * 0.1} color={accent} style={{ left: center - size * 0.05, top: size * 0.54 }} /></>;
      break;
    case 'bookmark':
      glyph = <><View style={[styles.bookmark, { width: size * 0.46, height: size * 0.68, left: size * 0.27, top: size * 0.15, borderColor: color, borderWidth: stroke }]} /><Line width={size * 0.23} color={accent} rotate={-38} top={size * 0.51} left={size * 0.33} /></>;
      break;
    case 'bolt':
      glyph = <><View style={[styles.bolt, { width: size * 0.28, height: size * 0.58, left: size * 0.38, top: size * 0.12, backgroundColor: accent }]} /><Dot size={size * 0.1} color={color} style={{ left: size * 0.75, top: size * 0.15 }} /></>;
      break;
    case 'plus':
      glyph = <><Line width={size * 0.58} color={color} top={center - size * 0.045} left={size * 0.21} /><Line width={size * 0.58} color={accent} rotate={90} top={center - size * 0.045} left={size * 0.21} /><Dot size={size * 0.1} color={accent} style={{ left: size * 0.74, top: size * 0.16 }} /></>;
      break;
    case 'play':
      glyph = <><View style={[styles.play, { left: size * 0.31, top: size * 0.21, borderLeftColor: accent, borderLeftWidth: size * 0.34, borderTopWidth: size * 0.3, borderBottomWidth: size * 0.3 }]} /><Ring size={size * 0.82} color={`${color}66`} width={stroke} style={{ left: size * 0.09, top: size * 0.09 }} /></>;
      break;
    case 'pause':
      glyph = <><Bar width={size * 0.15} height={size * 0.58} color={color} style={{ left: size * 0.29, top: size * 0.21 }} /><Bar width={size * 0.15} height={size * 0.58} color={accent} style={{ left: size * 0.56, top: size * 0.21 }} /></>;
      break;
    case 'stop':
      glyph = <View style={[styles.stop, { width: size * 0.48, height: size * 0.48, left: size * 0.26, top: size * 0.26, backgroundColor: accent }]} />;
      break;
    case 'arrow':
      glyph = <><Line width={size * 0.58} color={color} top={center - size * 0.04} left={size * 0.14} /><Line width={size * 0.22} color={accent} rotate={45} top={size * 0.26} left={size * 0.65} /><Line width={size * 0.22} color={accent} rotate={-45} top={size * 0.55} left={size * 0.65} /></>;
      break;
    case 'balance':
      glyph = <><Line width={size * 0.62} color={color} top={size * 0.27} left={size * 0.19} /><Line width={size * 0.62} color={color} rotate={90} top={size * 0.4} left={size * 0.19} /><Line width={size * 0.32} color={accent} rotate={-18} top={size * 0.52} left={size * 0.18} /><Line width={size * 0.32} color={accent} rotate={18} top={size * 0.52} left={size * 0.5} /></>;
      break;
    default:
      glyph = <><Ring size={size * 0.72} color={color} width={stroke} style={{ left: size * 0.14, top: size * 0.14 }} /><Dot size={size * 0.16} color={accent} style={{ left: size * 0.42, top: size * 0.42 }} /></>;
  }

  const animatedGlyphStyle = { width: size, height: size, transform: [{ translateY: glyphLift }, { scale: glyphScale }, { rotate: glyphTilt }] };

  if (framed) return <View accessible={false} pointerEvents="none" style={[styles.icon, styles.framedIcon, { width: size, height: size, borderRadius: Math.max(8, size * 0.28), borderColor: color, backgroundColor: `${accent}30` }, style]}>
    <View style={[styles.framedBubble, { width: size * 0.62, height: size * 0.62, borderRadius: size, right: -size * 0.15, bottom: -size * 0.16, backgroundColor: `${color}24` }]} />
    <View style={[styles.framedBubble, { width: size * 0.24, height: size * 0.24, borderRadius: size, left: size * 0.08, top: size * 0.12, backgroundColor: `${accent}55` }]} />
    <Animated.View style={[styles.framedGlyph, animatedGlyphStyle]}>{glyph}</Animated.View>
    <Animated.View style={[styles.iconGlint, { width: size * 0.34, height: size * 0.11, borderRadius: size, left: size * 0.1, top: size * 0.1, opacity: glintOpacity, transform: [{ translateX: glintX }, { rotate: '-9deg' }] }]} />
  </View>;
  return <View accessible={false} pointerEvents="none" style={[styles.icon, { width: size, height: size }, style]}><Animated.View style={[styles.glyphLayer, animatedGlyphStyle]}>{glyph}</Animated.View></View>;
}

const styles = StyleSheet.create({
  icon: { position: 'relative', overflow: 'visible' },
  framedIcon: { borderWidth: 2, overflow: 'hidden', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
  framedGlyph: { position: 'absolute', left: 0, top: 0 },
  glyphLayer: { position: 'absolute', left: 0, top: 0 },
  framedBubble: { position: 'absolute' },
  iconGlint: { position: 'absolute', backgroundColor: '#FFFFFFC9' },
  dot: { position: 'absolute', shadowOpacity: 0.28, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  recordDot: { position: 'absolute', shadowColor: colors.yellow, shadowOpacity: 0.5, shadowRadius: 5 },
  bar: { position: 'absolute', shadowOpacity: 0.22, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  barGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  ring: { position: 'absolute', backgroundColor: 'transparent' },
  line: { position: 'absolute', transformOrigin: 'center', shadowOpacity: 0.18, shadowRadius: 1.5, shadowOffset: { width: 0, height: 1 } },
  diamond: { position: 'absolute', transform: [{ rotate: '45deg' }], borderRadius: 5 },
  cardShape: { position: 'absolute', borderRadius: 6 },
  folderBody: { position: 'absolute', borderRadius: 5, borderTopLeftRadius: 2 },
  gridTile: { position: 'absolute', borderRadius: 5 },
  clapperTop: { position: 'absolute', borderRadius: 4, transform: [{ rotate: '-8deg' }] },
  bookPage: { position: 'absolute', borderRadius: 4 },
  meetingNote: { position: 'absolute', borderRadius: 3 },
  shoulder: { position: 'absolute', backgroundColor: 'transparent' },
  spark: { position: 'absolute', transform: [{ rotate: '45deg' }], borderRadius: 7 },
  sparkSmall: { position: 'absolute', transform: [{ rotate: '45deg' }], borderRadius: 3 },
  shield: { position: 'absolute', borderRadius: 9, transform: [{ rotate: '45deg' }] },
  audioGuardBadge: { position: 'absolute', borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 13, borderBottomRightRadius: 13 },
  eye: { position: 'absolute', borderRadius: 99, transform: [{ rotate: '45deg' }] },
  vehicle: { position: 'absolute', borderRadius: 8 },
  lockBody: { position: 'absolute', borderRadius: 7 },
  lockShackle: { position: 'absolute', borderBottomWidth: 0, borderTopLeftRadius: 99, borderTopRightRadius: 99, backgroundColor: 'transparent' },
  bookmark: { position: 'absolute', borderRadius: 6 },
  bolt: { position: 'absolute', transform: [{ skewX: '-22deg' }] },
  play: { position: 'absolute', width: 0, height: 0, backgroundColor: 'transparent', borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightWidth: 0 },
  stop: { position: 'absolute', borderRadius: 6 },
  emojiGlyph: { position: 'absolute', textAlign: 'center', includeFontPadding: false },
  cameraBody: { position: 'absolute', borderRadius: 6 },
  cameraTop: { position: 'absolute', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  phone: { position: 'absolute', borderRadius: 7 },
  microphone: { position: 'absolute', borderRadius: 99 },
  micCradle: { position: 'absolute', borderTopWidth: 0, borderBottomLeftRadius: 99, borderBottomRightRadius: 99, backgroundColor: 'transparent' },
  chatBubble: { position: 'absolute', borderRadius: 9 },
  chatTail: { position: 'absolute', width: 0, height: 0, borderRightColor: 'transparent' },
  battery: { position: 'absolute', borderRadius: 5 },
  batteryTip: { position: 'absolute', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  batteryFill: { position: 'absolute', borderRadius: 3 },
  houseRoof: { position: 'absolute', width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  houseBody: { position: 'absolute', borderRadius: 4, borderTopWidth: 0 },
  houseDoor: { position: 'absolute', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  saveBody: { position: 'absolute', borderRadius: 6 },
  saveSlot: { position: 'absolute', borderRadius: 3 },
});
