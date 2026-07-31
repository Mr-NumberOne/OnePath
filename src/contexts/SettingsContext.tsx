"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getStoredData, setStoredData } from "@/lib/storage";

type Language = "en" | "ar";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ar"); // Default to Arabic as requested earlier
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    getStoredData("roadmap-language").then(storedLang => {
      if (!active) return;
      setMounted(true);
      if (storedLang === "en" || storedLang === "ar") {
        setLanguageState(storedLang as Language);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    setStoredData("roadmap-language", language);
  }, [language, mounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
