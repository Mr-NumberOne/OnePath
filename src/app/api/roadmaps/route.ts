import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Phase, RoadmapConfig } from "@/types";
import { auth } from "@/auth";

const getDataFile = () => {
  if (process.env.ONEPATH_DATA_DIR) {
    return path.join(process.env.ONEPATH_DATA_DIR, "custom-roadmap.json");
  }
  return path.join(process.cwd(), "src", "data", "custom-roadmap.json");
};

export async function GET() {
  try {
    const dataFile = getDataFile();
    const fileContents = await fs.readFile(dataFile, "utf-8");
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
      // Save migrated data (atomic)
      const tmpFile = `${dataFile}.tmp`;
      await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tmpFile, dataFile);
    }

    return NextResponse.json(data); // returns RoadmapConfig[]
  } catch (error) {
    // If file doesn't exist, return empty array so client can handle it
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json(); // should be RoadmapConfig[]
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid roadmap data format" }, { status: 400 });
    }

    // Basic size limitation (500 items max to prevent abuse)
    if (body.length > 500) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const dataFile = getDataFile();
    const tmpFile = `${dataFile}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(body, null, 2), "utf-8");
    await fs.rename(tmpFile, dataFile);

    return NextResponse.json({ success: true, message: "Roadmaps saved successfully" });
  } catch (error) {
    console.error("Failed to save roadmaps", error);
    return NextResponse.json({ error: "Failed to save roadmaps" }, { status: 500 });
  }
}
