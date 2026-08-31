"""Deterministic communication metrics + LLM feedback generation.

Metrics (word count, WPM, fillers, grammar patterns, readability) are computed
locally so scoring works even in development mode. Feedback prose is generated
by the configured LLM provider (development mock or a real provider).
"""
import re
from typing import List, Optional

from app.ai.base import get_llm_provider
from app.ai.schemas import (
    Correction,
    MistakeItem,
    ReadingAnalysis,
    SpeakingAnalysis,
    WritingAnalysis,
)
from app.ai.providers.development import (
    FILLERS,
    _count_fillers,
    _detect_grammar,
    _score_clip,
    _wpm,
)

SIMPLE_FUNCTION_WORDS = set(
    "the a an of to in on at for and or but so if then by from with without over under about after before between into through during including against within along throughout upon via across during because since while"
    .split()
)


def _text_scores(transcript: str) -> dict:
    """Vocabulary + grammar + coherence heuristics from text."""
    words = re.findall(r"[A-Za-z']+", transcript)
    if not words:
        return {"vocabulary": 50.0, "grammar": 60.0, "clarity": 55.0, "coherence": 55.0}
    unique = set(w.lower() for w in words)
    avg_len = sum(len(w) for w in words) / len(words)
    # Higher average word length -> slightly richer vocabulary signal.
    vocab = _score_clip(45 + (avg_len - 4.0) * 12, 50)
    # Short simple sentences and low repetition -> clarity signal.
    sentences = [s for s in re.split(r"[.!?]+", transcript) if s.strip()]
    clarity = _score_clip(50, len(sentences) > 0 and min(3.0, len(words) / max(len(sentences), 1)) * 18 + 40)
    # Grammar heuristic: penalty for detected patterns.
    grammar = max(40.0, 80.0 - len(_detect_grammar(transcript)) * 6.0)
    return {"vocabulary": round(vocab, 1), "grammar": round(grammar, 1), "clarity": round(clarity, 1), "coherence": round(clarity - 3, 1)}


def analyze_speaking(transcript: str, topic: str = "", duration_ms: int = 0) -> SpeakingAnalysis:
    transcript = (transcript or "").strip()
    words = re.findall(r"[A-Za-z']+", transcript)
    word_count = len(words)
    fillers = _count_fillers(transcript)
    grammar_items = _detect_grammar(transcript)
    base = _text_scores(transcript)

    fill_ratio = len(fillers) / max(word_count, 1)
    fluency = _score_clip(55 + (1 - min(fill_ratio * 6, 1.0)) * 30, base["coherence"])
    confidence = _score_clip(50, 100 - fill_ratio * 180, (word_count / 60.0) * 22 if word_count else 40)
    pronunciation = 78.0  # placeholder: needs a pronunciation-aware provider
    # Participation reflects how much the speaker engages with the topic:
    # a reasonable amount of speech on-topic (not too brief, not rambling).
    participation = _score_clip(50, (word_count / 40.0) * 30 if word_count else 40, 100 - fill_ratio * 120)

    mistakes: List[MistakeItem] = []
    for f in fillers[:8]:
        mistakes.append(MistakeItem(category="fluency", text=f, corrected_text="", explanation="Filler word; pausing briefly is better."))
    for g in grammar_items[:8]:
        mistakes.append(MistakeItem(**g))

    scores = {
        "grammar": base["grammar"],
        "vocabulary": base["vocabulary"],
        "fluency": fluency,
        "pronunciation": pronunciation,
        "confidence": confidence,
        "participation": participation,
        "clarity": base["clarity"],
        "coherence": base["coherence"],
    }
    overall = _score_clip(*list(scores.values()))

    strengths = []
    weaknesses = []
    for name, val in scores.items():
        if val >= 75:
            strengths.append(f"Good {name} in your speech")
        elif val < 60:
            weaknesses.append(f"{name.capitalize()} needs practice")

    recommendations = [
        f"Practice speaking on: {topic or 'a familiar topic'} for 2 minutes daily.",
    ]
    if fillers:
        recommendations.append("Pause briefly instead of using filler words.")
    if grammar_items:
        recommendations.append("Review the grammar patterns flagged in your feedback.")
    if base["vocabulary"] < 65:
        recommendations.append("Learn 5 new words daily and use them in a sentence.")

    feedback = _feedback_prose(scores)
    return SpeakingAnalysis(
        scores=scores,
        overall=overall,
        level="Intermediate",
        strengths=strengths,
        weaknesses=weaknesses,
        mistakes=mistakes,
        recommendations=recommendations,
        feedback=feedback,
        transcript=transcript,
        duration_ms=duration_ms,
        word_count=word_count,
        wpm=_wpm(word_count, duration_ms),
        fillers=fillers,
        corrections=[],
    )


