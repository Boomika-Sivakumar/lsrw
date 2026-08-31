import os
import re

os.environ["DATABASE_URL"] = "sqlite:///./test_api.db"
os.environ["AI_PROVIDER"] = "development"
os.environ["STT_PROVIDER"] = "development"

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.database.db import Base, engine, SessionLocal
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def clean_db():
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture()
def student_headers(client):
    r = client.post("/api/auth/register", json={
        "username": "t_student", "email": "t_student@test.dev",
        "password": "secret123", "full_name": "Test Student", "role": "student",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def teacher_headers(client):
    r = client.post("/api/auth/register", json={
        "username": "t_teacher", "email": "t_teacher@test.dev",
        "password": "secret123", "full_name": "Test Teacher", "role": "teacher",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_flow(client, clean_db):
    r = client.post("/api/auth/register", json={
        "username": "flow_user", "email": "flow@test.dev", "password": "secret123",
        "full_name": "Flow User", "role": "student",
    })
    assert r.status_code == 200
    body = r.json()
    assert re.fullmatch(r"[A-HJ-NP-Z]{2}\d{4}", body["user"]["user_id"]), body["user"]["user_id"]
    assert len(body["access_token"]) > 10

    # Duplicate username rejected
    dup = client.post("/api/auth/register", json={
        "username": "flow_user", "email": "other@test.dev", "password": "secret123",
        "full_name": "Other", "role": "student",
    })
    assert dup.status_code == 400

    # Login + /me
    login = client.post("/api/auth/login", data={"username": "flow_user", "password": "secret123"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["username"] == "flow_user"

    # Wrong password
    bad = client.post("/api/auth/login", data={"username": "flow_user", "password": "nope"})
    assert bad.status_code == 401

    # Missing token
    assert client.get("/api/auth/me").status_code == 401


def test_student_dashboard_and_goals(client, clean_db, student_headers):
    r = client.get("/api/students/me/dashboard", headers=student_headers)
    assert r.status_code == 200
    assert "overall" in r.json() and "charts" in r.json()

    r = client.put("/api/students/me/goals", headers=student_headers,
                   json={"goals": ["grammar", "pronunciation"], "target_level": "Advanced"})
    assert r.status_code == 200
    assert r.json()["target_level"] == "Advanced"

    r = client.get("/api/students/me/progress", headers=student_headers)
    assert r.status_code == 200
    assert set(["daily", "skill_history", "before_after"]).issubset(r.json().keys())


def test_assessment_flow(client, clean_db, student_headers):
    r = client.post("/api/assessments", headers=student_headers, json={"title": "Initial", "kind": "initial"})
    assert r.status_code == 200
    aid = r.json()["assessment_id"]

    r = client.get(f"/api/assessments/{aid}", headers=student_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["questions"]) >= 16

    answers = [
        {"question_id": q["id"], "answer_text": "The student chooses to buy the ticket.", "is_correct": "true"}
        if q["skill"] == "listening" and q["type"] == "listening" else
        {"question_id": q["id"], "answer_text": "A thoughtful response about the topic."}
        for q in data["questions"]
    ]
    r = client.post(f"/api/assessments/{aid}/submit", headers=student_headers, json={"answers": answers})
    assert r.status_code == 200, r.text
    scored = r.json()
    assert 0 <= scored["overall"] <= 100
    assert scored["level"]
    assert scored["scores"]

    report = client.get(f"/api/assessments/{aid}/report", headers=student_headers)
    assert report.status_code == 200
    assert "strengths" in report.json() and "recommendations" in report.json()


def test_practice_speaking(client, clean_db, student_headers):
    r = client.post("/api/practice/speaking", headers=student_headers, json={
        "skill": "speaking", "mode": "submit", "topic": "Self introduction",
        "transcript": "Hello, my name is Test. I work as an engineer and I enjoy learning languages.",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert "overall" in body and "level" in body


def test_discussion_flow(client, clean_db, teacher_headers, student_headers):
    # Teacher creates
    r = client.post("/api/discussions", headers=teacher_headers, json={
        "topic": "Should homework be banned?", "duration_seconds": 60, "participant_limit": 4,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    code = d["session_code"]
    assert code.startswith("GD-")

    # Student joins
    r = client.post("/api/discussions/join", headers=student_headers, json={"session_code": code})
    assert r.status_code == 200

    # Start + end → completed
    start = client.post(f"/api/discussions/{d['id']}/start", headers=teacher_headers)
    assert start.status_code == 200

    # Add a couple of segments via the REST transcript endpoint isn't present,
    # so end directly and check analysis runs with at least the moderator message.
    end = client.post(f"/api/discussions/{d['id']}/end", headers=teacher_headers)
    assert end.status_code == 200, end.text
    assert end.json()["status"] == "COMPLETED"

    report = client.get(f"/api/discussions/{d['id']}/report", headers=student_headers)
    assert report.status_code == 200
    assert "individual_reports" in report.json()

    leaderboard = client.get(f"/api/discussions/{d['id']}/leaderboard", headers=teacher_headers)
    assert leaderboard.status_code == 200


def test_discussion_recap_and_recording(client, clean_db, teacher_headers, student_headers):
    r = client.post("/api/discussions", headers=teacher_headers, json={
        "topic": "Remote work pros and cons", "duration_seconds": 60, "participant_limit": 4,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    code = d["session_code"]
    client.post("/api/discussions/join", headers=student_headers, json={"session_code": code})
    client.post(f"/api/discussions/{d['id']}/start", headers=teacher_headers)

    # No transcript yet → recap still returns structured notes
    r = client.post(f"/api/discussions/{d['id']}/recap", headers=teacher_headers)
    assert r.status_code == 200, r.text
    recap = r.json()
    assert "title" in recap and "key_points" in recap and "action_items" in recap

    # Recap persists and is retrievable by a student too
    r = client.get(f"/api/discussions/{d['id']}/recap", headers=student_headers)
    assert r.status_code == 200 and r.json().get("title") == recap["title"]

    # Recording upload → metadata → download
    up = client.post(
        f"/api/discussions/{d['id']}/recording",
        headers=teacher_headers,
        files={"file": ("demo.webm", b"fakemediabytes", "video/webm")},
    )
    assert up.status_code == 200, up.text
    assert up.json()["size"] == len(b"fakemediabytes")

    meta = client.get(f"/api/discussions/{d['id']}/recording", headers=student_headers)
    assert meta.status_code == 200 and meta.json()["download_url"]

    dl = client.get(f"/api/discussions/{d['id']}/recording/file", headers=teacher_headers)
    assert dl.status_code == 200 and dl.content == b"fakemediabytes"

    # Detail payload now includes recap + recording
    detail = client.get(f"/api/discussions/{d['id']}", headers=student_headers).json()
    assert detail["recap"].get("title") == recap["title"]
    assert detail["recording"]["name"] == "demo.webm"


def test_teacher_endpoints(client, clean_db, teacher_headers, student_headers):
    # Give the class at least one student with data
    client.get("/api/students/me/dashboard", headers=student_headers)

    r = client.get("/api/teachers/dashboard", headers=teacher_headers)
    assert r.status_code == 200
    assert r.json()["total_students"] == 1

    r = client.get("/api/teachers/students", headers=teacher_headers)
    assert r.status_code == 200 and len(r.json()) == 1

    r = client.get("/api/teachers/analytics", headers=teacher_headers)
    assert r.status_code == 200

    # Assignment create + list + student submit
    r = client.post("/api/teachers/assignments", headers=teacher_headers, json={
        "title": "Test Essay", "skill": "writing", "topic": "Environment",
        "difficulty": "intermediate",
        "questions": [{"prompt": "Write about the environment", "type": "essay"}],
        "assessment_criteria": ["Clarity"],
    })
    assert r.status_code == 200

    r = client.get("/api/students/assignments", headers=student_headers)
    assert r.status_code == 200 and len(r.json()) == 1

    r = client.post(f"/api/students/assignments/{r.json()[0]['id']}/submit", headers=student_headers,
                    json={"answer": {"text": "Protecting the environment matters for future generations."}})
    assert r.status_code == 200, r.text
    assert "score" in r.json()

    # Role separation: student cannot hit teacher endpoints
    r = client.get("/api/teachers/dashboard", headers=student_headers)
    assert r.status_code == 403


def test_intelligence_layer(client, clean_db, student_headers):
    # AI Coach
    r = client.post("/api/students/me/coach", headers=student_headers, json={"message": "Help me improve fluency"})
    assert r.status_code == 200, r.text
    assert r.json()["reply"]
    hist = client.get("/api/students/me/coach", headers=student_headers)
    assert hist.status_code == 200 and len(hist.json()) == 2

    # Vocabulary builder
    r = client.post("/api/students/me/vocabulary/seed", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["added"] > 0
    r = client.get("/api/students/me/vocabulary", headers=student_headers)
    assert r.status_code == 200
    words = r.json()["words"]
    assert words
    wid = words[0]["id"]
    r = client.post(f"/api/students/me/vocabulary/{wid}/status", headers=student_headers, json={"status": "learning"})
    assert r.status_code == 200 and r.json()["status"] == "learning"
    r = client.post("/api/students/me/vocabulary/practice", headers=student_headers, json={"word_ids": [wid]})
    assert r.status_code == 200 and r.json()["practiced"] == 1

    # Study plan (no assessment yet -> regenerate creates one deterministically)
    r = client.post("/api/students/me/study-plan/regenerate", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["weeks"]
    r = client.get("/api/students/me/study-plan", headers=student_headers)
    assert r.status_code == 200 and r.json()["available"] is True

    # Mistake heatmap
    r = client.get("/api/students/me/mistakes/heatmap", headers=student_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["weeks"]) == 12 and body["categories"]

    # Per-skill timeline
    r = client.get("/api/students/me/progress", headers=student_headers)
    assert "skill_timeline" in r.json()


def test_teacher_insights(client, clean_db, teacher_headers, student_headers):
    client.get("/api/students/me/dashboard", headers=student_headers)
    r = client.get("/api/teachers/insights", headers=teacher_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "class_narrative" in body and body["students"]
    assert "narrative" in body["students"][0]
    assert body["students"][0]["student_id"] is not None

    # Student cannot access teacher insights
    assert client.get("/api/teachers/insights", headers=student_headers).status_code == 403


@pytest.fixture()
def admin_headers(client):
    from app.database.db import SessionLocal
    from app.services.admin import ensure_admin

    db = SessionLocal()
    try:
        ensure_admin(db, "t_admin", "secret123", "Test Admin")
    finally:
        db.close()
    r = client.post("/api/auth/login", data={"username": "t_admin", "password": "secret123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_speaking_includes_participation(client, clean_db, student_headers):
    r = client.post("/api/practice/speaking", headers=student_headers, json={
        "skill": "speaking", "mode": "submit", "topic": "Hobbies",
        "transcript": "I enjoy reading books and playing football in my free time. It helps me relax.",
    })
    assert r.status_code == 200, r.text
    scores = r.json()["scores"]
    assert "participation" in scores
    assert 0 <= scores["participation"] <= 100


def test_coach_returns_solutions(client, clean_db, student_headers):
    # Ask about a specific problem -> structured solution with steps
    r = client.post("/api/students/me/coach", headers=student_headers, json={
        "message": "My problem is I get very nervous before interviews. Give me a solution",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"]
    assert body["solution"] and body["solution"].get("steps")
    assert "context" in body

    # Follow-up message about fluency is answered too (conversation memory)
    r2 = client.post("/api/students/me/coach", headers=student_headers, json={
        "message": "How do I speak more fluently?",
    })
    assert r2.status_code == 200 and r2.json()["reply"]
    sol = r2.json().get("solution")
    assert sol and len(sol.get("steps", [])) >= 1

    # History endpoint returns the conversation
    h = client.get("/api/students/me/coach", headers=student_headers)
    assert h.status_code == 200
    roles = [m["role"] for m in h.json()]
    assert roles.count("user") >= 2 and roles.count("coach") >= 2


def test_admin_registration_requires_code(client, clean_db):
    payload = {
        "username": "reg_admin", "email": "reg_admin@test.dev", "password": "secret123",
        "full_name": "Registered Admin", "role": "admin",
    }
    # Wrong code rejected
    r = client.post("/api/auth/register", json={**payload, "admin_code": "wrong"})
    assert r.status_code == 400
    # Correct code accepted, admin gets a User ID
    r = client.post("/api/auth/register", json={**payload, "admin_code": settings.ADMIN_REGISTRATION_CODE})
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["role"] == "admin" and user["user_id"]

    # Registering student/teacher works without a code
    r = client.post("/api/auth/register", json={
        "username": "no_code", "email": "no_code@test.dev", "password": "secret123",
        "full_name": "No Code", "role": "student",
    })
    assert r.status_code == 200


def test_admin_user_management(client, clean_db, admin_headers, student_headers, teacher_headers):
    # Stats
    r = client.get("/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200 and r.json()["students"] == 1 and r.json()["teachers"] == 1

    # Non-admin blocked
    assert client.get("/api/admin/users", headers=student_headers).status_code == 403
    assert client.get("/api/admin/users", headers=teacher_headers).status_code == 403

    # List + find the student
    r = client.get("/api/admin/users", headers=admin_headers)
    student = [u for u in r.json() if u["role"] == "student"][0]

    # Promote to teacher, then demote back
    r = client.put(f"/api/admin/users/{student['id']}/role", headers=admin_headers, json={"role": "teacher"})
    assert r.status_code == 200 and r.json()["role"] == "teacher"
    r = client.put(f"/api/admin/users/{student['id']}/role", headers=admin_headers, json={"role": "student"})
    assert r.status_code == 200 and r.json()["role"] == "student"

    # Invalid role rejected
    r = client.put(f"/api/admin/users/{student['id']}/role", headers=admin_headers, json={"role": "admin"})
    assert r.status_code == 400

    # Delete a fresh account
    r = client.post("/api/auth/register", json={
        "username": "doomed", "email": "doomed@test.dev", "password": "secret123",
        "full_name": "Doomed", "role": "student",
    })
    assert r.status_code == 200
    uid = r.json()["user"]["id"]
    r = client.delete(f"/api/admin/users/{uid}", headers=admin_headers)
    assert r.status_code == 200
    gone = client.get("/api/admin/users", headers=admin_headers).json()
    assert all(u["id"] != uid for u in gone)

    # Admin cannot delete themselves
    r = client.get("/api/admin/users", headers=admin_headers)
    me = [u for u in r.json() if u["role"] == "admin"][0]
    r = client.delete(f"/api/admin/users/{me['id']}", headers=admin_headers)
    assert r.status_code == 400