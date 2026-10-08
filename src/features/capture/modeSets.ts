import { CaptureMode, CaptureSaveMode, PowerMode } from '../../types/models';

export type ModeSetId = 'vehicle' | 'sentry' | 'monitor' | 'bodycam' | 'creator' | 'endurance' | 'smart' | 'advanced';
export type VideoQuality = '480p' | '720p' | '1080p' | '2160p';
export type CameraLens = 'rear' | 'front';

export interface CameraOptions {
  dualCamera: boolean;
  night: boolean;
  evidence: boolean;
}

export const defaultCameraOptions: CameraOptions = { dualCamera: false, night: false, evidence: false };

export interface CustomCaptureConfig {
  lens: CameraLens;
  quality: VideoQuality;
  fps: 15 | 24 | 30 | 60;
  microphone: boolean;
  motionDetection: boolean;
  soundDetection: boolean;
  batteryThreshold: 10 | 20 | 30;
  storageLimitGB: 1 | 5 | 10;
  notifications: boolean;
}

export const defaultCustomCaptureConfig: CustomCaptureConfig = {
  lens: 'rear', quality: '1080p', fps: 30, microphone: true,
  motionDetection: false, soundDetection: false, batteryThreshold: 20,
  storageLimitGB: 5, notifications: false,
};

export interface UseCaseMode {
  id: string;
  set: ModeSetId;
  label: string;
  icon: string;
  detail: string;
  captureMode: CaptureMode;
  lens: CameraLens;
  quality: VideoQuality;
  fps: 15 | 24 | 30 | 60;
  power: PowerMode;
  save: CaptureSaveMode;
  protect?: boolean;
  available: string[];
  planned: string[];
  note?: string;
}

export const modeSets: { id: ModeSetId; title: string; icon: string; detail: string }[] = [
  { id: 'vehicle', title: 'Vehicle', icon: 'emoji:🚗', detail: 'Trips and parked cars' },
  { id: 'sentry', title: 'Sentry', icon: 'emoji:🛡️', detail: 'Rooms, doors and belongings' },
  { id: 'monitor', title: 'Monitor', icon: 'emoji:👁️', detail: 'People, pets and sound' },
  { id: 'bodycam', title: 'Bodycam', icon: 'emoji:🎥', detail: 'Personal and outdoor capture' },
  { id: 'creator', title: 'Creator', icon: 'emoji:🎬', detail: 'Interviews, sports and shows' },
  { id: 'endurance', title: 'Endurance', icon: 'emoji:⏱️', detail: 'Long sessions and smaller files' },
  { id: 'smart', title: 'Smart Sentry', icon: 'emoji:✨', detail: 'Event focused monitoring' },
  { id: 'advanced', title: 'Advanced', icon: 'emoji:🎛️', detail: 'Build your own setup' },
];

const camera = (id: string, set: ModeSetId, label: string, icon: string, detail: string, options: Partial<UseCaseMode> = {}): UseCaseMode => ({
  id, set, label, icon, detail,
  captureMode: 'event_camera', lens: 'rear', quality: '1080p', fps: 30,
  power: 'standard', save: 'full_record', available: ['Foreground camera recording', 'Manual event markers', 'Local archive'], planned: [],
  ...options,
});

