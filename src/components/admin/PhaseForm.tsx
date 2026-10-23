import React, { useState, useEffect } from "react";
import { Phase } from "@/types";
import { generateId } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhaseFormProps {
  phase: Phase;
  allPhases: Phase[];
  availableCategories?: string[];
  onChange: (updatedPhase: Phase) => void;
  onDelete: (id: string) => void;
}

export function PhaseForm({ phase, allPhases, availableCategories, onChange, onDelete }: PhaseFormProps) {
  const { language } = useSettings();
  const [cycleError, setCycleError] = useState(false);

  // Clear error if prerequisites change or phase changes
  useEffect(() => {
    setCycleError(false);
  }, [phase.id, phase.prerequisites]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({
      ...phase,
      [name]: name === "estimatedHours" || name === "order" ? Number(value) : value,
    });
  };

  const handlePrereqToggle = (prereqId: string) => {
    // If we are adding a new prerequisite, check for circular dependencies
    if (!phase.prerequisites.includes(prereqId)) {
      const checkCycle = (currentId: string): boolean => {
        if (currentId === phase.id) return true;
        const currentPhase = allPhases.find(p => p.id === currentId);
        if (!currentPhase) return false;
        return currentPhase.prerequisites.some(checkCycle);
      };

      if (checkCycle(prereqId)) {
        setCycleError(true);
        return;
      }
    }

    setCycleError(false);
    const newPrereqs = phase.prerequisites.includes(prereqId)
      ? phase.prerequisites.filter((id) => id !== prereqId)
      : [...phase.prerequisites, prereqId];
    
    onChange({ ...phase, prerequisites: newPrereqs });
  };

  const handleAddStep = () => {
    const newSteps = [...(phase.steps || [])];
    newSteps.push({
      id: generateId("step"),
      title: language === "ar" ? "خطوة جديدة" : "New Step",
      description: "",
      order: newSteps.length + 1
    });
    onChange({ ...phase, steps: newSteps });
  };

  const handleUpdateStep = (stepId: string, field: string, value: string) => {
    const newSteps = (phase.steps || []).map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    );
    onChange({ ...phase, steps: newSteps });
  };

  const handleDeleteStep = (stepId: string) => {
    const newSteps = (phase.steps || []).filter(step => step.id !== stepId);
    onChange({ ...phase, steps: newSteps });
  };

  const handleAddPhaseResource = () => {
    const newResources = [...(phase.resources || [])];
    newResources.push({ id: generateId("res"), title: "", url: "" });
    onChange({ ...phase, resources: newResources });
  };

  const handleUpdatePhaseResource = (id: string, field: "title" | "url", value: string) => {
    const newResources = (phase.resources || []).map(r => r.id === id ? { ...r, [field]: value } : r);
    onChange({ ...phase, resources: newResources });
  };

  const handleDeletePhaseResource = (id: string) => {
    onChange({ ...phase, resources: (phase.resources || []).filter(r => r.id !== id) });
  };

  const handleAddStepResource = (stepId: string) => {
    const newSteps = (phase.steps || []).map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          resources: [...(step.resources || []), { id: generateId("res"), title: "", url: "" }]
        };
      }
      return step;
    });
    onChange({ ...phase, steps: newSteps });
  };

  const handleUpdateStepResource = (stepId: string, resId: string, field: "title" | "url", value: string) => {
    const newSteps = (phase.steps || []).map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          resources: (step.resources || []).map(r => r.id === resId ? { ...r, [field]: value } : r)
        };
      }
      return step;
    });
    onChange({ ...phase, steps: newSteps });
  };

  const handleDeleteStepResource = (stepId: string, resId: string) => {
    const newSteps = (phase.steps || []).map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          resources: (step.resources || []).filter(r => r.id !== resId)
        };
      }
      return step;
    });
    onChange({ ...phase, steps: newSteps });
  };

  return (
    <div className="space-y-4 border p-4 rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">{phase.title || (language === "ar" ? "مرحلة جديدة" : "New Phase")}</h3>
        <Button variant="destructive" size="icon" onClick={() => onDelete(phase.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`title-${phase.id}`}>{language === "ar" ? "العنوان" : "Title"}</Label>
          <Input 
            id={`title-${phase.id}`} 
            name="title" 
            value={phase.title} 
            onChange={handleChange} 
            placeholder={language === "ar" ? "مثال: أساسيات تقنية" : "e.g. ERP Fundamentals"} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`category-${phase.id}`}>{language === "ar" ? "الفئة" : "Category"}</Label>
          {availableCategories && availableCategories.length > 0 ? (
            <Select 
              value={phase.category} 
              onValueChange={(val) => onChange({ ...phase, category: val || "" })}
            >
              <SelectTrigger id={`category-${phase.id}`}>
                <SelectValue placeholder={language === "ar" ? "اختر فئة" : "Select a category"} />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input 
              id={`category-${phase.id}`} 
              name="category" 
              value={phase.category} 
              onChange={handleChange} 
              placeholder={language === "ar" ? "مثال: أساسيات" : "e.g. Basics"} 
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`desc-${phase.id}`}>{language === "ar" ? "الوصف" : "Description"}</Label>
        <Textarea 
          id={`desc-${phase.id}`} 
          name="description" 
          value={phase.description} 
          onChange={handleChange} 
          rows={2}
        />
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor={`obj-${phase.id}`}>{language === "ar" ? "الأهداف الرئيسية (كل هدف في سطر)" : "Key Objectives (One per line)"}</Label>
        <Textarea 
          id={`obj-${phase.id}`} 
          name="objectives" 
          value={(phase.objectives || []).join('\n')} 
          onChange={(e) => {
            onChange({
              ...phase,
              objectives: e.target.value.split('\n')
            });
          }} 
          placeholder={language === "ar" ? "أدخل الهدف هنا\nأدخل هدفا آخر هنا" : "Enter objective here\nEnter another objective here"}
          rows={3}
        />
      </div>

      <div className="space-y-3 pt-4 border-t mt-4">
        <div className="flex justify-between items-center">
          <Label>{language === "ar" ? "موارد المرحلة (روابط)" : "Phase Resources (Links)"}</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddPhaseResource}>
            <Plus className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "إضافة مورد" : "Add Resource"}
          </Button>
        </div>
        <div className="space-y-2">
          {(phase.resources || []).map((res) => (
            <div key={res.id} className="flex gap-2 items-start">
              <Input 
                value={res.title} 
                onChange={(e) => handleUpdatePhaseResource(res.id, "title", e.target.value)}
                placeholder={language === "ar" ? "عنوان الرابط" : "Link Title"}
                className="flex-1 h-8 text-sm"
              />
              <Input 
                value={res.url} 
                onChange={(e) => handleUpdatePhaseResource(res.id, "url", e.target.value)}
                placeholder="https://..."
                className="flex-2 h-8 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePhaseResource(res.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {(!phase.resources || phase.resources.length === 0) && (
            <div className="text-sm text-muted-foreground text-center p-2 border border-dashed rounded-md">
              {language === "ar" ? "لا توجد روابط." : "No links added."}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
        <div className="space-y-2">
          <Label htmlFor={`hours-${phase.id}`}>{language === "ar" ? "الساعات المقدرة" : "Estimated Hours"}</Label>
          <Input 
            id={`hours-${phase.id}`} 
            name="estimatedHours" 
            type="number" 
            value={phase.estimatedHours} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`order-${phase.id}`}>{language === "ar" ? "الترتيب" : "Order"}</Label>
          <Input 
            id={`order-${phase.id}`} 
            name="order" 
            type="number" 
            value={phase.order} 
            onChange={handleChange} 
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t mt-4">
        <Label>{language === "ar" ? "المتطلبات السابقة (يجب إكمالها قبل هذه المرحلة)" : "Prerequisites (Must complete before this phase)"}</Label>
        
        {cycleError && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-2 flex items-start gap-2 animate-in slide-in-from-top-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
              {language === "ar" 
                ? "لا يمكن إضافة هذه المرحلة كمتطلب سابق لأنها تعتمد بالفعل على المرحلة الحالية (حلقة مفرغة)." 
                : "Cannot add this phase as a prerequisite because it already depends on the current phase (circular dependency)."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-background">
          {allPhases.filter((p) => p.id !== phase.id).map((p) => (
            <label key={p.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
              <input
                type="checkbox"
                checked={phase.prerequisites.includes(p.id)}
                onChange={() => handlePrereqToggle(p.id)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="truncate">{p.title || p.id}</span>
            </label>
          ))}
          {allPhases.length <= 1 && <span className="text-xs text-muted-foreground">{language === "ar" ? "أضف المزيد من المراحل لتعيين المتطلبات السابقة." : "Add more phases to set prerequisites."}</span>}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t mt-4">
        <div className="flex justify-between items-center">
          <Label>{language === "ar" ? "خطوات المرحلة" : "Phase Steps"}</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
            <Plus className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "إضافة خطوة" : "Add Step"}
          </Button>
        </div>
        <div className="space-y-3">
          {(phase.steps || []).sort((a,b) => a.order - b.order).map((step, index) => (
            <div key={step.id} className="flex gap-2 items-start border p-3 rounded-md bg-zinc-50 dark:bg-zinc-900">
              <div className="mt-2 text-muted-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-2">
                <Input 
                  value={step.title} 
                  onChange={(e) => handleUpdateStep(step.id, "title", e.target.value)}
                  placeholder={language === "ar" ? "عنوان الخطوة" : "Step Title"}
                  className="h-8"
                />
                <Textarea 
                  value={step.description || ""} 
                  onChange={(e) => handleUpdateStep(step.id, "description", e.target.value)}
                  placeholder={language === "ar" ? "وصف الخطوة" : "Step Description"}
                  className="min-h-[60px]"
                />
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-muted-foreground">{language === "ar" ? "موارد الخطوة (روابط)" : "Step Resources"}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleAddStepResource(step.id)}>
                      <Plus className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0" /> {language === "ar" ? "إضافة مورد" : "Add"}
                    </Button>
                  </div>
                  {(step.resources || []).map((res) => (
                    <div key={res.id} className="flex gap-1 items-start">
                      <Input 
                        value={res.title} 
                        onChange={(e) => handleUpdateStepResource(step.id, res.id, "title", e.target.value)}
                        placeholder={language === "ar" ? "العنوان" : "Title"}
                        className="flex-1 h-7 text-xs"
                      />
                      <Input 
                        value={res.url} 
                        onChange={(e) => handleUpdateStepResource(step.id, res.id, "url", e.target.value)}
                        placeholder="https://..."
                        className="flex-2 h-7 text-xs"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteStepResource(step.id, res.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStep(step.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {(!phase.steps || phase.steps.length === 0) && (
            <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded-md">
              {language === "ar" ? "لا توجد خطوات بعد. أضف خطوات لتقسيم هذه المرحلة." : "No steps yet. Add steps to break down this phase."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
