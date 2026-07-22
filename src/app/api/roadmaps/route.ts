import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Phase, RoadmapConfig } from "@/types";

const DATA_FILE = path.join(process.cwd(), "src", "data", "custom-roadmap.json");

export async function GET() {
  try {
    const fileContents = await fs.readFile(DATA_FILE, "utf-8");
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
      // Save migrated data
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    }

    return NextResponse.json(data); // returns RoadmapConfig[]
  } catch (error) {
    // If file doesn't exist, return empty array so client can handle it
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json(); // should be RoadmapConfig[]
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid roadmap data format" }, { status: 400 });
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2), "utf-8");

    return NextResponse.json({ success: true, message: "Roadmaps saved successfully" });
  } catch (error) {
    console.error("Failed to save roadmaps", error);
    return NextResponse.json({ error: "Failed to save roadmaps" }, { status: 500 });
  }
}
