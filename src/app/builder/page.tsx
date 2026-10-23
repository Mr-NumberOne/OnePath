"use client";

import React, { useState } from "react";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import { RoadmapConfig } from "@/types";
import { Button } from "@/components/ui/button";
import UserButton from "@/components/UserButton";
import { useSettings } from "@/contexts/SettingsContext";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, Download, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { downloadExcelTemplate, parseExcelFile, exportRoadmapToExcel } from "@/lib/xlsxParser";
import { saveRoadmaps } from "@/lib/roadmapApi";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { roadmaps, refreshRoadmaps } = useRoadmaps();
  const { language } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const newRoadmap = await parseExcelFile(file);
      const updatedRoadmaps = [...roadmaps, newRoadmap];

      await saveRoadmaps(updatedRoadmaps);

      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم استيراد الخارطة بنجاح" : "Roadmap imported successfully!");
    } catch (err) {
      console.error(err);
      toast.error(language === "ar" ? "فشل استيراد الملف. تأكد من صحة التنسيق." : "Failed to import file. Ensure format is correct.");
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateRoadmap = async () => {
    setIsSaving(true);
    try {
      const newId = `rm-${Date.now()}`;
      const newRoadmap: RoadmapConfig = {
        id: newId,
        title: { en: "New Roadmap", ar: "خارطة طريق جديدة" },
        description: { en: "Description here", ar: "الوصف هنا" },
        category: { en: "General", ar: "عام" },
        isEnabled: false,
        phases: { en: [], ar: [] },
      };

      const updatedRoadmaps = [...roadmaps, newRoadmap];

      await saveRoadmaps(updatedRoadmaps);

      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم إنشاء الخارطة بنجاح" : "Roadmap created successfully!");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "حدث خطأ أثناء الإنشاء." : "Error creating roadmap.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnable = async (roadmap: RoadmapConfig) => {
    try {
      const updatedRoadmaps = roadmaps.map((r) =>
        r.id === roadmap.id ? { ...r, isEnabled: !r.isEnabled } : r
      );

      await saveRoadmaps(updatedRoadmaps);

      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم تحديث حالة الخارطة" : "Roadmap status updated!");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "حدث خطأ أثناء التحديث." : "Error toggling roadmap status.");
    }
  };

  const confirmDelete = async () => {
    if (!roadmapToDelete) return;
    try {
      const updatedRoadmaps = roadmaps.filter((r) => r.id !== roadmapToDelete);

      await saveRoadmaps(updatedRoadmaps);

      await refreshRoadmaps();
      toast.success(language === "ar" ? "تم حذف الخارطة بنجاح" : "Roadmap deleted successfully!");
    } catch (e) {
      console.error(e);
      toast.error(language === "ar" ? "حدث خطأ أثناء الحذف." : "Error deleting roadmap.");
    } finally {
      setRoadmapToDelete(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background font-sans">
      {/* Header */}
      <header className="flex-none h-16 border-b flex items-center justify-between px-6 bg-card sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img src={language === "ar" ? "/ar_logo.png" : "/logo.png"} alt="OnePath Logo" className="h-8 w-auto object-contain" />
            <h1 className="text-xl font-bold">{language === "ar" ? "إدارة خرائط الطريق" : "Roadmaps Management"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => downloadExcelTemplate(language as "en"|"ar")} disabled={isSaving}>
            <Download className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === "ar" ? "تحميل القالب" : "Template"}
          </Button>

          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
            <Upload className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {language === "ar" ? "استيراد" : "Import"}
          </Button>
          <input 
            type="file" 
            accept=".xlsx" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
          />

          <Button onClick={handleCreateRoadmap} disabled={isSaving}>
            <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {isSaving ? (language === "ar" ? "جاري الإنشاء..." : "Creating...") : (language === "ar" ? "إنشاء خارطة جديدة" : "Create Roadmap")}
          </Button>

          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">{roadmap.title[language as "en" | "ar"]}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleToggleEnable(roadmap)}>
                    {roadmap.isEnabled ? <Power className="w-4 h-4 text-green-500" /> : <PowerOff className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Link href={`/builder/roadmap/${roadmap.id}`}>
                    <Button variant="outline" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" onClick={() => exportRoadmapToExcel(roadmap, language as "en" | "ar")}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => setRoadmapToDelete(roadmap.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {roadmap.description[language as "en" | "ar"]}
                </p>
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="bg-muted px-2 py-1 rounded-md">{roadmap.category[language as "en" | "ar"]}</span>
                  <span>{roadmap.phases[language as "en" | "ar"]?.length || 0} {language === "ar" ? "مراحل" : "Phases"}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {roadmaps.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              {language === "ar" ? "لا توجد خرائط طريق. قم بإنشاء واحدة جديدة." : "No roadmaps found. Create a new one."}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!roadmapToDelete} onOpenChange={(open) => !open && setRoadmapToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تأكيد الحذف" : "Confirm Deletion"}</DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "هل أنت متأكد من أنك تريد حذف خارطة الطريق هذه؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسح جميع المراحل والبيانات المرتبطة بها." 
                : "Are you sure you want to delete this roadmap? This action cannot be undone and will erase all phases and data associated with it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRoadmapToDelete(null)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {language === "ar" ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
