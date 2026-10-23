"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RoadmapConfig } from "@/types";
// Removed defaultRoadmaps so the app starts empty

interface RoadmapContextType {
  roadmaps: RoadmapConfig[];
  isLoading: boolean;
  refreshRoadmaps: () => Promise<void>;
}

const RoadmapContext = createContext<RoadmapContextType | undefined>(undefined);

async function loadRoadmaps(): Promise<RoadmapConfig[]> {
  try {
    const res = await fetch(`/api/roadmaps`);
    if (res.ok) {
      const data = await res.json();
      return data || [];
    }
  } catch (error) {
    console.error("Failed to fetch roadmaps", error);
  }
  return [];
}

export function RoadmapProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [roadmaps, setRoadmaps] = useState<RoadmapConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRoadmaps = useCallback(async () => {
    setIsLoading(true);
    setRoadmaps(await loadRoadmaps());
    setIsLoading(false);
  }, []);

  // The API requires a session, so (re)load once the user is signed in.
  // The provider stays mounted across the login redirect, hence the status dependency.
  useEffect(() => {
    if (status === "loading") return;

    let active = true;
    const load = status === "authenticated" ? loadRoadmaps() : Promise.resolve([]);
    load.then((data) => {
      if (!active) return;
      setRoadmaps(data);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [status]);

  return (
    <RoadmapContext.Provider value={{ roadmaps, isLoading, refreshRoadmaps }}>
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
