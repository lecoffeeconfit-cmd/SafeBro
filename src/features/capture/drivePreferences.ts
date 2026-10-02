export interface DrivePreferences {
  view: 'road' | 'cabin' | 'dual';
  quality: '720p' | '1080p' | '2160p';
  fps: 30 | 60;
  microphone: boolean;
  gps: boolean;
  segmentMinutes: 1 | 3 | 5 | 10;
}

export const defaultDrivePreferences: DrivePreferences = {
  view: 'road',
  quality: '1080p',
  fps: 30,
  microphone: true,
  gps: true,
  segmentMinutes: 3,
};
