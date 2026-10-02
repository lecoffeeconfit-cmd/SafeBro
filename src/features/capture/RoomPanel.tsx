import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../../context/AppContext';
import { Badge, Button, Card, Chip, Label } from '../../components/UI';
import { FuturisticIcon } from '../../components/FuturisticIcon';
import { colors, spacing, typography } from '../../theme';

export function RoomPanel({ onOpen, onStart, onOpenAudio }: { onOpen: () => void; onStart: () => void; onOpenAudio: () => void }) {
  const { activeSession, selectedUseCaseModeId, roomPreferences, setRoomPreferences, capabilities, addMarker, lockActiveSession } = useApp();
  const live = activeSession?.useCaseModeId === 'room' && activeSession.status === 'recording';
  const selected = selectedUseCaseModeId === 'room' || live;
  const [setupOpen, setSetupOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const lens = live ? activeSession.settings.roomConfig?.lens ?? roomPreferences.lens : roomPreferences.lens;

  return <Card style={[styles.panel, selected && styles.selected]}>
    <View style={styles.headingRow}>
      <View style={styles.icon}><FuturisticIcon name="security" size={30} color={colors.navy} accent={colors.blue} /></View>
      <View style={styles.heading}><Label color={colors.purple}>ROOM WATCH · MAIN MODE</Label><Text style={styles.title}>{live ? 'Room watch is live' : 'Keep an eye on your space.'}</Text><Text style={styles.subtitle}>A local room camera with simple, visible controls.</Text></View>
      {live ? <Badge color={colors.red}>LIVE</Badge> : null}
    </View>
    <View style={styles.statusRow}>
      <View style={styles.status}><Text style={styles.statusValue}>{lens === 'dual' ? 'BOTH' : lens.toUpperCase()}</Text><Text style={styles.statusLabel}>CAMERA</Text></View>
      <View style={styles.status}><Text style={styles.statusValue}>{live ? activeSession.settings.cameraConfig?.microphone ? 'ON' : 'OFF' : roomPreferences.microphone ? 'ON' : 'OFF'}</Text><Text style={styles.statusLabel}>MICROPHONE</Text></View>
      <View style={styles.status}><Text style={styles.statusValue}>{live ? activeSession.settings.cameraConfig?.quality?.toUpperCase() : roomPreferences.quality.toUpperCase()}</Text><Text style={styles.statusLabel}>VIDEO</Text></View>
    </View>
    {live ? <>
      <View style={styles.liveActions}><Button label="MARK ACTIVITY" icon="◆" variant="secondary" onPress={() => addMarker('movement')} style={styles.liveButton} /><Button label={activeSession.protected ? 'PROTECTED' : 'PROTECT VIDEO'} icon="⌑" variant="danger" onPress={lockActiveSession} style={styles.liveButton} /></View>
      <Text style={styles.note}>The camera workspace below has Stop & Save. Manual markers and protected recordings appear in Library.</Text>
    </> : <>
      <Button label="START ROOM WATCH" icon="●" onPress={onStart} style={styles.startButton} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: setupOpen }} onPress={() => { if (!selected) onOpen(); setSetupOpen(!setupOpen); }} style={styles.dropdown}><Text style={styles.dropdownText}>Camera setup</Text><Text style={styles.chevron}>{setupOpen ? '⌃' : '⌄'}</Text></Pressable>
      {setupOpen ? <View style={styles.setup}>
        <Setting title="CAMERA"><Chip label="REAR" selected={roomPreferences.lens === 'rear'} onPress={() => setRoomPreferences({ lens: 'rear' })} /><Chip label="FRONT" selected={roomPreferences.lens === 'front'} onPress={() => setRoomPreferences({ lens: 'front' })} color={colors.purple} /><Chip label="BOTH" selected={roomPreferences.lens === 'dual'} disabled={!capabilities?.dualCameraSupported} onPress={() => setRoomPreferences({ lens: 'dual' })} color={colors.blue} /></Setting>
        <Setting title="VIDEO QUALITY"><Chip label="480P" selected={roomPreferences.quality === '480p'} onPress={() => setRoomPreferences({ quality: '480p' })} /><Chip label="720P" selected={roomPreferences.quality === '720p'} onPress={() => setRoomPreferences({ quality: '720p' })} /><Chip label="1080P" selected={roomPreferences.quality === '1080p'} onPress={() => setRoomPreferences({ quality: '1080p' })} /></Setting>
        <Setting title="SOUND"><Chip label={roomPreferences.microphone ? 'MIC ON' : 'MIC OFF'} selected={roomPreferences.microphone} onPress={() => setRoomPreferences({ microphone: !roomPreferences.microphone })} color={colors.purple} /></Setting>
        <Setting title="FILE LENGTH"><Chip label="2 MIN" selected={roomPreferences.segmentMinutes === 2} onPress={() => setRoomPreferences({ segmentMinutes: 2 })} /><Chip label="5 MIN" selected={roomPreferences.segmentMinutes === 5} onPress={() => setRoomPreferences({ segmentMinutes: 5 })} /><Chip label="10 MIN" selected={roomPreferences.segmentMinutes === 10} onPress={() => setRoomPreferences({ segmentMinutes: 10 })} /></Setting>
        <Setting title="DELETE UNPROTECTED AFTER"><Chip label="3 DAYS" selected={roomPreferences.retentionDays === 3} onPress={() => setRoomPreferences({ retentionDays: 3 })} /><Chip label="5 DAYS" selected={roomPreferences.retentionDays === 5} onPress={() => setRoomPreferences({ retentionDays: 5 })} /><Chip label="7 DAYS" selected={roomPreferences.retentionDays === 7} onPress={() => setRoomPreferences({ retentionDays: 7 })} /></Setting>
        <Text style={styles.note}>Continuous video records while SafeBro stays open. Front/rear switching, local clips, markers and protection work now. Both cameras require a supported iPhone. Protected clips are kept.</Text>
      </View> : null}
    </>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(!detailsOpen)} style={styles.dropdown}><Text style={styles.dropdownText}>Other room-watch abilities</Text><Text style={styles.chevron}>{detailsOpen ? '⌃' : '⌄'}</Text></Pressable>
    {detailsOpen ? <View style={styles.setup}>
      <Text style={styles.ready}>Available: foreground continuous video, optional mic, timed local files, manual activity markers, protected originals, retention and Library review/export.</Text>
      <Text style={styles.note}>Not active yet: automatic motion/person/sound detection, event-only saving, pre-event buffer, remote viewing, notifications, cloud/AI analysis, schedules and screen-off camera capture. iOS stops camera capture when this app is backgrounded.</Text>
      <Button label="OPEN AUDIO WATCH" icon="♫" variant="secondary" onPress={onOpenAudio} />
      <Text style={styles.note}>Audio Watch is the background-safe option: microphone recording can continue while the screen is locked or SafeBro is minimized when iOS permits background audio. It does not record video while locked.</Text>
    </View> : null}
  </Card>;
}

