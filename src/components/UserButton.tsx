"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2, User, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { useSettings } from "@/contexts/SettingsContext";
import { backupToDrive } from "@/lib/gdrive";
import { buildBackupPayload, PROGRESS_KEY } from "@/lib/backup";
import { removeStoredData } from "@/lib/storage";
import { saveRoadmaps } from "@/lib/roadmapApi";
import { getDriveAccessToken } from "@/lib/driveToken";
import { toast } from "sonner";
import { AlertTriangle, Cloud } from "lucide-react";

export default function UserButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { roadmaps } = useRoadmaps();
  const { language } = useSettings();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const confirmLogout = async () => {
    // Clear local progress
    await removeStoredData(PROGRESS_KEY);
    sessionStorage.removeItem("hasCheckedBackup");
    
    // Clear roadmaps from the server; don't block logout if that fails
    try {
      await saveRoadmaps([]);
    } catch (e) {
      console.error("Failed to clear roadmaps on logout", e);
    }

    // @ts-ignore
    if (typeof window !== 'undefined' && window.desktopAPI?.logout) {
      // @ts-ignore
      await window.desktopAPI.logout();
    }

    await signOut();
  };

  const handleBackupAndLogout = async () => {
    const token = await getDriveAccessToken(session);
    if (!token) {
      toast.error(language === "ar" ? "يرجى تسجيل الدخول مرة أخرى لمنح صلاحيات Google Drive." : "Please re-login to grant Google Drive permissions.");
      return;
    }

    try {
      setIsBackingUp(true);
      const backupPayload = await buildBackupPayload(roadmaps);
      await backupToDrive(token, backupPayload);
      toast.success(language === "ar" ? "تم النسخ الاحتياطي بنجاح!" : "Backup successful!");
      await confirmLogout();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || (language === "ar" ? "فشل النسخ الاحتياطي." : "Failed to backup to Google Drive."));
      setIsBackingUp(false);
    }
  };
  
  if (status === "loading") {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!session?.user) {
    return (
      <Link href="/login">
        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">{language === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
        </Button>
      </Link>
    );
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-transparent p-0 overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {session.user.image ? (
          <img src={session.user.image} alt={session.user.name || "User"} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {session.user.name?.charAt(0) || "U"}
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{session.user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer w-full flex items-center">
          <User className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
          <span>{language === "ar" ? "الملف الشخصي" : "Profile"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer w-full flex items-center">
          <Settings className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
          <span>{language === "ar" ? "الإعدادات" : "Settings"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 w-full flex items-center">
          <LogOut className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
          <span>{language === "ar" ? "تسجيل الخروج" : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {language === "ar" ? "تحذير: سيتم فقدان التقدم غير المحفوظ" : "Warning: Unsaved Progress Will Be Lost"}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {language === "ar" ? (
              <>
                سيؤدي تسجيل الخروج إلى مسح هذا الجهاز بالكامل لحماية خصوصيتك. 
                سيتم حذف أي تقدم أو تغييرات في خريطة الطريق تم إجراؤها منذ آخر نسخة احتياطية بشكل دائم.
                <br /><br />
                هل ترغب في النسخ الاحتياطي بأمان إلى Google Drive قبل تسجيل الخروج؟
              </>
            ) : (
              <>
                Logging out will completely wipe this device to protect your privacy. 
                Any progress or roadmap changes made since your last backup will be permanently deleted.
                <br /><br />
                Would you like to securely backup to Google Drive before logging out?
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={confirmLogout} disabled={isBackingUp}>
            {language === "ar" ? "تسجيل الخروج بدون نسخ احتياطي" : "Logout Without Backup"}
          </Button>
          <Button onClick={handleBackupAndLogout} disabled={isBackingUp}>
            {isBackingUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin rtl:ml-2 rtl:mr-0" /> : <Cloud className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />}
            {language === "ar" ? "نسخ احتياطي وتسجيل خروج" : "Backup & Logout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

