"use client";

import React, { useState, useEffect } from "react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { Phase, RoadmapConfig } from "@/types";
import { generateId } from "@/lib/utils";
import { PhaseForm } from "@/components/admin/PhaseForm";
import Roadmap from "@/components/roadmap/Roadmap";
import { Button } from "@/components/ui/button";
import UserButton from "@/components/UserButton";
import { useSettings } from "@/contexts/SettingsContext";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportRoadmapToExcel } from "@/lib/xlsxParser";
import { saveRoadmaps } from "@/lib/roadmapApi";

export default function RoadmapEditor() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { roadmaps, refreshRoadmaps } = useRoadmaps();
  const { language } = useSettings();
  
  const [draftRoadmap, setDraftRoadmap] = useState<RoadmapConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [radarCatsInputEn, setRadarCatsInputEn] = useState("");
  const [radarCatsInputAr, setRadarCatsInputAr] = useState("");

  useEffect(() => {
    const existing = roadmaps.find((r) => r.id === id);
    if (existing) {
      setDraftRoadmap(existing);
      setRadarCatsInputEn(existing.radarCategories?.en?.join(" - ") || "");
      setRadarCatsInputAr(existing.radarCategories?.ar?.join(" - ") || "");
    }
  }, [roadmaps, id]);

  if (!draftRoadmap) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  const handleUpdateMeta = (field: "title" | "description" | "category", value: string) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: { ...prev[field], [language]: value }
      };
    });
  };

  const handleUpdateRadarCategories = (value: string) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const currentEn = prev.radarCategories?.en || [];
      const currentAr = prev.radarCategories?.ar || [];
      const newArray = value.split("-").map(s => s.trim()).filter(s => s !== "");
      
      return {
        ...prev,
        radarCategories: {
          en: language === "en" ? newArray : currentEn,
          ar: language === "ar" ? newArray : currentAr,
        }
      };
    });
  };

  const handleAddPhase = () => {
    const newId = generateId("phase");
    const newPhase: Phase = {
      id: newId,
      title: "New Custom Phase",
      description: "",
      category: "Custom",
      prerequisites: [],
      estimatedHours: 10,
      objectives: [],
      milestones: [],
      order: (draftRoadmap.phases[language as "en" | "ar"] || []).length + 1,
    };
    
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const lang = language as "en" | "ar";
      return {
        ...prev,
        phases: {
          ...prev.phases,
          [lang]: [...(prev.phases[lang] || []), newPhase]
        }
      };
    });
  };

  const handleUpdatePhase = (updatedPhase: Phase) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const lang = language as "en" | "ar";
      return {
        ...prev,
        phases: {
          ...prev.phases,
          [lang]: prev.phases[lang].map((p) => (p.id === updatedPhase.id ? updatedPhase : p))
        }
      };
    });
  };

  const handleDeletePhase = (phaseId: string) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const lang = language as "en" | "ar";
      const filtered = prev.phases[lang].filter((p) => p.id !== phaseId);
      const cleaned = filtered.map((p) => ({
        ...p,
        prerequisites: p.prerequisites.filter((prereqId) => prereqId !== phaseId)
      }));

      return {
        ...prev,
        phases: {
          ...prev.phases,
          [lang]: cleaned
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedRoadmaps = roadmaps.map((r) => r.id === draftRoadmap.id ? draftRoadmap : r);
      
      await saveRoadmaps(updatedRoadmaps);
      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم حفظ الخارطة بنجاح!" : "Roadmap saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "حدث خطأ أثناء الحفظ." : "Error saving roadmap.");
    } finally {
      setIsSaving(false);
    }
  };

  const lang = language as "en" | "ar";
  const currentPhases = draftRoadmap.phases[lang] || [];

  return (
    <main className="flex h-screen flex-col bg-background font-sans">
      {/* Header */}
      <header className="flex-none h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/builder">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img src={language === "ar" ? "/ar_logo.png" : "/logo.png"} alt="OnePath Logo" className="h-8 w-auto object-contain" />
            <h1 className="text-xl font-bold">{language === "ar" ? "مُنشئ خارطة الطريق" : "Roadmap Builder"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => exportRoadmapToExcel(draftRoadmap, language as "en"|"ar")} disabled={isSaving}>
            <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === "ar" ? "تصدير" : "Export"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {isSaving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ خارطة الطريق" : "Save Roadmap")}
          </Button>
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Form Editor */}
        <div className="w-[40%] min-w-[400px] border-r rtl:border-r-0 rtl:border-l overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col gap-8">
          
          {/* Meta Info */}
          <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
            <h2 className="font-bold text-lg border-b pb-2">{language === "ar" ? "معلومات الخارطة الأساسية" : "Roadmap Settings"}</h2>
            <div className="space-y-2">
              <Label>{language === "ar" ? "العنوان" : "Title"}</Label>
              <Input value={draftRoadmap.title[lang]} onChange={(e) => handleUpdateMeta("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "التصنيف" : "Category"}</Label>
              <Input value={draftRoadmap.category[lang]} onChange={(e) => handleUpdateMeta("category", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea value={draftRoadmap.description[lang]} onChange={(e) => handleUpdateMeta("description", e.target.value)} />
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label>{language === "ar" ? "فئات المهارات (مفصولة بشرطة)" : "Radar Skill Categories (hyphen separated)"}</Label>
              <Input 
                value={language === "ar" ? radarCatsInputAr : radarCatsInputEn} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (language === "ar") setRadarCatsInputAr(val);
                  else setRadarCatsInputEn(val);
                  handleUpdateRadarCategories(val);
                }} 
                placeholder={language === "ar" ? "تقنية - أعمال - إدارة مشاريع..." : "Tech - Business - Project Management..."}
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "سيتم استخدام هذه الفئات في مخطط رادار المهارات الخاص بهذه الخارطة." 
                  : "These categories will be used in the Skill Radar chart for this roadmap."}
              </p>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">
                {language === "ar" ? "المراحل" : "Phases"} ({currentPhases.length})
              </h2>
              <Button onClick={handleAddPhase} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "إضافة مرحلة" : "Add Phase"}
              </Button>
            </div>
            
            <div className="flex flex-col gap-4">
              {currentPhases.sort((a,b) => a.order - b.order).map((phase) => (
                <PhaseForm 
                  key={phase.id} 
                  phase={phase} 
                  allPhases={currentPhases} 
                  availableCategories={draftRoadmap.radarCategories?.[lang] || []}
                  onChange={handleUpdatePhase}
                  onDelete={handleDeletePhase}
                />
              ))}
              {currentPhases.length === 0 && (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                  {language === "ar" ? "لا توجد مراحل بعد. انقر على 'إضافة مرحلة' للبدء." : 'No phases yet. Click "Add Phase" to begin building your roadmap.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-background/80 backdrop-blur-sm border px-3 py-1.5 rounded-md text-sm shadow-sm font-medium text-muted-foreground">
              {language === "ar" ? "معاينة حية" : "Live Preview"}
            </div>
          </div>
          <div className="flex-1 relative">
            <Roadmap roadmapId={draftRoadmap.id} previewPhases={currentPhases} />
          </div>
        </div>
      </div>
    </main>
  );
}
