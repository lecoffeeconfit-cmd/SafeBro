import AVFoundation
import ExpoModulesCore

private final class DualCameraCaptureController: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
  private let session = AVCaptureMultiCamSession()
  private let queue = DispatchQueue(label: "sentinel.multicam.capture", qos: .userInitiated)
  private let lock = NSLock()
  private var backOutput = AVCaptureVideoDataOutput()
  private var frontOutput = AVCaptureVideoDataOutput()
  private var audioOutput = AVCaptureAudioDataOutput()
  private var backWriter: WriterState?
  private var frontWriter: WriterState?
  private var isRecording = false
  private var frontURL: URL?
  private var rearURL: URL?

  func isSupported() -> Bool {
    AVCaptureMultiCamSession.isMultiCamSupported &&
      AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front) != nil &&
      AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) != nil
  }

  func start(sessionId: String, quality: String, fps: Int) throws -> [String: String] {
    guard isSupported() else { throw CaptureError.unsupported }
    guard !isRecording else { throw CaptureError.alreadyRecording }

    let backDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)!
    let frontDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)!
    let audioDevice = AVCaptureDevice.default(for: .audio)
    let backInput = try AVCaptureDeviceInput(device: backDevice)
    let frontInput = try AVCaptureDeviceInput(device: frontDevice)

    let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("sentinel-sessions", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    rearURL = directory.appendingPathComponent("\(sessionId)-rear.mp4")
    frontURL = directory.appendingPathComponent("\(sessionId)-front.mp4")
    if let rearURL { try? FileManager.default.removeItem(at: rearURL) }
    if let frontURL { try? FileManager.default.removeItem(at: frontURL) }

    session.beginConfiguration()
    let requestedPreset = preset(for: quality)
    session.sessionPreset = session.canSetSessionPreset(requestedPreset) ? requestedPreset : .high
    if session.canAddInput(backInput) { session.addInputWithNoConnections(backInput) }
    if session.canAddInput(frontInput) { session.addInputWithNoConnections(frontInput) }
    if let audioDevice, let audioInput = try? AVCaptureDeviceInput(device: audioDevice), session.canAddInput(audioInput) { session.addInputWithNoConnections(audioInput) }

    configureOutput(backOutput, pixelFormat: kCVPixelFormatType_32BGRA)
    configureOutput(frontOutput, pixelFormat: kCVPixelFormatType_32BGRA)
    if session.canAddOutput(backOutput) { session.addOutputWithNoConnections(backOutput) }
    if session.canAddOutput(frontOutput) { session.addOutputWithNoConnections(frontOutput) }
    if session.canAddOutput(audioOutput) { session.addOutputWithNoConnections(audioOutput) }

    if let backPort = backInput.ports.first(where: { $0.mediaType == .video }) {
      let connection = AVCaptureConnection(inputPorts: [backPort], output: backOutput)
      if session.canAddConnection(connection) { session.addConnection(connection) }
    }
    if let frontPort = frontInput.ports.first(where: { $0.mediaType == .video }) {
      let connection = AVCaptureConnection(inputPorts: [frontPort], output: frontOutput)
      if session.canAddConnection(connection) { session.addConnection(connection) }
    }
    if let audioInput = session.inputs.compactMap({ $0 as? AVCaptureDeviceInput }).first(where: { $0.device.hasMediaType(.audio) }), let audioPort = audioInput.ports.first(where: { $0.mediaType == .audio }) {
      let connection = AVCaptureConnection(inputPorts: [audioPort], output: audioOutput)
      if session.canAddConnection(connection) { session.addConnection(connection) }
    }
    session.commitConfiguration()

    configureFrameRate(backDevice, fps: fps)
    configureFrameRate(frontDevice, fps: fps)
    backOutput.setSampleBufferDelegate(self, queue: queue)
    frontOutput.setSampleBufferDelegate(self, queue: queue)
    audioOutput.setSampleBufferDelegate(self, queue: queue)

    lock.lock()
    backWriter = nil
    frontWriter = nil
    isRecording = true
    lock.unlock()
    queue.async { self.session.startRunning() }

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
      writer = WriterState(url: url, width: Int(dimensions.width), height: Int(dimensions.height))
    }
    writer?.appendVideo(sampleBuffer, timestamp: timestamp)
  }

  private final class WriterState {
    let writer: AVAssetWriter
    let videoInput: AVAssetWriterInput
    let audioInput: AVAssetWriterInput
    var started = false

    init?(url: URL, width: Int, height: Int) {
      guard let writer = try? AVAssetWriter(url: url, fileType: .mp4) else { return nil }
      self.writer = writer
      videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height])
      audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 1, AVSampleRateKey: 44100, AVEncoderBitRateKey: 128000])
      videoInput.expectsMediaDataInRealTime = true
      audioInput.expectsMediaDataInRealTime = true
      if writer.canAdd(videoInput) { writer.add(videoInput) }
      if writer.canAdd(audioInput) { writer.add(audioInput) }
    }

    func appendVideo(_ sampleBuffer: CMSampleBuffer, timestamp: CMTime) {
      if !started { writer.startWriting(); writer.startSession(atSourceTime: timestamp); started = true }
      if videoInput.isReadyForMoreMediaData { videoInput.append(sampleBuffer) }
    }

    func appendAudio(_ sampleBuffer: CMSampleBuffer) {
      guard started, audioInput.isReadyForMoreMediaData else { return }
      audioInput.append(sampleBuffer)
    }

    func finish(completion: @escaping () -> Void) {
      guard started else { completion(); return }
      videoInput.markAsFinished()
      audioInput.markAsFinished()
      writer.finishWriting(completionHandler: completion)
    }
  }

  enum CaptureError: Error { case unsupported, alreadyRecording, notRecording, finalizationTimedOut }
}

public class SentinelMulticamModule: Module {
  private let controller = DualCameraCaptureController()

  public func definition() -> ModuleDefinition {
    Name("SentinelMulticam")

    AsyncFunction("isSupportedAsync") { () -> Bool in
      self.controller.isSupported()
    }

    AsyncFunction("startRecording") { (sessionId: String, quality: String, fps: Int) throws -> [String: String] in
      try self.controller.start(sessionId: sessionId, quality: quality, fps: fps)
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
