"use client";

import { useParams } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import Roadmap from "@/components/roadmap/Roadmap";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UserButton from "@/components/UserButton";
import { useProgress } from "@/contexts/ProgressContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SkillRadar from "@/components/dashboard/SkillRadar";

export default function RoadmapPage() {
  const params = useParams();
  const id = params.id as string;
  const { language } = useSettings();
  const { roadmaps } = useRoadmaps();
  const { getRoadmapProgress } = useProgress();

  const roadmap = roadmaps.find((r) => r.id === id);

  if (!roadmap) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">{language === "ar" ? "خارطة الطريق غير موجودة" : "Roadmap Not Found"}</h1>
        <Link href="/">
          <Button>{language === "ar" ? "العودة للوحة الرئيسية" : "Back to Dashboard"}</Button>
        </Link>
      </div>
    );
  }
  
  const rProgress = getRoadmapProgress(roadmap.id);
  const rTotal = roadmap.phases[language as "en" | "ar"]?.length || 0;
  const rCompleted = rProgress.completedPhases.length;
  const rPercent = rTotal === 0 ? 0 : (rCompleted / rTotal) * 100;

  return (
    <main className="flex h-screen flex-col bg-background font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight">{roadmap.title[language as "en" | "ar"]}</h1>
            <span className="text-xs text-muted-foreground">{roadmap.category[language as "en" | "ar"]}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content Area: Graph + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Roadmap Graph */}
        <section className="flex-1 h-full relative overflow-hidden">
          <Roadmap roadmapId={id} />
        </section>

        {/* Stats Sidebar */}
        <aside className="w-[320px] md:w-[360px] flex-none border-l rtl:border-l-0 rtl:border-r bg-muted/10 p-6 overflow-y-auto flex flex-col gap-4">
          <h2 className="text-lg font-bold">
            {language === "ar" ? "إحصائيات الخارطة" : "Roadmap Stats"}
          </h2>
          
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {language === "ar" ? "نسبة الإنجاز" : "Progress"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{Math.round(rPercent)}%</div>
              <Progress value={rPercent} className="h-2" />
              <p className="text-xs text-zinc-500 mt-2">{rCompleted} {language === "ar" ? "من" : "of"} {rTotal} {language === "ar" ? "مراحل مكتملة" : "Phases Completed"}</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {language === "ar" ? "ساعات الدراسة" : "Study Hours"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rProgress.studyHours} {language === "ar" ? "س" : "h"}</div>
              <p className="text-xs text-zinc-500 mt-2">{language === "ar" ? "وقت التعلم المتتبع" : "Tracked learning time"}</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {language === "ar" ? "نقاط المحفظة" : "Portfolio Score"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">★ {rProgress.portfolioScore}</div>
              <p className="text-xs text-zinc-500 mt-2">{language === "ar" ? "إجمالي النقاط المكتسبة" : "Total score earned"}</p>
            </CardContent>
          </Card>
          
          <Card className="flex flex-col h-[320px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {language === "ar" ? "رادار المهارات" : "Skill Radar"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-6 min-h-0">
              <SkillRadar roadmapId={roadmap.id} />
            </CardContent>
          </Card>

        </aside>
      </div>
    </main>
  );
}
