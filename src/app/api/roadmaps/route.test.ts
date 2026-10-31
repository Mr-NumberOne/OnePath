import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeRoadmap } from "@/test/fixtures";

// Signed in unless a test says otherwise
const session = vi.hoisted(() => ({ current: { user: { id: "u1" } } as unknown }));
vi.mock("@/auth", () => ({ auth: async () => session.current }));

const { GET, POST } = await import("./route");

let dataDir: string;
const dataFile = () => path.join(dataDir, "custom-roadmap.json");

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/roadmaps", { method: "POST", body, headers: { "Content-Type": "application/json", ...headers } }));

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "onepath-api-"));
  process.env.ONEPATH_DATA_DIR = dataDir;
  session.current = { user: { id: "u1" } };
});

afterEach(async () => {
  delete process.env.ONEPATH_DATA_DIR;
  await fs.rm(dataDir, { recursive: true, force: true });
});

describe("GET /api/roadmaps", () => {
  it("requires a session", async () => {
    session.current = null;
    expect((await GET()).status).toBe(401);
  });

  it("returns [] when no file exists yet", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 500 for a corrupt file instead of []", async () => {
    await fs.writeFile(dataFile(), "{not json");
    expect((await GET()).status).toBe(500);
  });

  it("migrates the legacy { en, ar } format", async () => {
    await fs.writeFile(dataFile(), JSON.stringify({ en: [], ar: [] }));
    const data = await (await GET()).json();
    expect(data[0].id).toBe("demo-roadmap");
    expect(JSON.parse(await fs.readFile(dataFile(), "utf-8"))[0].id).toBe("demo-roadmap");
  });
});

describe("POST /api/roadmaps", () => {
  it("requires a session", async () => {
    session.current = null;
    expect((await post("[]")).status).toBe(401);
  });

  it("saves valid roadmaps", async () => {
    const roadmaps = [makeRoadmap()];
    const res = await post(JSON.stringify(roadmaps));
    expect(res.status).toBe(200);
    expect(JSON.parse(await fs.readFile(dataFile(), "utf-8"))).toEqual(roadmaps);
  });

  it("rejects invalid JSON", async () => {
    expect((await post("[{")).status).toBe(400);
  });

  it("rejects data that doesn't match the schema", async () => {
    const res = await post(JSON.stringify([{ id: "x" }]));
    expect(res.status).toBe(400);
    expect((await res.json()).issues.length).toBeGreaterThan(0);
  });

  it("rejects bodies over 5 MB", async () => {
    expect((await post(" ".repeat(5 * 1024 * 1024 + 1))).status).toBe(413);
  });

  it("keeps the file valid under concurrent saves", async () => {
    const saves = Array.from({ length: 20 }, (_, i) => post(JSON.stringify([makeRoadmap({ id: `rm-${i}` })])));
    const statuses = (await Promise.all(saves)).map((r) => r.status);
    expect(statuses.every((s) => s === 200)).toBe(true);

    const saved = JSON.parse(await fs.readFile(dataFile(), "utf-8"));
    expect(saved).toHaveLength(1);
    expect((await fs.readdir(dataDir)).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });
});
