import AVFoundation
import ExpoModulesCore
import Speech
import UIKit

public final class SentinelTranscriptionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SentinelTranscription")

    AsyncFunction("requestAuthorizationAsync") { (promise: Promise) in
      SFSpeechRecognizer.requestAuthorization { status in
        DispatchQueue.main.async {
          promise.resolve(["speech": status == .authorized ? "granted" : "denied"])
        }
      }
    }

    AsyncFunction("transcribeVideo") { (videoPath: String, localeIdentifier: String, promise: Promise) in
      guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
        promise.reject("TRANSCRIPTION_PERMISSION_DENIED", "Speech Recognition permission was not granted.")
        return
      }

      let sourceURL = videoPath.hasPrefix("file://") ? URL(string: videoPath) : URL(fileURLWithPath: videoPath)
      guard let sourceURL, let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier.isEmpty ? "en-US" : localeIdentifier)) else {
        promise.reject("TRANSCRIPTION_UNAVAILABLE", "Speech recognition is unavailable for this language.")
        return
      }
      if #available(iOS 13.0, *) {
        guard recognizer.supportsOnDeviceRecognition else {
          promise.reject("TRANSCRIPTION_ON_DEVICE_UNAVAILABLE", "On-device transcription is unavailable for this language or device.")
          return
        }
      } else {
        promise.reject("TRANSCRIPTION_ON_DEVICE_UNAVAILABLE", "On-device transcription requires iOS 13 or newer.")
        return
      }

      let asset = AVURLAsset(url: sourceURL)
      guard asset.tracks(withMediaType: .audio).first != nil else {
        promise.reject("TRANSCRIPTION_NO_AUDIO", "This video does not contain an audio track.")
        return
      }

      let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("sentinel-transcription-\(UUID().uuidString).m4a")
      try? FileManager.default.removeItem(at: outputURL)
      guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetAppleM4A) else {
        promise.reject("TRANSCRIPTION_EXPORT_FAILED", "The video audio could not be prepared for transcription.")
        return
      }
      exporter.outputURL = outputURL
      exporter.outputFileType = .m4a
      exporter.shouldOptimizeForNetworkUse = false
      exporter.exportAsynchronously {
        guard exporter.status == .completed else {
          let message = exporter.error?.localizedDescription ?? "The video audio could not be prepared for transcription."
          promise.reject("TRANSCRIPTION_EXPORT_FAILED", message)
          return
        }

        let request = SFSpeechURLRecognitionRequest(url: outputURL)
        request.shouldReportPartialResults = false
        if #available(iOS 13.0, *) { request.requiresOnDeviceRecognition = true }

        var task: SFSpeechRecognitionTask?
        task = recognizer.recognitionTask(with: request) { result, error in
          if let error {
            try? FileManager.default.removeItem(at: outputURL)
            promise.reject("TRANSCRIPTION_FAILED", error.localizedDescription)
            task?.cancel()
            return
          }
          guard let result, result.isFinal else { return }
          let segments = result.bestTranscription.segments.map { segment in
            [
              "text": segment.substring,
              "timestampMs": Int(segment.timestamp * 1_000),
              "durationMs": Int(segment.duration * 1_000)
            ] as [String: Any]
          }
          try? FileManager.default.removeItem(at: outputURL)
          promise.resolve(["text": result.bestTranscription.formattedString, "segments": segments])
          task?.cancel()
        }
      }
    }

    AsyncFunction("renderTextOverlay") { (videoPath: String, overlays: [[String: Any]], promise: Promise) in
      let sourceURL = videoPath.hasPrefix("file://") ? URL(string: videoPath) : URL(fileURLWithPath: videoPath)
      guard let sourceURL else {
        promise.reject("VIDEO_RENDER_INVALID_SOURCE", "The video path is invalid.")
        return
      }
      let asset = AVURLAsset(url: sourceURL)
      guard asset.tracks(withMediaType: .video).first != nil else {
        promise.reject("VIDEO_RENDER_NO_VIDEO", "The source does not contain a video track.")
        return
      }
      let composition = AVMutableVideoComposition(propertiesOf: asset)

      let outputDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("sentinel-exports", isDirectory: true)
      try? FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
      let outputURL = outputDirectory.appendingPathComponent("sentinel-overlay-\(UUID().uuidString).mp4")

      let parentLayer = CALayer()
      parentLayer.frame = CGRect(origin: .zero, size: composition.renderSize)
      parentLayer.isGeometryFlipped = true
      let videoLayer = CALayer()
      videoLayer.frame = parentLayer.bounds
      parentLayer.addSublayer(videoLayer)

      let scale = UIScreen.main.scale
      for overlay in overlays {
        guard let text = overlay["text"] as? String, !text.isEmpty else { continue }
        let startMs = number(overlay["startMs"])
        let endMs = number(overlay["endMs"])
        let startSeconds = max(0, startMs / 1_000)
        let durationSeconds = max(0.25, (endMs - startMs) / 1_000)
        let textLayer = CATextLayer()
        textLayer.string = text
        textLayer.font = UIFont.boldSystemFont(ofSize: 34)
        textLayer.fontSize = 34
        textLayer.alignmentMode = .center
        textLayer.foregroundColor = UIColor.white.cgColor
        textLayer.backgroundColor = UIColor.black.withAlphaComponent(0.72).cgColor
        textLayer.cornerRadius = 14
        textLayer.contentsScale = scale
        textLayer.frame = CGRect(x: 40, y: max(40, composition.renderSize.height - 180), width: max(100, composition.renderSize.width - 80), height: 90)
        textLayer.opacity = 0

        let visibility = CAKeyframeAnimation(keyPath: "opacity")
        visibility.values = [0, 1, 1, 0]
        visibility.keyTimes = [0, 0.02, 0.98, 1]
        visibility.beginTime = startSeconds
        visibility.duration = durationSeconds
        visibility.fillMode = .forwards
        visibility.isRemovedOnCompletion = false
        textLayer.add(visibility, forKey: "sentinel-overlay")
        parentLayer.addSublayer(textLayer)
      }

      composition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
      guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
        promise.reject("VIDEO_RENDER_EXPORT_FAILED", "The video export session could not be created.")
        return
      }
      exporter.outputURL = outputURL
      exporter.outputFileType = .mp4
      exporter.videoComposition = composition
      exporter.shouldOptimizeForNetworkUse = false
      exporter.exportAsynchronously {
        guard exporter.status == .completed else {
          promise.reject("VIDEO_RENDER_EXPORT_FAILED", exporter.error?.localizedDescription ?? "The video export failed.")
          return
        }
        promise.resolve(["uri": outputURL.path])
      }
    }
  }

  private func number(_ value: Any?) -> Double {
    if let value = value as? Double { return value }
    if let value = value as? Int { return Double(value) }
    if let value = value as? NSNumber { return value.doubleValue }
    return 0
  }
}
