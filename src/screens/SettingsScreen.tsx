import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Badge, Card, Chip, ScreenHeader, SectionHeader } from '../components/UI';
import { FuturisticIcon } from '../components/FuturisticIcon';
import { quickCaptureModes, quickCaptureTriggers } from '../features/quickCapture/config';
import { useApp } from '../context/AppContext';
import { colors, commonStyles, spacing, typography } from '../theme';

export function SettingsScreen() {
  const { quickCaptureMode, setQuickCaptureMode, capturePolicy, setCapturePolicy, capabilities } = useApp();
  const selectedQuickMode = quickCaptureModes.find((mode) => mode.id === quickCaptureMode) ?? quickCaptureModes[0];

  return <View style={commonStyles.screen}><ScrollView contentContainerStyle={commonStyles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="CONTROL CENTER" title="Settings" detail="Capture behavior, privacy, processing, and recovery." action={<Badge>LOCAL</Badge>} />
    <SectionHeader title="Privacy" />
    <Card style={styles.card}><SettingRow title="Local-only mode" detail="Media and metadata stay on this device" value /><SettingRow title="Biometric lock" detail="Protect the private archive" /><SettingRow title="Cloud backup" detail="Nothing uploads without explicit setup" /></Card>
    <SectionHeader title="Analysis schedule" />
    <Card><Text style={styles.settingTitle}>PROCESS ANALYSIS</Text><Text style={styles.settingDetail}>Heavy processing waits until capture is safe and complete.</Text><View style={styles.chips}><Chip label="Immediately" selected /><Chip label="When idle" /><Chip label="Charging" /><Chip label="Manual" /></View></Card>
    <SectionHeader title="Capture defaults" />
    <Card style={styles.card}><SettingRow title="Silent UI" detail="No in-app sounds or unnecessary haptics" /><SettingRow title="Low profile mode" detail="Dim, black, or minimal capture screen" /><SettingRow title="Recovery checkpoints" detail="Persist session state during long recordings" value /></Card>
    <SectionHeader title="Driver & event capture" action={`${capturePolicy.retentionDays} DAY RETENTION`} />
    <Card style={styles.policyCard}>
      <Text style={styles.settingTitle}>Choose what gets kept</Text>
      <Text style={styles.settingDetail}>Every session stores its own policy. Automatic cleanup applies only when enabled and never removes protected sessions.</Text>
      <Text style={styles.policyLabel}>AUTO DELETE UNPROTECTED SESSIONS</Text>
      <View style={styles.chips}><Chip label="OFF" selected={!capturePolicy.autoDelete} onPress={() => setCapturePolicy({ autoDelete: false })} /><Chip label="ON" selected={capturePolicy.autoDelete === true} onPress={() => setCapturePolicy({ autoDelete: true })} color={colors.orange} /></View>
      <Text style={styles.policyLabel}>SAVE MODE</Text>
      <View style={styles.chips}><Chip label="FULL RECORD" selected={capturePolicy.saveMode === 'full_record'} onPress={() => setCapturePolicy({ saveMode: 'full_record' })} /><Chip label="MOTION CLIPS" selected={capturePolicy.saveMode === 'motion_only'} onPress={() => setCapturePolicy({ saveMode: 'motion_only' })} color={colors.orange} /><Chip label="SOUND CLIPS" selected={capturePolicy.saveMode === 'sound_only'} onPress={() => setCapturePolicy({ saveMode: 'sound_only' })} color={colors.blue} /><Chip label="CONVERSATION" selected={capturePolicy.saveMode === 'conversation_only'} onPress={() => setCapturePolicy({ saveMode: 'conversation_only' })} color={colors.purple} /></View>
      <Text style={styles.policyLabel}>RETENTION</Text>
      <View style={styles.chips}><Chip label="3 DAYS" selected={capturePolicy.retentionDays === 3} onPress={() => setCapturePolicy({ retentionDays: 3 })} /><Chip label="5 DAYS" selected={capturePolicy.retentionDays === 5} onPress={() => setCapturePolicy({ retentionDays: 5 })} /><Chip label="7 DAYS" selected={capturePolicy.retentionDays === 7} onPress={() => setCapturePolicy({ retentionDays: 7 })} /></View>
      <Text style={styles.policyLabel}>EVENT BUFFER</Text>
      <View style={styles.chips}><Chip label="PRE 5s" selected={capturePolicy.preRollSeconds === 5} onPress={() => setCapturePolicy({ preRollSeconds: 5 })} /><Chip label="PRE 10s" selected={capturePolicy.preRollSeconds === 10} onPress={() => setCapturePolicy({ preRollSeconds: 10 })} /><Chip label="PRE 20s" selected={capturePolicy.preRollSeconds === 20} onPress={() => setCapturePolicy({ preRollSeconds: 20 })} /></View>
      <View style={styles.chips}><Chip label="POST 10s" selected={capturePolicy.postRollSeconds === 10} onPress={() => setCapturePolicy({ postRollSeconds: 10 })} /><Chip label="POST 30s" selected={capturePolicy.postRollSeconds === 30} onPress={() => setCapturePolicy({ postRollSeconds: 30 })} /><Chip label="POST 60s" selected={capturePolicy.postRollSeconds === 60} onPress={() => setCapturePolicy({ postRollSeconds: 60 })} /></View>
      <Text style={styles.policyLabel}>SENSITIVITY</Text>
      <View style={styles.sensitivityRow}><View style={styles.sensitivityItem}><Text style={styles.sensitivityName}>MOTION</Text><View style={styles.chips}><Chip label="LOW" selected={capturePolicy.motionSensitivity === 'low'} onPress={() => setCapturePolicy({ motionSensitivity: 'low' })} /><Chip label="MED" selected={capturePolicy.motionSensitivity === 'medium'} onPress={() => setCapturePolicy({ motionSensitivity: 'medium' })} /><Chip label="HIGH" selected={capturePolicy.motionSensitivity === 'high'} onPress={() => setCapturePolicy({ motionSensitivity: 'high' })} /></View></View><View style={styles.sensitivityItem}><Text style={styles.sensitivityName}>SOUND</Text><View style={styles.chips}><Chip label="LOW" selected={capturePolicy.soundSensitivity === 'low'} onPress={() => setCapturePolicy({ soundSensitivity: 'low' })} /><Chip label="MED" selected={capturePolicy.soundSensitivity === 'medium'} onPress={() => setCapturePolicy({ soundSensitivity: 'medium' })} /><Chip label="HIGH" selected={capturePolicy.soundSensitivity === 'high'} onPress={() => setCapturePolicy({ soundSensitivity: 'high' })} /></View></View></View>
      <View style={styles.policyNotice}><FuturisticIcon name="analyze" size={20} color={colors.orange} accent={colors.accent} /><Text style={[styles.settingDetail, { flex: 1, minWidth: 0 }]}>{capabilities?.backgroundVideoSupported ? 'This device reports background video support.' : 'Standard iOS camera capture is foreground-only. Low-power audio can continue with the app minimized when the audio background mode is enabled.'}</Text></View>
      <Text style={styles.policyFootnote}>Motion/sound clip extraction uses a native rolling-buffer recorder. Until that device-specific pipeline is installed, camera event mode records the foreground session and supports manual Mark / Lock Event controls.</Text>
    </Card>
    <SectionHeader title="Quick capture" action="READY TO ASSIGN" />
    <Card style={styles.quickCard}>
      <View style={styles.quickHeading}>
        <View style={styles.quickIcon}><FuturisticIcon name={selectedQuickMode.icon} size={24} color={colors.accent} accent={colors.purple} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>Default quick record</Text>
          <Text style={styles.settingDetail}>Choose what every shortcut, widget, or in-app quick button should start.</Text>
        </View>
      </View>
      <View style={styles.chips}>
        {quickCaptureModes.map((mode) => <Chip key={mode.id} label={mode.label} selected={mode.id === quickCaptureMode} onPress={() => setQuickCaptureMode(mode.id)} color={mode.id === 'double_surveillance' ? colors.purple : colors.accent} />)}
      </View>
      <View style={styles.selectedMode}>
        <Text style={styles.selectedModeLabel}>SELECTED MODE</Text>
        <Text style={styles.selectedModeValue}>{selectedQuickMode.label}</Text>
        <Text style={styles.settingDetail}>{selectedQuickMode.detail}</Text>
      </View>
      <Text style={styles.triggerTitle}>START OPTIONS</Text>
      <View style={styles.triggerList}>
        {quickCaptureTriggers.map((trigger) => <View key={trigger.id} style={styles.triggerRow}>
          <View style={styles.triggerDot}><FuturisticIcon name={trigger.id === 'widget' || trigger.id === 'lock_screen' ? 'grid' : trigger.id === 'siri_shortcut' ? 'spark' : trigger.id === 'back_tap' ? 'analyze' : trigger.id === 'action_button' ? 'capture' : 'arrow'} size={15} color={colors.accent} accent={colors.purple} /></View>
          <View style={{ flex: 1 }}><Text style={styles.triggerLabel}>{trigger.label}</Text><Text style={styles.settingDetail}>{trigger.detail}</Text></View>
          <Badge color={trigger.id === 'app_button' ? colors.accent : colors.textMuted}>{trigger.id === 'app_button' ? 'LIVE' : 'IOS'}</Badge>
        </View>)}
      </View>
      <View style={styles.platformNote}>
        <Text style={styles.platformNoteTitle}>ABOUT THE SOUND BUTTON</Text>
        <Text style={styles.settingDetail}>iOS does not allow apps to intercept a triple press of the volume buttons. Use Action Button or Back Tap for a physical gesture, or add a Home Screen / Lock Screen widget for one-tap recording.</Text>
      </View>
      <View style={styles.deepLinkBox}>
        <Text style={styles.deepLinkLabel}>SHORTCUT LINK</Text>
        <Text selectable style={styles.deepLinkValue}>{`sentinel://quick-capture?mode=${quickCaptureMode}`}</Text>
      </View>
    </Card>
    <SectionHeader title="Data integrity" />
    <Card style={styles.integrity}><FuturisticIcon name="security" size={22} color={colors.accent} accent={colors.purple} /><View style={{ flex: 1 }}><Text style={styles.settingTitle}>ORIGINALS ARE PRESERVED</Text><Text style={styles.settingDetail}>Every session keeps its original media, checksum, capture settings, segments, and edit history. Studio exports are derived copies.</Text></View></Card>
    <Text style={styles.version}>SAFEBRO 0.1.0 · Expo managed foundation · native modules isolated</Text>
  </ScrollView></View>;
}

function SettingRow({ title, detail, value = false }: { title: string; detail: string; value?: boolean }) {
  return <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View><Switch value={value} onValueChange={() => undefined} trackColor={{ false: colors.border, true: colors.accentMuted }} thumbColor={value ? colors.accent : colors.textMuted} /></View>;
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  settingTitle: { ...typography.bodyMedium, color: colors.text },
  settingDetail: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  quickCard: { gap: 14 },
  policyCard: { gap: 12 },
  policyLabel: { ...typography.label, color: colors.textMuted, marginTop: 9 },
  sensitivityRow: { gap: 8, marginTop: 4 },
  sensitivityItem: { padding: 10, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  sensitivityName: { ...typography.label, color: colors.textSubtle, fontSize: 9 },
  policyNotice: { flexDirection: 'row', gap: 9, padding: 11, borderRadius: 12, backgroundColor: `${colors.orange}0D`, borderWidth: 1, borderColor: `${colors.orange}44`, marginTop: 5 },
  policyFootnote: { ...typography.caption, color: colors.textSubtle, lineHeight: 17, marginTop: 3 },
  quickHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: `${colors.accent}55`, alignItems: 'center', justifyContent: 'center' },
  selectedMode: { borderRadius: 14, borderWidth: 1, borderColor: `${colors.purple}55`, backgroundColor: `${colors.purple}12`, padding: 12 },
  selectedModeLabel: { ...typography.label, color: colors.purple },
  selectedModeValue: { ...typography.bodyMedium, color: colors.text, marginTop: 4 },
  triggerTitle: { ...typography.label, color: colors.textMuted, marginTop: 2 },
  triggerList: { gap: 8 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  triggerDot: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  triggerLabel: { ...typography.bodyMedium, color: colors.text },
  platformNote: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 2 },
  platformNoteTitle: { ...typography.label, color: colors.orange, marginBottom: 4 },
  deepLinkBox: { backgroundColor: colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  deepLinkLabel: { ...typography.label, color: colors.textSubtle, marginBottom: 5 },
  deepLinkValue: { ...typography.caption, color: colors.accent },
  integrity: { flexDirection: 'row', gap: 12, backgroundColor: colors.accentMuted, borderColor: `${colors.accent}44` },
  version: { ...typography.caption, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.xl },
});
