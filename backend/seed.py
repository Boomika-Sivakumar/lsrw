"""Seed the dev database with demo users, assessments, discussions and assignments.

Run from backend/:  ../.venv/Scripts/python seed.py
Uses the development (mock) AI providers; no network required.
"""
import datetime

from app.database.db import SessionLocal, init_db
from app.models.assessment import Assessment
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.practice import Mistake, Recommendation
from app.models.user import User
from app.services import discussion as ds
from app.services.assignment import create_assignment, submit_assignment
from app.services.scoring import record_progress_snapshot, record_skill_scores
from app.services.user_service import register_user

STUDENTS = [
    ("arjun", "arjun@lsrw.demo", "arjun", "Arjun Mehta", ["speaking", "pronunciation", "grammar"]),
    ("priya", "priya@lsrw.demo", "priya", "Priya Sharma", ["interview-communication", "vocabulary"]),
    ("rahul", "rahul@lsrw.demo", "rahul", "Rahul Nair", ["presentation-skills", "fluency"]),
    ("sneha", "sneha@lsrw.demo", "sneha", "Sneha Reddy", ["writing", "grammar", "reading"]),
    ("vikram", "vikram@lsrw.demo", "vikram", "Vikram Singh", ["workplace-communication", "pronunciation"]),
]

BASE_SCORES = {
    "arjun": {"listening": 68, "speaking": 62, "reading": 74, "writing": 66, "grammar": 60, "vocabulary": 63,
              "pronunciation": 58, "fluency": 59, "comprehension": 70, "confidence": 61, "participation": 65},
    "priya": {"listening": 75, "speaking": 71, "reading": 80, "writing": 78, "grammar": 74, "vocabulary": 70,
              "pronunciation": 66, "fluency": 69, "comprehension": 78, "confidence": 68, "participation": 72},
    "rahul": {"listening": 64, "speaking": 70, "reading": 71, "writing": 65, "grammar": 63, "vocabulary": 66,
              "pronunciation": 62, "fluency": 68, "comprehension": 67, "confidence": 72, "participation": 76},
    "sneha": {"listening": 79, "speaking": 66, "reading": 82, "writing": 80, "grammar": 78, "vocabulary": 73,
              "pronunciation": 64, "fluency": 61, "comprehension": 81, "confidence": 58, "participation": 62},
    "vikram": {"listening": 60, "speaking": 58, "reading": 66, "writing": 62, "grammar": 57, "vocabulary": 59,
               "pronunciation": 55, "fluency": 56, "comprehension": 63, "confidence": 64, "participation": 67},
}

LEVELS = {
    "arjun": "Intermediate",
    "priya": "Upper Intermediate",
    "rahul": "Intermediate",
    "sneha": "Upper Intermediate",
    "vikram": "Beginner",
}

MISTAKES = {
    "arjun": [("grammar", "He go to office every day", "He goes to office every day", "Third person singular needs 'goes'."),
              ("pronunciation", "I am very happy", "I am very happy", "Stress on second syllable of 'happy'.")],
    "priya": [("vocabulary", "I made a hard decision", "I made a difficult decision", "'Hard' is overused; prefer 'difficult'.")],
    "rahul": [("grammar", "She don't like coffee", "She doesn't like coffee", "Use 'doesn't' for third person singular."),
              ("fluency", "Um, basically, like, I think", "", "Reduce filler words for smoother delivery.")],
    "sneha": [("writing", "Their are many reasons", "There are many reasons", "Confusing 'there' and 'their'.")],
    "vikram": [("grammar", "I have went to school", "I have gone to school", "Use past participle 'gone' with 'have'."),
               ("pronunciation", "development", "development", "Stress the second syllable: de-VE-lop-ment.")],
}


def build_assessment(db, student: User, title: str, kind: str, scores: dict, level: str) -> Assessment:
    overall = round(sum(scores.values()) / len(scores), 1)
    a = Assessment(
        student_id=student.id,
        title=title,
        kind=kind,
        status="scored",
        started_at=datetime.datetime.utcnow() - datetime.timedelta(days=7),
        submitted_at=datetime.datetime.utcnow() - datetime.timedelta(days=7),
        overall_score=overall,
        level=level,
        scores=scores,
        strengths=["Strong reading", "Good listening comprehension"] if scores["reading"] > 70 else ["Consistent effort"],
        weaknesses=["Pronunciation needs work", "Fluency needs practice"] if scores["speaking"] < 70 else ["Keep polishing speaking"],
        mistakes=MISTAKES.get(student.username, [])[:2],
        recommendations=["Practice speaking daily", "Work on grammar exercises", "Expand vocabulary with reading"],
        summary=f"{student.full_name} shows a {level} level of communication with room to grow in speaking fluency.",
    )
    db.add(a)
    db.flush()
    return a


