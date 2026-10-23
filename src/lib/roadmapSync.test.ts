import { describe, expect, it } from "vitest";
import { otherLanguage, removePhase, syncPhaseAdd, syncPhaseUpdate } from "./roadmapSync";
import { makePhase } from "@/test/fixtures";

const step = (id: string, order = 1) => ({ id, title: `Step ${id}`, description: "", order, resources: [] });

describe("otherLanguage", () => {
  it("swaps en and ar", () => {
    expect(otherLanguage("en")).toBe("ar");
    expect(otherLanguage("ar")).toBe("en");
  });
});

describe("syncPhaseUpdate", () => {
  const en = makePhase({ id: "p1", title: "English" });
  const ar = makePhase({ id: "p1", title: "عربي", steps: [step("ar-only")] });

  it("leaves the other language untouched for text-only edits", () => {
    const [result] = syncPhaseUpdate([ar], en, { ...en, title: "Edited" });
    expect(result.title).toBe("عربي");
    expect(result.steps).toEqual([step("ar-only")]);
  });

  it("mirrors an added step without dropping existing ones", () => {
    const [result] = syncPhaseUpdate([ar], en, { ...en, steps: [step("s1")] });
    expect(result.steps?.map((s) => s.id)).toEqual(["ar-only", "s1"]);
  });

  it("mirrors a removed step", () => {
    const before = { ...en, steps: [step("s1")] };
    const target = { ...ar, steps: [step("ar-only"), step("s1")] };
    const [result] = syncPhaseUpdate([target], before, { ...before, steps: [] });
    expect(result.steps?.map((s) => s.id)).toEqual(["ar-only"]);
  });

  it("keeps the other language's text for existing steps but mirrors order", () => {
    const before = { ...en, steps: [step("s1", 1)] };
    const target = { ...ar, steps: [{ ...step("s1", 1), title: "خطوة" }] };
    const [result] = syncPhaseUpdate([target], before, { ...before, steps: [step("s1", 5)] });
    expect(result.steps?.[0]).toMatchObject({ title: "خطوة", order: 5 });
  });

  it("mirrors added and removed step resources", () => {
    const res = { id: "r1", title: "Guide", url: "https://example.com" };
    const before = { ...en, steps: [step("s1")] };
    const target = { ...ar, steps: [step("s1")] };
    const added = syncPhaseUpdate([target], before, { ...before, steps: [{ ...step("s1"), resources: [res] }] })[0];
    expect(added.steps?.[0].resources).toEqual([res]);
  });

  it("mirrors hours, order and prerequisites, dropping unknown prerequisite IDs", () => {
    const p0 = makePhase({ id: "p0" });
    const [, result] = syncPhaseUpdate([p0, ar], en, { ...en, estimatedHours: 42, order: 3, prerequisites: ["p0", "missing"] });
    expect(result).toMatchObject({ estimatedHours: 42, order: 3, prerequisites: ["p0"] });
  });

  it("ignores phases with other IDs", () => {
    const other = makePhase({ id: "p2" });
    const [result] = syncPhaseUpdate([other], en, { ...en, estimatedHours: 99 });
    expect(result).toBe(other);
  });
});

describe("syncPhaseAdd", () => {
  it("adds a copy with the same ID", () => {
    const added = makePhase({ id: "new" });
    const result = syncPhaseAdd([], added);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(added);
    expect(result[0]).not.toBe(added);
  });

  it("does not duplicate an existing ID", () => {
    const existing = makePhase({ id: "new" });
    expect(syncPhaseAdd([existing], makePhase({ id: "new" }))).toEqual([existing]);
  });
});

describe("removePhase", () => {
  it("removes the phase and references to it", () => {
    const phases = [makePhase({ id: "a" }), makePhase({ id: "b", prerequisites: ["a"] })];
    expect(removePhase(phases, "a")).toEqual([makePhase({ id: "b", prerequisites: [] })]);
  });
});
