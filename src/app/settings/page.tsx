"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Moon, Sun, Monitor } from "lucide-react";
import Link from "next/link";
import UserButton from "@/components/UserButton";

export default function SettingsPage() {
  const { language, setLanguage } = useSettings();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="flex-none h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              {language === "ar" ? "الإعدادات" : "Settings"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        {/* Language Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {language === "ar" ? "اللغة" : "Language"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 ${language === "en" ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setLanguage("en")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">English</CardTitle>
                <CardDescription>
                  {language === "ar" ? "تغيير لغة التطبيق إلى الإنجليزية." : "Switch the application language to English."}
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 ${language === "ar" ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setLanguage("ar")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">العربية</CardTitle>
                <CardDescription>
                  {language === "ar" ? "تغيير لغة التطبيق إلى العربية." : "Switch the application language to Arabic."}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Theme Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary" />
            {language === "ar" ? "المظهر" : "Appearance"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 ${theme === "light" ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setTheme("light")}
            >
              <CardHeader className="pb-2">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
                  <Sun className="w-4 h-4 text-zinc-900" />
                </div>
                <CardTitle className="text-base">{language === "ar" ? "فاتح" : "Light"}</CardTitle>
              </CardHeader>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 ${theme === "dark" ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <CardHeader className="pb-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
                  <Moon className="w-4 h-4 text-zinc-100" />
                </div>
                <CardTitle className="text-base">{language === "ar" ? "داكن" : "Dark"}</CardTitle>
              </CardHeader>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:border-primary/50 ${theme === "system" ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setTheme("system")}
            >
              <CardHeader className="pb-2">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-2">
                  <Monitor className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <CardTitle className="text-base">{language === "ar" ? "النظام" : "System"}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
