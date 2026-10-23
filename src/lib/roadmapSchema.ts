import { z } from "zod";

// Server-side validation for roadmap data posted to /api/roadmaps.
// Mirrors RoadmapConfig in src/types; limits keep a single save bounded.

const MAX_TEXT = 10_000;
const MAX_ITEMS = 500;

const id = z.string().min(1).max(200);
const text = z.string().max(MAX_TEXT);
const textList = z.array(text).max(MAX_ITEMS);
const localized = z.object({ en: text, ar: text });

const resourceLink = z.object({
  id,
  title: text,
  url: z.string().max(2_000),
});

const phaseStep = z.object({
  id,
  title: text,
  description: text,
  order: z.number(),
  resources: z.array(resourceLink).max(MAX_ITEMS).optional(),
});

const phase = z.object({
  id,
  title: text,
  description: text,
  category: text,
  prerequisites: z.array(id).max(MAX_ITEMS),
  estimatedHours: z.number().min(0),
  objectives: textList,
  milestones: textList,
  steps: z.array(phaseStep).max(MAX_ITEMS).optional(),
  resources: z.array(resourceLink).max(MAX_ITEMS).optional(),
  order: z.number(),
});

const phaseList = z.array(phase).max(MAX_ITEMS);

export const roadmapConfigSchema = z.object({
  id,
  title: localized,
  description: localized,
  category: localized,
  isEnabled: z.boolean(),
  phases: z.object({ en: phaseList, ar: phaseList }),
  radarCategories: z.object({ en: textList, ar: textList }).optional(),
});

export const roadmapListSchema = z.array(roadmapConfigSchema).max(MAX_ITEMS);