def main():
    init_db()
    db = SessionLocal()

    if db.query(User).filter(User.username == "teacher1").first():
        print("Seed already present. Skipping.")
        db.close()
        return

    teacher = register_user(db, "teacher1", "teacher@lsrw.demo", "teacher123", "Meera Krishnan", "teacher")
    print("Teacher:", teacher.full_name)

    students = []
    for username, email, password, name, goals in STUDENTS:
        u = register_user(db, username, email, password, name, "student", goals)
        students.append(u)
        print("Student:", u.full_name, u.user_id)

    # ---- Skill snapshots + progress history (before/after) ----
    for u in students:
        scores = BASE_SCORES[u.username]
        initial = {k: v - 6 for k, v in scores.items()}
        record_skill_scores(db, u.id, "assessment", initial, source_id=0)
        record_progress_snapshot(db, u.id, initial, activities=2)
        build_assessment(db, u, f"Initial LSRW Assessment - {u.full_name}", "initial", initial, LEVELS[u.username])
        db.commit()

        record_skill_scores(db, u.id, "speaking", {k: v for k, v in scores.items()}, source_id=0)
        record_progress_snapshot(db, u.id, scores, activities=3)
        build_assessment(db, u, f"Final LSRW Assessment - {u.full_name}", "final", scores, LEVELS[u.username])
        db.commit()

    # ---- Mistakes + recommendations ----
    for u in students:
        for category, text, corrected, explanation in MISTAKES.get(u.username, []):
            db.add(Mistake(student_id=u.id, category=category, text=text,
                           corrected_text=corrected, explanation=explanation,
                           occurrences=2, last_detected=datetime.datetime.utcnow()))
        recs = [
            ("speaking", "Daily speaking warm-up", "Speak for 3 minutes each day on a random topic to build fluency.", "Practice Speaking"),
            ("grammar", "Review present tenses", "Reinforce simple vs continuous usage.", "Grammar Drill"),
        ]
        for cat, title, detail, activity in recs:
            db.add(Recommendation(student_id=u.id, category=cat, title=title, detail=detail, activity=activity, source="ai"))
    db.commit()

    # ---- Assignment + submissions ----
    assign = create_assignment(db, teacher, {
        "title": "Why Communication Skills Matter",
        "skill": "writing",
        "topic": "Communication skills",
        "difficulty": "intermediate",
        "description": "Write a 200-word essay explaining why communication skills are important.",
        "questions": [{"prompt": "Write a 200-word essay explaining why communication skills are important.", "type": "essay", "order": 1}],
        "assessment_criteria": ["Clarity", "Grammar", "Relevance", "Vocabulary"],
    })
    for u in students[:3]:
        submit_assignment(db, u, assign, {
            "text": f"Communication skills are essential in every field. {u.full_name} believes that listening carefully and speaking clearly build better relationships and career opportunities."
        })
    db.commit()
    print("Assignment with submissions:", assign.title)

    # ---- Completed group discussion ----
    disc = ds.create_discussion(db, teacher, {
        "topic": "Is technology making us better communicators?",
        "description": "Group discussion practice session.",
        "difficulty": "intermediate",
        "duration_seconds": 300,
        "participant_limit": 6,
    })
    for u in students[:4]:
        ds.join_discussion(db, u, disc.session_code)

    ds.transition(db, disc, "WAITING")
    ds.transition(db, disc, "ACTIVE")
    lines = [
        ("arjun", 0, 12, "I think technology helps us connect with people across the world instantly, but we depend on it too much."),
        ("priya", 14, 25, "Yes, but the quality of conversations has gone down because we text instead of talking face to face."),
        ("rahul", 27, 38, "I agree with that. In meetings people check their phones and do not listen to what others say."),
        ("sneha", 40, 52, "However, tools like video calls saved remote teams and made work possible during the pandemic."),
        ("arjun", 54, 65, "That is a good point, and I would add that we need to set boundaries on screen time to stay present."),
        ("vikram", 67, 76, "I think the balance is the key, technology is a tool and we decide how to use it."),
    ]
    for user_id, start, end, text in lines:
        ds.add_segment(db, disc.id, user_id, text, start, end)
    ds.transition(db, disc, "ENDED")
    ds.transition(db, disc, "ANALYZING")
    ds.analyze_discussion(db, disc)
    ds.transition(db, disc, "COMPLETED")
    db.commit()
    print("Discussion:", disc.session_code, disc.status)

    db.close()
    print("Seeding complete.")
    print("\nLogin with:")
    print("  Teacher: teacher1 / teacher123")
    for username, *_ in STUDENTS:
        print(f"  Student: {username} / {username}")


if __name__ == "__main__":
    main()