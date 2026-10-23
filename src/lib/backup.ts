import { RoadmapConfig, UserProgressMap } from '@/types';
import { getStoredData, setStoredData } from '@/lib/storage';
import { saveRoadmaps } from '@/lib/roadmapApi';

export const PROGRESS_KEY = 'erp-roadmap-progress-v2';
export const LANGUAGE_KEY = 'roadmap-language';
// next-themes always keeps the theme in localStorage, even on desktop
const THEME_KEY = 'theme';

export interface BackupPayload {
  // When the backup was made; older backups don't have it
  createdAt?: string;
  progress: UserProgressMap;
  roadmaps: RoadmapConfig[];
  settings: {
    theme: string;
    language: string;
  };
}

export async function buildBackupPayload(roadmaps: RoadmapConfig[]): Promise<BackupPayload> {
  const progressDataString = await getStoredData(PROGRESS_KEY);

  return {
    createdAt: new Date().toISOString(),
    progress: progressDataString ? JSON.parse(progressDataString) : {},
    roadmaps,
    settings: {
      theme: localStorage.getItem(THEME_KEY) || 'system',
      language: (await getStoredData(LANGUAGE_KEY)) || 'en',
    },
  };
}

// Writes a downloaded backup into local storage and the roadmap API.
// Callers should reload the page afterwards so the contexts pick it up.
export async function applyBackup(data: unknown): Promise<void> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The backup file is not in a format OnePath recognises.');
  }
  const backup = data as Partial<BackupPayload>;
  if (backup.progress && backup.roadmaps) {
    // New format: contains progress, roadmaps, and settings.
    // Roadmaps go first: if the server rejects them, nothing local has changed yet.
    await saveRoadmaps(backup.roadmaps);
    await setStoredData(PROGRESS_KEY, JSON.stringify(backup.progress));

    if (backup.settings) {
      if (backup.settings.theme) localStorage.setItem(THEME_KEY, backup.settings.theme);
      if (backup.settings.language) await setStoredData(LANGUAGE_KEY, backup.settings.language);
    }
  } else {
    // Old format fallback: only contains progress
    await setStoredData(PROGRESS_KEY, JSON.stringify(data));
  }
}

// What a restore would bring in or replace, for showing before it happens
export interface DataSummary {
  createdAt?: string;
  // null when a (very old) backup has no roadmaps, so a restore keeps the current ones
  roadmaps: { id: string; title: { en: string; ar: string } }[] | null;
  completedPhases: number;
  completedSteps: number;
}

function countProgress(progress: UserProgressMap | undefined) {
  const entries = Object.values(progress || {});
  return {
    completedPhases: entries.reduce((n, p) => n + (p?.completedPhases?.length || 0), 0),
    completedSteps: entries.reduce((n, p) => n + (p?.completedSteps?.length || 0), 0),
  };
}

export function summarizeLocal(roadmaps: RoadmapConfig[], progress: UserProgressMap): DataSummary {
  return {
    roadmaps: roadmaps.map((r) => ({ id: r.id, title: r.title })),
    ...countProgress(progress),
  };
}

// Returns null when the data isn't something applyBackup would accept
export function summarizeBackup(data: unknown): DataSummary | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const backup = data as Partial<BackupPayload>;
  if (backup.progress && backup.roadmaps) {
    return {
      createdAt: backup.createdAt,
      roadmaps: backup.roadmaps.map((r) => ({ id: r.id, title: r.title })),
      ...countProgress(backup.progress),
    };
  }
  // Old format: the whole file is the progress map
  return { roadmaps: null, ...countProgress(data as UserProgressMap) };
}
