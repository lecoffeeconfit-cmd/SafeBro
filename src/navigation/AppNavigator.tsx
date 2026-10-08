import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AnalyzeScreen } from '../screens/AnalyzeScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { AudioScreen, AudioPageMode } from '../screens/AudioScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StudioScreen } from '../screens/StudioScreen';
import { AmbientOrbs, useReducedMotion } from '../components/Motion';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { colors, spacing, typography } from '../theme';
import { useApp } from '../context/AppContext';
import { isAudioQuickCaptureMode, QuickCaptureMode, quickCaptureModes } from '../features/quickCapture/config';

type Tab = 'capture' | 'audio' | 'library' | 'people' | 'analyze' | 'studio' | 'settings';
type Deck = 'record' | null;
const TAB_BAR_HEIGHT = 76;

const leftTabs: { id: Tab; label: string; icon: string; accent: string }[] = [
  { id: 'capture', label: 'Camera', icon: 'rear-camera', accent: colors.accent },
  { id: 'audio', label: 'Audio', icon: 'microphone', accent: colors.aqua },
  { id: 'people', label: 'People', icon: 'people', accent: colors.blue },
];

const rightTabs: { id: Tab; label: string; icon: string; accent: string }[] = [
  { id: 'studio', label: 'Studio', icon: 'studio', accent: colors.purple },
  { id: 'library', label: 'Library', icon: 'library', accent: colors.blue },
  { id: 'settings', label: 'Settings', icon: 'settings', accent: colors.orange },
];

const recordActions = [
  { id: 'camera', label: 'Camera', detail: 'Front · rear · dual', icon: 'rear-camera', color: colors.accent },
  { id: 'audio', label: 'Audio', detail: 'Mic · voice · notes', icon: 'microphone', color: colors.aqua },
  { id: 'drive', label: 'Drive', detail: 'Road · cabin · GPS', icon: 'vehicle', color: colors.yellow },
  { id: 'room', label: 'Room', detail: 'Local room watch', icon: 'security', color: colors.purple },
  { id: 'podcast', label: 'Podcast', detail: 'Mic · multicamera', icon: 'podcast', color: '#FF8DA1' },
  { id: 'quick', label: 'Quick', detail: 'Your saved action', icon: 'bolt', color: colors.orange },
] as const;

type NavItem = { id: Tab; label: string; icon: string; accent: string };

function NavTab({ item, selected, onPress, reducedMotion, linked = false }: { item: NavItem; selected: boolean; onPress: () => void; reducedMotion: boolean; linked?: boolean }) {
  const selection = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { selection.setValue(selected ? 1 : 0); return; }
    const animation = Animated.spring(selection, { toValue: selected ? 1 : 0, damping: 15, stiffness: 250, mass: 0.62, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, selected, selection]);
  const scale = selection.interpolate({ inputRange: [0, 1], outputRange: [1, 1.11] });
  const translateY = selection.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const glowOpacity = selection.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8] });
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.tab, linked && styles.linkedTab, pressed && styles.tabPressed]} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label}>
    <Animated.View pointerEvents="none" style={[styles.navGlow, { opacity: glowOpacity }]} />
    <Animated.View style={[styles.iconWrap, linked && styles.linkedIconWrap, selected && styles.iconWrapSelected, { transform: [{ scale }, { translateY }] }]}>
      <FuturisticIcon name={item.icon} size={linked ? 20 : 23} color={selected ? colors.navy : '#58738E'} accent={item.accent} animated />
    </Animated.View>
    <Text numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text>
  </Pressable>;
}

function LinkedCaptureTabs({ items, tab, onOpen, reducedMotion }: { items: readonly [NavItem, NavItem]; tab: Tab; onOpen: (tab: Tab) => void; reducedMotion: boolean }) {
  const signal = useRef(new Animated.Value(0)).current;
  const active = tab === items[0].id || tab === items[1].id;
  useEffect(() => {
    if (reducedMotion) { signal.setValue(0.5); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(signal, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(signal, { toValue: 0, duration: 950, useNativeDriver: true }),
      Animated.delay(420),
    ]));
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, signal]);
  const sparkX = signal.interpolate({ inputRange: [0, 1], outputRange: [-13, 13] });
  const sparkScale = signal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1.15, 0.72] });
  const beamOpacity = signal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.28, 0.92, 0.28] });
  return <View style={[styles.capturePair, active && styles.capturePairActive]} accessibilityLabel="Linked camera and audio tools">
    <View pointerEvents="none" style={styles.capturePairHalftone}><View style={styles.capturePairDot} /><View style={styles.capturePairDot} /><View style={styles.capturePairDot} /></View>
    <Animated.View pointerEvents="none" style={[styles.capturePairBeam, { opacity: beamOpacity }]} />
    <Animated.View pointerEvents="none" style={[styles.capturePairSpark, { transform: [{ translateX: sparkX }, { scale: sparkScale }, { rotate: '45deg' }] }]} />
    <NavTab item={items[0]} selected={tab === items[0].id} onPress={() => onOpen(items[0].id)} reducedMotion={reducedMotion} linked />
    <View pointerEvents="none" style={styles.capturePairSeam} />
    <NavTab item={items[1]} selected={tab === items[1].id} onPress={() => onOpen(items[1].id)} reducedMotion={reducedMotion} linked />
  </View>;
}