function Setting({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <View style={styles.setting}><Label>{title}</Label><View style={styles.chips}>{children}</View></View>;
}

const styles = StyleSheet.create({
  panel: { gap: 14, marginBottom: spacing.lg, backgroundColor: '#F2EEFF', borderColor: colors.navy },
  selected: { backgroundColor: '#EDE8FF' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 51, height: 51, borderRadius: 15, backgroundColor: '#D9EFFF', borderWidth: 2, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '3deg' }] },
  heading: { flex: 1, minWidth: 0 }, title: { ...typography.title, color: colors.text, marginTop: 3, fontSize: 20 }, subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  statusRow: { flexDirection: 'row', gap: 8 }, status: { flex: 1, minWidth: 0, padding: 10, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.navy}55` },
  statusValue: { fontSize: 15, fontWeight: '800', color: colors.navy }, statusLabel: { ...typography.label, color: colors.textMuted, fontSize: 8, marginTop: 3 },
  startButton: { minHeight: 64 }, liveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, liveButton: { flexBasis: '45%', flexGrow: 1, minHeight: 52, paddingHorizontal: 7 },
  dropdown: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.navy, paddingHorizontal: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { ...typography.bodyMedium, color: colors.text }, chevron: { ...typography.title, color: colors.purple },
  setup: { gap: 14, padding: 12, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  setting: { gap: 7 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, note: { ...typography.caption, color: colors.textMuted, lineHeight: 18 }, ready: { ...typography.caption, color: colors.text },
});