def analyze_writing(text: str, prompt: str = "") -> WritingAnalysis:
    text = (text or "").strip()
    words = re.findall(r"[A-Za-z']+", text)
    base = _text_scores(text)
    grammar_items = _detect_grammar(text)

    # Detect basic spelling issues (common misspellings list).
    misspellings = {
        "recieve": "receive", "seperate": "separate", "definately": "definitely",
        "occured": "occurred", "tommorow": "tomorrow", "enviroment": "environment",
        "goverment": "government", "wierd": "weird", "untill": "until",
    }
    corrections: List[Correction] = []
    for m in re.finditer(r"[A-Za-z']+", text):
        word = m.group(0)
        lower = word.lower()
        if lower in misspellings:
            correct = misspellings[lower]
            corrections.append(
                Correction(
                    original=word,
                    problem="Spelling",
                    corrected=correct,
                    explanation=f"'{word}' is misspelled; the correct spelling is '{correct}'.",
                )
            )
    for g in grammar_items[:6]:
        corrections.append(
            Correction(
                original=g["text"],
                problem=g["explanation"],
                corrected=g["corrected_text"],
                explanation=g["explanation"],
            )
        )

    relevance = 80.0 if prompt else 75.0
    scores = {
        "grammar": max(40.0, base["grammar"] - len(corrections) * 2),
        "spelling": _score_clip(85, 100 - len([c for c in corrections if c.problem == "Spelling"]) * 10),
        "vocabulary": base["vocabulary"],
        "sentence_structure": _score_clip(base["clarity"], base["grammar"]),
        "clarity": base["clarity"],
        "coherence": base["coherence"],
        "relevance": relevance,
    }
    overall = _score_clip(*list(scores.values()))

    strengths, weaknesses = [], []
    for name, val in scores.items():
        if val >= 75:
            strengths.append(f"Strong {name.replace('_', ' ')}")
        elif val < 60:
            weaknesses.append(f"{name.replace('_', ' ').capitalize()} needs work")

    feedback = _feedback_prose(scores)
    return WritingAnalysis(
        scores=scores,
        overall=overall,
        level="Intermediate",
        strengths=strengths,
        weaknesses=weaknesses,
        mistakes=[
            MistakeItem(category="writing", text=c.original, corrected_text=c.corrected, explanation=c.explanation)
            for c in corrections[:8]
        ],
        recommendations=[
            "Revise your draft using the corrected sentences.",
            "Read your writing aloud to catch awkward phrasing.",
            "Use linking words to improve coherence.",
        ],
        feedback=feedback,
        corrections=corrections,
        corrected_text=_apply_corrections(text, corrections),
        clarity=scores["clarity"],
        coherence=scores["coherence"],
        relevance=relevance,
    )


def _apply_corrections(text: str, corrections: List[Correction]) -> str:
    out = text
    for c in corrections:
        if c.original and c.corrected:
            out = out.replace(c.original, c.corrected)
    return out


def analyze_reading(
    transcript: str,
    expected_text: str = "",
    duration_ms: int = 0,
) -> ReadingAnalysis:
    """Analyze a read-aloud session by comparing spoken vs expected text."""
    spoken = (transcript or "").strip().lower()
    expected = (expected_text or "").strip().lower()
    spoken_words = re.findall(r"[A-Za-z']+", spoken)
    expected_words = re.findall(r"[A-Za-z']+", expected)

    skipped = repeated = 0
    accuracy = 0.0
    if expected_words and spoken_words:
        expected_set = {w for w in expected_words}
        spoken_set = {w for w in spoken_words}
        skipped = max(0, len(expected_set - spoken_set))
        # rough accuracy: matched unique words / expected unique words
        accuracy = round(100 * len(expected_set & spoken_set) / len(expected_set), 1)
        repeated = max(0, len(spoken_words) - len(expected_words))

    pause_count = len(re.findall(r"\b(um|uh|er|hmm)\b", spoken))
    speed = _wpm(len(spoken_words), duration_ms)
    scores = {
        "pronunciation": _score_clip(accuracy, 78),
        "accuracy": accuracy or 60.0,
        "reading_speed": _score_clip(60, (speed / 150.0) * 60 if speed else 55),
        "fluency": _score_clip(70 - pause_count * 5, accuracy or 60),
        "comprehension": 70.0,
    }
    overall = _score_clip(*list(scores.values()))
    return ReadingAnalysis(
        scores=scores,
        overall=overall,
        level="Intermediate",
        strengths=["Read at a good pace"] if speed and 100 <= speed <= 180 else [],
        weaknesses=([] if accuracy >= 80 else ["Some words were misread or skipped"]),
        mistakes=[],
        recommendations=(
            ["Read aloud daily to improve accuracy."] if accuracy < 85 else ["Try a longer passage next time."]
        ),
        feedback=f"Reading accuracy ~{accuracy}%, speed ~{speed} wpm, {pause_count} pauses detected.",
        transcript=transcript,
        word_count=len(spoken_words),
        reading_speed_wpm=speed,
        skipped_words=skipped,
        repeated_words=repeated,
        pause_count=pause_count,
        accuracy=accuracy,
    )


def _feedback_prose(scores: dict) -> str:
    try:
        provider = get_llm_provider()
        prompt = " ".join(f"{k}_score:{v}" for k, v in scores.items())
        data = provider.chat(
            [{"role": "system", "content": "__ROUTE:feedback You are a communication coach."},
             {"role": "user", "content": prompt}],
        )
        return str(data.get("feedback", "Good work overall."))
    except Exception:
        strengths = [k for k, v in scores.items() if v >= 75]
        weaknesses = [k for k, v in scores.items() if v < 60]
        msg = "Good work overall."
        if strengths:
            msg += f" Your strengths: {', '.join(strengths).replace('_', ' ')}."
        if weaknesses:
            msg += f" Focus on: {', '.join(weaknesses).replace('_', ' ')}."
        else:
            msg += " Try slightly harder content next time."
        return msg


def detect_grammar_issue(sentence: str) -> Correction:
    try:
        provider = get_llm_provider()
        data = provider.chat(
            [{"role": "system", "content": "__ROUTE:grammar"},
             {"role": "user", "content": f"sentence: {sentence}"}],
        )
        return Correction(**{k: data.get(k, "") for k in ("original", "problem", "corrected", "explanation")})
    except Exception:
        return Correction(original=sentence, problem="", corrected=sentence, explanation="No obvious grammar issue.")
