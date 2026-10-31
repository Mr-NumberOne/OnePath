import { describe, expect, it } from "vitest";
import { roadmapListSchema } from "./roadmapSchema";
import { makePhase, makeRoadmap } from "@/test/fixtures";

describe("roadmapListSchema", () => {
  it("accepts a valid roadmap list", () => {
    const result = roadmapListSchema.safeParse([makeRoadmap()]);
    expect(result.success).toBe(true);
  });

  it("accepts an empty list (logout clears roadmaps)", () => {
    expect(roadmapListSchema.safeParse([]).success).toBe(true);
  });

  it("rejects a non-array body", () => {
    expect(roadmapListSchema.safeParse({ roadmaps: [] }).success).toBe(false);
  });

  it("rejects a roadmap missing localized fields", () => {
    const noTitle: Partial<ReturnType<typeof makeRoadmap>> = makeRoadmap();
    delete noTitle.title;
    expect(roadmapListSchema.safeParse([noTitle]).success).toBe(false);
  });

  it("rejects numeric phase IDs", () => {
    const roadmap = makeRoadmap({ phases: { en: [{ ...makePhase(), id: 1 as unknown as string }], ar: [] } });
    expect(roadmapListSchema.safeParse([roadmap]).success).toBe(false);
  });

  it("rejects negative estimated hours", () => {
    const roadmap = makeRoadmap({ phases: { en: [makePhase({ estimatedHours: -1 })], ar: [] } });
    expect(roadmapListSchema.safeParse([roadmap]).success).toBe(false);
  });

  it("rejects oversized text fields", () => {
    const roadmap = makeRoadmap({ phases: { en: [makePhase({ description: "x".repeat(10_001) })], ar: [] } });
    expect(roadmapListSchema.safeParse([roadmap]).success).toBe(false);
  });
});
