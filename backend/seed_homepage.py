"""Fill the teacher homepage with sample student records and class activity.

Runs scored assessments for students that have no data yet, creates a few
assignments, and starts/completes a few group discussions so the dashboard
homepage is populated.

Usage (backend/):  ../.venv/Scripts/python seed_homepage.py
"""
from fastapi.testclient import TestClient

from app.main import app
from create_demo import register, run_assessment

STUDENTS_TO_SCORE = [
    {"username": "boomika", "email": "boomikasivakumar555@gmail.com", "password": "secret123", "full_name": "Boomika", "role": "student", "quality": 3},
    {"username": "swadiya", "email": "swadiya@lsrw.demo", "password": "secret123", "full_name": "Swadiya", "role": "student", "quality": 2},
    {"username": "Sivakumar", "email": "sivakumar555@gmail.com", "password": "secret123", "full_name": "Sivakumar", "role": "student", "quality": 1},
]

TEACHER = {"username": "teacher1", "email": "teacher@lsrw.demo", "password": "teacher123", "full_name": "Meera Krishnan", "role": "teacher"}

ASSIGNMENTS = [
    {"title": "Write a cover letter for a job application", "skill": "writing",
     "topic": "Applying for a job", "difficulty": "intermediate",
     "description": "Write a professional cover letter introducing yourself and your strengths.",
     "questions": [{"type": "essay", "prompt": "Write a cover letter for a role you want. Include your skills and why you fit."}],
     "assessment_criteria": ["Clarity", "Grammar", "Vocabulary", "Professional tone"]},
    {"title": "Describe a place you love", "skill": "speaking",
     "topic": "My favourite place", "difficulty": "easy",
     "description": "Speak for 1 minute describing a place that is special to you.",
     "questions": [{"type": "speaking", "prompt": "Describe your favourite place and explain why it matters to you."}],
     "assessment_criteria": ["Fluency", "Pronunciation", "Vocabulary"]},
    {"title": "Do you agree that homework should be banned?", "skill": "writing",
     "topic": "Homework debate", "difficulty": "intermediate",
     "description": "Write a balanced paragraph arguing your position on homework.",
     "questions": [{"type": "essay", "prompt": "Argue for or against banning homework, giving two reasons."}],
     "assessment_criteria": ["Relevance", "Grammar", "Structure"]},
]

DISCUSSIONS = [
    {"topic": "Should social media be restricted for teenagers?", "difficulty": "intermediate", "duration_seconds": 600},
    {"topic": "Is online learning as effective as classroom learning?", "difficulty": "intermediate", "duration_seconds": 600},
    {"topic": "How can we reduce plastic pollution in our city?", "difficulty": "advanced", "duration_seconds": 600},
]

DEMO_STUDENTS = [
    {"username": "alice", "email": "alice@lsrw.demo", "password": "student123", "full_name": "Alice Johnson", "role": "student"},
    {"username": "ben", "email": "ben@lsrw.demo", "password": "student123", "full_name": "Ben Carter", "role": "student"},
    {"username": "chen", "email": "chen@lsrw.demo", "password": "student123", "full_name": "Chen Wei", "role": "student"},
    {"username": "dia", "email": "dia@lsrw.demo", "password": "student123", "full_name": "Dia Fernandes", "role": "student"},
]


def main():
    client = TestClient(app)

    print("\nScoring assessments for students without data:")
    for s in STUDENTS_TO_SCORE:
        user = register(client, s)
        headers = {"Authorization": f"Bearer {user['access_token']}"}
        res = run_assessment(client, headers, quality=s["quality"])
        print(f"  {s['username']:10} -> overall {res['overall']} | {res['level']}")

    teacher = register(client, TEACHER)
    th = {"Authorization": f"Bearer {teacher['access_token']}"}

    print("\nCreating assignments:")
    for a in ASSIGNMENTS:
        r = client.post("/api/teachers/assignments", headers=th, json=a)
        if r.status_code == 200:
            print(f"  + {a['title']} (id {r.json().get('id')})")
        else:
            print(f"  ! {a['title']}: {r.status_code} {r.text[:120]}")

    print("\nCreating + completing group discussions:")
    for i, d in enumerate(DISCUSSIONS):
        r = client.post("/api/discussions", headers=th, json=d)
        if r.status_code != 200:
            print(f"  ! {d['topic']}: {r.status_code} {r.text[:120]}")
            continue
        disc = r.json()
        # Have two students join, then start + end so analysis runs.
        for stu in DEMO_STUDENTS[i:i + 2]:
            su = register(client, stu)
            sh = {"Authorization": f"Bearer {su['access_token']}"}
            client.post("/api/discussions/join", headers=sh, json={"session_code": disc["session_code"]})
        client.post(f"/api/discussions/{disc['id']}/start", headers=th)
        end = client.post(f"/api/discussions/{disc['id']}/end", headers=th)
        print(f"  + {d['topic']} -> {end.json().get('status') if end.status_code == 200 else end.status_code}")

    print("\nHomepage seeding complete. Refresh the teacher dashboard.")
    print(f"  Teacher: {TEACHER['username']} / {TEACHER['password']}")


if __name__ == "__main__":
    main()