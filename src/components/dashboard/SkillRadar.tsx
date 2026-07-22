"use client";

import React from "react";
import { useProgress } from "@/contexts/ProgressContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function SkillRadar({ roadmapId }: { roadmapId?: string }) {
  const { getGlobalProgress, getRoadmapProgress } = useProgress();
  const progress = roadmapId && roadmapId !== "overall" ? getRoadmapProgress(roadmapId) : getGlobalProgress();
  const { language } = useSettings();
  const { roadmaps } = useRoadmaps();
  
  const relevantRoadmaps = roadmapId && roadmapId !== "overall" ? roadmaps.filter(r => r.id === roadmapId) : roadmaps;
  const phasesData = relevantRoadmaps.flatMap(r => r.phases[language as "en" | "ar"] || []);

  // Compute skill levels dynamically based on phase categories
  const computeSkillData = () => {
    const categoriesMap: Record<string, { total: number; completed: number }> = {};

    phasesData.forEach((phase) => {
      const cat = phase.category || (language === "ar" ? "عام" : "General");
      
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { total: 0, completed: 0 };
      }
      
      categoriesMap[cat].total += 1;
      if (progress.completedPhases.includes(phase.id)) {
        categoriesMap[cat].completed += 1;
      }
    });

    const dataPoints = Object.keys(categoriesMap).map((key) => {
      const { total, completed } = categoriesMap[key];
      // value from 0 to 100, default minimum 10 so the radar shape is visible
      const value = total > 0 ? (completed / total) * 100 : 10; 
      return {
        subject: key,
        A: value,
        fullMark: 100,
      };
    });

    // If no categories exist, provide a default empty radar so the chart doesn't break
    if (dataPoints.length === 0) {
      return [
        { subject: language === "ar" ? "المهارات" : "Skills", A: 10, fullMark: 100 },
        { subject: language === "ar" ? "التطور" : "Growth", A: 10, fullMark: 100 },
        { subject: language === "ar" ? "المعرفة" : "Knowledge", A: 10, fullMark: 100 }
      ];
    }

    return dataPoints;
  };

  const data = computeSkillData();

  return (
    <div className={`w-full h-full min-h-[150px] flex items-center justify-center`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
