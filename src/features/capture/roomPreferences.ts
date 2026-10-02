export interface RoomPreferences {
  lens: 'rear' | 'front' | 'dual';
  quality: '480p' | '720p' | '1080p';
  microphone: boolean;
  segmentMinutes: 2 | 5 | 10;
  retentionDays: 3 | 5 | 7;
}

export const defaultRoomPreferences: RoomPreferences = {
  lens: 'rear', quality: '720p', microphone: true,
  segmentMinutes: 5, retentionDays: 5,
};
