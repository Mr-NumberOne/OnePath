import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phase } from "@/types";
import { Clock, CheckCircle2, Lock } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface PhaseNodeProps {
  data: {
    phase: Phase;
    isCompleted: boolean;
    isLocked: boolean;
    onClick: (id: string) => void;
  };
}

export default function PhaseNode({ data }: PhaseNodeProps) {
  const { phase, isCompleted, isLocked, onClick } = data;
  const { language } = useSettings();
  const isRTL = language === "ar";

  let cardClasses = "w-72 shadow-md transition-all duration-200 border-2 ";
  
  if (isCompleted) {
    cardClasses += "border-green-500 bg-green-500/10 hover:bg-green-500/20";
  } else if (isLocked) {
    cardClasses += "border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/50 opacity-75 cursor-not-allowed";
  } else {
    cardClasses += "border-[#4d6fb0] bg-[#4d6fb0]/10 hover:bg-[#4d6fb0]/20";
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
      <Card 
        className={cardClasses}
        dir={isRTL ? "rtl" : "ltr"}
        onClick={() => {
          if (!isLocked) onClick(phase.id);
        }}
        role={isLocked ? "presentation" : "button"}
        tabIndex={isLocked ? -1 : 0}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <Badge variant="outline" className="mb-2 bg-background/50">
              {phase.category}
            </Badge>
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : isLocked ? (
              <Lock className="w-5 h-5 text-zinc-400 dark:text-zinc-600 shrink-0" />
            ) : null}
          </div>
          <CardTitle className="text-sm leading-tight">{phase.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2 text-xs mb-3 text-zinc-500 dark:text-zinc-400">
            {phase.description}
          </CardDescription>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-300 font-medium">
            <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <span>{phase.estimatedHours} {isRTL ? 'ساعات' : 'Hours'}</span>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
    </>
  );
}

