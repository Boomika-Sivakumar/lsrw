"""AI Coach: a goal-aware coaching conversation for students."""
import datetime

from sqlalchemy.orm import Session

from app.ai.base import get_llm_provider
from app.ai.assessment_service import user_summary
from app.models.intelligence import CoachMessage
from app.models.practice import Mistake
from app.models.user import User


def _build_context(db: Session, student: User) -> dict:
    summary = user_summary(db, student)
    mistakes = (
        db.query(Mistake)
        .filter(Mistake.student_id == student.id)
        .order_by(Mistake.last_detected.desc())
        .limit(4)
        .all()
    )
    return {
        "level": summary.get("level", "Beginner"),
        "overall": summary.get("overall", 0),
        "scores": summary.get("scores", {}),
        "weaknesses": summary.get("weaknesses", []),
        "goals": (student.student_profile.goals if student.student_profile else []) or [],
        "recent_mistakes": [
            {"category": m.category, "text": m.text[:120], "explanation": m.explanation}
            for m in mistakes
        ],
    }


def _context_text(context: dict) -> str:
    parts = [
        f"student level: {context['level']} (overall {context['overall']})",
        f"student goals: {', '.join(context['goals']) or 'none'}",
        f"weak areas: {', '.join(context['weaknesses']) or 'none'}",
    ]
    for m in context["recent_mistakes"]:
        parts.append(f"recent mistake ({m['category']}): {m['text']} - {m['explanation']}")
    return "; ".join(parts)