export const useCaseModes: UseCaseMode[] = [
  camera('drive', 'vehicle', 'Drive', 'emoji:🚘', 'Road facing dash cam with an optional cabin view.', { captureMode: 'dashcam', available: ['Road or cabin lens; dual on supported iPhones', 'Timed local video segments', 'GPS speed and route with permission', 'Manual incident protection and PDF report'], planned: ['Impact detection and pre-event buffer', 'Automatic loop overwrite', 'Post-drive AI analysis'] }),
  camera('park', 'vehicle', 'Park Guard', 'emoji:🅿️', 'Watch a parked car with a low power profile.', { quality: '720p', fps: 15, power: 'low_power', save: 'motion_only', planned: ['Motion and impact triggers', 'Buffered footage before the trigger', 'Automatic event protection', 'Screen off camera recording'] }),
  camera('bike', 'vehicle', 'Bike / Motorcycle', 'emoji:🏍️', 'Trip video with quick incident marking.', { captureMode: 'dashcam', fps: 60, available: ['Trip recording', 'GPS speed and local route with permission', 'Manual incident marker'], planned: ['Crash detection', 'Guaranteed 60 fps on single camera'] }),

  camera('room', 'sentry', 'Room Guard', 'emoji:🏠', 'Stationary room camera with local recording and manual event markers.', { save: 'full_record', available: ['Foreground continuous recording', 'Front or rear lens; dual on supported iPhones', 'Timed local video files and optional mic', 'Manual activity markers and protected originals', 'Local retention and Library review'], planned: ['Automatic motion, person and sound detection', 'Event-only recording with pre-event buffer', 'Remote viewing and alerts'] }),
  camera('home_away', 'sentry', 'Home / Away', 'emoji:🏡', 'Choose a home or away room monitoring profile.', { save: 'motion_only', planned: ['Automatic arrival and departure switching', 'Presence based notifications'] }),
  camera('door', 'sentry', 'Door / Entry', 'emoji:🚪', 'Point an old phone toward an entrance.', { save: 'motion_only', planned: ['People entering and leaving detection', 'Entry notifications'] }),
  camera('hotel', 'sentry', 'Hotel / Airbnb', 'emoji:🏨', 'Temporary room watch with one tap to start and stop.', { save: 'motion_only', planned: ['Encrypted media vault', 'Automatic person alerts'], note: 'Use only where recording is permitted and disclose recording where required.' }),
  camera('package', 'sentry', 'Package Watch', 'emoji:📦', 'Bookmark activity near a delivery area.', { save: 'motion_only', planned: ['Package dropoff and pickup recognition', 'Detection zones'] }),
  camera('garage', 'sentry', 'Garage', 'emoji:🚙', 'Fixed wide view of a garage or driveway.', { quality: '720p', save: 'motion_only', planned: ['Vehicle and door recognition', 'Wide angle lens selection'] }),
  camera('window', 'sentry', 'Window Watch', 'emoji:🪟', 'Look outward while filtering busy scenery.', { quality: '720p', save: 'motion_only', planned: ['Adjustable motion zones', 'Tree and traffic filtering'] }),
  camera('travel', 'sentry', 'Travel Guard', 'emoji:🧳', 'Keep a visible camera on your belongings.', { quality: '720p', power: 'low_power', save: 'motion_only', planned: ['Belongings detection', 'Remote alerts'], note: 'Keep the phone in the foreground and respect venue rules.' }),

  camera('pet', 'monitor', 'Pet Watch', 'emoji:🐾', 'Keep a local record of pet activity.', { quality: '720p', save: 'motion_only', planned: ['Pet activity and unusual sound detection', 'Condensed activity timeline'] }),
  camera('baby', 'monitor', 'Baby Monitor', 'emoji:👶', 'Convenience audio and video monitoring.', { quality: '720p', fps: 24, planned: ['Cry and noise alerts', 'Background audio handoff', 'Authorized live viewer'], note: 'Convenience monitoring only. This is not a medical or life safety device.' }),
  camera('audio_guard', 'monitor', 'Audio Guard', 'emoji:🎧', 'Start with low power audio capture.', { captureMode: 'conversation_audio', quality: '480p', fps: 15, power: 'low_power', save: 'sound_only', available: ['Background audio recording', 'Manual event markers', 'Local archive'], planned: ['Selected sound detection', 'Automatic video wakeup'] }),
  camera('remote', 'monitor', 'Remote Camera', 'emoji:📡', 'Use this phone as a local camera source.', { quality: '720p', available: ['Local camera recording', 'Front or rear lens'], planned: ['Authorized device pairing', 'Live remote viewer and controller', 'End to end encryption'], note: 'Remote viewing is not connected yet.' }),

  camera('bodycam', 'bodycam', 'Standard', 'emoji:🧍', 'First person recording with quick event markers.', { captureMode: 'rear_video' }),
  camera('adventure', 'bodycam', 'Adventure', 'emoji:🥾', 'Battery conscious outdoor recording.', { captureMode: 'rear_video', quality: '720p', fps: 24, power: 'low_power', available: ['720p outdoor recording', 'GPS route with permission', 'Manual event markers'], planned: ['Automatic waypoints', 'Battery threshold stop'] }),
  camera('incident', 'bodycam', 'Incident', 'emoji:🚨', 'One tap recording with locked evidence.', { captureMode: 'rear_video', protect: true, available: ['Manual event markers', 'Protected session', 'GPS route with permission'], planned: ['Emergency contact shortcut', 'Automatic location marker'] }),

  camera('sports', 'creator', 'Sports', 'emoji:🏃', 'Fast action recording for later editing.', { captureMode: 'rear_video', fps: 60, planned: ['Automatic action clip selection', 'Guaranteed 60 fps on single camera'] }),
  camera('interview', 'creator', 'Interview', 'emoji:🎤', 'Desk or tripod video with clear spoken audio.', { captureMode: 'rear_video', fps: 30, available: ['Video and microphone recording', 'Local captions in Studio'], planned: ['Speaker focused framing', 'Automatic transcript on save'] }),
  camera('podcast', 'creator', 'Podcast', 'emoji:🎙️', 'Microphone first show with optional second camera.', { captureMode: 'podcast', available: ['Local recording', 'Dual camera on supported iPhones', 'Studio captions and editing'], planned: ['Automatic speaker switching'] }),
  camera('creator', 'creator', 'Standard Creator', 'emoji:🎨', 'High quality video for the social editor.', { captureMode: 'rear_video', quality: '2160p', available: ['High quality video', 'Manual text and captions in Studio'], planned: ['Open editor automatically after recording'] }),

  camera('timelapse', 'endurance', 'Time Lapse', 'emoji:⏳', 'Prepare a low frame rate long watch.', { captureMode: 'rear_video', quality: '720p', fps: 15, power: 'low_power', planned: ['Time lapse export', 'Automatic still frame interval'] }),
  camera('low_power', 'endurance', 'Low Power Watch', 'emoji:🔋', 'Use lower resolution for longer foreground sessions.', { quality: '480p', fps: 15, power: 'low_power', save: 'motion_only', planned: ['Screen off camera capture', 'Battery threshold stop', 'Motion only recording'] }),
  camera('continuous', 'endurance', 'Continuous', 'emoji:🔁', 'Keep a foreground session running.', { quality: '720p', fps: 24, save: 'full_record', planned: ['Automatic loop overwrite', 'Segmented 24/7 capture'] }),

  camera('smart_sentry', 'smart', 'Smart Sentry', 'emoji:🧠', 'One place for combined motion and sound settings.', { quality: '720p', fps: 24, save: 'motion_only', planned: ['On device event fusion', 'Buffered event clips', 'Adaptive high quality recording'] }),
  camera('custom', 'advanced', 'Custom Mode', 'emoji:🎛️', 'Choose your own lens, quality and event preferences.', { captureMode: 'rear_video', planned: ['Native motion and sound events', 'Battery and storage limits', 'Notifications'] }),
];

export function getUseCaseMode(id: string | null | undefined): UseCaseMode | null {
  return useCaseModes.find((mode) => mode.id === id) ?? null;
}
