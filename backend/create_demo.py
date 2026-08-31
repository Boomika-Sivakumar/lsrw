"""Create demo teacher + students and run a real scored assessment for each.

Runs in-process against the app (same dev.db the server uses), walking the
normal API flow: register -> create assessment -> answer -> submit -> report.

Usage (backend/):  ../.venv/Scripts/python create_demo.py
"""
from fastapi.testclient import TestClient

from app.data.banks import LISTENING_SCRIPTS, READING_PASSAGES
from app.main import app

TEACHER = {"username": "teacher1", "email": "teacher@lsrw.demo", "password": "teacher123",
           "full_name": "Meera Krishnan", "role": "teacher"}

STUDENTS = [
    {"username": "alice", "email": "alice@lsrw.demo", "password": "student123", "full_name": "Alice Johnson", "role": "student"},
    {"username": "ben", "email": "ben@lsrw.demo", "password": "student123", "full_name": "Ben Carter", "role": "student"},
    {"username": "chen", "email": "chen@lsrw.demo", "password": "student123", "full_name": "Chen Wei", "role": "student"},
    {"username": "dia", "email": "dia@lsrw.demo", "password": "student123", "full_name": "Dia Fernandes", "role": "student"},
    {"username": "elena", "email": "elena@lsrw.demo", "password": "student123", "full_name": "Elena Petrova", "role": "student"},
]

WRITING_ANSWER = (
    "Communication skills are essential in the modern workplace. Clear speaking and careful "
    "listening build trust between colleagues, improve teamwork, and reduce misunderstandings. "
    "In meetings, active listening helps teams respond to real concerns instead of assumptions. "
    "Strong writers also present ideas clearly in emails and reports, which saves time for everyone. "
    "Companies that invest in communication training often see higher productivity and better "
    "relationships with clients. Therefore, every professional should practice these skills "
    "regularly to grow in their career."
)
SPEAKING_TRANSCRIPT = (
    "My hometown is a small city with friendly people and beautiful parks. Every morning, I walk "
    "near the river and enjoy the fresh air. The markets are lively and colorful, and the local "
    "food is delicious. I really appreciate the peaceful atmosphere and the strong sense of "
    "community among the people who live there. It is the place where I learned my values."
)


def register(client, data):
    r = client.post("/api/auth/register", json=data)
    if r.status_code == 200:
        return r.json()
    if r.status_code == 400 and "already" in r.json().get("detail", ""):
        login = client.post("/api/auth/login", data={"username": data["username"], "password": data["password"]})
        if login.status_code == 200:
            return login.json()
    raise RuntimeError(f"register {data['username']}: {r.status_code} {r.text}")


def listening_answer():
    return [" ".join(q["answer"] for q in script["questions"]).lower() for script in LISTENING_SCRIPTS]


def reading_answer(prompt):
    for passage in READING_PASSAGES:
        for q in passage["questions"]:
            if q["q"].strip() == (prompt or "").strip():
                if q["type"] == "mcq":
                    return str(q["answer"])
                if q["type"] == "truefalse":
                    return str(q["answer"])
                return q["answer"].split(" or ")[0]
    return "reading"


def run_assessment(client, headers, quality=0):
    r = client.post("/api/assessments", headers=headers, json={"kind": "initial"})
    assert r.status_code == 200, r.text
    aid = r.json()["assessment_id"]
    qs = client.get(f"/api/assessments/{aid}", headers=headers).json()["questions"]

    listen_idx = 0
    answers = []
    for q in qs:
        if q["skill"] == "listening":
            answers.append({"question_id": q["id"], "text": listening_answer()[listen_idx], "duration_ms": 8000})
            listen_idx += 1
        elif q["skill"] == "reading":
            answers.append({"question_id": q["id"], "text": reading_answer(q["prompt"]), "duration_ms": 12000})
        elif q["skill"] == "writing":
            answers.append({"question_id": q["id"], "text": _writing_answer(quality), "duration_ms": 120000})
        elif q["skill"] == "speaking":
            answers.append({"question_id": q["id"], "text": _speaking_transcript(quality), "duration_ms": 30000})

    r = client.post(f"/api/assessments/{aid}/submit", headers=headers, json={"answers": answers})
    assert r.status_code == 200, r.text
    return r.json()


def _writing_answer(quality):
    variants = [
        "Comm skills are very important for job. I think talking good and listening people help in work.",
        "Communication skills matter in the workplace. Speaking clearly and listening carefully build trust and improve teamwork, which makes projects succeed.",
        "Communication skills are essential in the modern workplace. Clear speaking and careful listening build trust between colleagues, improve teamwork, and reduce misunderstandings in daily work.",
        WRITING_ANSWER,
        WRITING_ANSWER + " Moreover, leaders who communicate transparently inspire confidence, and teams that share honest feedback continuously improve their performance and innovation over time.",
    ]
    return variants[quality]


def _speaking_transcript(quality):
    variants = [
        "My town is small. People friendly. Market nice. Food good. I like it here. It is my home.",
        "My hometown is a small city with friendly people and parks. I walk near the river every morning and enjoy the fresh air. The food is very good.",
        "My hometown is a small city with friendly people and beautiful parks. Every morning, I walk near the river and enjoy the fresh air. The markets are lively and the local food is delicious.",
        SPEAKING_TRANSCRIPT,
        SPEAKING_TRANSCRIPT + " The people there taught me to be patient and kind, and I believe those values now shape how I communicate at work and with my friends.",
    ]
    return variants[quality]


def main():
    client = TestClient(app)

    teacher = register(client, TEACHER)
    print("\nTeacher account:")
    print(f"  login: {TEACHER['username']} / {TEACHER['password']}  ({TEACHER['full_name']})")

    print("\nStudent accounts & assessment results:")
    for i, s in enumerate(STUDENTS):
        user = register(client, s)
        headers = {"Authorization": f"Bearer {user['access_token']}"}
        res = run_assessment(client, headers, quality=i)
        print(
            f"  {s['username']:6} / {s['password']:9}  {s['full_name']:16} "
            f"| User ID {user['user']['user_id']} | overall {res['overall']} | {res['level']}"
        )

    print("\nAll accounts created and assessments scored. Start the app and log in.")


if __name__ == "__main__":
    main()