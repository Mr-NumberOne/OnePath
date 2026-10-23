import type { Phase, RoadmapConfig } from "@/types";

export function makePhase(overrides: Partial<Phase> = {}): Phase {
  return {
    id: "phase-1",
    title: "Fundamentals",
    description: "Basic concepts.",
    category: "Tech",
    prerequisites: [],
    estimatedHours: 10,
    objectives: ["Understand basics"],
    milestones: ["Pass quiz"],
    steps: [],
    resources: [],
    order: 1,
    ...overrides,
  };
}

export function makeRoadmap(overrides: Partial<RoadmapConfig> = {}): RoadmapConfig {
  return {
    id: "rm-1",
    title: { en: "ERP Consultant", ar: "مستشار ERP" },
    description: { en: "Master ERP.", ar: "احتراف ERP." },
    category: { en: "General", ar: "عام" },
    isEnabled: true,
    phases: {
      en: [makePhase()],
      ar: [makePhase({ title: "الأساسيات" })],
    },
    radarCategories: { en: ["Tech"], ar: ["تقنية"] },
    ...overrides,
  };
}
