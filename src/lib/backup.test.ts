// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyBackup, buildBackupPayload, LANGUAGE_KEY, PROGRESS_KEY, summarizeBackup, summarizeLocal } from "./backup";
import { makeRoadmap } from "@/test/fixtures";

const progress = { "rm-1": { completedPhases: ["phase-1"], completedSteps: [], completedResources: [], completedProjects: [], completedInterviewQuestions: [], achievements: [], portfolioScore: 100, studyHours: 10 } };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  delete window.desktopAPI;
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// In-memory stand-in for the Electron preload bridge
function installDesktopStore(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  window.desktopAPI = {
    getStoreValue: async (key) => store.get(key),
    setStoreValue: async (key, value) => { store.set(key, value); return true; },
    deleteStoreValue: async (key) => store.delete(key),
    startGoogleAuth: vi.fn(),
    logout: vi.fn(),
  };
  return store;
}

describe("buildBackupPayload", () => {
  it("reads progress and language from localStorage on the web", async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    localStorage.setItem(LANGUAGE_KEY, "ar");
    localStorage.setItem("theme", "dark");

    const payload = await buildBackupPayload([makeRoadmap()]);
    expect(payload).toEqual({ createdAt: expect.any(String), progress, roadmaps: [makeRoadmap()], settings: { theme: "dark", language: "ar" } });
    expect(new Date(payload.createdAt!).getTime()).not.toBeNaN();
  });

  it("reads progress and language from the desktop store", async () => {
    installDesktopStore({ [PROGRESS_KEY]: JSON.stringify(progress), [LANGUAGE_KEY]: "ar" });

    const payload = await buildBackupPayload([]);
    expect(payload.progress).toEqual(progress);
    expect(payload.settings.language).toBe("ar");
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });
});

describe("applyBackup", () => {
  it("writes restored data to the desktop store", async () => {
    const store = installDesktopStore();
    await applyBackup({ progress, roadmaps: [makeRoadmap()], settings: { theme: "light", language: "ar" } });

    expect(JSON.parse(store.get(PROGRESS_KEY)!)).toEqual(progress);
    expect(store.get(LANGUAGE_KEY)).toBe("ar");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(fetchMock).toHaveBeenCalledWith("/api/roadmaps", expect.objectContaining({ method: "POST" }));
  });

  it("leaves local data untouched when the server rejects the roadmaps", async () => {
    localStorage.setItem(PROGRESS_KEY, "old");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Invalid roadmap data format" }), { status: 400 }));

    await expect(applyBackup({ progress, roadmaps: [] })).rejects.toThrow("Invalid roadmap data format");
    expect(localStorage.getItem(PROGRESS_KEY)).toBe("old");
  });

  it("accepts the old progress-only format", async () => {
    await applyBackup(progress);
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual(progress);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects data that isn't an object", async () => {
    await expect(applyBackup("nope")).rejects.toThrow();
    await expect(applyBackup([])).rejects.toThrow();
  });
});

describe("backup summaries", () => {
  const roadmap = makeRoadmap();
  const withSteps = { "rm-1": { ...progress["rm-1"], completedSteps: ["s1", "s2"] } };

  it("summarizes this device", () => {
    expect(summarizeLocal([roadmap], withSteps)).toEqual({
      roadmaps: [{ id: roadmap.id, title: roadmap.title }],
      completedPhases: 1,
      completedSteps: 2,
    });
  });

  it("summarizes a full backup, including when it was made", () => {
    const summary = summarizeBackup({ createdAt: "2026-10-01T10:00:00.000Z", progress: withSteps, roadmaps: [roadmap], settings: {} });
    expect(summary).toEqual({
      createdAt: "2026-10-01T10:00:00.000Z",
      roadmaps: [{ id: roadmap.id, title: roadmap.title }],
      completedPhases: 1,
      completedSteps: 2,
    });
  });

  it("marks roadmaps as unchanged for old progress-only backups", () => {
    expect(summarizeBackup(progress)).toEqual({ roadmaps: null, completedPhases: 1, completedSteps: 0 });
  });

  it("rejects data applyBackup would reject", () => {
    expect(summarizeBackup("nope")).toBeNull();
    expect(summarizeBackup([])).toBeNull();
  });
});
