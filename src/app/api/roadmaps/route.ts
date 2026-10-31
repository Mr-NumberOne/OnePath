import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { RoadmapConfig } from "@/types";
import { auth } from "@/auth";
import { roadmapListSchema } from "@/lib/roadmapSchema";

// Largest request body accepted by POST, in bytes
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const getDataFile = () => {
  if (process.env.ONEPATH_DATA_DIR) {
    return path.join(process.env.ONEPATH_DATA_DIR, "custom-roadmap.json");
  }
  return path.join(process.cwd(), "src", "data", "custom-roadmap.json");
};

// Serializes writes so concurrent saves can't interleave.
let writeQueue: Promise<void> = Promise.resolve();

function writeDataFile(data: unknown): Promise<void> {
  const run = async () => {
    const dataFile = getDataFile();
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    // Unique temp name per write, then an atomic rename over the real file
    const tmpFile = `${dataFile}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tmpFile, dataFile);
    } catch (error) {
      await fs.rm(tmpFile, { force: true });
      throw error;
    }
  };
  const result = writeQueue.then(run);
  writeQueue = result.catch(() => {});
  return result;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileContents: string;
  try {
    fileContents = await fs.readFile(getDataFile(), "utf-8");
  } catch (error) {
    // No file yet means no roadmaps; anything else is a real failure
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json([]);
    }
    console.error("Failed to read roadmaps", error);
    return NextResponse.json({ error: "Failed to read roadmaps" }, { status: 500 });
  }

  try {
    let data = JSON.parse(fileContents);

    // Migration from old format: { en: Phase[], ar: Phase[] }
    if (data.en && Array.isArray(data.en) && !Array.isArray(data)) {
      const demoRoadmap: RoadmapConfig = {
        id: "demo-roadmap",
        title: { en: "Demo Roadmap", ar: "خارطة الطريق التجريبية" },
        description: { en: "Migrated from existing setup", ar: "تم ترحيله من الإعداد الحالي" },
        category: { en: "General", ar: "عام" },
        isEnabled: true,
        phases: {
          en: data.en,
          ar: data.ar || []
        }
      };
      data = [demoRoadmap];
      await writeDataFile(data);
    }

    return NextResponse.json(data); // returns RoadmapConfig[]
  } catch (error) {
    // Don't return [] here: the next save would overwrite the unreadable file
    console.error("Failed to parse roadmaps file", error);
    return NextResponse.json({ error: "Roadmaps file is corrupt" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf-8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = roadmapListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid roadmap data format", issues: parsed.error.issues.slice(0, 10) },
      { status: 400 }
    );
  }

  try {
    await writeDataFile(parsed.data);
    return NextResponse.json({ success: true, message: "Roadmaps saved successfully" });
  } catch (error) {
    console.error("Failed to save roadmaps", error);
    return NextResponse.json({ error: "Failed to save roadmaps" }, { status: 500 });
  }
}
