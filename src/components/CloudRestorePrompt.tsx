"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkBackupExists, restoreFromDrive } from "@/lib/gdrive";
import { applyBackup } from "@/lib/backup";
import { getDriveAccessToken } from "@/lib/driveToken";
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
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Only run if user is logged in
    if (status !== "authenticated" || !session?.user) return;
    
    // Checked automatically after sign-in, so skip expired sessions rather than prompting
    const token = session.accessToken;
    if (!token || session.error) return;

    // Check if we've already checked this session
    const hasChecked = sessionStorage.getItem("hasCheckedBackup");
    if (hasChecked) return;

    const checkBackup = async () => {
      try {
        const fileId = await checkBackupExists(token);
        if (fileId) {
          // Backup found, prompt user
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Failed to check for backup", error);
        toast.error(`Backup check failed: ${(error instanceof Error && error.message) || "Unknown error"}`);
      } finally {
        // Mark as checked so we don't check again this session
        sessionStorage.setItem("hasCheckedBackup", "true");
      }
    };

    checkBackup();
  }, [session, status]);

  const handleRestore = async () => {
    const token = await getDriveAccessToken(session);
    if (!token) return;

    try {
      setIsRestoring(true);
      const data = await restoreFromDrive(token);
      if (data) {
        await applyBackup(data);
        toast.success(language === "ar" ? "تم الاستعادة بنجاح!" : "Restore successful!");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      toast.error((e instanceof Error && e.message) || "Failed to restore from Google Drive.");
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
