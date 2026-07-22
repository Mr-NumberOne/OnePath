"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProgressMap, RoadmapProgress } from "@/types";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { useSettings } from "@/contexts/SettingsContext";

const defaultProgress: RoadmapProgress = {
  completedPhases: [],
  completedSteps: [],
  completedResources: [],
  completedProjects: [],
  completedInterviewQuestions: [],
  achievements: [],
  portfolioScore: 0,
  studyHours: 0,
};

interface ProgressContextType {
  progressMap: UserProgressMap;
  getGlobalProgress: () => RoadmapProgress;
  getRoadmapProgress: (roadmapId: string) => RoadmapProgress;
  togglePhaseCompletion: (roadmapId: string, phaseId: string) => void;
  toggleStepCompletion: (roadmapId: string, phaseId: string, stepId: string) => void;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progressMap, setProgressMap] = useState<UserProgressMap>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { roadmaps } = useRoadmaps();
  const { language } = useSettings();

  useEffect(() => {
    const saved = localStorage.getItem("erp-roadmap-progress-v2");
    if (saved) {
      try {
        setProgressMap(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Migrate from old format
      const legacy = localStorage.getItem("erp-roadmap-progress");
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed.completedPhases) {
            setProgressMap({ "demo-roadmap": parsed });
          }
        } catch(e) {}
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("erp-roadmap-progress-v2", JSON.stringify(progressMap));
    }
  }, [progressMap, isLoaded]);

  const getRoadmapProgress = (roadmapId: string): RoadmapProgress => {
    return progressMap[roadmapId] || defaultProgress;
  };

  const getGlobalProgress = (): RoadmapProgress => {
    const global: RoadmapProgress = { ...defaultProgress };
    // Clone arrays to prevent mutation
    global.completedPhases = [];
    global.completedSteps = [];
    global.completedResources = [];
    global.completedProjects = [];
    global.completedInterviewQuestions = [];
    global.achievements = [];
    Object.entries(progressMap).forEach(([roadmapId, p]) => {
      // Only include progress for roadmaps that actually still exist
      if (!roadmaps.some((r) => r.id === roadmapId)) return;

      global.completedPhases.push(...p.completedPhases);
      global.completedSteps.push(...p.completedSteps);
      global.completedResources.push(...p.completedResources);
      global.completedProjects.push(...p.completedProjects);
      global.completedInterviewQuestions.push(...p.completedInterviewQuestions);
      global.achievements.push(...p.achievements);
      global.portfolioScore += p.portfolioScore;
      global.studyHours += p.studyHours;
    });
    return global;
  };

  const togglePhaseCompletion = (roadmapId: string, phaseId: string) => {
    setProgressMap((prevMap) => {
      const prev = prevMap[roadmapId] || defaultProgress;
      const isCompleted = prev.completedPhases.includes(phaseId);
      const phases = roadmaps.find(r => r.id === roadmapId)?.phases[language as "en"|"ar"] || [];
      
      if (isCompleted) {
        const hasCompletedDependent = phases.some(
          (p) => prev.completedPhases.includes(p.id) && p.prerequisites.includes(phaseId)
        );
        if (hasCompletedDependent) return prevMap;
      }

      const newPhases = isCompleted
        ? prev.completedPhases.filter((id) => id !== phaseId)
        : [...prev.completedPhases, phaseId];
      
      const newStudyHours = newPhases.reduce((acc, pId) => {
        const p = phases.find(ph => ph.id === pId);
        return acc + (p?.estimatedHours || 0);
      }, 0);
      
      return {
        ...prevMap,
        [roadmapId]: {
          ...prev,
          completedPhases: newPhases,
          portfolioScore: newPhases.length * 100,
          studyHours: newStudyHours,
        }
      };
    });
  };

  const toggleStepCompletion = (roadmapId: string, phaseId: string, stepId: string) => {
    setProgressMap((prevMap) => {
      const prev = prevMap[roadmapId] || defaultProgress;
      const prevSteps = prev.completedSteps || [];
      const isStepCompleted = prevSteps.includes(stepId);
      
      let newSteps = isStepCompleted
        ? prevSteps.filter((id) => id !== stepId)
        : [...prevSteps, stepId];

      const phases = roadmaps.find(r => r.id === roadmapId)?.phases[language as "en"|"ar"] || [];
      const phase = phases.find((p) => p.id === phaseId);
      if (!phase) return prevMap;

      let newPhases = [...prev.completedPhases];
      const isPhaseCompleted = prev.completedPhases.includes(phaseId);

      const phaseStepIds = phase.steps?.map((s) => s.id) || [];
      const allStepsCompleted = phaseStepIds.length > 0 && phaseStepIds.every((id) => newSteps.includes(id));

      if (allStepsCompleted && !isPhaseCompleted) {
        newPhases.push(phaseId);
      } else if (!allStepsCompleted && isPhaseCompleted) {
        const hasCompletedDependent = phases.some(
          (p) => prev.completedPhases.includes(p.id) && p.prerequisites.includes(phaseId)
        );
        if (hasCompletedDependent) return prevMap;
        newPhases = newPhases.filter((id) => id !== phaseId);
      }

      const newStudyHours = newPhases.reduce((acc, pId) => {
        const p = phases.find(ph => ph.id === pId);
        return acc + (p?.estimatedHours || 0);
      }, 0);

      return {
        ...prevMap,
        [roadmapId]: {
          ...prev,
          completedSteps: newSteps,
          completedPhases: newPhases,
          portfolioScore: newPhases.length * 100,
          studyHours: newStudyHours,
        }
      };
    });
  };

  const resetProgress = () => setProgressMap({});

  return (
    <ProgressContext.Provider value={{ progressMap, getGlobalProgress, getRoadmapProgress, togglePhaseCompletion, toggleStepCompletion, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}
