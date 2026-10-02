import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../../context/AppContext';
import { Badge, Button, Card, Chip, Label } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { colors, spacing, typography } from '../../theme';
import { tripDistanceKm } from './tripMetrics';

export function DrivePanel({ onOpen, onStart }: { onOpen: () => void; onStart: () => void }) {
  const { activeSession, sessions, selectedUseCaseModeId, selectUseCaseMode, capabilities, drivePreferences, setDrivePreferences, addMarker, lockActiveSession } = useApp();
  const driving = activeSession?.useCaseModeId === 'drive' && activeSession.status === 'recording';
  const selected = selectedUseCaseModeId === 'drive' || driving;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const samples = driving ? activeSession.locationSamples ?? [] : [];
  const latest = samples[samples.length - 1];
  const speedMph = latest?.speedMps != null && latest.speedMps >= 0 ? Math.round(latest.speedMps * 2.23694) : null;
  const miles = tripDistanceKm(samples) * 0.621371;
  const incidentCount = driving ? activeSession.markers.filter((marker) => marker.label === 'incident').length : 0;
  const lastSavedDrive = !activeSession && sessions[0]?.useCaseModeId === 'drive' && sessions[0].status === 'complete' && Date.now() - Date.parse(sessions[0].endedAt ?? '') < 30 * 60 * 1000;

  return <Card style={[styles.panel, selected && styles.panelSelected]}>
    <View style={styles.head}>
      <View style={styles.icon}><FuturisticIcon name="vehicle" size={28} color={colors.white} accent={colors.yellow} /></View>
      <View style={styles.heading}><Label color={colors.blue}>DRIVING · MAIN MODE</Label><Text style={styles.title}>{driving ? 'Drive recording' : 'Ready for the road.'}</Text><Text style={styles.subtitle}>Road video, trip route and incident protection.</Text></View>
    </View>
    {driving ? <>
      <View style={styles.tripGrid}>
        <View style={styles.tripTile}><Text style={styles.tripNumber}>{speedMph ?? '—'}</Text><Text style={styles.tripLabel}>MPH · GPS</Text></View>
        <View style={styles.tripTile}><Text style={styles.tripNumber}>{miles.toFixed(1)}</Text><Text style={styles.tripLabel}>MILES · APPROX.</Text></View>
        <View style={styles.tripTile}><Text style={styles.tripNumber}>{incidentCount}</Text><Text style={styles.tripLabel}>EVENTS MARKED</Text></View>
      </View>
      <Button label={activeSession.protected ? 'INCIDENT PROTECTED' : 'SAVE INCIDENT'} icon="◆" variant="danger" onPress={() => { addMarker('incident'); lockActiveSession(); }} style={styles.primaryAction} />
      <Button label="MARK MOMENT" icon="＋" variant="secondary" onPress={() => addMarker('important')} style={styles.secondaryAction} />
      <Text style={styles.footnote}>Save Incident protects the entire current drive and adds a timestamped marker. Automatic collision detection and pre-event clip extraction are not active yet.</Text>
    </> : <>
      {lastSavedDrive ? <View style={styles.parkOffer}><Text style={styles.parkOfferText}>Drive saved. Parked now?</Text><Button label="SET UP PARK GUARD" compact variant="secondary" onPress={() => selectUseCaseMode('park')} /></View> : null}
      <View style={styles.startRow}><Button label={selected ? 'START DRIVE' : 'OPEN DRIVE'} icon="▶" onPress={selected ? onStart : onOpen} style={styles.startButton} />{!selected ? <Button label="SET UP" variant="secondary" onPress={() => { onOpen(); setSettingsOpen(true); }} style={styles.setupButton} /> : null}</View>
      {selected ? <>
        <View style={styles.summary}><Badge color={colors.blue}>{drivePreferences.view === 'dual' ? 'ROAD + CABIN' : drivePreferences.view.toUpperCase()}</Badge><Badge color={colors.orange}>{drivePreferences.segmentMinutes} MIN SEGMENTS</Badge></View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: settingsOpen }} onPress={() => setSettingsOpen(!settingsOpen)} style={styles.dropdown}><Text style={styles.dropdownText}>Drive setup</Text><Text style={styles.chevron}>{settingsOpen ? '⌃' : '⌄'}</Text></Pressable>
        {settingsOpen ? <View style={styles.settings}>
          <Setting label="CAMERA VIEW"><Chip label="ROAD" selected={drivePreferences.view === 'road'} onPress={() => setDrivePreferences({ view: 'road' })} /><Chip label="CABIN" selected={drivePreferences.view === 'cabin'} onPress={() => setDrivePreferences({ view: 'cabin' })} color={colors.purple} /><Chip label="BOTH" selected={drivePreferences.view === 'dual'} disabled={!capabilities?.dualCameraSupported} onPress={() => setDrivePreferences({ view: 'dual' })} color={colors.orange} /></Setting>
          {!capabilities?.dualCameraSupported ? <Text style={styles.footnote}>Road + cabin requires a compatible iPhone and native multicamera capture.</Text> : null}
          <Setting label="VIDEO QUALITY"><Chip label="720P" selected={drivePreferences.quality === '720p'} onPress={() => setDrivePreferences({ quality: '720p' })} /><Chip label="1080P" selected={drivePreferences.quality === '1080p'} onPress={() => setDrivePreferences({ quality: '1080p' })} /><Chip label="4K" selected={drivePreferences.quality === '2160p'} onPress={() => setDrivePreferences({ quality: '2160p' })} color={colors.purple} /></Setting>
          <Setting label="FRAME RATE"><Chip label="30 FPS" selected={drivePreferences.fps === 30} onPress={() => setDrivePreferences({ fps: 30 })} /><Chip label="60 FPS" selected={drivePreferences.fps === 60} onPress={() => setDrivePreferences({ fps: 60 })} color={colors.purple} /></Setting>
          <Text style={styles.footnote}>The chosen FPS is a target for native dual capture. iOS chooses the supported rate for a single camera.</Text>
          <Setting label="CLIP SEGMENTS"><Chip label="1 MIN" selected={drivePreferences.segmentMinutes === 1} onPress={() => setDrivePreferences({ segmentMinutes: 1 })} /><Chip label="3 MIN" selected={drivePreferences.segmentMinutes === 3} onPress={() => setDrivePreferences({ segmentMinutes: 3 })} /><Chip label="5 MIN" selected={drivePreferences.segmentMinutes === 5} onPress={() => setDrivePreferences({ segmentMinutes: 5 })} /><Chip label="10 MIN" selected={drivePreferences.segmentMinutes === 10} onPress={() => setDrivePreferences({ segmentMinutes: 10 })} /></Setting>
          <Setting label="TRIP OPTIONS"><Chip label={drivePreferences.microphone ? 'MIC ON' : 'MIC OFF'} selected={drivePreferences.microphone} onPress={() => setDrivePreferences({ microphone: !drivePreferences.microphone })} /><Chip label={drivePreferences.gps ? 'GPS ON' : 'GPS OFF'} selected={drivePreferences.gps} onPress={() => setDrivePreferences({ gps: !drivePreferences.gps })} /></Setting>
          <Text style={styles.footnote}>GPS asks permission when recording starts. iOS stops camera capture when the app is backgrounded.</Text>
        </View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: readinessOpen }} onPress={() => setReadinessOpen(!readinessOpen)} style={styles.dropdown}><Text style={styles.dropdownText}>More driving abilities</Text><Text style={styles.chevron}>{readinessOpen ? '⌃' : '⌄'}</Text></Pressable>
        {readinessOpen ? <View style={styles.readiness}><Text style={styles.readyLine}>Now: timed local clips, GPS route and speed, manual incident markers, protected originals, and Library export.</Text><Text style={styles.plannedLine}>Device work ahead: collision sensors, pre-event buffer, automatic storage overwrite, voice “Save that,” screen dimming, CarPlay prompts, cloud backup, and AI trip analysis.</Text></View> : null}
      </> : null}
    </>}
  </Card>;
}

