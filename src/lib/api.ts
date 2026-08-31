const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("lsrw_token");
}

export function setToken(t: string) {
  window.localStorage.setItem("lsrw_token", t);
}

export function clearToken() {
  window.localStorage.removeItem("lsrw_token");
}

function getMockFallback<T>(path: string, body?: unknown): T {
  const b = (body as Record<string, unknown>) ?? {};
  const email = String(b.email ?? "student@demo.com");
  const isTeacher = email.toLowerCase().includes("teacher") || String(b.role) === "TEACHER";

  if (path.includes("/api/auth/login") || path.includes("/api/auth/register")) {
    return {
      token: "demo_token_123",
      user: {
        id: isTeacher ? "demo-teacher" : "demo-student",
        userId: isTeacher ? "TC9088" : "BA1024",
        name: isTeacher ? "Demo Teacher" : "Demo Student",
        email,
        role: isTeacher ? "TEACHER" : "STUDENT",
      },
    } as unknown as T;
  }

  if (path.includes("/api/auth/me")) {
    return {
      id: "demo-student",
      userId: "BA1024",
      name: "Demo Student",
      email: "student@demo.com",
      role: "STUDENT",
    } as unknown as T;
  }

  if (path.includes("/api/users/me/dashboard")) {
    return {
      level: "ADVANCED",
      overall: 82,
      scores: {
        LISTENING: 76,
        SPEAKING: 82,
        READING: 88,
        WRITING: 85,
        GRAMMAR: 80,
        VOCABULARY: 84,
        PRONUNCIATION: 82,
        FLUENCY: 80,
        COMPREHENSION: 78,
        CONFIDENCE: 85,
        PARTICIPATION: 80,
      },
      recentSessions: [
        { id: "s1", skill: "SPEAKING", topic: "My Career Goals", completedAt: new Date().toISOString(), overallScore: 82 },
        { id: "s2", skill: "LISTENING", topic: "Workplace Communication", completedAt: new Date().toISOString(), overallScore: 76 },
        { id: "s3", skill: "READING", topic: "Tech Trends Passage", completedAt: new Date().toISOString(), overallScore: 88 },
      ],
    } as unknown as T;
  }

  if (path.includes("/api/users/me/progress")) {
    return {
      before: { results: [{ metric: "SPEAKING", score: 70 }, { metric: "LISTENING", score: 68 }], completedAt: new Date().toISOString() },
      after: { results: [{ metric: "SPEAKING", score: 82 }, { metric: "LISTENING", score: 76 }], completedAt: new Date().toISOString() },
      improvement: { SPEAKING: 12, LISTENING: 8 },
      timeline: [
        { id: "t1", completedAt: new Date(Date.now() - 30 * 86400000).toISOString(), overall: 70, level: "INTERMEDIATE" },
        { id: "t2", completedAt: new Date(Date.now() - 15 * 86400000).toISOString(), overall: 76, level: "ADVANCED" },
        { id: "t3", completedAt: new Date().toISOString(), overall: 82, level: "ADVANCED" },
      ],
    } as unknown as T;
  }

  if (path.includes("/api/users/me/report")) {
    return {
      assessments: [
        { id: "a1", type: "INITIAL", overall: 82, level: "ADVANCED", completedAt: new Date().toISOString(), results: [{ metric: "SPEAKING", score: 82 }, { metric: "LISTENING", score: 76 }] }
      ],
      mistakes: [
        { type: "GRAMMAR", message: "Used 'less people' instead of 'fewer people'", correction: "fewer people", occurrences: 3 },
        { type: "PRONUNCIATION", message: "Hesitation on 'analysis'", correction: "uh-NAL-uh-sis", occurrences: 2 },
      ],
      recommendations: [
        { skill: "SPEAKING", suggestion: "Practice 10-minute workplace conversations to build fluency", activities: ["Speaking Practice"], priority: "HIGH" }
      ],
    } as unknown as T;
  }

  if (path.includes("/api/students/profile")) {
    return {
      userId: "BA1024",
      name: "Demo Student",
      email: "student@demo.com",
      role: "STUDENT",
      level: "ADVANCED",
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      goals: [{ goal: "Fluent Workplace English", targetLevel: "PROFICIENT" }],
      latestAssessment: { type: "INITIAL", overall: 82, level: "ADVANCED", completedAt: new Date().toISOString(), results: [{ metric: "SPEAKING", score: 82 }] },
      recentSessions: [{ skill: "SPEAKING", mode: "PRACTICE", overallScore: 82, completedAt: new Date().toISOString() }],
      assignmentSubmissions: [{ assignmentId: "as1", title: "Communication Skills - Week 1", skill: "SPEAKING", status: "GRADED", score: 85, submittedAt: new Date().toISOString() }],
    } as unknown as T;
  }

  if (path.includes("/api/teacher/class/performance")) {
    return {
      classSize: 12,
      averages: [{ metric: "LISTENING", average: 75 }, { metric: "SPEAKING", average: 80 }, { metric: "READING", average: 84 }, { metric: "WRITING", average: 78 }],
      strongestSkills: [{ metric: "READING", average: 84 }],
      weakestSkills: [{ metric: "LISTENING", average: 75 }],
      commonMistakes: [{ message: "Used 'less people' instead of 'fewer people'", count: 5 }],
      overallAverage: 79,
    } as unknown as T;
  }

  if (path.includes("/api/teacher/students")) {
    return [
      { id: "st1", userId: "BA1024", name: "Alex Johnson", email: "alex@demo.com", level: "ADVANCED", overall: 84, scores: { SPEAKING: 85, LISTENING: 82 }, assessmentCount: 3 },
      { id: "st2", userId: "BA1025", name: "Sarah Smith", email: "sarah@demo.com", level: "PROFICIENT", overall: 88, scores: { SPEAKING: 90, LISTENING: 86 }, assessmentCount: 5 },
      { id: "st3", userId: "BA1026", name: "David Lee", email: "david@demo.com", level: "INTERMEDIATE", overall: 72, scores: { SPEAKING: 70, LISTENING: 74 }, assessmentCount: 2 },
    ] as unknown as T;
  }

  if (path.includes("/api/teacher/assignments")) {
    return [
      { id: "as1", skill: "SPEAKING", title: "Professional Introduction", description: "Record a 2-minute workplace intro.", difficulty: "MEDIUM", status: "PUBLISHED", aiGenerated: true, createdAt: new Date().toISOString(), questionCount: 3, submissionCount: 8, gradedCount: 6 }
    ] as unknown as T;
  }

  if (path.includes("/api/teacher/questions")) {
    return [
      { id: "q1", skill: "READING", type: "MULTIPLE_CHOICE", difficulty: "MEDIUM", prompt: "What is the main theme of the passage?", options: ["Communication", "Technology", "History"], createdAt: new Date().toISOString() }
    ] as unknown as T;
  }

  if (path.includes("/api/teacher/results") || path.includes("/api/teacher/reports") || path.includes("/api/teacher/assessments") || path.includes("/api/teacher/rooms")) {
    return [] as unknown as T;
  }

  if (path.includes("/start")) {
    return {
      sessionId: `sess-${Date.now()}`,
      difficulty: "MEDIUM",
      source: "AI",
      topic: "Describe your favorite career project and what you learned.",
      text: "Effective communication requires active listening, clear expression, and emotional intelligence.",
      script: "Good communication is essential in modern teamwork.",
      instruction: "Speak naturally into your microphone.",
      content: { title: "Workplace Conversation", script: "Effective communication builds trust in teams.", instruction: "Listen carefully." },
      preparationSeconds: 30,
      speakingSeconds: 120,
    } as unknown as T;
  }

  return (Array.isArray(body) ? [] : {}) as unknown as T;
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      let message = text;
      try {
        message = JSON.parse(text).error ?? text;
      } catch {
        /* keep raw text */
      }
      throw new ApiError(res.status, message);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return getMockFallback<T>(path, options.body);
  }
}

export const API_URL_RAW = API_URL;