function RecordHubButton({ selected, active, open, onPress, reducedMotion }: { selected: boolean; active: boolean; open: boolean; onPress: () => void; reducedMotion: boolean }) {
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) { orbit.setValue(0); pulse.setValue(0); return; }
    const orbitAnimation = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: active ? 1500 : 4200, useNativeDriver: true }));
    const pulseAnimation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: active ? 650 : 1400, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: active ? 650 : 1400, useNativeDriver: true }),
    ]));
    orbitAnimation.start(); pulseAnimation.start();
    return () => { orbitAnimation.stop(); pulseAnimation.stop(); };
  }, [active, orbit, pulse, reducedMotion]);
  const rotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.18 : 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.76, active ? 0.12 : 0.34] });
  return <View style={styles.recordSlot}>
    <Animated.View pointerEvents="none" style={[styles.recordPulse, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
    <Animated.View pointerEvents="none" style={[styles.recordOrbit, { transform: [{ rotate }] }]}><View style={styles.orbitSpark} /><View style={styles.orbitSparkTwo} /></Animated.View>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open, selected }} accessibilityLabel={active ? 'Open active recording' : 'Open recording modes'} style={({ pressed }) => [styles.recordButton, active && styles.recordButtonLive, selected && styles.recordButtonSelected, pressed && styles.recordButtonPressed]}>
      <LinearGradient colors={active ? ['#FF6C74', '#DD3048'] : ['#54D5FF', '#278BFF']} style={styles.recordButtonGradient}>
        <FuturisticIcon name={active ? 'stop' : 'record'} size={28} color={colors.white} accent={active ? colors.white : colors.yellow} animated />
      </LinearGradient>
    </Pressable>
    <Text style={[styles.recordLabel, active && styles.recordLabelLive]}>{active ? 'LIVE' : 'RECORD'}</Text>
  </View>;
}

