"""DEVELOPMENT / MOCK AI providers.

These providers are used when AI_PROVIDER=development or STT_PROVIDER=development
(default). They perform deterministic, rule-based heuristic analysis so the full
application flow works end-to-end WITHOUT any external API keys.

They are explicitly marked as development providers. They do NOT pretend to be a
real AI model. To get real AI analysis, set AI_PROVIDER=openai_compatible and
provide AI_API_KEY / AI_BASE_URL, or swap in a different provider.

The interfaces (LLMProvider / SpeechProvider) are identical to real providers so
replacing them requires no changes elsewhere in the codebase.
"""
import re
from typing import Any, Dict, List

from app.ai import schemas
from app.ai.base import LLMProvider, SpeechProvider

FILLERS = ["um", "uh", "like", "you know", "basically", "actually", "i mean", "er", "hmm", "so", "well"]

SIMPLE_GRAMMAR_PATTERNS = [
    ("subject-verb agreement", re.compile(r"\b(he|she|it) (are|were)\b", re.I), "Use 'is'/'was' with third-person singular subjects."),
    ("subject-verb agreement", re.compile(r"\b(they|we|you) (is|was)\b", re.I), "Use 'are'/'were' with plural subjects."),
    ("past tense", re.compile(r"\b(i|he|she|we|they) (go|went) (to|at) yesterday\b", re.I), "Use past tense consistently."),
    ("article usage", re.compile(r"\ba (apple|orange|hour|honest)\b", re.I), "Use 'an' before vowel sounds."),
    ("preposition", re.compile(r"\bdepend (from|at)\b", re.I), "Use 'depend on'."),
    ("preposition", re.compile(r"\bmarried (to|for) (the |a )?\w+\b", re.I), "Use 'married to'."),
    ("double negative", re.compile(r"\bdon'?t (know|think|have) nothing\b", re.I), "Avoid double negatives."),
]

INTERVIEW_BANK = [
    "Tell me about yourself.",
    "What are your strengths and weaknesses?",
    "Why do you want this role?",
    "Describe a challenge you overcame.",
    "Where do you see yourself in five years?",
    "How do you handle pressure or deadlines?",
    "Tell me about a time you worked in a team.",
    "Why should we hire you?",
]

CONVERSATION_BANK = {
    "self-introduction": [
        "Hello! Could you start by introducing yourself?",
        "That's great. What do you enjoy most about your work or studies?",
        "Interesting! What are your long-term goals?",
        "How do you usually spend your weekends?",
    ],
    "workplace": [
        "Good morning. Could you walk me through your typical workday?",
        "How do you handle disagreements with colleagues?",
        "What tools do you use to stay organized?",
    ],
    "customer-interaction": [
        "Welcome! How can I help you today?",
        "Could you describe the issue in a bit more detail?",
        "Thank you for explaining. What would be the ideal outcome for you?",
    ],
    "travel": [
        "Where are you planning to travel next?",
        "What is your favorite place you have visited and why?",
        "Do you prefer planning trips in advance or being spontaneous?",
    ],
    "meetings": [
        "Let's begin the meeting. Could you share your updates first?",
        "Do you have any concerns about the current timeline?",
        "What do you think we should prioritize this quarter?",
    ],
    "daily-communication": [
        "How is your day going so far?",
        "What did you do earlier today?",
        "What are you looking forward to this week?",
    ],
    "hr-discussion": [
        "Welcome to the discussion. Could you tell me about your experience?",
        "What are you looking for in your next role?",
        "How do you prefer to receive feedback?",
    ],
    "professional-communication": [
        "Could you give me a quick summary of your current responsibilities?",
        "How do you communicate with stakeholders?",
        "What improvements would you suggest for our team communication?",
    ],
}

SPEAKING_TOPICS = [
    "Describe your hometown.",
    "Talk about a skill you want to learn.",
    "Describe your career goal.",
    "Discuss the role of technology in daily life.",
    "Describe a person who inspires you.",
    "Talk about your daily routine.",
    "Describe a memorable trip.",
    "Discuss the importance of teamwork.",
    "Talk about your favorite book or movie.",
    "Describe a challenge you overcame.",
]

