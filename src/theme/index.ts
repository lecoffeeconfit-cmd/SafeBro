import { Platform, StyleSheet } from 'react-native';

export const colors = {
  background: '#FFF9E9',
  surface: '#FFFFFF',
  surfaceElevated: '#E2F4FF',
  surfaceMuted: '#F1F8FC',
  border: '#12325B',
  text: '#0E2A52',
  textMuted: '#496783',
  textSubtle: '#7289A0',
  accent: '#2F9CF4',
  accentMuted: '#D9EFFF',
  orange: '#C48700',
  yellow: '#FFD83D',
  red: '#F24E56',
  blue: '#20C7C0',
  purple: '#806CF2',
  aqua: '#3EE0C6',
  cream: '#FFF9E9',
  navy: '#0E2A52',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = { xs: 6, sm: 10, md: 16, panel: 18, lg: 24, xl: 32, xxl: 44 };

export const radii = { sm: 10, md: 16, lg: 24, pill: 999 };

export const typography = {
  display: { fontSize: 30, lineHeight: 35, fontWeight: '800' as const, letterSpacing: -0.7 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const, letterSpacing: -0.25 },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '700' as const },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '800' as const, letterSpacing: 1.05 },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const },
};

export const shadow = Platform.select({
  ios: { shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 0, shadowOffset: { width: 3, height: 4 } },
  android: { elevation: 4 },
  web: { shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 0, shadowOffset: { width: 3, height: 4 } },
  default: {},
});

export const commonStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, borderBottomRightRadius: 12 },
  muted: { color: colors.textMuted },
});
