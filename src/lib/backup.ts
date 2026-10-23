import { RoadmapConfig, UserProgressMap } from '@/types';
import { getStoredData, setStoredData } from '@/lib/storage';

export const PROGRESS_KEY = 'erp-roadmap-progress-v2';
export const LANGUAGE_KEY = 'roadmap-language';
// next-themes always keeps the theme in localStorage, even on desktop
const THEME_KEY = 'theme';

export interface BackupPayload {
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
export async function applyBackup(data: Partial<BackupPayload> | UserProgressMap): Promise<void> {
  const backup = data as Partial<BackupPayload>;
  if (backup.progress && backup.roadmaps) {
    // New format: contains progress, roadmaps, and settings
    await setStoredData(PROGRESS_KEY, JSON.stringify(backup.progress));

    if (backup.settings) {
      if (backup.settings.theme) localStorage.setItem(THEME_KEY, backup.settings.theme);
      if (backup.settings.language) await setStoredData(LANGUAGE_KEY, backup.settings.language);
    }

    await fetch('/api/roadmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backup.roadmaps),
    });
  } else {
    // Old format fallback: only contains progress
    await setStoredData(PROGRESS_KEY, JSON.stringify(data));
  }
}
