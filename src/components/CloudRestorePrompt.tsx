"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkBackupExists } from "@/lib/gdrive";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import { RestoreDialog } from "@/components/RestoreDialog";

// After sign-in, offers to restore a Google Drive backup if one exists
export function CloudRestorePrompt() {
  const { data: session, status } = useSession();
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <RestoreDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      intro={language === "ar"
        ? "لقد وجدنا نسخة احتياطية لتقدمك وخرائط الطريق الخاصة بك في Google Drive. راجع ما سيتغير قبل استعادتها."
        : "We found a backup of your progress and roadmaps on your Google Drive. Check what will change before restoring it."}
    />
  );
}
