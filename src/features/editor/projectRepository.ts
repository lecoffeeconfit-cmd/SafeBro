import { getJson, setJson } from '../../services/storage/LocalStore';
import { EditorProject } from './types';

const key = 'editor_projects';

export async function loadProjects(): Promise<EditorProject[]> {
  return getJson<EditorProject[]>(key, []);
}

export async function saveProject(project: EditorProject): Promise<void> {
  const projects = await loadProjects();
  await setJson(key, [project, ...projects.filter((item) => item.id !== project.id)]);
}

export function createEmptyProject(name: string, sourceSessionIds: string[], format: EditorProject['format']): EditorProject {
  const now = new Date().toISOString();
  return { id: `PRJ_${Date.now().toString(36)}`, name, status: 'draft', sourceSessionIds, format, durationMs: 0, tracks: { video: [], video_overlay: [], audio: [], music: [], voiceover: [], text: [], captions: [], graphics: [] }, operations: [], createdAt: now, updatedAt: now, derivedOutputs: [] };
}
