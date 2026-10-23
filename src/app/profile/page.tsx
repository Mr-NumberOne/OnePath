"use client";

import { useSession } from "next-auth/react";
import { useSettings } from "@/contexts/SettingsContext";
import { useProgress } from "@/contexts/ProgressContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, Award, Loader2, Cloud, UploadCloud, DownloadCloud } from "lucide-react";
import Link from "next/link";
import UserButton from "@/components/UserButton";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "sonner";
import { backupToDrive, restoreFromDrive } from "@/lib/gdrive";
import { applyBackup, buildBackupPayload } from "@/lib/backup";
import { getDriveAccessToken } from "@/lib/driveToken";
import { useRoadmaps } from "@/contexts/RoadmapContext";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { language } = useSettings();
  const { getGlobalProgress } = useProgress();
  const { roadmaps } = useRoadmaps();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleBackup = async () => {
    const token = await getDriveAccessToken(session);
    if (!token) {
      toast.error(language === "ar" ? "يرجى تسجيل الدخول مرة أخرى لمنح صلاحيات Google Drive." : "Please re-login to grant Google Drive permissions.");
      return;
    }

    try {
      setIsSyncing(true);
      const backupPayload = await buildBackupPayload(roadmaps);
      await backupToDrive(token, backupPayload);
      toast.success(language === "ar" ? "تم النسخ الاحتياطي بنجاح!" : "Backup successful!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to backup to Google Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    const token = await getDriveAccessToken(session);
    if (!token) {
      toast.error(language === "ar" ? "يرجى تسجيل الدخول مرة أخرى لمنح صلاحيات Google Drive." : "Please re-login to grant Google Drive permissions.");
      return;
    }

    if (!confirm(language === "ar" ? "سيؤدي هذا إلى استبدال تقدمك الحالي. هل تريد المتابعة؟" : "This will overwrite your current progress. Continue?")) {
      return;
    }

    try {
      setIsSyncing(true);
      const data = await restoreFromDrive(token);
      if (data) {
        await applyBackup(data);
        toast.success(language === "ar" ? "تم الاستعادة بنجاح!" : "Restore successful!");
        window.location.reload();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to restore from Google Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null; // Middleware will catch this and redirect to /login
  }

  // Calculate the level or rank based on score
  const globalProgress = getGlobalProgress();
  const score = globalProgress.portfolioScore;
  let rank = language === "ar" ? "مبتدئ" : "Beginner";
  let nextRankScore = 300;
  
  if (score >= 1000) {
    rank = language === "ar" ? "خبير استشاري" : "Expert Consultant";
    nextRankScore = score; // Max rank
  } else if (score >= 500) {
    rank = language === "ar" ? "استشاري متقدم" : "Senior Consultant";
    nextRankScore = 1000;
  } else if (score >= 300) {
    rank = language === "ar" ? "استشاري" : "Consultant";
    nextRankScore = 500;
  }

  const progressToNextRank = score >= 1000 ? 100 : (score / nextRankScore) * 100;

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
              {language === "ar" ? "الملف الشخصي" : "Profile"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Profile Card */}
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-lg ring-2 ring-primary/20 shrink-0">
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                  {session.user.name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left rtl:sm:text-right gap-1 pt-2">
              <CardTitle className="text-3xl font-bold">{session.user.name}</CardTitle>
              <CardDescription className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {session.user.email}
              </CardDescription>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Award className="w-4 h-4" />
                {rank}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {language === "ar" ? "نظرة عامة على الإنجازات" : "Progress Overview"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <Card>
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="w-5 h-5" />
                    <span className="font-medium">{language === "ar" ? "درجة التقييم" : "Portfolio Score"}</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{score}</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-medium">
                    <span>{rank}</span>
                    {score < 1000 && <span>{nextRankScore}</span>}
                  </div>
                  <Progress value={progressToNextRank} className="h-2" />
                  {score < 1000 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      {nextRankScore - score} {language === "ar" ? "نقطة للوصول إلى المستوى التالي" : "points to next rank"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col justify-center h-full gap-2">
                <div className="text-muted-foreground font-medium">
                  {language === "ar" ? "المراحل المكتملة" : "Completed Phases"}
                </div>
                <div className="text-4xl font-bold">
                  {globalProgress.completedPhases.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" 
                    ? "إجمالي عدد المراحل التي أكملتها عبر جميع مسارات التعلم."
                    : "Total phases completed across all roadmaps."}
                </p>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Cloud Backup Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            {language === "ar" ? "النسخ الاحتياطي السحابي" : "Cloud Backup"}
          </h2>
          <Card>
            <CardContent className="p-6 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {language === "ar" 
                  ? "قم بالنسخ الاحتياطي لتقدمك الحالي إلى Google Drive، أو استعادته من نسخة احتياطية سابقة." 
                  : "Backup your current progress securely to your Google Drive, or restore it from a previous backup."}
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <Button variant="outline" onClick={handleBackup} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" /> : <UploadCloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
                  {language === "ar" ? "نسخ احتياطي إلى Google Drive" : "Backup to Google Drive"}
                </Button>
                <Button variant="outline" onClick={handleRestore} disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" /> : <DownloadCloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
                  {language === "ar" ? "استعادة من Google Drive" : "Restore from Google Drive"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
