export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | 'custom';
export type EditorTrackType = 'video' | 'video_overlay' | 'audio' | 'music' | 'voiceover' | 'text' | 'captions' | 'graphics';
export type ProjectStatus = 'draft' | 'ready' | 'exported';

export interface SocialFormatPreset {
  id: string;
  label: string;
  platform: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  safeZone: { top: number; bottom: number; left: number; right: number };
  defaultExport: { fps: number; codec: 'h264' | 'hevc'; quality: 'fast' | 'social_hd' | 'max' };
}

export interface TimelineClip {
  id: string;
  sourceUri?: string;
  sourceSessionId?: string;
  type: EditorTrackType;
  startMs: number;
  endMs: number;
  timelineStartMs: number;
  label?: string;
  text?: string;
  speakerId?: string;
  syncGroupId?: string;
  volume: number;
  opacity: number;
  speed: number;
  transform?: { x: number; y: number; scale: number; rotation: number };
}

export interface EditOperation {
  id: string;
  type: 'trim' | 'split' | 'delete' | 'crop' | 'text' | 'caption' | 'transition' | 'audio' | 'reframe' | 'blur';
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface EditorProject {
  id: string;
  name: string;
  status: ProjectStatus;
  sourceSessionIds: string[];
  format: SocialFormatPreset;
  durationMs: number;
  tracks: Record<EditorTrackType, TimelineClip[]>;
  operations: EditOperation[];
  captionStyleId?: string;
  createdAt: string;
  updatedAt: string;
  derivedOutputs: { uri: string; createdAt: string; formatId: string }[];
}

export interface CaptionStyle {
  id: string;
  name: string;
  font: string;
  size: number;
  weight: '400' | '600' | '700' | '800';
  position: 'top' | 'center' | 'bottom';
  background: string;
  outline: boolean;
  wordHighlight: boolean;
  maxWordsPerLine: number;
}

export interface EditorTemplate {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  captionStyleId: string;
  layout: 'single' | 'split' | 'picture_in_picture' | 'speaker_focus';
  intro?: string;
  outro?: string;
}

export const socialPresets: SocialFormatPreset[] = [
  { id: 'tiktok', label: 'TikTok', platform: 'TikTok', aspectRatio: '9:16', width: 1080, height: 1920, safeZone: { top: 180, bottom: 280, left: 48, right: 48 }, defaultExport: { fps: 30, codec: 'h264', quality: 'social_hd' } },
  { id: 'instagram_reel', label: 'Instagram Reel', platform: 'Instagram', aspectRatio: '9:16', width: 1080, height: 1920, safeZone: { top: 180, bottom: 300, left: 48, right: 48 }, defaultExport: { fps: 30, codec: 'h264', quality: 'social_hd' } },
  { id: 'youtube_short', label: 'YouTube Short', platform: 'YouTube', aspectRatio: '9:16', width: 1080, height: 1920, safeZone: { top: 110, bottom: 220, left: 48, right: 48 }, defaultExport: { fps: 30, codec: 'h264', quality: 'social_hd' } },
  { id: 'youtube', label: 'YouTube', platform: 'YouTube', aspectRatio: '16:9', width: 1920, height: 1080, safeZone: { top: 40, bottom: 40, left: 40, right: 40 }, defaultExport: { fps: 30, codec: 'h264', quality: 'max' } },
  { id: 'instagram_feed', label: 'Instagram Feed', platform: 'Instagram', aspectRatio: '4:5', width: 1080, height: 1350, safeZone: { top: 48, bottom: 48, left: 48, right: 48 }, defaultExport: { fps: 30, codec: 'h264', quality: 'social_hd' } },
  { id: 'podcast_vertical', label: 'Podcast Vertical Clip', platform: 'Podcast', aspectRatio: '9:16', width: 1080, height: 1920, safeZone: { top: 180, bottom: 300, left: 48, right: 48 }, defaultExport: { fps: 30, codec: 'h264', quality: 'social_hd' } },
  { id: 'podcast_landscape', label: 'Podcast Landscape Clip', platform: 'Podcast', aspectRatio: '16:9', width: 1920, height: 1080, safeZone: { top: 40, bottom: 40, left: 40, right: 40 }, defaultExport: { fps: 30, codec: 'h264', quality: 'max' } },
];

export const captionStyles: CaptionStyle[] = [
  { id: 'clean', name: 'Clean', font: 'System', size: 34, weight: '600', position: 'bottom', background: 'transparent', outline: true, wordHighlight: false, maxWordsPerLine: 6 },
  { id: 'bold', name: 'Bold', font: 'System', size: 42, weight: '800', position: 'center', background: '#00000099', outline: false, wordHighlight: false, maxWordsPerLine: 5 },
  { id: 'word_highlight', name: 'Word Highlight', font: 'System', size: 38, weight: '700', position: 'bottom', background: '#11151DCC', outline: false, wordHighlight: true, maxWordsPerLine: 5 },
  { id: 'podcast', name: 'Podcast', font: 'System', size: 30, weight: '700', position: 'bottom', background: '#B7F36BEE', outline: false, wordHighlight: true, maxWordsPerLine: 6 },
];

export const templates: EditorTemplate[] = [
  { id: 'podcast_clean', name: 'Podcast Clean', aspectRatio: '9:16', captionStyleId: 'clean', layout: 'speaker_focus' },
  { id: 'podcast_bold', name: 'Podcast Bold', aspectRatio: '9:16', captionStyleId: 'bold', layout: 'split' },
  { id: 'interview', name: 'Interview', aspectRatio: '16:9', captionStyleId: 'clean', layout: 'split' },
  { id: 'quote_clip', name: 'Quote Clip', aspectRatio: '9:16', captionStyleId: 'word_highlight', layout: 'single' },
  { id: 'security_breakdown', name: 'Security Breakdown', aspectRatio: '16:9', captionStyleId: 'clean', layout: 'picture_in_picture' },
];
