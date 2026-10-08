import AVFoundation
import ExpoModulesCore

private final class DualCameraCaptureController: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
  private var session = AVCaptureMultiCamSession()
  private let queue = DispatchQueue(label: "sentinel.multicam.capture", qos: .userInitiated)
  private let lock = NSLock()
  private var backOutput = AVCaptureVideoDataOutput()
  private var frontOutput = AVCaptureVideoDataOutput()
  private var audioOutput = AVCaptureAudioDataOutput()
  private var backWriter: WriterState?
  private var frontWriter: WriterState?
  private var isRecording = false
  private var microphoneEnabled = false
  private var frontURL: URL?
  private var rearURL: URL?

  func isSupported() -> Bool {
    AVCaptureMultiCamSession.isMultiCamSupported &&
      AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) != nil &&
      AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil
  }

  func start(sessionId: String, quality: String, fps: Int, microphone: Bool) throws -> [String: String] {
    guard isSupported() else { throw CaptureError.unsupported }
    guard !isRecording else { throw CaptureError.alreadyRecording }
    guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else { throw CaptureError.cameraPermissionDenied }
    if microphone && AVCaptureDevice.authorizationStatus(for: .audio) != .authorized {
      throw CaptureError.microphonePermissionDenied
    }

    let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)!
    let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)!
    let backInput = try AVCaptureDeviceInput(device: backDevice)
    let frontInput = try AVCaptureDeviceInput(device: frontDevice)
    let audioInput: AVCaptureDeviceInput?
    if microphone {
      guard let audioDevice = AVCaptureDevice.default(for: .audio) else { throw CaptureError.microphoneUnavailable }
      audioInput = try AVCaptureDeviceInput(device: audioDevice)
    } else {
      audioInput = nil
    }

    // Rebuild the capture graph for every recording so a previous mic-on session
    // cannot leave audio attached to a later mic-off session.
    session = AVCaptureMultiCamSession()
    backOutput = AVCaptureVideoDataOutput()
    frontOutput = AVCaptureVideoDataOutput()
    audioOutput = AVCaptureAudioDataOutput()
    let captureSession = session

    let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("sentinel-sessions", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    rearURL = directory.appendingPathComponent("\(sessionId)-rear.mp4")
    frontURL = directory.appendingPathComponent("\(sessionId)-front.mp4")
    if let rearURL { try? FileManager.default.removeItem(at: rearURL) }
    if let frontURL { try? FileManager.default.removeItem(at: frontURL) }

    captureSession.beginConfiguration()
    var configurationCommitted = false
    defer {
      if !configurationCommitted { captureSession.commitConfiguration() }
    }
    let requestedPreset = preset(for: quality)
    captureSession.sessionPreset = captureSession.canSetSessionPreset(requestedPreset) ? requestedPreset : .high
    guard captureSession.canAddInput(backInput), captureSession.canAddInput(frontInput) else { throw CaptureError.captureSetupFailed }
    captureSession.addInputWithNoConnections(backInput)
    captureSession.addInputWithNoConnections(frontInput)
    if let audioInput {
      guard captureSession.canAddInput(audioInput) else { throw CaptureError.microphoneUnavailable }
      captureSession.addInputWithNoConnections(audioInput)
    }

    configureOutput(backOutput, pixelFormat: kCVPixelFormatType_32BGRA)
    configureOutput(frontOutput, pixelFormat: kCVPixelFormatType_32BGRA)
    guard captureSession.canAddOutput(backOutput), captureSession.canAddOutput(frontOutput) else { throw CaptureError.captureSetupFailed }
    captureSession.addOutputWithNoConnections(backOutput)
    captureSession.addOutputWithNoConnections(frontOutput)
    if microphone {
      guard captureSession.canAddOutput(audioOutput) else { throw CaptureError.microphoneUnavailable }
      captureSession.addOutputWithNoConnections(audioOutput)
    }

    guard let backPort = backInput.ports.first(where: { $0.mediaType == .video }),
          let frontPort = frontInput.ports.first(where: { $0.mediaType == .video }) else { throw CaptureError.captureSetupFailed }
    let backConnection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
    let frontConnection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
    guard captureSession.canAddConnection(backConnection), captureSession.canAddConnection(frontConnection) else { throw CaptureError.captureSetupFailed }
    captureSession.addConnection(backConnection)
    captureSession.addConnection(frontConnection)
    if let audioInput {
      guard let audioPort = audioInput.ports.first(where: { $0.mediaType == .audio }) else { throw CaptureError.microphoneUnavailable }
      let connection = AVCaptureConnection(inputPorts: [audioPort], output: audioOutput)
      guard captureSession.canAddConnection(connection) else { throw CaptureError.microphoneUnavailable }
      captureSession.addConnection(connection)
    }
    captureSession.commitConfiguration()
    configurationCommitted = true

    configureFrameRate(backDevice, fps: fps)
    configureFrameRate(frontDevice, fps: fps)
    backOutput.setSampleBufferDelegate(self, queue: queue)
    frontOutput.setSampleBufferDelegate(self, queue: queue)
    if microphone { audioOutput.setSampleBufferDelegate(self, queue: queue) }

    lock.lock()
    backWriter = nil
    frontWriter = nil
    microphoneEnabled = microphone
    isRecording = true
    lock.unlock()
    queue.async { captureSession.startRunning() }

    return ["frontUri": frontURL?.path ?? "", "rearUri": rearURL?.path ?? ""]
  }

  func stopBlocking() throws -> [String: String] {
    lock.lock()
    guard isRecording else { lock.unlock(); throw CaptureError.notRecording }
    isRecording = false
    lock.unlock()
    session.stopRunning()
    let completion = DispatchGroup()
    queue.sync {
      backOutput.setSampleBufferDelegate(nil, queue: nil)
      frontOutput.setSampleBufferDelegate(nil, queue: nil)
      audioOutput.setSampleBufferDelegate(nil, queue: nil)
      for writer in [backWriter, frontWriter].compactMap({ $0 }) {
        completion.enter()
        writer.finish { completion.leave() }
      }
    }
    guard completion.wait(timeout: .now() + 30) == .success else { throw CaptureError.finalizationTimedOut }
    return ["frontUri": frontURL?.path ?? "", "rearUri": rearURL?.path ?? ""]
  }

  private func configureOutput(_ output: AVCaptureVideoDataOutput, pixelFormat: OSType) {
    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: pixelFormat]
    output.alwaysDiscardsLateVideoFrames = false
  }

  private func configureFrameRate(_ device: AVCaptureDevice, fps: Int) {
    guard fps > 0, let format = device.formats.first(where: { format in
      let ranges = format.videoSupportedFrameRateRanges
      return ranges.contains { $0.minFrameRate <= Double(fps) && $0.maxFrameRate >= Double(fps) }
    }) else { return }
    try? device.lockForConfiguration()
    device.activeFormat = format
    device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: CMTimeScale(fps))
    device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: CMTimeScale(fps))
    device.unlockForConfiguration()
  }

  private func preset(for quality: String) -> AVCaptureSession.Preset {
    switch quality {
    case "480p": return .vga640x480
    case "720p": return .hd1280x720
    case "2160p": return session.canSetSessionPreset(.hd4K3840x2160) ? .hd4K3840x2160 : .high
    default: return .hd1920x1080
    }
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard isRecording, let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).isValid ? CMSampleBufferGetPresentationTimeStamp(sampleBuffer) : nil else { return }
    if output === backOutput {
      appendVideo(sampleBuffer, to: &backWriter, url: rearURL, timestamp: timestamp)
    } else if output === frontOutput {
      appendVideo(sampleBuffer, to: &frontWriter, url: frontURL, timestamp: timestamp)
    } else if output === audioOutput {
      backWriter?.appendAudio(sampleBuffer)
      frontWriter?.appendAudio(sampleBuffer)
    }
  }

  private func appendVideo(_ sampleBuffer: CMSampleBuffer, to writer: inout WriterState?, url: URL?, timestamp: CMTime) {
    if writer == nil, let url, let format = CMSampleBufferGetFormatDescription(sampleBuffer) {
      let dimensions = CMVideoFormatDescriptionGetDimensions(format)
      writer = WriterState(url: url, width: Int(dimensions.width), height: Int(dimensions.height), includesAudio: microphoneEnabled)
    }
    writer?.appendVideo(sampleBuffer, timestamp: timestamp)
  }

  private final class WriterState {
    let writer: AVAssetWriter
    let videoInput: AVAssetWriterInput
    let audioInput: AVAssetWriterInput?
    var started = false

    init?(url: URL, width: Int, height: Int, includesAudio: Bool) {
      guard let writer = try? AVAssetWriter(url: url, fileType: .mp4) else { return nil }
      self.writer = writer
      videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height])
      videoInput.expectsMediaDataInRealTime = true
      guard writer.canAdd(videoInput) else { return nil }
      writer.add(videoInput)
      if includesAudio {
        let audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 1, AVSampleRateKey: 44100, AVEncoderBitRateKey: 128000])
        audioInput.expectsMediaDataInRealTime = true
        guard writer.canAdd(audioInput) else { return nil }
        writer.add(audioInput)
        self.audioInput = audioInput
      } else {
        audioInput = nil
      }
    }

    func appendVideo(_ sampleBuffer: CMSampleBuffer, timestamp: CMTime) {
      if !started { writer.startWriting(); writer.startSession(atSourceTime: timestamp); started = true }
      if videoInput.isReadyForMoreMediaData { videoInput.append(sampleBuffer) }
    }

    func appendAudio(_ sampleBuffer: CMSampleBuffer) {
      guard started, let audioInput, audioInput.isReadyForMoreMediaData else { return }
      audioInput.append(sampleBuffer)
    }

    func finish(completion: @escaping () -> Void) {
      guard started else { completion(); return }
      videoInput.markAsFinished()
      audioInput?.markAsFinished()
      writer.finishWriting(completionHandler: completion)
    }
  }

  enum CaptureError: LocalizedError {
    case unsupported, alreadyRecording, notRecording, finalizationTimedOut
    case cameraPermissionDenied, microphonePermissionDenied, microphoneUnavailable, captureSetupFailed

    var errorDescription: String? {
      switch self {
      case .unsupported: return "Simultaneous front and rear camera capture is not supported on this iPhone."
      case .alreadyRecording: return "A dual-camera recording is already active."
      case .notRecording: return "No dual-camera recording is active."
      case .finalizationTimedOut: return "The dual-camera files did not finish saving in time."
      case .cameraPermissionDenied: return "Allow SafeBro to use the camera in Settings, then try again."
      case .microphonePermissionDenied: return "Allow SafeBro to use the microphone in Settings, or turn the microphone off and retry."
      case .microphoneUnavailable: return "The microphone could not be added to the dual-camera recording."
      case .captureSetupFailed: return "The dual-camera recording could not be configured on this device."
      }
    }
  }
}

public class SentinelMulticamModule: Module {
  private let controller = DualCameraCaptureController()

  public func definition() -> ModuleDefinition {
    Name("SentinelMulticam")

    AsyncFunction("isSupportedAsync") { () -> Bool in
      self.controller.isSupported()
    }

    AsyncFunction("startRecording") { (sessionId: String, quality: String, fps: Int, microphone: Bool) throws -> [String: String] in
      try self.controller.start(sessionId: sessionId, quality: quality, fps: fps, microphone: microphone)
    }

    AsyncFunction("stopRecording") { () async throws -> [String: String] in
      try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.global(qos: .userInitiated).async {
          do { continuation.resume(returning: try self.controller.stopBlocking()) }
          catch { continuation.resume(throwing: error) }
        }
      }
    }
  }
}