function Setting({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return <View style={styles.setting}><Label>{label}</Label><View style={styles.chips}>{children}</View></View>;
}

const styles = StyleSheet.create({
  panel: { gap: 14, backgroundColor: '#E9F6FF', borderColor: colors.navy, marginBottom: spacing.lg },
  panelSelected: { backgroundColor: '#E2F4FF' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, borderColor: colors.navy, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  heading: { flex: 1, minWidth: 0 }, title: { ...typography.title, color: colors.text, marginTop: 3 }, subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  startRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, startButton: { flexGrow: 2, minWidth: 140 }, setupButton: { flexGrow: 1, minWidth: 96 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dropdown: { minHeight: 48, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dropdownText: { ...typography.bodyMedium, color: colors.text }, chevron: { ...typography.title, color: colors.accent },
  settings: { gap: 16, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface }, setting: { gap: 7 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  footnote: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },
  tripGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tripTile: { flexBasis: '29%', flexGrow: 1, minWidth: 70, minHeight: 78, padding: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, tripNumber: { color: colors.text, fontSize: 22, fontWeight: '800' }, tripLabel: { ...typography.label, color: colors.textMuted, fontSize: 9, marginTop: 5 },
  primaryAction: { minHeight: 68 }, secondaryAction: { minHeight: 52 },
  readiness: { gap: 9, padding: 12, borderRadius: 12, backgroundColor: colors.surface }, readyLine: { ...typography.caption, color: colors.text }, plannedLine: { ...typography.caption, color: colors.textMuted },
  parkOffer: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFF0AC' }, parkOfferText: { ...typography.bodyMedium, color: colors.text },
});
