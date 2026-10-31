"use client";

import { useProgress } from "@/contexts/ProgressContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import UserButton from "@/components/UserButton";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

const dictionary = {
  en: {
    title: "Implementation Consultant Roadmap",
    subtitle: "Master the art of enterprise ERP implementation.",
    score: "Portfolio Score",
    progress: "Overall Progress",
    completed: "Phases Completed",
    hours: "Study Hours",
    trackedTime: "Tracked learning time",
    achievements: "Achievements",
    badges: "Badges earned",
    radar: "Skill Radar",
    curriculum: "Interactive Curriculum"
  },
  ar: {
    title: "خارطة طريق استشاري التنفيذ",
    subtitle: "احتراف فن تنفيذ أنظمة تخطيط الموارد (ERP) للمؤسسات.",
    score: "نقاط المحفظة",
    progress: "التقدم الإجمالي",
    completed: "مراحل مكتملة",
    hours: "ساعات الدراسة",
    trackedTime: "وقت التعلم المتتبع",
    achievements: "الإنجازات",
    badges: "شارات مكتسبة",
    radar: "رادار المهارات",
    curriculum: "المنهج التفاعلي"
  }
};

export default function Home() {
  const { getGlobalProgress, getRoadmapProgress } = useProgress();
  const { language } = useSettings();
  const { roadmaps } = useRoadmaps();
  const t = dictionary[language as keyof typeof dictionary];

  const globalProgress = getGlobalProgress();
  const enabledRoadmaps = roadmaps.filter((r) => r.isEnabled);
  const totalPhases = enabledRoadmaps.reduce((acc, r) => acc + (r.phases[language as "en" | "ar"]?.length || 0), 0);
  const completedPhases = globalProgress.completedPhases.length;
  const completionPercentage = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;

  // Group roadmaps by category
  const categories = Array.from(new Set(enabledRoadmaps.map((r) => r.category[language as "en" | "ar"])));

  return (
    <main className="flex min-h-screen flex-col bg-background font-sans">
      {/* Full-width Navbar */}
      <header className="flex-none h-16 border-b flex items-center justify-between px-6 bg-card sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={language === "ar" ? "/ar_logo.png" : "/logo.png"} alt="OnePath Logo" className="h-8 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">{t.title}</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end rtl:items-start leading-tight hidden sm:flex">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t.score}</span>
            <span className="text-base font-bold text-primary">{globalProgress.portfolioScore}</span>
          </div>
          <Link href="/builder" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "المُنشئ" : "Builder"}</span>
          </Link>
          <UserButton />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center p-6 sm:p-12 gap-8">
        <div className="w-full max-w-7xl flex flex-col gap-6">
          
          <div className="flex flex-col gap-1 mb-2">
            <h2 className="text-2xl font-bold tracking-tight">{t.curriculum}</h2>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{t.progress}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{Math.round(completionPercentage)}%</div>
              <Progress value={completionPercentage} className="h-2" />
              <p className="text-xs text-zinc-500 mt-2">{completedPhases} {language === 'en' ? 'of' : 'من'} {totalPhases} {t.completed}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{t.hours}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalProgress.studyHours} {language === 'en' ? 'h' : 'س'}</div>
              <p className="text-xs text-zinc-500 mt-2">{t.trackedTime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{t.score}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalProgress.portfolioScore}</div>
              <p className="text-xs text-zinc-500 mt-2">
                {language === 'en' ? 'Points from completed phases' : 'النقاط من المراحل المكتملة'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-col gap-8">
          {categories.map((category) => (
            <section key={category} className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enabledRoadmaps
                  .filter((r) => r.category[language as "en" | "ar"] === category)
                  .map((roadmap) => {
                    const rPhases = roadmap.phases[language as "en" | "ar"] || [];
                    const rTotal = rPhases.length;
                    const rProgress = getRoadmapProgress(roadmap.id);
                    const rCompleted = rPhases.filter(p => rProgress.completedPhases.includes(p.id)).length;
                    const rPercent = rTotal > 0 ? (rCompleted / rTotal) * 100 : 0;
                    
                    return (
                      <Link href={`/roadmap/${roadmap.id}`} key={roadmap.id} className="block group">
                        <Card className="h-full hover:border-primary/50 transition-colors flex flex-col">
                          <CardHeader>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center justify-between">
                              {roadmap.title[language as "en" | "ar"]}
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 rtl:rotate-180 rtl:group-hover:-translate-x-0 rtl:translate-x-2 transition-all" />
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {roadmap.description[language as "en" | "ar"]}
                            </p>
                            <div className="mt-auto">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{Math.round(rPercent)}%</span>
                                <span className="flex gap-2">
                                  <span>{rCompleted}/{rTotal}</span>
                                  {rProgress.portfolioScore > 0 && <span className="font-bold text-primary ml-1">★ {rProgress.portfolioScore}</span>}
                                </span>
                              </div>
                              <Progress value={rPercent} className="h-1.5" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </section>
          ))}
          {enabledRoadmaps.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {language === "ar" ? "لا توجد خرائط طريق متاحة حالياً." : "No roadmaps available currently."}
            </div>
          )}
        </div>

        </div>
      </div>
    </main>
  );
}
