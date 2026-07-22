"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { RoadmapProvider } from "@/contexts/RoadmapContext";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <SettingsProvider>
          <RoadmapProvider>
            <ProgressProvider>
              {children}
            </ProgressProvider>
          </RoadmapProvider>
        </SettingsProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}

