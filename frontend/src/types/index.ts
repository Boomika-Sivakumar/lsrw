export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "student" | "teacher" | "admin";
  user_id: string | null;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Scores {
  [skill: string]: number;
}

export interface AssessmentSummary {
  id: number;
  title: string;
  kind: string;
  status: string;
  overall_score: number | null;
  level: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
}

export interface MistakeItem {
  id?: number;
  category: string;
  text: string;
  corrected_text: string;
  explanation: string;
  occurrences?: number;
  last_detected?: string | null;
}

export interface RecommendationItem {
  id?: number;
  category: string;
  title: string;
  detail: string;
  activity: string;
  source?: string;
}

export interface AnalysisResult {
  scores: Scores;
  overall: number;
  level: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: MistakeItem[];
  recommendations: string[];
  feedback: string;
  transcript?: string;
  word_count?: number;
  wpm?: number;
  fillers?: string[];
  corrections?: Correction[];
  corrected_text?: string;
  reading_speed_wpm?: number;
  skipped_words?: number;
  repeated_words?: number;
  accuracy?: number;
}

export interface Correction {
  original: string;
  problem: string;
  corrected: string;
  explanation: string;
}

export interface Discussion {
  id: number;
  session_code: string;
  topic: string;
  description: string;
  difficulty: string;
  duration_seconds: number;
  participant_limit: number;
  status: string;
  assessment_criteria: string[];
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  group_score?: Record<string, unknown>;
  participant_count?: number;
  moderator_message?: string;
  participants?: DiscussionParticipant[];
  is_joined?: boolean;
}

export interface DiscussionParticipant {
  id?: number;
  user_id: string;
  full_name: string;
  role: string;
  connected?: string;
  joined_at?: string | null;
}

export interface Segment {
  speaker: string;
  text: string;
  start_time: number;
  end_time: number;
  is_interruption?: string;
  interrupted_speaker?: string | null;
}

export interface Assignment {
  id: number;
  title: string;
  skill: string;
  topic: string;
  difficulty: string;
  description: string;
  questions: Array<Record<string, unknown>>;
  assessment_criteria: string[];
  deadline?: string | null;
  created_at?: string | null;
  submitted?: boolean;
  score?: number | null;
  status?: string;
}
