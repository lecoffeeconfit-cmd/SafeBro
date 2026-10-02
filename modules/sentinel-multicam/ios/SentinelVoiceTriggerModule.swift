import AVFoundation
import ExpoModulesCore
import Speech

private final class VoiceTriggerController: NSObject {
  private let audioEngine = AVAudioEngine()
  private let lock = NSLock()
  private var recognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var phrases: [String] = []
  private var isListening = false
  private var generation = 0
  private var lastDetectionAt = Date.distantPast
  private var localeIdentifier = "en-US"

  var onPhraseDetected: ((String, String) -> Void)?
  var onStateChanged: ((String) -> Void)?

  func requestAuthorization(_ completion: @escaping ([String: String]) -> Void) {
    SFSpeechRecognizer.requestAuthorization { speechStatus in
      AVAudioSession.sharedInstance().requestRecordPermission { microphoneGranted in
        DispatchQueue.main.async {
          completion([
            "speech": speechStatus == .authorized ? "granted" : "denied",
            "microphone": microphoneGranted ? "granted" : "denied"
          ])
        }
      }
    }
  }

  func start(phrases: [String], localeIdentifier: String) throws -> [String: String] {
    let cleanedPhrases = phrases.map(normalize).filter { !$0.isEmpty }
    guard !cleanedPhrases.isEmpty else { throw VoiceTriggerError.noPhrases }
    guard SFSpeechRecognizer.authorizationStatus() == .authorized else { throw VoiceTriggerError.speechPermissionDenied }
    guard AVAudioSession.sharedInstance().recordPermission == .granted else { throw VoiceTriggerError.microphonePermissionDenied }

    stop(notify: false)
    self.phrases = cleanedPhrases
    self.localeIdentifier = localeIdentifier.isEmpty ? "en-US" : localeIdentifier
    guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: self.localeIdentifier)) else { throw VoiceTriggerError.recognizerUnavailable }
    self.recognizer = recognizer

    if #available(iOS 13.0, *) {
      guard recognizer.supportsOnDeviceRecognition else { throw VoiceTriggerError.onDeviceUnavailable }
    } else {
      throw VoiceTriggerError.onDeviceUnavailable
    }

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    let inputNode = audioEngine.inputNode
    inputNode.removeTap(onBus: 0)
    let format = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1_024, format: format) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    lock.lock()
    isListening = true
    generation += 1
    lock.unlock()

    audioEngine.prepare()
    try audioEngine.start()
    startRecognitionTask()
    emitState("listening")

    var onDevice = false
    if #available(iOS 13.0, *) { onDevice = recognizer.supportsOnDeviceRecognition }
    return ["locale": self.localeIdentifier, "onDevice": onDevice ? "true" : "false"]
  }

  func stop(notify: Bool = true) {
    lock.lock()
    isListening = false
    generation += 1
    lock.unlock()

    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest?.endAudio()
    recognitionRequest = nil
    audioEngine.inputNode.removeTap(onBus: 0)
    if audioEngine.isRunning { audioEngine.stop() }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    if notify { emitState("idle") }
  }

  private func startRecognitionTask() {
    guard isCurrentlyListening(), let recognizer else { return }
    recognitionTask?.cancel()

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    if #available(iOS 13.0, *) { request.requiresOnDeviceRecognition = true }
    recognitionRequest = request

    lock.lock()
    let taskGeneration = generation
    lock.unlock()

    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self, self.isGenerationCurrent(taskGeneration) else { return }
      if let result {
        self.inspect(result.bestTranscription.formattedString)
        if result.isFinal { self.scheduleRestart(for: taskGeneration) }
      } else if error != nil {
        self.scheduleRestart(for: taskGeneration)
      }
    }
  }

  private func scheduleRestart(for taskGeneration: Int) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
      guard let self, self.isCurrentlyListening(), self.isGenerationCurrent(taskGeneration) else { return }
      self.startRecognitionTask()
    }
  }

  private func inspect(_ transcript: String) {
    let normalizedTranscript = normalize(transcript)
    guard !normalizedTranscript.isEmpty else { return }
    let now = Date()
    guard now.timeIntervalSince(lastDetectionAt) > 3 else { return }
    guard let matched = phrases.first(where: { normalizedTranscript.contains($0) }) else { return }
    lastDetectionAt = now
    onPhraseDetected?(matched, transcript)
  }

  private func normalize(_ value: String) -> String {
    value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
      .replacingOccurrences(of: "[^a-z0-9 ]", with: "", options: .regularExpression)
      .split(separator: " ")
      .joined(separator: " ")
  }

  private func isCurrentlyListening() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return isListening
  }

  private func isGenerationCurrent(_ value: Int) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return isListening && generation == value
  }

  private func emitState(_ state: String) {
    DispatchQueue.main.async { [weak self] in self?.onStateChanged?(state) }
  }

  enum VoiceTriggerError: LocalizedError {
    case noPhrases
    case speechPermissionDenied
    case microphonePermissionDenied
    case recognizerUnavailable
    case onDeviceUnavailable

    var errorDescription: String? {
      switch self {
      case .noPhrases: return "Add at least one voice phrase before arming Voice Trigger."
      case .speechPermissionDenied: return "Speech recognition permission was not granted."
      case .microphonePermissionDenied: return "Microphone permission was not granted."
      case .recognizerUnavailable: return "Speech recognition is unavailable for this language."
      case .onDeviceUnavailable: return "On-device speech recognition is unavailable for this language or device."
      }
    }
  }
}

public final class SentinelVoiceTriggerModule: Module {
  private let controller = VoiceTriggerController()

  public func definition() -> ModuleDefinition {
    Name("SentinelVoiceTrigger")
    Events("onPhraseDetected", "onVoiceTriggerState")

    OnCreate {
      self.controller.onPhraseDetected = { [weak self] phrase, transcript in
        DispatchQueue.main.async { self?.sendEvent("onPhraseDetected", ["phrase": phrase, "transcript": transcript]) }
      }
      self.controller.onStateChanged = { [weak self] state in
        self?.sendEvent("onVoiceTriggerState", ["state": state])
      }
    }

    OnDestroy {
      self.controller.stop()
    }

    AsyncFunction("requestAuthorizationAsync") { (promise: Promise) in
      self.controller.requestAuthorization { result in promise.resolve(result) }
    }

    AsyncFunction("startListening") { (phrases: [String], localeIdentifier: String, promise: Promise) in
      do {
        promise.resolve(try self.controller.start(phrases: phrases, localeIdentifier: localeIdentifier))
      } catch {
        promise.reject("VOICE_TRIGGER_START_FAILED", error.localizedDescription)
      }
    }

    AsyncFunction("stopListening") { () in
      self.controller.stop()
    }
  }
}
