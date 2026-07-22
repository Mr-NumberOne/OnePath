export type PhaseCategory = string;

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
}

export interface PhaseStep {
  id: string;
  title: string;
  description: string;
  order: number;
  resources?: ResourceLink[];
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  category: PhaseCategory;
  prerequisites: string[]; // array of Phase IDs
  estimatedHours: number;
  objectives: string[];
  milestones: string[];
  steps?: PhaseStep[];
  resources?: ResourceLink[];
  order: number;
}

export interface RoadmapConfig {
  id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  category: { en: string; ar: string };
  isEnabled: boolean;
  phases: { en: Phase[]; ar: Phase[] };
  radarCategories?: { en: string[]; ar: string[] };
}

export interface Resource {
  id: string;
  phaseId: string;
  title: string;
  type: 'Documentation' | 'Video' | 'Course' | 'Book' | 'Article';
  url: string;
  duration?: string;
  description: string;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  expectedAnswer: string;
  evaluationCriteria: string[];
  commonMistakes: string[];
}

export interface Project {
  id: string;
  phaseId: string; // The phase this project is introduced in
  title: string;
  scenario: string;
  requirements: string[];
  deliverables: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  estimatedHours: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string; // Internal logic identifier
}

export interface RoadmapProgress {
  completedPhases: string[]; // Array of completed phase IDs
  completedSteps: string[]; // Array of completed step IDs
  completedResources: string[];
  completedProjects: string[];
  completedInterviewQuestions: string[];
  achievements: string[];
  portfolioScore: number;
  studyHours: number;
}

export type UserProgressMap = Record<string, RoadmapProgress>;
