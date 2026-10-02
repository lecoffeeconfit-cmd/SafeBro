import React, { PropsWithChildren, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { FadeIn, useReducedMotion } from './Motion';
import { FuturisticIcon } from './FuturisticIcon';
import { colors, commonStyles, radii, shadow, spacing, typography } from '../theme';

export function ScreenHeader({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  const branded = eyebrow?.startsWith('SAFEBRO');
  return <FadeIn style={styles.header}>
    <View style={styles.headerMeta}>
      {branded ? <View style={styles.brandRow}><View style={styles.brandMark}><FuturisticIcon name="security" size={17} color={colors.white} accent={colors.yellow} /></View><Text style={styles.brandGood}>SAFE</Text><Text style={styles.brandBro}>BRO</Text><View style={styles.brandSpark} /></View> : eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {action}
    </View>
    <Text style={styles.title}>{title}</Text>
    <View pointerEvents="none" style={styles.titleAccent} />
    {detail ? <Text style={styles.detail}>{detail}</Text> : null}
  </FadeIn>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <FadeIn style={[commonStyles.card, styles.card, style]}>{children}</FadeIn>;
}

export function Label({ children, color = colors.textMuted }: PropsWithChildren<{ color?: string }>) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}

export function Badge({ children, color = colors.accent, style }: PropsWithChildren<{ color?: string; style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}45` }, style]}><View style={[styles.badgeDot, { backgroundColor: color }]} /><Text style={[styles.badgeText, { color }]}>{children}</Text></View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ label, onPress, variant = 'primary', icon, disabled = false, compact = false, style }: { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string; disabled?: boolean; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(-70)).current;
  const reducedMotion = useReducedMotion();
  const animatePress = (toValue: number, liftValue: number) => {
    if (reducedMotion) return;
    Animated.parallel([
      Animated.spring(scale, { toValue, useNativeDriver: true, damping: 15, stiffness: 360, mass: 0.62 }),
      Animated.spring(lift, { toValue: liftValue, useNativeDriver: true, damping: 16, stiffness: 380, mass: 0.6 }),
    ]).start();
    if (toValue < 1 && variant === 'primary') {
      shine.setValue(-70);
      Animated.timing(shine, { toValue: 220, duration: 520, useNativeDriver: true }).start();
    }
  };
  return <AnimatedPressable
    disabled={disabled}
    onPress={onPress}
    onPressIn={() => animatePress(0.965, 3)}
    onPressOut={() => animatePress(1, 0)}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={[styles.button, compact && styles.buttonCompact, styles[`button_${variant}`], disabled && styles.disabled, style, { transform: [{ translateY: lift }, { scale }] }]}
  >
    {variant === 'primary' ? <Animated.View pointerEvents="none" style={[styles.buttonShine, { transform: [{ translateX: shine }, { rotate: '-12deg' }] }]} /> : null}
    {icon ? <FuturisticIcon name={icon} size={compact ? 15 : 18} color={variant === 'primary' || variant === 'danger' ? colors.white : colors.text} accent={variant === 'primary' ? colors.yellow : variant === 'danger' ? colors.white : colors.accent} /> : null}
    <Text style={[styles.buttonText, compact && styles.buttonTextCompact, variant === 'primary' && styles.primaryButtonText, variant === 'danger' && styles.dangerButtonText]}>{label}</Text>
  </AnimatedPressable>;
}

export function IconButton({ label, onPress, active = false, danger = false }: { label: string; onPress?: () => void; active?: boolean; danger?: boolean }) {
  const glyphOnly = !/[A-Za-z0-9]/.test(label);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.iconButton, active && styles.iconButtonActive, danger && styles.iconButtonDanger, pressed && styles.pressed]}>{glyphOnly ? <FuturisticIcon name={label} size={19} color={danger ? colors.red : colors.text} accent={active ? colors.accent : danger ? colors.red : colors.accent} /> : <Text style={styles.iconButtonLabel}>{label}</Text>}</Pressable>;
}

export function Chip({ label, selected, onPress, color = colors.accent, disabled = false }: { label: string; selected?: boolean; onPress?: () => void; color?: string; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: Boolean(selected), disabled }} style={({ pressed }) => [styles.chip, selected && { backgroundColor: `${color}20`, borderColor: color }, disabled && styles.disabled, pressed && styles.chipPressed]}><Text style={[styles.chipText, selected && { color }]}>{label}</Text></Pressable>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionCaption}><Text style={styles.sectionTitle}>{title}</Text></View>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
}

export function Metric({ label, value, detail, accent = colors.text }: { label: string; value: string; detail?: string; accent?: string }) {
  return <View style={styles.metric}><Label>{label}</Label><Text style={[styles.metricValue, { color: accent }]}>{value}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</View>;
}

export function SearchField({ placeholder, value, onChangeText }: { placeholder: string; value?: string; onChangeText?: (value: string) => void }) {
  return <View style={styles.search}><FuturisticIcon name="search" size={19} color={colors.textMuted} accent={colors.accent} style={styles.searchIcon} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSubtle} style={styles.searchInput} /></View>;
}

const styles = StyleSheet.create({
  header: { alignItems: 'stretch', paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  headerMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginRight: 7, transform: [{ rotate: '-3deg' }] },
  brandGood: { color: colors.text, fontSize: 16, lineHeight: 19, fontWeight: '900', letterSpacing: -0.45 },
  brandBro: { color: colors.accent, fontSize: 16, lineHeight: 19, fontWeight: '900', letterSpacing: -0.45 },
  brandSpark: { width: 8, height: 8, borderRadius: 2, marginLeft: 6, backgroundColor: colors.yellow, transform: [{ rotate: '45deg' }] },
  eyebrow: { ...typography.label, color: colors.accent, flexShrink: 1 },
  title: { ...typography.display, color: colors.text },
  titleAccent: { width: 68, height: 5, borderRadius: 99, backgroundColor: colors.yellow, transform: [{ rotate: '-2deg' }] },
  detail: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  card: { padding: spacing.panel, minWidth: 0, ...shadow },
  label: { ...typography.label },
  badge: { maxWidth: '100%', flexShrink: 1, alignSelf: 'flex-start', borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface },
  badgeDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  badgeText: { ...typography.label, letterSpacing: 0.6, flexShrink: 1 },
  button: { minHeight: 50, minWidth: 0, maxWidth: '100%', borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, overflow: 'hidden' },
  buttonCompact: { minHeight: 44, paddingHorizontal: 6, paddingVertical: 7, gap: 5 },
  button_primary: { backgroundColor: colors.accent, borderColor: colors.navy, shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 1, shadowOffset: { width: 0, height: 4 } },
  button_secondary: { backgroundColor: colors.surfaceElevated, borderColor: colors.navy },
  button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  button_danger: { backgroundColor: colors.red, borderColor: colors.navy, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 1, shadowOffset: { width: 0, height: 4 } },
  buttonShine: { position: 'absolute', top: -18, bottom: -18, left: 0, width: 34, borderRadius: 99, backgroundColor: '#FFFFFF66' },
  buttonText: { ...typography.bodyMedium, color: colors.text, fontWeight: '800', flexShrink: 1, textAlign: 'center', lineHeight: 18, letterSpacing: 0.15 },
  buttonTextCompact: { fontSize: 12, lineHeight: 15, letterSpacing: 0.45 },
  primaryButtonText: { color: colors.white },
  dangerButtonText: { color: colors.white },
  pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 1, shadowOffset: { width: 0, height: 3 } },
  iconButtonActive: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  iconButtonDanger: { backgroundColor: `${colors.red}18`, borderColor: `${colors.red}55` },
  iconButtonLabel: { color: colors.text, fontSize: 17, fontWeight: '700' },
  chip: { minHeight: 44, maxWidth: '100%', justifyContent: 'center', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.15 },
  chipPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 8, marginTop: spacing.lg, marginBottom: spacing.md },
  sectionCaption: { maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: colors.navy, borderRadius: 10, borderBottomLeftRadius: 3, backgroundColor: '#FFF0AC' },
  sectionTitle: { ...typography.bodyMedium, color: colors.text, flexShrink: 1 },
  sectionAction: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  metric: { flexBasis: '42%', flexGrow: 1, minWidth: 100 },
  metricValue: { fontSize: 20, fontWeight: '700', marginTop: 5 },
  metricDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2, flexShrink: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 46, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.sm },
  searchIcon: { marginHorizontal: 5 },
  searchInput: { flex: 1, color: colors.text, ...typography.body, paddingHorizontal: 5 },
});
