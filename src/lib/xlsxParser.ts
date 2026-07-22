import * as XLSX from 'xlsx';
import { RoadmapConfig, Phase, PhaseStep, ResourceLink } from '@/types';

// Helper to generate a dummy ID if none provided
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const downloadExcelTemplate = (language: "en" | "ar") => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Roadmap Meta
  const metaData = [
    ["Language", "Title", "Description", "Category", "RadarCategories (hyphen separated)"],
    ["en", "ERP Consultant", "Master ERP implementations.", "General", "Tech - Business - Project Management"],
    ["ar", "مستشار ERP", "احتراف تنفيذ أنظمة ERP.", "عام", "تقنية - أعمال - إدارة مشاريع"]
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Roadmap Meta");

  // Sheet 2: Phases
  const phasesData = [
    ["Language", "PhaseID", "Title", "Description", "Category", "EstimatedHours", "Order", "Prerequisites (comma separated)", "Objectives (comma separated)", "Milestones (comma separated)"],
    ["en", "phase-1", "Fundamentals", "Basic concepts.", "Tech", 10, 1, "", "Understand basics", "Pass quiz"],
    ["en", "phase-2", "Advanced Topics", "Deep dive into ERP.", "Tech", 20, 2, "phase-1", "Master advanced concepts", "Complete project"],
    ["ar", "phase-1", "الأساسيات", "المفاهيم الأساسية.", "تقنية", 10, 1, "", "فهم الأساسيات", "اجتياز الاختبار"],
    ["ar", "phase-2", "مواضيع متقدمة", "تعمق في أنظمة ERP.", "تقنية", 20, 2, "phase-1", "إتقان المفاهيم المتقدمة", "إنجاز المشروع"]
  ];
  const wsPhases = XLSX.utils.aoa_to_sheet(phasesData);
  XLSX.utils.book_append_sheet(wb, wsPhases, "Phases");

  // Sheet 3: Steps
  const stepsData = [
    ["Language", "PhaseID", "StepID", "Title", "Description", "Order"],
    ["en", "phase-1", "step-1-1", "Install ERP Software", "Download and install the ERP system locally.", 1],
    ["en", "phase-1", "step-1-2", "Navigate the Interface", "Learn the main navigation and menus.", 2],
    ["ar", "phase-1", "step-1-1", "تثبيت نظام ERP", "تحميل وتثبيت نظام ERP محلياً.", 1],
    ["ar", "phase-1", "step-1-2", "التنقل في الواجهة", "تعلم التنقل الرئيسي والقوائم.", 2]
  ];
  const wsSteps = XLSX.utils.aoa_to_sheet(stepsData);
  XLSX.utils.book_append_sheet(wb, wsSteps, "Steps");

  // Sheet 4: Resources
  const resourcesData = [
    ["Language", "PhaseID", "StepID (optional)", "ResourceID", "Title", "URL"],
    ["en", "phase-1", "", "res-1", "ERP Overview Guide", "https://example.com/erp-guide"],
    ["en", "phase-1", "step-1-1", "res-2", "Installation Walkthrough", "https://example.com/install-video"],
    ["ar", "phase-1", "", "res-1", "دليل نظرة عامة على ERP", "https://example.com/erp-guide-ar"],
    ["ar", "phase-1", "step-1-1", "res-2", "شرح التثبيت", "https://example.com/install-video-ar"]
  ];
  const wsResources = XLSX.utils.aoa_to_sheet(resourcesData);
  XLSX.utils.book_append_sheet(wb, wsResources, "Resources");

  // Save the file
  const filename = language === "ar" ? "قالب_خارطة_طريق.xlsx" : "Roadmap_Template.xlsx";
  XLSX.writeFile(wb, filename);
};

