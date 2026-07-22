"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkBackupExists, restoreFromDrive } from "@/lib/gdrive";
import { useSettings } from "@/contexts/SettingsContext";
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
import { Cloud, DownloadCloud, Loader2 } from "lucide-react";

export function CloudRestorePrompt() {
  const { data: session, status } = useSession();
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Only run if user is logged in
    if (status !== "authenticated" || !session?.user) return;
    
    // @ts-ignore
    const token = session.accessToken;
    if (!token) return;

    // Check if we've already checked this session
    const hasChecked = sessionStorage.getItem("hasCheckedBackup");
    if (hasChecked) return;

    const checkBackup = async () => {
      try {
        setIsChecking(true);
        const fileId = await checkBackupExists(token);
        if (fileId) {
          // Backup found, prompt user
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Failed to check for backup", error);
      } finally {
        setIsChecking(false);
        // Mark as checked so we don't check again this session
        sessionStorage.setItem("hasCheckedBackup", "true");
      }
    };

    checkBackup();
  }, [session, status]);

  const handleRestore = async () => {
    // @ts-ignore
    const token = session?.accessToken;
    if (!token) return;

    try {
      setIsRestoring(true);
      const data = await restoreFromDrive(token);
      if (data) {
        if (data.progress && data.roadmaps) {
          localStorage.setItem("erp-roadmap-progress-v2", JSON.stringify(data.progress));
          
          if (data.settings) {
            if (data.settings.theme) localStorage.setItem("theme", data.settings.theme);
            if (data.settings.language) localStorage.setItem("roadmap-language", data.settings.language);
          }

          await fetch("/api/roadmaps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.roadmaps)
          });
        } else {
          localStorage.setItem("erp-roadmap-progress-v2", JSON.stringify(data));
        }
        toast.success(language === "ar" ? "تم الاستعادة بنجاح!" : "Restore successful!");
        window.location.reload();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to restore from Google Drive.");
    } finally {
      setIsRestoring(false);
      setIsOpen(false);
    }
  };

  const handleDecline = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            {language === "ar" ? "تم العثور على نسخة احتياطية سحابية" : "Cloud Backup Found"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar"
              ? "لقد وجدنا نسخة احتياطية لتقدمك وخرائط الطريق الخاصة بك في Google Drive الخاص بك. هل ترغب في استعادتها الآن؟ سيؤدي هذا إلى استبدال أي بيانات حالية على هذا الجهاز."
              : "We found a backup of your progress and roadmaps on your Google Drive. Would you like to restore it now? This will overwrite any current data on this device."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleDecline} disabled={isRestoring}>
            {language === "ar" ? "لا، شكراً" : "No, Thanks"}
          </Button>
          <Button onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" />
            ) : (
              <DownloadCloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            )}
            {language === "ar" ? "نعم، استعادة" : "Yes, Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
