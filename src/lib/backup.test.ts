// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyBackup, buildBackupPayload, LANGUAGE_KEY, PROGRESS_KEY } from "./backup";
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
    expect(payload).toEqual({ progress, roadmaps: [makeRoadmap()], settings: { theme: "dark", language: "ar" } });
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
