# Sentinel iOS multicamera module

This local Expo module is iOS-first. It uses `AVCaptureMultiCamSession` to capture front and rear camera streams concurrently and writes derived MP4 files into the app's private documents directory.

The JavaScript boundary exposes:

- `isSupportedAsync()` — checks actual device support instead of assuming it.
- `startRecording(sessionId, quality, fps)` — starts front/rear capture and microphone capture.
- `stopRecording()` — stops safely and returns the two local file paths.

The app keeps the dual-camera option disabled when the native capability check is false. No second feed is simulated. The module requires an iOS development build / prebuild because Expo Go cannot load local native modules.

Android remains an explicit unsupported fallback until a Camera2 concurrent-camera implementation is added.
