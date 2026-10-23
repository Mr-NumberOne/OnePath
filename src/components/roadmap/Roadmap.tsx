"use client";

import React, { useCallback, useMemo, useEffect, useState, useSyncExternalStore } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Panel,
  Position,
} from "@xyflow/react";
import { Phase } from "@/types";
import "@xyflow/react/dist/style.css";
import PhaseNode from "./PhaseNode";
import { PhaseDetailPanel } from "./PhaseDetailPanel";
import { useProgress } from "@/contexts/ProgressContext";
import { useTheme } from "next-themes";
import { useSettings } from "@/contexts/SettingsContext";
import { useRoadmaps } from "@/contexts/RoadmapContext";
import dagre from "dagre";

const nodeTypes = {
  phaseNode: PhaseNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 288;
const nodeHeight = 150; // Approximate height of the PhaseNode card

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

const subscribeNoop = () => () => {};

interface RoadmapProps {
  roadmapId?: string;
  previewPhases?: Phase[];
}

export default function Roadmap({ roadmapId, previewPhases }: RoadmapProps) {
  const { getRoadmapProgress, getGlobalProgress, togglePhaseCompletion } = useProgress();
  
  const progress = useMemo(() => {
    return roadmapId ? getRoadmapProgress(roadmapId) : getGlobalProgress();
  }, [roadmapId, getRoadmapProgress, getGlobalProgress]);
  const { theme, resolvedTheme } = useTheme();
  const { language } = useSettings();
  const { roadmaps } = useRoadmaps();

  const activeRoadmap = roadmapId ? roadmaps.find(r => r.id === roadmapId) : null;
  const currentPhasesData = useMemo(() => {
    return previewPhases || activeRoadmap?.phases[language as "en" | "ar"] || [];
  }, [previewPhases, activeRoadmap, language]);

  // false during SSR and hydration, true afterwards
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

  const handleToggleCompletion = useCallback((phaseId: string) => {
    if (roadmapId) {
      togglePhaseCompletion(roadmapId, phaseId);
    }
  }, [roadmapId, togglePhaseCompletion]);

  const handleNodeClick = useCallback((phaseId: string) => {
    const phase = currentPhasesData.find((p) => p.id === phaseId);
    if (phase) {
      setSelectedPhase(phase);
    }
  }, [currentPhasesData]);

  // Use default theme/language for SSR to prevent hydration mismatch
  const safeTheme = mounted ? (theme === "system" ? resolvedTheme : theme) : "light";
  const isDark = safeTheme === "dark";

  const initialNodes: Node[] = useMemo(() => {
    return currentPhasesData.map((phase) => {
      const isCompleted = progress.completedPhases.includes(phase.id);
      
      const isLocked = phase.prerequisites.length > 0 && phase.prerequisites.some(
        (prereqId) => !progress.completedPhases.includes(prereqId)
      );

      return {
        id: phase.id,
        position: { x: 0, y: 0 },
        type: "phaseNode",
        data: {
          phase,
          isCompleted,
          isLocked,
          onClick: handleNodeClick,
          onToggleCompletion: handleToggleCompletion,
        },
      };
    });
  }, [progress, currentPhasesData, handleNodeClick, handleToggleCompletion]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    currentPhasesData.forEach((phase) => {
      phase.prerequisites.forEach((prereqId) => {
        edges.push({
          id: `e-${prereqId}-${phase.id}`,
          source: prereqId,
          target: phase.id,
          animated: true,
          style: { stroke: isDark ? "#52525b" : "#a1a1aa", strokeWidth: 2 },
        });
      });
    });
    return edges;
  }, [currentPhasesData, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Apply layout once
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      "TB"
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!mounted) {
    return (
      <div style={{ width: "100%", height: "600px" }} className="border rounded-lg relative bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 animate-pulse">
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "600px" }} className={`border rounded-lg relative ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        colorMode={isDark ? "dark" : "light"}
        panOnScroll={true}
        zoomOnScroll={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={1.5}
        fitView
      >
        <Background gap={16} size={1} color={isDark ? "#27272a" : "#e4e4e7"} />
        <Controls showZoom={true} />
        <Panel position="top-left" className="bg-background/80 p-2 rounded-md shadow-sm border text-xs">
          {language === "ar" ? "اضغط على أي مرحلة لعرض التفاصيل" : "Click a node to view details"}
        </Panel>
      </ReactFlow>

      <PhaseDetailPanel 
        phase={selectedPhase} 
        isOpen={!!selectedPhase} 
        onClose={() => setSelectedPhase(null)}
        roadmapId={roadmapId}
      />
    </div>
  );
}
