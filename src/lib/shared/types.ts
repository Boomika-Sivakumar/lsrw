export const UserRole = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CommunicationLevel = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  PROFICIENT: "PROFICIENT",
} as const;
export type CommunicationLevel = (typeof CommunicationLevel)[keyof typeof CommunicationLevel];

export const LSRW_SKILLS = {
  LISTENING: "LISTENING",
  SPEAKING: "SPEAKING",
  READING: "READING",
  WRITING: "WRITING",
} as const;
export type LSRW_SKILLS = (typeof LSRW_SKILLS)[keyof typeof LSRW_SKILLS];

export const MetricKey = {
  LISTENING: "LISTENING",
  SPEAKING: "SPEAKING",
  READING: "READING",
  WRITING: "WRITING",
  GRAMMAR: "GRAMMAR",
  VOCABULARY: "VOCABULARY",
  PRONUNCIATION: "PRONUNCIATION",
  FLUENCY: "FLUENCY",
  COMPREHENSION: "COMPREHENSION",
  CONFIDENCE: "CONFIDENCE",
  PARTICIPATION: "PARTICIPATION",
} as const;
export type MetricKey = (typeof MetricKey)[keyof typeof MetricKey];

export const ALL_METRICS: MetricKey[] = [
  MetricKey.LISTENING,
  MetricKey.SPEAKING,
  MetricKey.READING,
  MetricKey.WRITING,
  MetricKey.GRAMMAR,
  MetricKey.VOCABULARY,
  MetricKey.PRONUNCIATION,
  MetricKey.FLUENCY,
  MetricKey.COMPREHENSION,
  MetricKey.CONFIDENCE,
  MetricKey.PARTICIPATION,
];

export const SKILL_KEYS: LSRW_SKILLS[] = [
  LSRW_SKILLS.LISTENING,
  LSRW_SKILLS.SPEAKING,
  LSRW_SKILLS.READING,
  LSRW_SKILLS.WRITING,
];

export const PracticeMode = {
  PRACTICE: "PRACTICE",
  ASSESSMENT: "ASSESSMENT",
  MOCK_INTERVIEW: "MOCK_INTERVIEW",
  PRESENTATION: "PRESENTATION",
  GROUP_DISCUSSION: "GROUP_DISCUSSION",
} as const;
export type PracticeMode = (typeof PracticeMode)[keyof typeof PracticeMode];

export const Difficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  ADAPTIVE: "ADAPTIVE",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const SpeakingScenario = {
  INTRODUCTION: "INTRODUCTION",
  WORKPLACE: "WORKPLACE",
  CUSTOMER_SERVICE: "CUSTOMER_SERVICE",
  TRAVEL: "TRAVEL",
  MEETING: "MEETING",
  DAILY_COMMUNICATION: "DAILY_COMMUNICATION",
  MOCK_INTERVIEW: "MOCK_INTERVIEW",
  PRESENTATION: "PRESENTATION",
  GROUP_DISCUSSION: "GROUP_DISCUSSION",
  PUBLIC_SPEAKING: "PUBLIC_SPEAKING",
  HR_DISCUSSION: "HR_DISCUSSION",
} as const;
export type SpeakingScenario = (typeof SpeakingScenario)[keyof typeof SpeakingScenario];

export const LearningGoal = {
  SPOKEN_ENGLISH: "SPOKEN_ENGLISH",
  INTERVIEW_COMMUNICATION: "INTERVIEW_COMMUNICATION",
  WORKPLACE_COMMUNICATION: "WORKPLACE_COMMUNICATION",
  PRESENTATION_SKILLS: "PRESENTATION_SKILLS",
  GRAMMAR: "GRAMMAR",
  VOCABULARY: "VOCABULARY",
  PRONUNCIATION: "PRONUNCIATION",
  READING: "READING",
  WRITING: "WRITING",
} as const;
export type LearningGoal = (typeof LearningGoal)[keyof typeof LearningGoal];

export const WritingType = {
  EMAIL: "EMAIL",
  ESSAY: "ESSAY",
  REPORT: "REPORT",
  APPLICATION: "APPLICATION",
  SUMMARY: "SUMMARY",
  MESSAGE: "MESSAGE",
  PROFESSIONAL_COMMUNICATION: "PROFESSIONAL_COMMUNICATION",
} as const;
export type WritingType = (typeof WritingType)[keyof typeof WritingType];

export const AssignmentStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const RoomStatus = {
  WAITING: "WAITING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const MistakeType = {
  GRAMMAR: "GRAMMAR",
  PRONUNCIATION: "PRONUNCIATION",
  VOCABULARY: "VOCABULARY",
  FLUENCY: "FLUENCY",
  SPELLING: "SPELLING",
  CONFIDENCE: "CONFIDENCE",
  COMPREHENSION: "COMPREHENSION",
  LISTENING: "LISTENING",
  WRITING: "WRITING",
  COMMUNICATION: "COMMUNICATION",
} as const;
export type MistakeType = (typeof MistakeType)[keyof typeof MistakeType];