GD_TOPICS = [
    "Is Artificial Intelligence beneficial for education?",
    "Should social media be regulated?",
    "Is remote work the future?",
    "Should college education be free?",
    "Are electric vehicles truly sustainable?",
    "Does technology make people less social?",
    "Should exams be replaced by continuous assessment?",
    "Is online learning as effective as classroom learning?",
]

READING_PASSAGES = [
    {
        "title": "The Benefits of Reading",
        "text": "Reading regularly improves vocabulary, concentration, and empathy. Studies show that people who read for at least twenty minutes a day retain information better and communicate more clearly. Schools encourage reading programs because strong readers tend to perform well across all subjects.",
    },
    {
        "title": "Artificial Intelligence at Work",
        "text": "Artificial intelligence is changing the workplace by automating repetitive tasks. While some fear job losses, experts argue that AI creates new roles that require human judgment and creativity. The key is to use AI as a tool that supports people rather than replaces them.",
    },
    {
        "title": "Healthy Habits",
        "text": "Sleep, exercise, and nutrition form the foundation of good health. Experts recommend at least seven hours of sleep, thirty minutes of moderate exercise, and a balanced diet. Small consistent changes matter more than short-term extreme efforts.",
    },
]

WRITING_PROMPTS = [
    {
        "type": "email",
        "title": "Professional Email",
        "prompt": "Write a professional email to your manager requesting two days of leave next week, explaining the reason and how you will ensure work continues.",
    },
    {
        "type": "essay",
        "title": "Short Essay",
        "prompt": "Write a short essay on: 'The importance of communication skills in the modern workplace.' (150-250 words)",
    },
    {
        "type": "report",
        "title": "Progress Report",
        "prompt": "Write a short progress report on a project you recently worked on, including what was completed, what remains, and any challenges.",
    },
    {
        "type": "application",
        "title": "Cover Letter",
        "prompt": "Write a cover letter applying for an entry-level position at a company of your choice.",
    },
    {
        "type": "summary",
        "title": "Article Summary",
        "prompt": "Summarize the following passage in 3-4 sentences: 'Remote work has grown rapidly. Companies report both higher productivity and new challenges such as isolation and work-life boundaries. Many organizations now adopt hybrid models that combine office and home days.'",
    },
    {
        "type": "message",
        "title": "Professional Message",
        "prompt": "Write a polite message to a colleague asking them to review a document before the end of the day.",
    },
]

LISTENING_SCRIPTS = [
    {
        "title": "Morning Announcement",
        "script": "Good morning everyone. Today's workshop will begin at ten in room 204. Please bring your student ID cards. Lunch will be served at one in the cafeteria.",
        "questions": [
            {"q": "What time does the workshop begin?", "answer": "ten / 10 o'clock"},
            {"q": "Which room is the workshop in?", "answer": "room 204"},
            {"q": "Where will lunch be served?", "answer": "the cafeteria"},
        ],
    },
    {
        "title": "Weather Report",
        "script": "Here is today's weather. The morning will be sunny with a high of twenty-five degrees. By evening, clouds will move in and light rain is expected around nine. Tomorrow will be cooler.",
        "questions": [
            {"q": "What is the forecast for the morning?", "answer": "sunny"},
            {"q": "What is the high temperature expected?", "answer": "twenty-five / 25 degrees"},
            {"q": "When is light rain expected?", "answer": "around nine / evening"},
        ],
    },
    {
        "title": "Library Notice",
        "script": "The library will close early on Friday at five. The online catalogue will be unavailable from Saturday to Monday for maintenance. Please return borrowed books before the weekend.",
        "questions": [
            {"q": "What time does the library close on Friday?", "answer": "five / 5 o'clock"},
            {"q": "When will the online catalogue be unavailable?", "answer": "saturday to monday"},
            {"q": "What should students do before the weekend?", "answer": "return borrowed books"},
        ],
    },
]


