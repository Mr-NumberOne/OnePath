// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearDraft, DRAFTS_KEY, isSameRoadmap, loadDraft, saveDraft } from "./builderDraft";
import { makeRoadmap } from "@/test/fixtures";

beforeEach(() => {
  localStorage.clear();
  delete window.desktopAPI;
});

describe("builder drafts", () => {
  it("saves, loads and clears a draft per roadmap", async () => {
    const a = makeRoadmap({ id: "a" });
    const b = makeRoadmap({ id: "b" });
    await saveDraft(a);
    await saveDraft(b);

    expect((await loadDraft("a"))?.roadmap).toEqual(a);
    expect(new Date((await loadDraft("a"))!.savedAt).getTime()).not.toBeNaN();

    await clearDraft("a");
    expect(await loadDraft("a")).toBeNull();
    expect((await loadDraft("b"))?.roadmap).toEqual(b);
  });

  it("returns null for missing or corrupt storage", async () => {
    expect(await loadDraft("x")).toBeNull();
    localStorage.setItem(DRAFTS_KEY, "{broken");
    expect(await loadDraft("x")).toBeNull();
  });

  it("uses the desktop store when running in the app", async () => {
    const store = new Map<string, string>();
    window.desktopAPI = {
      getStoreValue: async (key) => store.get(key),
      setStoreValue: async (key, value) => { store.set(key, value); return true; },
      deleteStoreValue: async (key) => store.delete(key),
      startGoogleAuth: async () => { throw new Error("unused"); },
      logout: async () => true,
    };
    await saveDraft(makeRoadmap());
    expect(store.has(DRAFTS_KEY)).toBe(true);
    expect(localStorage.getItem(DRAFTS_KEY)).toBeNull();
  });

  it("compares roadmaps by content", () => {
    expect(isSameRoadmap(makeRoadmap(), makeRoadmap())).toBe(true);
    expect(isSameRoadmap(makeRoadmap(), makeRoadmap({ isEnabled: false }))).toBe(false);
    // The server returns keys in schema order
    const { id, ...rest } = makeRoadmap();
    expect(isSameRoadmap(makeRoadmap(), { ...rest, id })).toBe(true);
  });
});
