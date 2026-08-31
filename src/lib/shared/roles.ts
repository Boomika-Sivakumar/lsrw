import { CommunicationLevel } from "./types";

export interface UserProfile {
  id: string;
  userId: string; // unique public identifier, e.g. "BA1024"
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "TEACHER";
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

/** Level bands used to map an overall score (0-100) to a communication level. */
export const LEVEL_BANDS: Record<CommunicationLevel, [number, number]> = {
  BEGINNER: [0, 39],
  INTERMEDIATE: [40, 59],
  ADVANCED: [60, 79],
  PROFICIENT: [80, 100],
};

export function levelFromScore(score: number): CommunicationLevel {
  if (score >= 80) return CommunicationLevel.PROFICIENT;
  if (score >= 60) return CommunicationLevel.ADVANCED;
  if (score >= 40) return CommunicationLevel.INTERMEDIATE;
  return CommunicationLevel.BEGINNER;
}

export function scoreFromLevel(level: CommunicationLevel): number {
  const [min, max] = LEVEL_BANDS[level];
  return Math.round((min + max) / 2);
}