def _wpm(word_count: int, duration_ms: int) -> float:
    minutes = max(duration_ms, 1) / 60000.0
    return round(word_count / minutes, 1)


def _count_fillers(text: str) -> List[str]:
    words = re.split(r"\s+", text.lower())
    return [w for w in words if w.strip(".,!?") in FILLERS]


def _detect_grammar(text: str) -> List[Dict[str, str]]:
    findings = []
    for label, pattern, expl in SIMPLE_GRAMMAR_PATTERNS:
        for m in pattern.finditer(text):
            start = max(0, m.start() - 40)
            ctx = text[start:m.end() + 40].replace("\n", " ")
            findings.append(
                {
                    "category": "grammar",
                    "text": ctx.strip(),
                    "corrected_text": "",
                    "explanation": f"{label}: {expl}",
                }
            )
    return findings


def _score_clip(*parts) -> float:
    vals = [p for p in parts if isinstance(p, (int, float))]
    if not vals:
        return 60.0
    return round(max(20.0, min(98.0, sum(vals) / len(vals))), 1)


class DevelopmentLLMProvider(LLMProvider):
    """Deterministic development/mock LLM. Marked as a development provider."""

    name = "development-mock"

    def chat(
        self,
        messages: List[Dict[str, str]],
        response_schema: Any = None,
        temperature: float = 0.4,
    ) -> Dict[str, Any]:
        # Locate the routing tag in the system prompt if present.
        system = next((m["content"] for m in messages if m.get("role") == "system"), "")
        user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
        route = re.search(r"__ROUTE:(\w+)", system)
        kind = route.group(1) if route else "generic"
        handler = getattr(self, f"_route_{kind}", self._route_generic)
        return handler(user, system, response_schema)

    # ---- generation routes ----

    def _route_topics(self, user: str, system: str, schema):
        skill = re.search(r"skill[:=]\s*(\w+)", user, re.I)
        skill = skill.group(1) if skill else "speaking"
        bank = {
            "speaking": SPEAKING_TOPICS,
            "listening": [f"Listening comprehension: {t}" for t in SPEAKING_TOPICS[:5]],
            "reading": READING_PASSAGES,
            "writing": [p["prompt"] for p in WRITING_PROMPTS[:4]],
            "interview": INTERVIEW_BANK,
            "presentation": [t for t in SPEAKING_TOPICS[:5]],
            "gd": GD_TOPICS,
        }.get(skill, SPEAKING_TOPICS)
        return {"topics": bank[:6]}

    def _route_questions(self, user: str, system: str, schema):
        skill = re.search(r"skill[:=]\s*(\w+)", user, re.I)
        skill = skill.group(1) if skill else "reading"
        topic = re.search(r"topic[:=]\s*(.+)", user, re.I)
        topic = (topic.group(1).strip() if topic else "General")[:100]
        questions = []
        if skill == "mcq":
            questions = [
                {"type": "mcq", "prompt": f"According to the text about '{topic}', which statement is true?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0},
            ]
        elif skill == "truefalse":
            questions = [{"type": "truefalse", "prompt": f"True or False: '{topic}' is the main idea of the passage.", "answer": "true"}]
        elif skill == "shortanswer":
            questions = [{"type": "shortanswer", "prompt": f"Summarize the main idea about '{topic}' in one sentence."}]
        else:
            questions = [
                {"type": "mcq", "prompt": "What is the main idea of the passage?", "options": ["A summary", "A detail", "An opinion", "A question"], "answer": 0},
                {"type": "truefalse", "prompt": "The passage provides factual information.", "answer": "true"},
                {"type": "shortanswer", "prompt": "Why is this topic important?"},
            ]
        return {"skill": skill, "questions": questions}

    def _route_moderator(self, user: str, system: str, schema):
        # Generate a moderator line relevant to the current discussion state.
        topic = re.search(r"topic[:=]\s*(.+)", user, re.I)
        topic = (topic.group(1).strip() if topic else "our topic")[:150]
        state = re.search(r"state[:=]\s*(\w+)", user, re.I)
        state = (state.group(1) if state else "start").lower()
        if state == "start":
            return {"message": f"Welcome everyone! Today's topic is: \"{topic}\". I will moderate the discussion. Please speak clearly, take turns, and support your points with reasons. Let's begin!"}
        if state == "timeout":
            return {"message": "We are approaching the end. Let's hear final thoughts from someone who has not spoken recently."}
        if state == "pause":
            return {"message": "Let's pause here for a moment. Could someone summarize what we have agreed on so far?"}
        if state == "encourage":
            return {"message": "Does anyone have a different viewpoint to share?"}
        return {"message": f"Let's keep the discussion about \"{topic}\" going. Who would like to add a point?"}

    def _route_feedback(self, user: str, system: str, schema):
        scores = {}
        for m in re.finditer(r"(\w+)_score[:=]\s*([\d.]+)", user):
            scores[m.group(1)] = float(m.group(2))
        strengths = []
        weaknesses = []
        for name, val in scores.items():
            if val >= 75:
                strengths.append(f"Strong {name.replace('_', ' ')}")
            elif val < 60:
                weaknesses.append(f"Needs improvement in {name.replace('_', ' ')}")
        feedback = "Good work overall. "
        if strengths:
            feedback += "Keep building on: " + ", ".join(strengths) + ". "
        if weaknesses:
            feedback += "Focus on: " + ", ".join(weaknesses) + "."
        else:
            feedback += "Try slightly harder content next time."
        return {"feedback": feedback}

    def _route_assignment(self, user: str, system: str, schema):
        topic = re.search(r"topic[:=]\s*(.+)", user, re.I)
        topic = (topic.group(1).strip() if topic else "General topic")[:100]
        objective = re.search(r"objective[:=]\s*(.+)", user, re.I)
        objective = (objective.group(1).strip() if objective else "Improve communication skills")[:150]
        return {
            "title": f"{topic} - Communication Activity",
            "skill": "writing",
            "topic": topic,
            "difficulty": "intermediate",
            "description": objective,
            "questions": [
                {"type": "essay", "prompt": f"Write a short paragraph explaining your view on: {topic}."},
                {"type": "shortanswer", "prompt": f"List two advantages related to: {topic}."},
            ],
            "assessment_criteria": ["Clarity", "Grammar", "Relevance", "Vocabulary"],
        }

    def _route_summary(self, user: str, system: str, schema):
        lines = [l.strip(" -•0123456789.").strip() for l in user.splitlines() if l.strip()]
        ideas = [l for l in lines if len(l.split()) >= 3][:6]
        return {
            "major_ideas": ideas or ["Participants shared multiple viewpoints"],
            "agreements": ["The group generally agreed on the main points"],
            "disagreements": ["Different viewpoints were raised on specific details"],
            "conclusion": "The discussion was constructive and stayed on topic.",
        }

    def _route_conversation(self, user: str, system: str, schema):
        scenario = re.search(r"scenario[:=]\s*(\w+)", user, re.I)
        scenario = (scenario.group(1) if scenario else "self-introduction").lower()
        turn = re.search(r"turn[:=]\s*(\d+)", user, re.I)
        turn = int(turn.group(1)) if turn else 0
        bank = CONVERSATION_BANK.get(scenario, CONVERSATION_BANK["self-introduction"])
        if turn >= len(bank):
            return {"message": "Thank you for the conversation. It was nice talking to you!", "next_step": "end", "evaluation": None}
        return {"message": bank[turn], "next_step": "ask_followup", "evaluation": None}

    def _route_coach(self, user: str, system: str, schema):
        message = re.search(r"student message[:=]\s*(.+)", user, re.S | re.I)
        message = message.group(1).strip() if message else ""
        context = re.search(r"context[:=]\s*(.+)", user, re.S | re.I)
        context = context.group(1).strip() if context else ""
        from app.services.coach import _detect_problem, _PROBLEM_SOLUTIONS, _fallback_coach

        problem = _detect_problem(message)
        if problem and problem in _PROBLEM_SOLUTIONS:
            sol = dict(_PROBLEM_SOLUTIONS[problem])
            reply = f"I understand what you're working on. {sol['summary']}"
            return {"reply": reply, "solution": sol}
        weak = [w.strip() for w in re.findall(r"weak areas[:=]\s*([^;]+)", context)]
        if weak and weak[0] and weak[0].lower() != "none":
            return {
                "reply": f"Based on your latest analysis, let's focus on: {weak[0]}. Tell me exactly what you struggle with and I will give you a step-by-step plan.",
                "solution": None,
            }
        return {
            "reply": "Tell me what you want to improve — grammar, fluency, pronunciation, vocabulary, confidence, interviews, or presentations — and I will give you a clear, personal solution.",
            "solution": None,
        }



    def _route_recap(self, user: str, system: str, schema):
        topic = re.search(r"topic[:=]\s*(.+)", user, re.I)
        topic = (topic.group(1).strip() if topic else "our discussion")[:100]
        lines = [l.strip(" -•0123456789.").strip() for l in user.splitlines() if l.strip()]
        # Drop the "topic:" prefix line if present
        key_points = [l for l in lines if len(l.split()) >= 4 and ":" in l][:8]
        if not key_points:
            key_points = [l for l in lines if len(l.split()) >= 4][:8]
        if not key_points:
            key_points = ["The group discussed the topic and exchanged viewpoints."]
        return {
            "title": f"Recap - {topic}",
            "key_points": key_points,
            "decisions": ["The group agreed to continue exploring the main points raised."],
            "action_items": ["Review the transcript and practice the new vocabulary from the discussion."],
            "speaker_summary": "All participants contributed to the conversation with relevant ideas.",
        }

    def _route_grammar(self, user: str, system: str, schema):
        # Simple deterministic grammar explanation route.
        sentence = re.search(r"sentence[:=]\s*(.+)", user, re.I)
        sentence = sentence.group(1).strip() if sentence else ""
        if "go to yesterday" in sentence.lower() or "went to at" in sentence.lower():
            return {"original": sentence, "problem": "Past tense is used incorrectly.", "corrected": sentence.replace("go to yesterday", "went yesterday"), "explanation": "Use the past form 'went' with a past time reference."}
        return {"original": sentence, "problem": "", "corrected": sentence, "explanation": "No obvious grammar issue detected."}

    def _route_generic(self, user: str, system: str, schema):
        if schema:
            fields = schema.model_fields.keys()
            data = {}
            for f in fields:
                data[f] = [] if f in ("topics", "questions", "strengths", "weaknesses", "mistakes", "recommendations", "corrections") else (0.0 if "score" in f else "")
            return data
        return {"message": "This is a development mock response."}


class DevelopmentSpeechProvider(SpeechProvider):
    """Development/mock speech-to-text.

    It cannot truly transcribe audio. When a `fallback_text` is supplied by the
    client (e.g. produced by the browser Web Speech API), it returns that text.
    Otherwise it returns an empty string and raises a clear error message.
    """

    name = "development-mock"

    def __init__(self):
        self._last_fallback = ""

    def transcribe(self, audio_bytes: bytes, language: str = "en") -> str:
        text = self._last_fallback or ""
        if not text:
            raise RuntimeError(
                "Development speech provider cannot transcribe audio. "
                "Provide a 'transcript' field (browser Web Speech API) or configure "
                "a real STT provider via STT_PROVIDER."
            )
        return text

    def set_fallback(self, text: str):
        self._last_fallback = text or ""

    def supports_diarization(self) -> bool:
        return False


class WhisperSpeechProvider(DevelopmentSpeechProvider):
    """Placeholder for a local Whisper-based STT provider.

    The application architecture supports plugging in a real speech engine here.
    No local model is bundled; configure the environment to enable it.
    """

    name = "whisper-dev-placeholder"