export const parseExcelFile = async (file: File): Promise<RoadmapConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });

        // 1. Parse Meta
        const wsMeta = wb.Sheets["Roadmap Meta"];
        if (!wsMeta) throw new Error("Missing 'Roadmap Meta' sheet");
        
        const metaRows = XLSX.utils.sheet_to_json(wsMeta) as any[];
        
        const enMeta = metaRows.find(r => r.Language === "en") || {};
        const arMeta = metaRows.find(r => r.Language === "ar") || {};

        const config: RoadmapConfig = {
          id: generateId('rm'),
          title: { 
            en: enMeta.Title || "Untitled", 
            ar: arMeta.Title || "بدون عنوان" 
          },
          description: { 
            en: enMeta.Description || "", 
            ar: arMeta.Description || "" 
          },
          category: { 
            en: enMeta.Category || "General", 
            ar: arMeta.Category || "عام" 
          },
          isEnabled: false,
          radarCategories: {
            en: (enMeta['RadarCategories (hyphen separated)'] || "").split("-").map((s: string) => s.trim()).filter(Boolean),
            ar: (arMeta['RadarCategories (hyphen separated)'] || "").split("-").map((s: string) => s.trim()).filter(Boolean)
          },
          phases: { en: [], ar: [] }
        };

        // 2. Parse Steps (indexed by language + phaseId for fast lookup)
        const stepsByLangPhase: Record<string, PhaseStep[]> = {};
        const wsSteps = wb.Sheets["Steps"];
        if (wsSteps) {
          const stepRows = XLSX.utils.sheet_to_json(wsSteps) as any[];
          for (const row of stepRows) {
            const lang = row.Language || "en";
            const phaseId = row.PhaseID || "";
            const key = `${lang}::${phaseId}`;
            const step: PhaseStep = {
              id: row.StepID || generateId('step'),
              title: row.Title || "Untitled Step",
              description: row.Description || "",
              order: Number(row.Order) || 1,
              resources: []
            };
            if (!stepsByLangPhase[key]) stepsByLangPhase[key] = [];
            stepsByLangPhase[key].push(step);
          }
        }

        // 3. Parse Resources (can attach to a phase or a specific step within a phase)
        const phaseResourcesByLangPhase: Record<string, ResourceLink[]> = {};
        const stepResourcesByLangStep: Record<string, ResourceLink[]> = {};
        const wsResources = wb.Sheets["Resources"];
        if (wsResources) {
          const resourceRows = XLSX.utils.sheet_to_json(wsResources) as any[];
          for (const row of resourceRows) {
            const lang = row.Language || "en";
            const phaseId = row.PhaseID || "";
            const stepId = (row['StepID (optional)'] || "").toString().trim();
            const resource: ResourceLink = {
              id: row.ResourceID || generateId('res'),
              title: row.Title || "Untitled Resource",
              url: row.URL || ""
            };
            if (stepId) {
              // Attach to a specific step
              const stepKey = `${lang}::${stepId}`;
              if (!stepResourcesByLangStep[stepKey]) stepResourcesByLangStep[stepKey] = [];
              stepResourcesByLangStep[stepKey].push(resource);
            } else {
              // Attach to the phase itself
              const phaseKey = `${lang}::${phaseId}`;
              if (!phaseResourcesByLangPhase[phaseKey]) phaseResourcesByLangPhase[phaseKey] = [];
              phaseResourcesByLangPhase[phaseKey].push(resource);
            }
          }
        }

        // 4. Parse Phases and attach steps + resources
        const wsPhases = wb.Sheets["Phases"];
        if (wsPhases) {
          const phaseRows = XLSX.utils.sheet_to_json(wsPhases) as any[];
          
          const processPhaseRow = (row: any, lang: string): Phase => {
            const phaseId = row.PhaseID || generateId('phase');
            const key = `${lang}::${phaseId}`;

            // Get steps for this phase and attach step-level resources
            const steps = (stepsByLangPhase[key] || []).map(step => ({
              ...step,
              resources: [
                ...(step.resources || []),
                ...(stepResourcesByLangStep[`${lang}::${step.id}`] || [])
              ]
            }));

            return {
              id: phaseId,
              title: row.Title || "Untitled Phase",
              description: row.Description || "",
              category: row.Category || "General",
              estimatedHours: Number(row.EstimatedHours) || 0,
              order: Number(row.Order) || 1,
              prerequisites: (row['Prerequisites (comma separated)'] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
              objectives: (row['Objectives (comma separated)'] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
              milestones: (row['Milestones (comma separated)'] || "").split(",").map((s: string) => s.trim()).filter(Boolean),
              steps,
              resources: phaseResourcesByLangPhase[key] || []
            };
          };

          config.phases.en = phaseRows.filter(r => r.Language === "en").map(r => processPhaseRow(r, "en"));
          config.phases.ar = phaseRows.filter(r => r.Language === "ar").map(r => processPhaseRow(r, "ar"));
        }

        resolve(config);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportRoadmapToExcel = (roadmap: RoadmapConfig, language: "en" | "ar" = "en") => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Roadmap Meta
  const metaData = [
    ["Language", "Title", "Description", "Category", "RadarCategories (hyphen separated)"],
    ["en", roadmap.title.en, roadmap.description.en, roadmap.category.en, (roadmap.radarCategories?.en || []).join(" - ")],
    ["ar", roadmap.title.ar, roadmap.description.ar, roadmap.category.ar, (roadmap.radarCategories?.ar || []).join(" - ")]
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Roadmap Meta");

  // Sheet 2: Phases
  const phasesData = [
    ["Language", "PhaseID", "Title", "Description", "Category", "EstimatedHours", "Order", "Prerequisites (comma separated)", "Objectives (comma separated)", "Milestones (comma separated)"]
  ];
  
  const addPhases = (lang: "en" | "ar", phases: Phase[]) => {
    phases.forEach(p => {
      phasesData.push([
        lang, p.id, p.title, p.description, p.category, p.estimatedHours?.toString() || "0", p.order?.toString() || "1",
        (p.prerequisites || []).join(", "), (p.objectives || []).join(", "), (p.milestones || []).join(", ")
      ]);
    });
  };
  addPhases("en", roadmap.phases.en || []);
  addPhases("ar", roadmap.phases.ar || []);
  
  const wsPhases = XLSX.utils.aoa_to_sheet(phasesData);
  XLSX.utils.book_append_sheet(wb, wsPhases, "Phases");

  // Sheet 3: Steps
  const stepsData = [
    ["Language", "PhaseID", "StepID", "Title", "Description", "Order"]
  ];
  const addSteps = (lang: "en" | "ar", phases: Phase[]) => {
    phases.forEach(p => {
      if (p.steps) {
        p.steps.forEach(s => {
          stepsData.push([lang, p.id, s.id, s.title, s.description, s.order?.toString() || "1"]);
        });
      }
    });
  };
  addSteps("en", roadmap.phases.en || []);
  addSteps("ar", roadmap.phases.ar || []);

  const wsSteps = XLSX.utils.aoa_to_sheet(stepsData);
  XLSX.utils.book_append_sheet(wb, wsSteps, "Steps");

  // Sheet 4: Resources
  const resourcesData = [
    ["Language", "PhaseID", "StepID (optional)", "ResourceID", "Title", "URL"]
  ];
  const addResources = (lang: "en" | "ar", phases: Phase[]) => {
    phases.forEach(p => {
      if (p.resources) {
        p.resources.forEach(r => {
          resourcesData.push([lang, p.id, "", r.id, r.title, r.url]);
        });
      }
      if (p.steps) {
        p.steps.forEach(s => {
          if (s.resources) {
            s.resources.forEach(r => {
              resourcesData.push([lang, p.id, s.id, r.id, r.title, r.url]);
            });
          }
        });
      }
    });
  };
  addResources("en", roadmap.phases.en || []);
  addResources("ar", roadmap.phases.ar || []);

  const wsResources = XLSX.utils.aoa_to_sheet(resourcesData);
  XLSX.utils.book_append_sheet(wb, wsResources, "Resources");

  // Save the file
  const title = roadmap.title[language] || "roadmap";
  // Replace only invalid OS characters (\ / : * ? " < > |) with an underscore
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${safeTitle}.xlsx`;
  XLSX.writeFile(wb, filename);
};

