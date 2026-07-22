import React from "react";
import { Phase } from "@/types";
import { useProgress } from "@/contexts/ProgressContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PhaseDetailPanelProps {
  phase: Phase | null;
  isOpen: boolean;
  onClose: () => void;
  roadmapId?: string;
}

export function PhaseDetailPanel({ phase, isOpen, onClose, roadmapId }: PhaseDetailPanelProps) {
  const { getRoadmapProgress, toggleStepCompletion, togglePhaseCompletion } = useProgress();
  const { roadmaps } = useRoadmaps();
  const { language } = useSettings();
  const phases = roadmaps.flatMap(r => r.phases[language as "en" | "ar"] || []);
  const [dependentError, setDependentError] = useState(false);

  if (!phase) return null;

  const progress = roadmapId ? getRoadmapProgress(roadmapId) : { completedPhases: [] as string[], completedSteps: [] as string[] };

  const isCompleted = progress.completedPhases.includes(phase.id);
  const completedSteps = progress.completedSteps || [];

  const handleToggleStep = (stepId: string) => {
    setDependentError(false); // Reset error
    const isStepDone = completedSteps.includes(stepId);

    if (isStepDone && isCompleted) {
      // If we are unchecking a step of a completed phase, check dependencies
      const hasCompletedDependent = phases.some(
        (p) => progress.completedPhases.includes(p.id) && p.prerequisites.includes(phase.id)
      );

      if (hasCompletedDependent) {
        setDependentError(true);
        return; // Prevent toggling
      }
    }

    if (roadmapId) {
      toggleStepCompletion(roadmapId, phase.id, stepId);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (!open) setDependentError(false);
      onClose();
    }}>
      <SheetContent className="w-full sm:w-[60%] sm:max-w-none overflow-y-auto px-6 py-8" side={language === "ar" ? "left" : "right"}>
        <SheetHeader className="mb-10 text-start mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              {phase.category}
            </span>
            {isCompleted && (
              <span className="text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-3 py-1 rounded-full shadow-sm">
                COMPLETED
              </span>
            )}
          </div>
          <SheetTitle className="text-3xl mt-5 font-extrabold tracking-tight text-start">{phase.title}</SheetTitle>
          <SheetDescription className="text-lg mt-3 text-foreground/80 leading-relaxed text-start">
            {phase.description}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-12 pb-20">
          {dependentError && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-start gap-3 animate-in slide-in-from-top-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                {language === "ar"
                  ? "لا يمكنك إلغاء تحديد هذه الخطوة لأن هناك مراحل متقدمة تعتمد على هذه المرحلة وقد تم إنجازها بالفعل. يرجى إلغاء تحديد المراحل اللاحقة أولاً!"
                  : "You can't uncheck this step right now because you've already completed advanced phases that depend on this one. Please unmark those future phases first!"}
              </p>
            </div>
          )}

          {/* Steps Section */}
          {phase.steps && phase.steps.length > 0 && (
            <div className="px-1">
              <h3 className="text-xl font-bold mb-5 border-b pb-3">
                {language === "ar" ? "خطوات المرحلة" : "Phase Steps"}
              </h3>
              <div className="space-y-4">
                {[...phase.steps].sort((a, b) => a.order - b.order).map((step) => {
                  const isStepDone = completedSteps.includes(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`p-5 border rounded-2xl transition-all duration-300 ${isStepDone ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-card hover:border-primary/30 hover:shadow-md'}`}
                      onClick={() => handleToggleStep(step.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleStep(step.id) }}
                    >
                      <div className="flex items-start gap-5 cursor-pointer">
                        <div className="mt-1 flex-shrink-0">
                          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${isStepDone ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-transparent'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg font-bold transition-all ${isStepDone ? 'text-muted-foreground line-through decoration-primary/30' : 'text-foreground'}`}>
                            {step.title}
                          </h4>
                          {step.description && (
                            <p className={`text-sm mt-2 leading-relaxed transition-all ${isStepDone ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                              {step.description}
                            </p>
                          )}
                          {step.resources && step.resources.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {step.resources.map((res) => (
                                <a
                                  key={res.id}
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {res.title || "Link"}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!phase.steps || phase.steps.length === 0) && (
            <div className="mb-10 px-1">
              <button
                onClick={() => {
                  if (roadmapId) {
                    togglePhaseCompletion(roadmapId, phase.id);
                  }
                }}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all font-bold text-lg ${isCompleted
                  ? 'bg-green-500/10 border-green-500 text-green-600 dark:text-green-500 hover:bg-green-500/20'
                  : 'bg-primary border-primary text-primary-foreground hover:opacity-90'
                  }`}
              >
                {isCompleted ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {language === "ar" ? "تم الإنجاز (انقر للتراجع)" : "Completed (Click to Undo)"}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
                    {language === "ar" ? "تحديد المرحلة كمكتملة" : "Mark Phase as Completed"}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Objectives Section */}
          {phase.objectives && phase.objectives.length > 0 && (
            <div className="bg-muted/30 rounded-2xl p-6 border border-muted mx-1">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-3 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                <span className="text-foreground">{language === "ar" ? "الأهداف الرئيسية" : "Key Objectives"}</span>
              </h3>
              <ul className="space-y-4">
                {phase.objectives.filter(obj => obj.trim() !== "").map((obj, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-foreground/80 leading-relaxed font-medium">
                    <span className="mt-2 w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Phase Resources Section */}
          {phase.resources && phase.resources.length > 0 && (
            <div className="bg-muted/30 rounded-2xl p-6 border border-muted mx-1 mt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-primary">
                <ExternalLink className="w-5 h-5" />
                <span className="text-foreground">{language === "ar" ? "الموارد والمراجع" : "Resources"}</span>
              </h3>
              <div className="flex flex-col gap-3">
                {phase.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors group"
                  >
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">{res.title || res.url}</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
