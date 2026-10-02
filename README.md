# SafeBro

## Driving recording

Drive is the main card at the top of Capture. Open Drive to configure road, cabin, or simultaneous road and cabin cameras (on supported iPhones); 720p/1080p/4K; a 30/60 fps target; 1/3/5/10-minute single-camera segments; microphone; and foreground GPS. These preferences are saved and copied into each trip's settings. Starting Drive creates a recording session. The live screen shows GPS speed, approximate distance, and event count, with large Save Incident and Stop & Save controls. Save Incident adds a timestamped marker and protects the **entire current trip** from retention cleanup. It does not create a pre-event clip. The camera must remain foregrounded on iPhone.

Library has a Drives filter and search. A saved trip shows approximate distance and GPS point count. Its detail sheet accepts written incident notes, shows the marker timeline, shares each original media segment, and exports a local incident PDF with times, GPS start/end, nearest event locations, speed, notes, original file references, and checksums when available. After a drive, Capture offers Park Guard setup.

The attached driving feature list also includes capabilities that are **not active yet**: automatic impact/braking/swerve detection; protected footage from before and after a trigger; segment overwrite and storage caps; a plotted route map and synced marker-to-video playback; damage photos and a packaged evidence ZIP; optical plate reading and enhancement; post-trip AI; spoken Save That; automatic CarPlay/Bluetooth/charging starts; cloud backup; phone thermal control; and true screen dimming. The setup view labels the main device-dependent items as future work. A 60 fps selection is a target on single-camera capture, not a guaranteed frame rate.

## Dashboard and event capture

Capture includes Dashboard Camera (rear lens) and Motion Events profiles. The Audio tab contains Microphone, Low Power, Conversation Audio, and Audio Guard recording, plus audio quality, sound sensitivity, foreground voice trigger, and voice phrases. Audio retention defaults are stored separately from camera defaults; existing settings are copied on first migration. Settings stores a per-session camera save policy with full-record, motion-only, sound-only, or conversation-only intent; 3/5/7-day retention; pre/post event buffers; and motion/sound sensitivity. On startup, completed sessions with automatic cleanup enabled are removed with their local media after the retention window. Protected sessions are never removed by this cleanup. Creator and podcast sessions default to automatic cleanup off.

The dashboard profile is foreground-first on iOS. A normal iPhone app cannot keep the camera running after it is minimized or another app takes the foreground. Low-power audio uses the iOS background audio mode and can continue after the app is minimized. Camera guard modes can split foreground recording into 2/5/10-minute files; Mark Event and Lock Event preserve important sessions. True motion-triggered rolling-buffer clips, impact detection and automatic overwrite require a native event recorder.

## Mode sets

Capture now includes the requested 27 selectable use cases, with three controls shared across camera modes. The previous Audio, Rear Video, Front Video, Video + Audio, Dual Camera, Double Surveillance, Podcast, Security, Dashboard Camera and Motion Event Camera modes remain directly available. Audio-only modes live in the new Audio tab; camera modes remain in Capture. Preset power, save and retention choices are applied to that recording only; switching back to an original mode does not inherit them.

| Set | Selectable use cases |
| --- | --- |
| Vehicle | Drive, Park Guard, Bike / Motorcycle |
| Sentry | Room Guard, Home / Away, Door / Entry, Hotel / Airbnb, Package Watch, Garage, Window Watch, Travel Guard |
| Monitor | Pet Watch, Baby Monitor, Audio Guard, Remote Camera |
| Bodycam | Standard, Adventure, Incident |
| Creator | Sports, Interview, Podcast, Standard Creator |
| Endurance | Time Lapse, Low Power Watch, Continuous |
| Smart Sentry | Smart Sentry |
| Advanced | Custom Mode |

Dual Camera, Night Preset and Evidence are shared controls. Dual Camera uses simultaneous front and rear capture only when supported by the device. Night Preset starts at 720p with a 24 fps target; it does not create night vision. Evidence locks the current or next session against archive unlock and retention cleanup and saves an MD5 checksum when media is available; this is not a forensic chain of custody. Custom Mode applies lens, resolution and microphone preferences now; frame rate is a target on single-camera capture because Expo CameraView does not expose a frame-rate setter. The other custom settings are saved for a native monitoring pipeline. Drive, Bike, Adventure and Incident request foreground location when recording starts; when granted, they show live GPS speed and save route points locally.

The mode detail card separates available recording behavior from device work still needed. Automatic person/pet/package/cry/motion/sound detection, speed burned into video, impact detection, geographic Home/Away switching, detection zones, encrypted vault, battery/storage thresholds, alerts, time-lapse export, automatic clip selection and authenticated remote viewing are not yet implemented. The app does not claim these are active when a preset is selected. Baby Monitor is presented as convenience monitoring, not a medical or life-safety system.

## Quick capture

The iOS-first app includes quick launch for microphone, low-power audio, rear camera, front camera, double-surveillance, dashboard camera, motion events, and conversation audio. Audio shortcuts open the Audio tab; camera shortcuts open Capture. The default mode for external triggers is saved from Settings.

Shortcuts, Back Tap, and Action Button workflows can open one of these deep links:

```text
sentinel://quick-capture?mode=audio
sentinel://quick-capture?mode=rear_video
sentinel://quick-capture?mode=front_video
sentinel://quick-capture?mode=double_surveillance
```

The app returns to Capture and starts the requested workflow when the link is opened. iOS does not expose the volume buttons to third-party apps, so a triple press of the sound buttons cannot be registered by Sentinel. Use Action Button or Back Tap for a physical gesture.

The Audio tab stores a separate suggested Siri phrase for every capture mode. Users can create a Shortcut that opens the matching link and rename that Shortcut to their preferred phrase. Siri then starts the selected mode after the user invokes the Shortcut.

## Foreground voice trigger

On an iOS development build, the Audio tab includes Voice Trigger. Arm it visibly, grant Microphone and Speech Recognition permission, and Sentinel will prefer on-device speech recognition for the custom phrases configured per mode. A matching phrase starts that mode once and then disarms automatically. Voice Trigger pauses when the app leaves the foreground; it does not wake a force-quit app or provide hidden background listening.

Native Home Screen and Lock Screen widgets still require the WidgetKit extension target to be added when the iOS project is generated. The shared deep-link contract is already in place for those widget buttons.

## Local captions and text overlays

Studio can transcribe a recorded video with the iOS Speech framework in an iOS development build, requiring on-device recognition support. It creates editable caption timeline clips and previews them over both synchronized feeds. Manual text overlays can be added at the playhead without any AI service, and the native export path burns caption/text overlays into derived MP4 copies while preserving originals. External AI is optional for summaries, translation, speaker labeling, or more advanced highlight selection.
