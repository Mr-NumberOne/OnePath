import type { RoadmapConfig } from '@/types';
import { getStoredData, setStoredData } from '@/lib/storage';

// Unsaved roadmap edits, kept per roadmap so they survive a reload or a
// crash. Stored through storage.ts, so the desktop app keeps them in its
// own store rather than in localStorage (which changes with the port).

export const DRAFTS_KEY = 'onepath-builder-drafts';

export interface BuilderDraft {
  savedAt: string; // ISO timestamp
  roadmap: RoadmapConfig;
}

type DraftMap = Record<string, BuilderDraft>;

async function readDrafts(): Promise<DraftMap> {
  const raw = await getStoredData(DRAFTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function loadDraft(roadmapId: string): Promise<BuilderDraft | null> {
  return (await readDrafts())[roadmapId] ?? null;
}

export async function saveDraft(roadmap: RoadmapConfig): Promise<void> {
  const drafts = await readDrafts();
  drafts[roadmap.id] = { savedAt: new Date().toISOString(), roadmap };
  await setStoredData(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function clearDraft(roadmapId: string): Promise<void> {
  const drafts = await readDrafts();
  if (!(roadmapId in drafts)) return;
  delete drafts[roadmapId];
  await setStoredData(DRAFTS_KEY, JSON.stringify(drafts));
}

// JSON with object keys sorted, so key order (which the server's schema
// may change) doesn't count as a difference
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}

export function isSameRoadmap(a: RoadmapConfig, b: RoadmapConfig) {
  return stableStringify(a) === stableStringify(b);
}
