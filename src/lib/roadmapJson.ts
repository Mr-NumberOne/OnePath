import type { RoadmapConfig } from '@/types';
import { roadmapConfigSchema } from '@/lib/roadmapSchema';
import { generateId } from '@/lib/utils';

// Lossless single-roadmap export/import. Unlike the Excel template, the JSON
// file keeps every field exactly as stored.

const FORMAT = 'onepath-roadmap';
const VERSION = 1;

interface RoadmapFile {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  roadmap: RoadmapConfig;
}

export function roadmapToJson(roadmap: RoadmapConfig): string {
  const file: RoadmapFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), roadmap };
  return JSON.stringify(file, null, 2);
}

export function exportRoadmapToJson(roadmap: RoadmapConfig, language: 'en' | 'ar' = 'en') {
  const blob = new Blob([roadmapToJson(roadmap)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  // Replace only invalid OS characters (\ / : * ? " < > |) with an underscore
  link.download = `${(roadmap.title[language] || 'roadmap').replace(/[\\/:*?"<>|]/g, '_')}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

// Parses an exported file (or a bare roadmap object). A roadmap whose ID is
// already taken gets a new one, so importing never replaces an existing roadmap.
export function parseRoadmapJson(text: string, existingIds: string[]): RoadmapConfig {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  const candidate =
    data && typeof data === 'object' && 'format' in data && (data as RoadmapFile).format === FORMAT
      ? (data as RoadmapFile).roadmap
      : data;

  const parsed = roadmapConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error('The file is not a OnePath roadmap.');
  }

  const roadmap = parsed.data as RoadmapConfig;
  return existingIds.includes(roadmap.id) ? { ...roadmap, id: generateId('rm') } : roadmap;
}