function DeckAction({ label, detail, icon, color, index, onPress, reducedMotion }: { label: string; detail: string; icon: string; color: string; index: number; onPress: () => void; reducedMotion: boolean }) {
  const entrance = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { entrance.setValue(1); return; }
    const animation = Animated.spring(entrance, { toValue: 1, delay: 45 + index * 45, damping: 16, stiffness: 210, mass: 0.72, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entrance, index, reducedMotion]);
  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  return <Animated.View style={[styles.deckActionWrap, { opacity: entrance, transform: [{ translateY }, { scale }] }]}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}. ${detail}`} style={({ pressed }) => [styles.deckAction, { borderColor: `${color}88` }, pressed && styles.deckActionPressed]}>
      <View style={[styles.deckActionIcon, { backgroundColor: `${color}24`, borderColor: color }]}><FuturisticIcon name={icon} size={24} color={color} accent={colors.white} animated /></View>
      <View style={styles.deckActionCopy}><Text style={styles.deckActionLabel}>{label}</Text><Text numberOfLines={2} style={styles.deckActionDetail}>{detail}</Text></View>
      <Text style={[styles.deckActionArrow, { color }]}>›</Text>
    </Pressable>
  </Animated.View>;
}

export function AppNavigator() {
  const { quickCaptureRequest, clearQuickCaptureRequest, activeSession, isReady, selectedMode, selectedUseCaseModeId, setSelectedMode, selectUseCaseMode, quickCaptureMode, requestQuickCapture } = useApp();
  const [tab, setTab] = useState<Tab>('capture');
  const [audioMode, setAudioMode] = useState<AudioPageMode>('audio');
  const [navigationWarning, setNavigationWarning] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck>(null);
  const cameraRecording = Boolean(activeSession && !isAudioQuickCaptureMode(activeSession.mode as QuickCaptureMode));
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslate = useRef(new Animated.Value(0)).current;
  const deckProgress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const navWidth = Platform.OS === 'web' && typeof window !== 'undefined' ? Math.min(window.innerWidth, 360) : windowWidth;
  const quickMode = quickCaptureModes.find((item) => item.id === quickCaptureMode) ?? quickCaptureModes[0];

  useEffect(() => {
    if (reducedMotion) { screenOpacity.setValue(1); screenTranslate.setValue(0); return; }
    screenOpacity.setValue(0); screenTranslate.setValue(8);
    const animation = Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(screenTranslate, { toValue: 0, damping: 18, stiffness: 150, mass: 0.7, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, screenOpacity, screenTranslate, tab]);

  useEffect(() => {
    if (!deck) return;
    if (reducedMotion) { deckProgress.setValue(1); return; }
    deckProgress.setValue(0);
    Animated.spring(deckProgress, { toValue: 1, damping: 18, stiffness: 190, mass: 0.72, useNativeDriver: true }).start();
  }, [deck, deckProgress, reducedMotion]);

  useEffect(() => {
    if (!quickCaptureRequest) return;
    if (activeSession) {
      setNavigationWarning('Stop and save the current recording before starting another mode.');
      clearQuickCaptureRequest(quickCaptureRequest.token);
      return;
    }
    setDeck(null);
    setTab(isAudioQuickCaptureMode(quickCaptureRequest.mode) ? 'audio' : 'capture');
  }, [quickCaptureRequest?.token, activeSession?.id, clearQuickCaptureRequest]);

  useEffect(() => {
    if (isReady && selectedUseCaseModeId === 'audio_guard' && !activeSession) {
      setAudioMode('audio_guard'); setTab('audio');
    }
  }, [isReady]);

  useEffect(() => { if (!activeSession) setNavigationWarning(null); }, [activeSession?.id]);

  const closeDeck = () => {
    if (!deck) return;
    if (reducedMotion) { setDeck(null); return; }
    Animated.timing(deckProgress, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => { if (finished) setDeck(null); });
  };

  const toggleDeck = (next: Exclude<Deck, null>) => {
    if (deck === next) { closeDeck(); return; }
    setDeck(next);
  };

  const openAudio = (mode?: AudioPageMode) => {
    if (cameraRecording) { setNavigationWarning('Stop and save the camera recording before changing pages.'); return; }
    if (mode) setAudioMode(mode);
    setNavigationWarning(null); setDeck(null); setTab('audio');
  };

  const openTab = (next: Tab) => {
    if (cameraRecording && next !== 'capture') { setNavigationWarning('Stop and save the camera recording before changing pages.'); return; }
    if (next === 'capture' && !activeSession && (selectedMode === 'audio' || selectedMode === 'low_power_audio' || selectedMode === 'conversation_audio')) setSelectedMode('rear_video');
    setNavigationWarning(null); setDeck(null); setTab(next);
  };

  const openRecordHub = () => {
    if (activeSession) { openTab(isAudioQuickCaptureMode(activeSession.mode as QuickCaptureMode) ? 'audio' : 'capture'); return; }
    toggleDeck('record');
  };

  const openRecordAction = (id: (typeof recordActions)[number]['id']) => {
    setNavigationWarning(null); setDeck(null);
    if (id === 'audio') { setAudioMode('audio'); setTab('audio'); return; }
    if (id === 'drive' || id === 'room') { selectUseCaseMode(id); setTab('capture'); return; }
    if (id === 'podcast') { setSelectedMode('podcast'); setTab('capture'); return; }
    if (id === 'quick') { requestQuickCapture(quickCaptureMode); return; }
    setSelectedMode('rear_video'); setTab('capture');
  };

  const screen = {
    capture: <CaptureScreen onOpenAudio={openAudio} />,
    audio: <AudioScreen mode={audioMode} onModeChange={setAudioMode} onOpenCapture={() => openTab('capture')} />,
    library: <LibraryScreen />,
    people: <PeopleScreen />,
    analyze: <AnalyzeScreen />,
    studio: <StudioScreen onOpenAnalyze={() => openTab('analyze')} />,
    settings: <SettingsScreen />,
  }[tab];

  const deckTranslate = deckProgress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const deckScale = deckProgress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const recordSelected = tab === 'capture' || tab === 'audio' || deck === 'record';

  return <LinearGradient colors={[colors.background, '#EAF7FF', colors.background]} style={styles.gradient}>
    <AmbientOrbs enabled={!activeSession} />
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.screen, { opacity: screenOpacity, transform: [{ translateY: screenTranslate }] }]}>{screen}</Animated.View>
      {deck ? <View style={styles.deckLayer} pointerEvents="box-none">
        <Pressable accessibilityLabel="Close navigation panel" onPress={closeDeck} style={styles.deckBackdrop} />
        <Animated.View style={[styles.deckCard, { opacity: deckProgress, transform: [{ translateY: deckTranslate }, { scale: deckScale }] }]}>
          <View style={styles.deckHandle} />
          <View style={styles.deckHeader}>
            <View><Text style={styles.deckEyebrow}>SAFEBRO CAPTURE DECK</Text><Text style={styles.deckTitle}>Choose what to record</Text></View>
            <View style={styles.deckSignal}><View style={styles.deckSignalDot} /><Text style={styles.deckSignalText}>LOCAL</Text></View>
          </View>
          <View style={styles.deckGrid}>
            {recordActions.map((action, index) => <DeckAction key={action.id} {...action} detail={action.id === 'quick' ? quickMode.label : action.detail} index={index} reducedMotion={reducedMotion} onPress={() => openRecordAction(action.id)} />)}
          </View>
          <Text style={styles.deckFootnote}>Tap a mode to open its full controls. Nothing records until you press Start.</Text>
        </Animated.View>
      </View> : null}
      {navigationWarning ? <View style={styles.navWarning}><Text style={styles.navWarningText}>{navigationWarning}</Text></View> : null}
      <View style={[styles.tabBarShell, { width: navWidth, maxWidth: navWidth }]}>
        <LinearGradient colors={[colors.cream, '#F1F8FC', '#EAF5FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabBar}>
          <LinkedCaptureTabs items={[leftTabs[0], leftTabs[1]]} tab={tab} onOpen={openTab} reducedMotion={reducedMotion} />
          <NavTab item={leftTabs[2]} selected={tab === leftTabs[2].id} onPress={() => openTab(leftTabs[2].id)} reducedMotion={reducedMotion} />
          <RecordHubButton selected={recordSelected} active={Boolean(activeSession)} open={deck === 'record'} onPress={openRecordHub} reducedMotion={reducedMotion} />
          {rightTabs.map((item) => <NavTab key={item.id} item={item} selected={tab === item.id || (item.id === 'studio' && tab === 'analyze')} onPress={() => openTab(item.id)} reducedMotion={reducedMotion} />)}
        </LinearGradient>
      </View>
    </SafeAreaView>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  screen: { flex: 1 },
  tabBarShell: { zIndex: 30, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: '#C8E4F3' },
  tabBar: { minHeight: TAB_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingTop: 3, paddingHorizontal: 4, shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -3 } },
  tab: { flex: 1, minWidth: 0, height: 64, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative' },
  linkedTab: { height: 58, gap: 1, zIndex: 2 },
  tabPressed: { opacity: 0.76, transform: [{ scale: 0.95 }] },
  navGlow: { position: 'absolute', top: 5, width: 42, height: 42, borderRadius: 21, backgroundColor: '#49D8FF33', shadowColor: '#49D8FF', shadowOpacity: 0.9, shadowRadius: 11, shadowOffset: { width: 0, height: 0 } },
  iconWrap: { width: 39, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  linkedIconWrap: { width: 34, height: 32, borderRadius: 11 },
  iconWrapSelected: { backgroundColor: '#E9FAFF', borderColor: '#65DFFF', shadowColor: '#65DFFF', shadowOpacity: 0.75, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  tabLabel: { ...typography.caption, color: '#58738E', fontSize: 9, lineHeight: 12, fontWeight: '700' },
  tabLabelSelected: { color: colors.navy, fontWeight: '900' },
  capturePair: { flex: 2, minWidth: 0, height: 62, marginHorizontal: 2, borderWidth: 1.5, borderColor: '#183F66', borderRadius: 18, borderTopRightRadius: 11, borderBottomLeftRadius: 11, backgroundColor: '#DFF5FF', flexDirection: 'row', alignItems: 'center', position: 'relative', overflow: 'hidden', shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 2, shadowOffset: { width: 0, height: 3 } },
  capturePairActive: { borderColor: '#39C8F5', backgroundColor: '#E9FBFF', shadowColor: '#39C8F5', shadowOpacity: 0.38, shadowRadius: 7 },
  capturePairHalftone: { position: 'absolute', left: 5, top: 5, flexDirection: 'row', gap: 2, transform: [{ rotate: '-8deg' }] },
  capturePairDot: { width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: '#4E80A955' },
  capturePairBeam: { position: 'absolute', zIndex: 3, left: '50%', top: 27, width: 28, height: 2, marginLeft: -14, borderRadius: 2, backgroundColor: colors.aqua, shadowColor: colors.aqua, shadowOpacity: 0.8, shadowRadius: 4 },
  capturePairSpark: { position: 'absolute', zIndex: 4, left: '50%', top: 23, width: 9, height: 9, marginLeft: -4.5, borderRadius: 2, backgroundColor: colors.yellow, borderWidth: 1, borderColor: colors.white, shadowColor: colors.yellow, shadowOpacity: 0.9, shadowRadius: 5 },
  capturePairSeam: { position: 'absolute', zIndex: 1, left: '50%', top: 8, bottom: 8, width: 1, backgroundColor: '#4E80A944', transform: [{ rotate: '5deg' }] },
  recordSlot: { width: 78, height: 88, alignItems: 'center', justifyContent: 'flex-start', marginTop: -24, position: 'relative' },
  recordPulse: { position: 'absolute', top: 3, width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: '#6BE6FF' },
  recordOrbit: { position: 'absolute', top: 0, width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderStyle: 'dashed', borderColor: '#85EAFF88' },
  orbitSpark: { position: 'absolute', width: 7, height: 7, borderRadius: 4, top: -4, left: 31, backgroundColor: colors.yellow, shadowColor: colors.yellow, shadowOpacity: 0.9, shadowRadius: 6 },
  orbitSparkTwo: { position: 'absolute', width: 5, height: 5, borderRadius: 3, bottom: 5, right: 5, backgroundColor: colors.aqua },
  recordButton: { width: 62, height: 62, marginTop: 6, borderRadius: 23, borderWidth: 2.5, borderColor: colors.white, backgroundColor: colors.accent, overflow: 'hidden', transform: [{ rotate: '-3deg' }], shadowColor: '#50D9FF', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  recordButtonSelected: { borderColor: colors.yellow },
  recordButtonLive: { shadowColor: colors.red },
  recordButtonPressed: { transform: [{ rotate: '-3deg' }, { scale: 0.91 }] },
  recordButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recordLabel: { ...typography.label, color: colors.navy, fontSize: 8, lineHeight: 10, marginTop: 4, letterSpacing: 0.85 },
  recordLabelLive: { color: '#B83145' },
  deckLayer: { position: 'absolute', zIndex: 20, top: 0, right: 0, bottom: TAB_BAR_HEIGHT, left: 0, justifyContent: 'flex-end' },
  deckBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#04132677' },
  deckCard: { marginHorizontal: 10, marginBottom: 9, padding: 16, paddingTop: 11, borderRadius: 24, borderBottomRightRadius: 11, borderWidth: 1.5, borderColor: '#62DBFF99', backgroundColor: '#071C36F7', shadowColor: colors.navy, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  deckHandle: { width: 48, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#5DDFFF88', marginBottom: 12 },
  deckHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  deckEyebrow: { ...typography.label, color: '#64DBFF', fontSize: 9 },
  deckTitle: { ...typography.title, color: colors.white, fontSize: 20, lineHeight: 25, marginTop: 3 },
  deckSignal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#4EE2C777', backgroundColor: '#4EE2C714' },
  deckSignalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.aqua, shadowColor: colors.aqua, shadowOpacity: 0.9, shadowRadius: 5 },
  deckSignalText: { ...typography.label, color: colors.aqua, fontSize: 8 },
  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  deckActionWrap: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  deckAction: { minHeight: 74, padding: 10, borderWidth: 1, borderRadius: 16, backgroundColor: '#102D4D', flexDirection: 'row', alignItems: 'center', gap: 9 },
  deckActionPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  deckActionIcon: { width: 38, height: 38, flexShrink: 0, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deckActionCopy: { flex: 1, minWidth: 0 },
  deckActionLabel: { ...typography.bodyMedium, color: colors.white, fontSize: 14, lineHeight: 18 },
  deckActionDetail: { ...typography.caption, color: '#99B1CA', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  deckActionArrow: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  deckFootnote: { ...typography.caption, color: '#9CB5CE', fontSize: 10, lineHeight: 14, marginTop: 12, textAlign: 'center' },
  navWarning: { zIndex: 35, paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: '#2F210B', borderTopWidth: 1, borderTopColor: `${colors.orange}77` },
  navWarningText: { ...typography.caption, color: '#FFD07B', textAlign: 'center' },
});
