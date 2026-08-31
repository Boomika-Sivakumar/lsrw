import type { UserRole } from "./types";

export interface UserDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface StudentProgressDTO {
  user: UserDTO;
  levels: {
    communication: string;
    listening: string;
    speaking: string;
    reading: string;
    writing: string;
  };
  latestScores: Record<string, number>;
  improvement: Record<string, number>;
  commonMistakes: { message: string; occurrences: number }[];
}

export interface DiscussionParticipantSummary {
  userId: string;
  name: string;
  speakingTimeSeconds: number;
  responseCount: number;
  participationPercent: number;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface GroupDiscussionSummary {
  roomId: string;
  topic: string;
  startedAt: string;
  endedAt: string;
  participants: DiscussionParticipantSummary[];
  majorTopics: string[];
  agreements: string[];
  disagreements: string[];
  conclusions: string[];
  overallQuality: string;
  leaderboard?: {
    bestCommunicator: string;
    bestListener: string;
    bestIdeaContributor: string;
    mostActive: string;
    overallPerformer: string;
  };
}
