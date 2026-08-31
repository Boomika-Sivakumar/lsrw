"""Admin operations: account deletion, role management, and stats.

The full cascade-delete logic lives here so both the CLI (delete_user.py)
and the admin API use the exact same deletion behaviour.
"""
from sqlalchemy.orm import Session

from app.core.security import generate_user_id, hash_password
from app.models.assessment import Assessment, AssessmentAnswer, AssessmentQuestion, SkillScore
from app.models.assignment import Assignment, AssignmentSubmission, ProgressHistory, Report
from app.models.discussion import (
    DiscussionAnalysis,
    DiscussionParticipant,
    DiscussionTranscript,
    GroupDiscussion,
    SpeakerSegment,
)
from app.models.intelligence import CoachMessage, VocabularyItem
from app.models.practice import (
    ChallengeCompletion,
    Conversation,
    DailyChallenge,
    Interview,
    LearningPath,
    Mistake,
    PracticeSession,
    Presentation,
    Recommendation,
)
from app.models.user import StudentProfile, TeacherProfile, User

USER_SCOPED = [
    (AssessmentAnswer, "student_id"),
    (Assessment, "student_id"),
    (SkillScore, "student_id"),
    (DiscussionParticipant, "student_id"),
    (GroupDiscussion, None),  # owner depends on user role, handled below
    (PracticeSession, "student_id"),
    (Conversation, "student_id"),
    (Interview, "student_id"),
    (Presentation, "student_id"),
    (Mistake, "student_id"),
    (Recommendation, "student_id"),
    (LearningPath, "student_id"),
    (ChallengeCompletion, "student_id"),
    (VocabularyItem, "student_id"),
    (CoachMessage, "student_id"),
    (Assignment, "teacher_id"),
    (AssignmentSubmission, "student_id"),
    (Report, "student_id"),
    (ProgressHistory, "student_id"),
    (StudentProfile, "user_id"),
    (TeacherProfile, "user_id"),
]

ROLES = ("student", "teacher", "admin")


def delete_account(db: Session, user: User) -> None:
    """Delete a user and every record that references them (cascade)."""
    assessment_ids = [a.id for a in db.query(Assessment.id).filter(Assessment.student_id == user.id).all()]
    if user.role == "teacher":
        discussion_ids = [d.id for d in db.query(GroupDiscussion.id).filter(GroupDiscussion.teacher_id == user.id).all()]
    else:
        discussion_ids = [
            d.id for d in db.query(GroupDiscussion.id).filter(
                GroupDiscussion.id.in_(
                    db.query(DiscussionParticipant.discussion_id).filter(DiscussionParticipant.student_id == user.id)
                )
            ).all()
        ]

    for model, fk in USER_SCOPED:
        if model is GroupDiscussion or fk is None:
            continue
        db.query(model).filter(getattr(model, fk) == user.id).delete(synchronize_session=False)

    if assessment_ids:
        db.query(AssessmentQuestion).filter(AssessmentQuestion.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)

    if discussion_ids:
        db.query(DiscussionTranscript).filter(DiscussionTranscript.discussion_id.in_(discussion_ids)).delete(synchronize_session=False)
        db.query(SpeakerSegment).filter(SpeakerSegment.discussion_id.in_(discussion_ids)).delete(synchronize_session=False)
        db.query(DiscussionAnalysis).filter(DiscussionAnalysis.discussion_id.in_(discussion_ids)).delete(synchronize_session=False)

    db.delete(user)
    db.commit()


def list_users(db: Session, role: str = "") -> list:
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    rows = q.order_by(User.id).all()
    return [
        {
            "id": u.id, "username": u.username, "full_name": u.full_name,
            "email": u.email, "role": u.role, "user_id": u.user_id or "",
            "is_active": bool(u.is_active),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]


def set_role(db: Session, user: User, new_role: str) -> User:
    """Change a user's role (student <-> teacher), swapping their profile."""
    if new_role not in ("student", "teacher"):
        raise ValueError("Role must be 'student' or 'teacher'")
    if user.role == "admin":
        raise ValueError("Cannot change an admin's role")
    if user.role == new_role:
        return user

    if new_role == "student":
        # Teacher -> student: keep their data, attach a student profile.
        db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).delete(synchronize_session=False)
        if not db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first():
            db.add(StudentProfile(user_id=user.id, goals=[]))
    else:
        # Student -> teacher: keep their data, attach a teacher profile.
        db.query(StudentProfile).filter(StudentProfile.user_id == user.id).delete(synchronize_session=False)
        if not db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first():
            db.add(TeacherProfile(user_id=user.id))

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


def admin_stats(db: Session) -> dict:
    students = db.query(User).filter(User.role == "student").count()
    teachers = db.query(User).filter(User.role == "teacher").count()
    admins = db.query(User).filter(User.role == "admin").count()
    total = students + teachers + admins
    return {"total_users": total, "students": students, "teachers": teachers, "admins": admins}


def _unique_user_id(db: Session) -> str:
    for _ in range(20):
        uid = generate_user_id()
        if not db.query(User).filter(User.user_id == uid).first():
            return uid
    return generate_user_id() + str(db.query(User).count())[-2:]


def ensure_admin(db: Session, username: str, password: str, full_name: str = "Administrator") -> User:
    """Create an admin account if it does not already exist (idempotent)."""
    admin = db.query(User).filter(User.username == username).first()
    if admin:
        if admin.role != "admin":
            raise ValueError(f"Username '{username}' exists with role '{admin.role}'")
        return admin
    user = User(
        username=username,
        email=f"{username}@admin.lsrw",
        password_hash=hash_password(password),
        full_name=full_name,
        role="admin",
        user_id=_unique_user_id(db),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user