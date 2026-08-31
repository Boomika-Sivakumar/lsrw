import type { MetricKey } from "./types";

/** A 0-100 score for a single metric within a session/assessment. */
export interface MetricScore {
  metric: MetricKey;
  score: number; // 0-100
  detail?: string; // human explanation of how this was derived
}

export interface SkillScores {
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  fluency: number;
  comprehension: number;
  confidence: number;
  participation: number;
}

/** A single detected mistake with its occurrence history for mistake-analysis (UC 49). */
export interface Mistake {
  id?: string;
  type: string; // MistakeType
  message: string; // e.g. "Used 'less people' instead of 'fewer people'"
  correction?: string;
  occurrences: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  context?: string;
}

export interface StrengthWeakness {
  strengths: string[];
  weaknesses: string[];
}

export interface Recommendation {
  skill: string;
  suggestion: string;
  activities: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface SessionReport {
  sessionId: string;
  userId: string;
  scores: MetricScore[];
  mistakes: Mistake[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  overallScore: number;
  summary: string; // the "understands the individual" narrative
  createdAt: string;
}
