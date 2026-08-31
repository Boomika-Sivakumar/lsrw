"""AI content generation: topics, questions, conversations, moderator,
summaries and assignment drafts. All routed through the LLM provider
abstraction with deterministic dev fallbacks."""
from typing import Dict, List

from app.ai.base import get_llm_provider
from app.ai.schemas import AssignmentDraft, ConversationReply, SummaryResult, TopicSet

SCENARIOS = [
    "self-introduction",
    "workplace",
    "customer-interaction",
    "travel",
    "meetings",
    "daily-communication",
    "hr-discussion",
    "professional-communication",
]

GD_TOPICS_DEFAULT = [
    "Is Artificial Intelligence beneficial for education?",
    "Should social media be regulated by governments?",
    "Is remote work the future of employment?",
    "Should college education be free for all students?",
    "Are electric vehicles truly sustainable?",
    "Does technology make people less social?",
]


def _safe_parse(data: dict, schema):
    try:
        return schema(**data)
    except Exception:
        if hasattr(schema, "model_fields"):
            defaults = {k: ([] if v.default is None and "list" in str(v.annotation) else v.default) for k, v in schema.model_fields.items()}
            return schema(**defaults)
        return schema()


def generate_topics(skill: str, context: str = "") -> TopicSet:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:topics You generate personalized practice topics."},
                {"role": "user", "content": f"skill: {skill}\ncontext: {context[:500]}"},
            ],
            TopicSet,
        )
        result = _safe_parse(data, TopicSet)
        if result.topics:
            return result
    except Exception:
        pass
    return _fallback_topics(skill)


def _fallback_topics(skill: str) -> TopicSet:
    bank = {
        "speaking": [
            "Describe your hometown.",
            "Talk about a skill you want to learn.",
            "Describe your career goal.",
            "Discuss the role of technology in daily life.",
            "Describe a person who inspires you.",
        ],
        "listening": [
            "A morning announcement",
            "A weather report",
            "A library notice",
        ],
        "reading": [
            "The Benefits of Reading",
            "Artificial Intelligence at Work",
            "Healthy Habits",
        ],
        "writing": [
            "Write a professional email requesting leave.",
            "Write an essay on the importance of communication skills.",
            "Write a short progress report.",
            "Write a cover letter for an entry-level position.",
        ],
        "interview": [
            "Tell me about yourself.",
            "What are your strengths and weaknesses?",
            "Describe a challenge you overcame.",
            "Where do you see yourself in five years?",
        ],
        "presentation": [
            "The future of artificial intelligence",
            "Why communication skills matter",
            "My career goals and how I plan to achieve them",
        ],
        "gd": GD_TOPICS_DEFAULT,
    }
    return TopicSet(topics=bank.get(skill, bank["speaking"]))


def generate_questions(skill: str, topic: str = "") -> List[Dict]:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:questions You generate practice questions."},
                {"role": "user", "content": f"skill: {skill}\ntopic: {topic[:200]}"},
            ],
        )
        questions = data.get("questions") or []
        if questions:
            return questions
    except Exception:
        pass
    return [
        {
            "type": "mcq",
            "prompt": "What is the main idea of the passage?",
            "options": ["A summary", "A supporting detail", "An opinion", "A question"],
            "answer": 0,
        },
        {
            "type": "truefalse",
            "prompt": "The passage presents factual information.",
            "answer": "true",
        },
        {
            "type": "shortanswer",
            "prompt": "Why is this topic important?",
        },
    ]


def conversation_turn(scenario: str, history: List[Dict], turn: int) -> ConversationReply:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": f"__ROUTE:conversation You are an AI conversation partner. scenario: {scenario}"},
                {"role": "user", "content": f"turn: {turn}\nhistory: {str(history)[-800:]}"},
            ],
            ConversationReply,
        )
        return ConversationReply(**{k: data.get(k, "") for k in ("message", "next_step", "evaluation")})
    except Exception:
        pass

    bank = {
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
    questions = bank.get(scenario, bank["self-introduction"])
    if turn >= len(questions):
        return ConversationReply(
            message="Thank you for the conversation. It was nice talking to you!",
            next_step="end",
        )
    return ConversationReply(message=questions[turn], next_step="ask_followup")


def moderator_message(state: str, topic: str, duration_seconds: int = 600) -> str:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:moderator You are an AI group-discussion moderator."},
                {"role": "user", "content": f"state: {state}\ntopic: {topic[:150]}\nduration: {duration_seconds}"},
            ],
        )
        msg = data.get("message")
        if msg:
            return msg
    except Exception:
        pass
    if state == "start":
        minutes = max(1, duration_seconds // 60)
        return f'Welcome everyone! Today\'s topic is: "{topic}". You have {minutes} minutes. Please begin!'
    if state == "timeout":
        return "We are approaching the end. Let's hear final thoughts from someone who has not spoken recently."
    if state == "pause":
        return "Let's pause here for a moment. Could someone summarize what we have agreed on so far?"
    if state == "encourage":
        return "Does anyone have a different viewpoint to share?"
    return f'Let\'s keep the discussion about "{topic}" going. Who would like to add a point?'


def generate_summary(transcript: str, topic: str) -> SummaryResult:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:summary You summarize group discussions."},
                {"role": "user", "content": f"topic: {topic}\n{transcript[:4000]}"},
            ],
            SummaryResult,
        )
        return SummaryResult(**{k: data.get(k, []) for k in ("major_ideas", "agreements", "disagreements")} | {"conclusion": data.get("conclusion", "")})
    except Exception:
        pass
    lines = [l.strip(" -•0123456789.").strip() for l in transcript.splitlines() if l.strip()]
    ideas = [l for l in lines if len(l.split()) >= 3][:6]
    return SummaryResult(
        major_ideas=ideas or ["Participants shared multiple viewpoints"],
        agreements=["The group generally agreed on the main points"],
        disagreements=["Different viewpoints were raised on specific details"],
        conclusion="The discussion was constructive and stayed on topic.",
    )


def generate_assignment(topic: str, objective: str) -> AssignmentDraft:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [
                {"role": "system", "content": "__ROUTE:assignment You create LSRW assignments."},
                {"role": "user", "content": f"topic: {topic[:150]}\nobjective: {objective[:200]}"},
            ],
            AssignmentDraft,
        )
        return AssignmentDraft(**data)
    except Exception:
        pass
    return AssignmentDraft(
        title=f"{topic[:80]} - Communication Activity",
        skill="writing",
        topic=topic,
        difficulty="intermediate",
        description=objective,
        questions=[
            {"type": "essay", "prompt": f"Write a short paragraph explaining your view on: {topic}."},
            {"type": "shortanswer", "prompt": f"List two advantages related to: {topic}."},
        ],
        assessment_criteria=["Clarity", "Grammar", "Relevance", "Vocabulary"],
    )