"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { downloadBackup } from "@/lib/gdrive";
import { applyBackup, DataSummary, summarizeBackup, summarizeLocal } from "@/lib/backup";
import { getDriveAccessToken } from "@/lib/driveToken";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { useProgress } from "@/contexts/ProgressContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Cloud, DownloadCloud, Loader2 } from "lucide-react";

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Shown above the comparison, e.g. "We found a backup…" after sign-in
  intro?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: unknown; summary: DataSummary; modifiedTime?: string };

// Downloads the Drive backup, shows how it compares with this device, and
// only overwrites local data once the user confirms.
export function RestoreDialog({ open, onOpenChange, intro }: RestoreDialogProps) {
  const { data: session } = useSession();
  const { language } = useSettings();
  const { roadmaps } = useRoadmaps();
  const { progressMap } = useProgress();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [isRestoring, setIsRestoring] = useState(false);
  const ar = language === "ar";

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const token = await getDriveAccessToken(session);
        if (!token) {
          throw new Error(ar ? "يرجى تسجيل الدخول مرة أخرى لمنح صلاحيات Google Drive." : "Please re-login to grant Google Drive permissions.");
        }
        const { data, modifiedTime } = await downloadBackup(token);
        const summary = summarizeBackup(data);
        if (!summary) throw new Error(ar ? "ملف النسخة الاحتياطية غير صالح." : "The backup file is not in a format OnePath recognises.");
        if (active) setState({ status: "ready", data, summary, modifiedTime });
      } catch (e) {
        console.error(e);
        if (active) setState({ status: "error", message: (e instanceof Error && e.message) || "Failed to read the backup." });
      }
    })();
    return () => {
      active = false;
    };
    // session changes while the dialog is open shouldn't refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (isRestoring) return;
    if (!next) setState({ status: "loading" });
    onOpenChange(next);
  };

  const handleRestore = async () => {
    if (state.status !== "ready") return;
    try {
      setIsRestoring(true);
      await applyBackup(state.data);
      toast.success(ar ? "تم الاستعادة بنجاح!" : "Restore successful!");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error((e instanceof Error && e.message) || "Failed to restore from Google Drive.");
      setIsRestoring(false);
    }
  };

  const local = summarizeLocal(roadmaps, progressMap);
  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString(ar ? "ar" : "en") : "—");
  const titles = (summary: DataSummary) =>
    summary.roadmaps === null
      ? (ar ? "بدون تغيير" : "unchanged")
      : summary.roadmaps.length === 0
        ? "—"
        : summary.roadmaps.map((r) => r.title[ar ? "ar" : "en"] || r.title.en).join(ar ? "، " : ", ");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            {ar ? "الاستعادة من Google Drive" : "Restore from Google Drive"}
          </DialogTitle>
          <DialogDescription>
            {intro ?? (ar ? "راجع ما سيتغير قبل الاستعادة." : "Check what will change before restoring.")}
          </DialogDescription>
        </DialogHeader>

        {state.status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {ar ? "جاري قراءة النسخة الاحتياطية..." : "Reading the backup..."}
          </div>
        )}

        {state.status === "error" && (
          <p className="text-sm text-destructive py-4">{state.message}</p>
        )}

        {state.status === "ready" && (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <caption className="sr-only">{ar ? "مقارنة هذا الجهاز بالنسخة الاحتياطية" : "This device compared with the backup"}</caption>
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="text-start font-medium pb-2"></th>
                  <th scope="col" className="text-start font-medium pb-2">{ar ? "هذا الجهاز" : "This device"}</th>
                  <th scope="col" className="text-start font-medium pb-2">{ar ? "النسخة الاحتياطية" : "Backup"}</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-1.5 [&_th]:py-1.5 [&_tr]:border-t">
                <tr>
                  <th scope="row" className="text-start font-medium">{ar ? "تاريخ الحفظ" : "Saved"}</th>
                  <td>—</td>
                  <td>{formatDate(state.summary.createdAt ?? state.modifiedTime)}</td>
                </tr>
                <tr>
                  <th scope="row" className="text-start font-medium align-top">{ar ? "خرائط الطريق" : "Roadmaps"}</th>
                  <td className="align-top">{local.roadmaps?.length ?? 0}<div className="text-xs text-muted-foreground">{titles(local)}</div></td>
                  <td className="align-top">{state.summary.roadmaps?.length ?? "—"}<div className="text-xs text-muted-foreground">{titles(state.summary)}</div></td>
                </tr>
                <tr>
                  <th scope="row" className="text-start font-medium">{ar ? "المراحل المكتملة" : "Completed phases"}</th>
                  <td>{local.completedPhases}</td>
                  <td>{state.summary.completedPhases}</td>
                </tr>
                <tr>
                  <th scope="row" className="text-start font-medium">{ar ? "الخطوات المكتملة" : "Completed steps"}</th>
                  <td>{local.completedSteps}</td>
                  <td>{state.summary.completedSteps}</td>
                </tr>
              </tbody>
            </table>
            <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {ar
                ? "ستحل النسخة الاحتياطية محل التقدم وخرائط الطريق الموجودة على هذا الجهاز."
                : "The backup replaces the progress and roadmaps on this device."}
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isRestoring}>
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleRestore} disabled={state.status !== "ready" || isRestoring}>
            {isRestoring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" />
            ) : (
              <DownloadCloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            )}
            {ar ? "استعادة" : "Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
