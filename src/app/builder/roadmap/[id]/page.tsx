"use client";

import React, { useEffect, useState } from "react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { Phase, RoadmapConfig } from "@/types";
import { generateId } from "@/lib/utils";
import { Language, otherLanguage, removePhase, syncPhaseAdd, syncPhaseUpdate } from "@/lib/roadmapSync";
import { PhaseForm } from "@/components/admin/PhaseForm";
import Roadmap from "@/components/roadmap/Roadmap";
import { Button } from "@/components/ui/button";
import UserButton from "@/components/UserButton";
import { useSettings } from "@/contexts/SettingsContext";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Download, Undo2, Redo2, History } from "lucide-react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exportRoadmapToExcel } from "@/lib/xlsxParser";
import { saveRoadmaps } from "@/lib/roadmapApi";
import { useHistoryState } from "@/hooks/useHistoryState";
import { BuilderDraft, clearDraft, isSameRoadmap, loadDraft, saveDraft } from "@/lib/builderDraft";

const parseRadarCategories = (value: string) => value.split("-").map((s) => s.trim()).filter((s) => s !== "");

export default function RoadmapEditor() {
  const params = useParams();
  const id = params.id as string;
  const { roadmaps, refreshRoadmaps } = useRoadmaps();
  const { language } = useSettings();
  
  // The draft being edited, with undo/redo
  const history = useHistoryState<RoadmapConfig | null>(null);
  const draftRoadmap = history.value;
  const setDraftRoadmap = history.set;
  const { undo, redo } = history;

  const [isSaving, setIsSaving] = useState(false);
  // What the user typed in the radar box, kept so "Tech - " can be typed
  const [radarCatsInputEn, setRadarCatsInputEn] = useState("");
  const [radarCatsInputAr, setRadarCatsInputAr] = useState("");

  // Unsaved edits from an earlier visit, offered back once
  const [pendingDraft, setPendingDraft] = useState<BuilderDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);

  // Start a fresh draft whenever the stored roadmap changes (first load, after a save).
  // Done during render, as React recommends, rather than in an effect.
  const existing = roadmaps.find((r) => r.id === id);
  const [loadedFrom, setLoadedFrom] = useState<RoadmapConfig | null>(null);
  if (existing && existing !== loadedFrom) {
    setLoadedFrom(existing);
    // After a save the stored roadmap equals the draft; keep the undo history then
    if (!draftRoadmap || !isSameRoadmap(existing, draftRoadmap)) {
      history.reset(existing);
    }
  }

  // Look for unsaved edits from a previous visit
  useEffect(() => {
    if (!existing || draftChecked) return;
    let active = true;
    loadDraft(id).then((draft) => {
      if (!active) return;
      if (draft && !isSameRoadmap(draft.roadmap, existing)) setPendingDraft(draft);
      setDraftChecked(true);
    });
    return () => { active = false; };
  }, [id, existing, draftChecked]);

  // Keep unsaved edits as a local draft. Paused while an older draft is
  // waiting for a decision, so it can't be overwritten.
  useEffect(() => {
    if (!draftChecked || pendingDraft || !draftRoadmap || !existing) return;
    const timer = setTimeout(() => {
      const write = isSameRoadmap(draftRoadmap, existing) ? clearDraft(id) : saveDraft(draftRoadmap);
      write.catch((e) => console.error("Failed to store builder draft", e));
    }, 500);
    return () => clearTimeout(timer);
  }, [id, draftRoadmap, existing, draftChecked, pendingDraft]);

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z to redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

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
      const newArray = parseRadarCategories(value);

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
    
    // Phases exist in both languages with the same ID; only the text differs
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const lang = language as Language;
      const other = otherLanguage(lang);
      return {
        ...prev,
        phases: {
          [lang]: [...(prev.phases[lang] || []), newPhase],
          [other]: syncPhaseAdd(prev.phases[other] || [], newPhase),
        } as RoadmapConfig["phases"]
      };
    });
  };

  const handleUpdatePhase = (updatedPhase: Phase) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      const lang = language as Language;
      const other = otherLanguage(lang);
      const previousPhase = prev.phases[lang].find((p) => p.id === updatedPhase.id);
      return {
        ...prev,
        phases: {
          [lang]: prev.phases[lang].map((p) => (p.id === updatedPhase.id ? updatedPhase : p)),
          [other]: previousPhase
            ? syncPhaseUpdate(prev.phases[other] || [], previousPhase, updatedPhase)
            : prev.phases[other] || [],
        } as RoadmapConfig["phases"]
      };
    });
  };

  const handleDeletePhase = (phaseId: string) => {
    setDraftRoadmap((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: {
          en: removePhase(prev.phases.en || [], phaseId),
          ar: removePhase(prev.phases.ar || [], phaseId),
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedRoadmaps = roadmaps.map((r) => r.id === draftRoadmap.id ? draftRoadmap : r);
      
      await saveRoadmaps(updatedRoadmaps);
      await clearDraft(draftRoadmap.id);
      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم حفظ الخارطة بنجاح!" : "Roadmap saved successfully!");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "حدث خطأ أثناء الحفظ." : "Error saving roadmap.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    // Undoable, in case the stored version was the one to keep
    setDraftRoadmap(() => pendingDraft.roadmap);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft(id).catch((e) => console.error("Failed to discard builder draft", e));
    setPendingDraft(null);
  };

  const lang = language as "en" | "ar";
  const currentPhases = draftRoadmap.phases[lang] || [];

  // Show what the user typed while it still matches the draft; after undo,
  // redo or a restore, show the draft's categories instead
  const draftRadarCategories = draftRoadmap.radarCategories?.[lang] || [];
  const typedRadar = lang === "ar" ? radarCatsInputAr : radarCatsInputEn;
  const radarInputValue = JSON.stringify(parseRadarCategories(typedRadar)) === JSON.stringify(draftRadarCategories)
    ? typedRadar
    : draftRadarCategories.join(" - ");

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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!history.canUndo}
              aria-label={language === "ar" ? "تراجع" : "Undo"}
              title={language === "ar" ? "تراجع (Ctrl+Z)" : "Undo (Ctrl+Z)"}
            >
              <Undo2 className="w-4 h-4 rtl:-scale-x-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!history.canRedo}
              aria-label={language === "ar" ? "إعادة" : "Redo"}
              title={language === "ar" ? "إعادة (Ctrl+Y)" : "Redo (Ctrl+Y)"}
            >
              <Redo2 className="w-4 h-4 rtl:-scale-x-100" />
            </Button>
          </div>
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

      {pendingDraft && (
        <div role="status" className="flex-none flex flex-wrap items-center gap-3 px-6 py-3 border-b bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <History className="w-4 h-4 shrink-0" />
          <p className="text-sm flex-1 min-w-[200px]">
            {language === "ar"
              ? `لديك تعديلات غير محفوظة على هذه الخارطة من ${new Date(pendingDraft.savedAt).toLocaleString("ar")}.`
              : `You have unsaved changes to this roadmap from ${new Date(pendingDraft.savedAt).toLocaleString("en")}.`}
          </p>
          <Button size="sm" onClick={handleRestoreDraft}>
            {language === "ar" ? "استعادة التعديلات" : "Restore changes"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
            {language === "ar" ? "تجاهل" : "Discard"}
          </Button>
        </div>
      )}

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
                value={radarInputValue}
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
              {[...currentPhases].sort((a,b) => a.order - b.order).map((phase) => (
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