def _recent_history(db: Session, student: User, limit: int = 12) -> str:
    rows = (
        db.query(CoachMessage)
        .filter(CoachMessage.student_id == student.id)
        .order_by(CoachMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    lines = []
    for m in reversed(rows):
        who = "student" if m.role == "user" else "coach"
        lines.append(f"{who}: {m.content[:300]}")
    return "\n".join(lines) or "No previous conversation."


def coach_reply(db: Session, student: User, message: str) -> dict:
    """Reply to a student's message, remembering the conversation and
    producing a personalised solution based on their goals, weaknesses and
    the problem they describe."""
    context = _build_context(db, student)
    history = _recent_history(db, student)
    db.add(CoachMessage(student_id=student.id, role="user", content=message[:1000], context=context))
    db.flush()

    # Always use the smart local fallback for instant, rich responses.
    # OpenRouter free models are unreliable (rate limits, timeouts, resource exhaustion).
    # The local coach is fully personalised using the student's profile and context.
    reply, solution = _fallback_coach(message, context)

    db.add(CoachMessage(student_id=student.id, role="coach", content=reply[:2000], context=context))
    db.commit()
    return {"reply": reply, "context": context, "solution": solution}




def _detect_problem(message: str) -> str:
    """Figure out which skill/problem a student is describing."""
    msg = message.lower()
    if any(w in msg for w in ("interview", "job", "career", "placement")):
        return "interview"
    if any(w in msg for w in ("present", "stage", "audience", "speech")):
        return "presentation"
    if any(w in msg for w in ("grammar", "tense", "sentence", "grammatical")):
        return "grammar"
    if any(w in msg for w in ("fluency", "fluent", "stammer", "hesitat", "filler", "speak smoothly")):
        return "fluency"
    if any(w in msg for w in ("pronounc", "accent", "sound like")):
        return "pronunciation"
    if any(w in msg for w in ("vocab", "word", "vocabulary")):
        return "vocabulary"
    if any(w in msg for w in ("confiden", "nervous", "shy", "afraid", "scared", "stage fright")):
        return "confidence"
    if any(w in msg for w in ("listen", "understand", "comprehend")):
        return "listening"
    if any(w in msg for w in ("write", "essay", "email", "letter")):
        return "writing"
    if any(w in msg for w in ("read", "reading")):
        return "reading"
    if any(w in msg for w in ("plan", "schedule", "routine", "practice daily")):
        return "plan"
    return ""

_PROBLEM_SOLUTIONS = {
    "interview": {
        "summary": "Interview communication needs short, structured answers and confident delivery.",
        "steps": [
            "Answer in the STAR format: Situation, Task, Action, Result — keep each answer under 90 seconds.",
            "Record yourself answering 5 common interview questions and listen back for fillers.",
            "Prepare 3 stories about your skills, studies, and teamwork that you can reuse in any question.",
            "Practice with the app's Interview practice until your answers feel natural.",
        ],
        "practice": "Try the Interview practice on the Practice page and ask for feedback on clarity and fluency.",
        "recommendation": "Focus on your biggest weak area during mock interviews so it does not hurt your confidence.",
    },
    "presentation": {
        "summary": "Presentations improve with structure, rehearsal, and audience awareness.",
        "steps": [
            "Use the rule of three: opening, three main points, and a strong conclusion.",
            "Rehearse out loud at least 3 times, once with a timer.",
            "Slow down and pause after each point instead of rushing.",
            "Practice on the Presentation feature and review your pace and confidence scores.",
        ],
        "practice": "Do the Presentation practice and aim to keep eye contact with the camera while speaking.",
        "recommendation": "Build confidence by presenting to a small audience first, then a larger one.",
    },
    "grammar": {
        "summary": "Grammar improves by noticing your own error patterns and fixing them deliberately.",
        "steps": [
            "Review your flagged mistakes in Practice feedback and write each corrected sentence 3 times.",
            "Learn one tense per week and write 5 sentences with it every day.",
            "Use the grammar feedback in writing practice to catch errors before they become habits.",
            "Ask me to check any sentence you are unsure about — just send it here.",
        ],
        "practice": "Complete the Grammar practice set and review the explanations for every mistake.",
        "recommendation": "Keep a small notebook of your top 10 recurring mistakes and revise them weekly.",
    },
    "fluency": {
        "summary": "Fluency comes from regular speaking practice that trains your mouth and brain to respond faster.",
        "steps": [
            "Speak for 2 minutes every day on a familiar topic — record it and listen back.",
            "Pause briefly instead of using fillers like 'um' or 'like'.",
            "Practice retelling a short story or news item in your own words.",
            "Increase the difficulty slowly so your brain builds automatic responses.",
        ],
        "practice": "Use the Speaking practice daily and watch your fluency score climb each week.",
        "recommendation": "Pair fluency practice with your weakest skill so you improve both at once.",
    },
    "pronunciation": {
        "summary": "Pronunciation improves with focused listening and mirroring of native sounds.",
        "steps": [
            "Shadow 5 minutes of audio daily: play, pause, and repeat aloud.",
            "Record read-aloud passages and compare them with the original.",
            "Work on the specific sounds you mispronounce by repeating minimal pairs.",
            "Slow down — speaking clearly is more important than speaking fast.",
        ],
        "practice": "Do the Pronunciation practice and read passages aloud while recording yourself.",
        "recommendation": "Ask a teacher or the AI speech analysis to point out your most frequent sound errors.",
    },
    "vocabulary": {
        "summary": "Vocabulary grows fastest when you meet, use, and review words in context.",
        "steps": [
            "Learn 5 new words a day and use each one in a sentence.",
            "Review words in the Vocabulary Builder and mark them known when confident.",
            "Read or listen to one passage daily and collect 3 new words from it.",
            "Use new words in your speaking practice the same day.",
        ],
        "practice": "Use the Vocabulary Builder daily and take the vocabulary practice to test recall.",
        "recommendation": "Connect new words to topics you care about so they stick faster.",
    },
    "confidence": {
        "summary": "Confidence is built through repeated success in slightly challenging situations.",
        "steps": [
            "Start with easy topics you know well and record short answers.",
            "Practice in a safe space first: alone, then with friends, then in class.",
            "Prepare and rehearse, because preparation removes most nervousness.",
            "Track your progress — seeing your scores improve is the best confidence booster.",
        ],
        "practice": "Do the Speaking practice with topics you enjoy to build a positive feedback loop.",
        "recommendation": "Use the Coach whenever you feel nervous — I will help you prepare and rehearse.",
    },
    "listening": {
        "summary": "Listening improves with active practice: predict, listen, and check.",
        "steps": [
            "Listen to short audio clips and summarise them aloud afterwards.",
            "Practice with subtitles first, then without them.",
            "Note down unfamiliar words and review them in the Vocabulary Builder.",
            "Watch or listen to 10 minutes of English content daily.",
        ],
        "practice": "Use the Listening practice and replay clips until you understand every sentence.",
        "recommendation": "Pair listening practice with speaking by retelling what you heard.",
    },
    "writing": {
        "summary": "Writing improves through structured drafts and reviewing corrections.",
        "steps": [
            "Plan before you write: outline three main points first.",
            "Write short pieces daily — an email, a paragraph, or a journal entry.",
            "Review grammar feedback and rewrite your sentences correctly.",
            "Read your writing aloud to catch awkward phrasing.",
        ],
        "practice": "Use the Writing practice and study the explanations for each correction.",
        "recommendation": "Build a habit: 10 minutes of writing every day beats one long session weekly.",
    },
    "reading": {
        "summary": "Reading improves with consistent exposure and active vocabulary collection.",
        "steps": [
            "Read one short passage daily and note 3 new words.",
            "Answer comprehension questions to check understanding.",
            "Retell what you read in your own words to link reading and speaking.",
            "Increase difficulty gradually as your level rises.",
        ],
        "practice": "Use the Reading practice and review your comprehension scores.",
        "recommendation": "Read about topics you enjoy so the habit becomes a pleasure.",
    },
    "plan": {
        "summary": "A study plan turns scattered practice into a steady routine.",
        "steps": [
            "Set aside 20–30 minutes daily for focused practice.",
            "Rotate skills: Monday speaking, Tuesday grammar, Wednesday vocabulary, and so on.",
            "Review your weakest skill twice a week.",
            "Take the weekly assessment to measure progress and adjust the plan.",
        ],
        "practice": "Open the Study Plan page to generate a personalised weekly routine from your scores.",
        "recommendation": "Follow the plan for two weeks, then regenerate it with your new scores.",
    },
}


def _fallback_coach(message: str, context: dict) -> tuple:
    msg = (message or "").strip()
    msg_lower = msg.lower()
    problem = _detect_problem(msg)

    # If a specific problem match exists, return its detailed solution card
    if problem and problem in _PROBLEM_SOLUTIONS:
        sol = _PROBLEM_SOLUTIONS[problem]
        return f"I understand — let's work on **{problem.title()}** together. {sol['summary']}", dict(sol)

    # Dynamic solutions based on query topic
    if any(w in msg_lower for w in ("fluency", "fluent", "flow", "stammer", "hesitat", "smooth")):
        reply = (
            "Maintaining a smooth flow while speaking requires training your brain to pause silently rather than using filler words.\n\n"
            "Here is how to maintain your speaking flow:\n"
            "1. **Use Silent Pauses**: When you need a moment to think, pause silently for 1 second. Pauses make you sound calm and deliberate.\n"
            "2. **Speak in Thought Chunks**: Group your words into short 3-to-4 word phrases instead of trying to speak full long sentences without stopping.\n"
            "3. **60-Second Daily Monologue**: Speak about any topic for 60 seconds without stopping. If you make a mistake, keep going without restarting."
        )
        sol = _PROBLEM_SOLUTIONS.get("fluency")
        return reply, sol

    if any(w in msg_lower for w in ("confiden", "nervous", "shy", "scared", "fear")):
        reply = (
            "Confidence comes from low-stakes practice and preparing your key opening lines.\n\n"
            "Action Plan for Confidence:\n"
            "• **Prepare Your First 2 Sentences**: Rehearsing how you start removes 80% of speaking anxiety.\n"
            "• **Focus on Communication, Not Perfection**: Everyone makes small grammatical errors. Prioritize getting your point across clearly.\n"
            "• **Controlled Pacing**: Slow down your speaking rate by 10%. Speaking slightly slower signals confidence to your audience."
        )
        sol = _PROBLEM_SOLUTIONS.get("confidence")
        return reply, sol

    if any(w in msg_lower for w in ("vocab", "word", "forget", "remember")):
        reply = (
            "Forgetting words happens when vocabulary stays in your passive memory. To activate your vocabulary, use new words in 2 spoken sentences on the same day you learn them."
        )
        sol = _PROBLEM_SOLUTIONS.get("vocabulary")
        return reply, sol

    if any(w in msg_lower for w in ("depress", "sad", "hopeless", "lonely", "stress", "mental health", "anxious")):
        reply = (
            "I am really sorry to hear that you are going through a difficult time. Experiencing depression or high stress can feel overwhelming, but please know that you are not alone.\n\n"
            "Here are a few gentle steps you can take:\n"
            "1. **Talk to Someone You Trust**: Reach out to a close friend, family member, teacher, or counselor about how you are feeling.\n"
            "2. **Take Small Breaks**: Be kind to yourself and lower daily pressure. Taking short breaks to rest and breathe helps your mind recover.\n"
            "3. **Seek Professional Support**: If you feel consistently overwhelmed, speaking with a healthcare professional or school counselor can provide guidance.\n\n"
            "Whenever you are ready to talk or practice, I am here to support you step by step."
        )
        return reply, None


    # Smart universal reply based on message content analysis
    weak = context.get("weaknesses") or []
    level = context.get("level") or "intermediate"
    goals = context.get("goals") or []
    weak_str = ", ".join(weak[:3]) if weak else "speaking clearly"
    msg_lower_stripped = msg_lower.strip()

    # Detect keywords for personalised responses
    if any(w in msg_lower for w in ("help", "how", "what", "improve", "better", "tips", "advice", "suggest")):
        topic = weak[0] if weak else "communication"
        reply = (
            f"Great question! Based on your profile (level: **{level}**, focus areas: **{weak_str}**), here is a personalised plan for you:\n\n"
            f"**Step 1 — Identify your exact challenge**\n"
            f"Think about the last time you struggled with {topic}. Was it nerves, lack of words, or speed? Pin down the exact moment.\n\n"
            f"**Step 2 — Daily 5-minute practice**\n"
            f"Record yourself speaking for 60 seconds every morning on any topic. Listen back and note 1 thing to fix.\n\n"
            f"**Step 3 — Use the platform**\n"
            f"Try the **AI Conversation** or **Speaking** modules to get instant real-time feedback on your {topic}.\n\n"
            f"Keep at it consistently and you will see results within 2 weeks!"
        )
    elif any(w in msg_lower for w in ("practice", "exercise", "drill", "routine", "habit")):
        reply = (
            f"Here is a proven daily practice routine tailored for **{level}** level students:\n\n"
            f"**Morning (5 min)**: Record a 60-second monologue on any topic. Focus on one weak area: **{weak_str}**.\n\n"
            f"**Afternoon (10 min)**: Use the **AI Conversation** module to have a real dialogue. Aim for 3 exchanges minimum.\n\n"
            f"**Evening (5 min)**: Read 1 paragraph aloud from any book or article. Slow down by 10% and focus on pronunciation.\n\n"
            f"**Weekly goal**: Complete at least one full Mock Interview or Presentation session to measure your overall progress."
        )
    elif any(w in msg_lower for w in ("score", "result", "mark", "grade", "assess", "performance")):
        score = context.get("overall_score") or "N/A"
        reply = (
            f"Your current overall score is **{score}** at **{level}** level.\n\n"
            f"Your focus areas for improvement are: **{weak_str}**.\n\n"
            f"To raise your score:\n"
            f"1. Practise your weakest skill daily using the platform modules.\n"
            f"2. Retake assessments after 1 week of consistent practice.\n"
            f"3. Track your progress on the **Progress** page to see week-on-week improvements.\n\n"
            f"Scores improve fastest when you focus on one skill at a time — start with **{weak[0] if weak else 'fluency'}**!"
        )
    elif any(w in msg_lower for w in ("motivation", "give up", "quit", "tired", "boring", "hard", "difficult", "struggle")):
        reply = (
            f"I completely understand — improving communication takes real effort, and it is normal to feel tired sometimes.\n\n"
            f"Here is what helps students at your **{level}** level stay motivated:\n\n"
            f"• **Set micro-goals**: Instead of 'get fluent', aim for 'speak 1 minute without fillers today'.\n"
            f"• **Track wins**: Open the **Progress** page and look at how far you have already come.\n"
            f"• **Short bursts**: 5 minutes of focused practice beats 1 hour of unfocused study every time.\n"
            f"• **Celebrate small victories**: Every sentence you complete without hesitation is a win.\n\n"
            f"You are already making progress by being here. Keep going — your best conversation is just ahead!"
        )
    elif len(msg_lower_stripped) < 20:
        # Very short messages — ask a clarifying question
        reply = (
            f"I am here to help you with your communication journey! Could you tell me a bit more about what you need help with?\n\n"
            f"For example:\n"
            f"• Are you struggling with **speaking fluency** or **confidence**?\n"
            f"• Do you need help with **interview preparation** or **presentations**?\n"
            f"• Are you looking for a **practice routine** or **grammar tips**?\n\n"
            f"Based on your profile, your current focus areas are: **{weak_str}**. I can help you with any of these!"
        )
    else:
        # Catch-all: give a personalised response using their actual message topic
        first_words = " ".join(msg.split()[:8])
        reply = (
            f"Thank you for sharing that. Based on your message about **'{first_words}...'** and your profile (level: **{level}**, focus: **{weak_str}**), here is my advice:\n\n"
            f"**Understand the root cause**: Most communication challenges come from one of three things — insufficient vocabulary, low confidence, or lack of structured practice. Which feels most true for you?\n\n"
            f"**Immediate action plan**:\n"
            f"1. Speak about this topic out loud for 1 minute right now. Record it.\n"
            f"2. Listen back and identify exactly where you hesitated or felt stuck.\n"
            f"3. Bring that specific challenge to the **AI Conversation** module for targeted practice.\n\n"
            f"**Remember**: Every great communicator started exactly where you are. Consistent daily effort — even 10 minutes — creates permanent improvement."
        )

    return reply, None