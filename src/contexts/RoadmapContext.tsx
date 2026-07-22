"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { RoadmapConfig } from "@/types";
// Removed defaultRoadmaps so the app starts empty

interface RoadmapContextType {
  roadmaps: RoadmapConfig[];
  isLoading: boolean;
  refreshRoadmaps: () => Promise<void>;
}

const RoadmapContext = createContext<RoadmapContextType | undefined>(undefined);

export function RoadmapProvider({ children }: { children: React.ReactNode }) {
  const [roadmaps, setRoadmaps] = useState<RoadmapConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoadmaps = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/roadmaps`);
      if (res.ok) {
        const data = await res.json();
        setRoadmaps(data || []);
      } else {
        setRoadmaps([]);
      }
    } catch (error) {
      console.error("Failed to fetch roadmaps", error);
      setRoadmaps([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  return (
    <RoadmapContext.Provider value={{ roadmaps, isLoading, refreshRoadmaps: fetchRoadmaps }}>
      {children}
    </RoadmapContext.Provider>
  );
}

export function useRoadmaps() {
  const context = useContext(RoadmapContext);
  if (context === undefined) {
    throw new Error("useRoadmaps must be used within a RoadmapProvider");
  }
  return context;
}
