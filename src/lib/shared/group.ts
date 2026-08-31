import type { Difficulty } from "./types";

export interface CreateRoomRequest {
  topic: string;
  durationMinutes: number;
  difficulty: Difficulty;
  maxParticipants: number;
  /** Assessment criteria selected by the teacher (UC 27). */
  criteria: ("FLUENCY" | "GRAMMAR" | "VOCABULARY" | "PRONUNCIATION" | "CONFIDENCE" | "LISTENING" | "PARTICIPATION" | "IDEA_CONTRIBUTION")[];
  startAt?: string;
}

export interface RoomDTO {
  id: string;
  sessionCode: string; // Discussion ID / Session Code (UC 28)
  topic: string;
  durationMinutes: number;
  difficulty: Difficulty;
  maxParticipants: number;
  status: "WAITING" | "ACTIVE" | "COMPLETED";
  participantCount: number;
  livekitRoom: string;
  token?: string;
  createdBy: string;
  createdAt: string;
}

export interface JoinRoomRequest {
  sessionCode: string;
  userId: string;
}

export interface TranscriptTurn {
  userId: string;
  speakerLabel: string; // e.g. "BA1024"
  text: string;
  startAt: number; // ms from session start
  endAt: number;
  confidence: number;
  wordsPerMinute: number;
}

export interface UtteranceMetrics {
  turnDuration: number;
  wordsPerMinute: number;
  pauseCount: number;
  pauseDurationMs: number;
  fillerWords: string[];
  repeatedWords: string[];
  interruptionCount: number; // overlapping speech detected (UC 36)
  pronunciationIssues: string[];
  grammarIssues: string[];
  sentenceFlow: "SMOOTH" | "OK" | "CHOPPY";
}

export interface SpeakerMetrics extends UtteranceMetrics {
  userId: string;
  speakingTimeSeconds: number;
  responseCount: number;
  meaningfulContributions: number;
  participationPercent: number;
  turnTaking: number; // 0-100
  activeListening: number; // 0-100
  ideaContribution: number; // 0-100
  relevance: number; // 0-100
  clarity: number; // 0-100
  interruptions: number; // count of interruptions by this speaker
}

export interface GroupAnalysisResult {
  speakers: SpeakerMetrics[];
  transcript: TranscriptTurn[];
  communicationFlow: number; // 0-100
  collaboration: number;
  topicRelevance: number;
  participationBalance: number;
  overallQuality: number;
  interruptionsCount: number;
  summary: {
    majorTopics: string[];
    agreements: string[];
    disagreements: string[];
    conclusions: string[];
  };
}

export interface RealTimeGroupSnapshot {
  roomId: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  participants: {
    userId: string;
    name: string;
    speakingTimeSeconds: number;
    speakingNow: boolean;
    participationPercent: number;
    currentScore: number;
  }[];
}
