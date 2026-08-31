import type { MetricKey } from "@/lib/shared";

const LABELS: Record<string, string> = {
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  READING: "Reading",
  WRITING: "Writing",
  GRAMMAR: "Grammar",
  VOCABULARY: "Vocabulary",
  PRONUNCIATION: "Pronunciation",
  FLUENCY: "Fluency",
  COMPREHENSION: "Comprehension",
  CONFIDENCE: "Confidence",
  PARTICIPATION: "Participation",
};

export function metricLabel(key: string): string {
  return LABELS[key] ?? key.toLowerCase().replace(/_/g, " ");
}

export function deriveStrengths(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v >= 80)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => metricLabel(k));
}

export function deriveWeaknesses(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v < 70)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => metricLabel(k));
}

export const INSIGHT_HINTS: Record<string, string> = {
  GRAMMAR: "grammar accuracy",
  VOCABULARY: "vocabulary range",
  PRONUNCIATION: "clear pronunciation",
  FLUENCY: "smooth fluency",
  COMPREHENSION: "listening comprehension",
  CONFIDENCE: "confident delivery",
  PARTICIPATION: "active participation",
};

export function buildRecommendation(scores: Record<string, number>): string {
  const strengths = deriveStrengths(scores);
  const weak = deriveWeaknesses(scores);

  const strengthLine =
    strengths.length > 0
      ? `Your ${strengths.slice(0, 2).join(" and ").toLowerCase()} are strong — keep building on them.`
      : "You're building a solid foundation across skills.";

  let focusLine = "Next, focus on your listening and comprehension by doing a short audio exercise.";
  const priority = weak[0];
  if (priority === "Grammar") focusLine = "Focus on grammar accuracy with today's grammar challenge.";
  else if (priority === "Fluency") focusLine = "Try a 10-minute workplace conversation to build fluency.";
  else if (priority === "Pronunciation") focusLine = "Practice pronunciation with 5 minutes of read-aloud.";
  else if (priority === "Comprehension") focusLine = "Improve active listening with today's comprehension exercise.";
  else if (priority === "Confidence") focusLine = "Do a 3-minute self-introduction to boost confidence.";
  else if (priority === "Participation") focusLine = "Join a group discussion to increase participation.";
  else if (priority === "Vocabulary") focusLine = "Complete the vocabulary builder before your next session.";
  else if (priority === "Speaking") focusLine = "Have a short AI conversation to sharpen speaking.";
  else if (priority === "Reading") focusLine = "Try a reading comprehension passage next.";
  else if (priority === "Writing") focusLine = "Write a professional email to practice writing.";

  return `${strengthLine} ${focusLine} Recommended next step: start a quick ${weak[0]?.toLowerCase() ?? "practice"} session now.`;
}