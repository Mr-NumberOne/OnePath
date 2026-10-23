import { describe, expect, it } from "vitest";
import { parseRoadmapJson, roadmapToJson } from "./roadmapJson";
import { makePhase, makeRoadmap } from "@/test/fixtures";

describe("roadmap JSON export/import", () => {
  it("round-trips a roadmap exactly", () => {
    const roadmap = makeRoadmap({
      phases: {
        en: [makePhase({ steps: [{ id: "s1", title: "Step", description: "d", order: 1, resources: [{ id: "r1", title: "R", url: "https://example.com" }] }] })],
        ar: [makePhase({ title: "الأساسيات" })],
      },
    });
    expect(parseRoadmapJson(roadmapToJson(roadmap), [])).toEqual(roadmap);
  });

  it("accepts a bare roadmap object", () => {
    const roadmap = makeRoadmap();
    expect(parseRoadmapJson(JSON.stringify(roadmap), [])).toEqual(roadmap);
  });

  it("gives an imported roadmap a new ID when the ID is taken", () => {
    const roadmap = makeRoadmap({ id: "rm-1" });
    const imported = parseRoadmapJson(roadmapToJson(roadmap), ["rm-1"]);
    expect(imported.id).not.toBe("rm-1");
    expect(imported.id).toMatch(/^rm-/);
    expect({ ...imported, id: "rm-1" }).toEqual(roadmap);
  });

  it("rejects invalid JSON and non-roadmap data", () => {
    expect(() => parseRoadmapJson("{", [])).toThrow("not valid JSON");
    expect(() => parseRoadmapJson(JSON.stringify({ hello: "world" }), [])).toThrow("not a OnePath roadmap");
    expect(() => parseRoadmapJson(JSON.stringify({ format: "onepath-roadmap", roadmap: { id: "x" } }), [])).toThrow("not a OnePath roadmap");
  });
});
