// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "./xlsxParser";
import { roadmapListSchema } from "./roadmapSchema";

type Rows = (string | number)[][];

function workbookFile(sheets: Record<string, Rows>): File {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([data], "roadmap.xlsx");
}

const META: Rows = [
  ["Language", "Title", "Description", "Category", "RadarCategories (hyphen separated)"],
  ["en", "ERP Consultant", "Master ERP.", "General", "Tech - Business"],
  ["ar", "مستشار ERP", "احتراف ERP.", "عام", "تقنية - أعمال"],
];
const PHASES: Rows = [
  ["Language", "PhaseID", "Title", "Description", "Category", "EstimatedHours", "Order", "Prerequisites (comma separated)", "Objectives (comma separated)", "Milestones (comma separated)"],
  ["en", "phase-1", "Fundamentals", "Basics.", "Tech", 10, 1, "", "Understand basics", "Pass quiz"],
  ["en", "phase-2", "Advanced", "Deep dive.", "Tech", 20, 2, "phase-1", "A, B", "Project"],
  ["ar", "phase-1", "الأساسيات", "مفاهيم.", "تقنية", 10, 1, "", "فهم", "اختبار"],
];
const STEPS: Rows = [
  ["Language", "PhaseID", "StepID", "Title", "Description", "Order"],
  ["en", "phase-1", "step-1-1", "Install", "Install it.", 1],
];
const RESOURCES: Rows = [
  ["Language", "PhaseID", "StepID (optional)", "ResourceID", "Title", "URL"],
  ["en", "phase-1", "", "res-1", "Guide", "https://example.com/guide"],
  ["en", "phase-1", "step-1-1", "res-2", "Video", "https://example.com/video"],
];

describe("parseExcelFile", () => {
  it("parses the template into a roadmap the API accepts", async () => {
    const roadmap = await parseExcelFile(workbookFile({ "Roadmap Meta": META, Phases: PHASES, Steps: STEPS, Resources: RESOURCES }));

    expect(roadmap.title).toEqual({ en: "ERP Consultant", ar: "مستشار ERP" });
    expect(roadmap.radarCategories).toEqual({ en: ["Tech", "Business"], ar: ["تقنية", "أعمال"] });
    expect(roadmap.isEnabled).toBe(false);
    expect(roadmap.phases.en.map((p) => p.id)).toEqual(["phase-1", "phase-2"]);
    expect(roadmap.phases.ar.map((p) => p.id)).toEqual(["phase-1"]);

    const [phase1, phase2] = roadmap.phases.en;
    expect(phase2).toMatchObject({ prerequisites: ["phase-1"], objectives: ["A", "B"], estimatedHours: 20 });
    expect(phase1.resources).toEqual([{ id: "res-1", title: "Guide", url: "https://example.com/guide" }]);
    expect(phase1.steps?.[0]).toMatchObject({ id: "step-1-1", resources: [{ id: "res-2", title: "Video", url: "https://example.com/video" }] });

    expect(roadmapListSchema.safeParse([roadmap]).success).toBe(true);
  });

  it("turns numeric IDs into strings", async () => {
    const phases: Rows = [PHASES[0], ["en", 1, "Numeric", "", "Tech", 5, 1, "", "", ""]];
    const roadmap = await parseExcelFile(workbookFile({ "Roadmap Meta": META, Phases: phases }));
    expect(roadmap.phases.en[0].id).toBe("1");
  });

  it("generates unique IDs for rows without one", async () => {
    const steps: Rows = [STEPS[0], ["en", "phase-1", "", "A", "", 1], ["en", "phase-1", "", "B", "", 2]];
    const roadmap = await parseExcelFile(workbookFile({ "Roadmap Meta": META, Phases: PHASES, Steps: steps }));
    const ids = roadmap.phases.en[0].steps?.map((s) => s.id) ?? [];
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toMatch(/^step-/);
  });

  it("rejects a workbook without the meta sheet", async () => {
    await expect(parseExcelFile(workbookFile({ Phases: PHASES }))).rejects.toThrow("Roadmap Meta");
  });
});
