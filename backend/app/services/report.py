"""Report generation + PDF/CSV export helpers."""
import csv
import io
from typing import Dict

from sqlalchemy.orm import Session

from app.models.assessment import Assessment, SkillScore
from app.models.assignment import Report
from app.models.discussion import DiscussionAnalysis
from app.models.user import User
from app.services.dashboard import _before_after, student_dashboard


def build_student_report(db: Session, student: User) -> dict:
    """Complete student performance report."""
    dash = student_dashboard(db, student)
    assessments = (
        db.query(Assessment)
        .filter(Assessment.student_id == student.id, Assessment.status == "scored")
        .order_by(Assessment.started_at.desc())
        .all()
    )
    before_after = _before_after(db, student.id)
    return {
        "user": student.to_public_dict(),
        "overall": dash["overall"],
        "level": dash["level"],
        "target_level": dash["target_level"],
        "scores": dash["scores"],
        "strengths": dash["strengths"],
        "weaknesses": dash["weaknesses"],
        "skill_gaps": dash["skill_gaps"],
        "mistakes": dash["recent_mistakes"],
        "recommendations": dash["recommendations"],
        "assessments": [
            {
                "id": a.id,
                "title": a.title,
                "kind": a.kind,
                "overall_score": a.overall_score,
                "level": a.level,
                "scores": a.scores,
                "date": a.started_at.isoformat() if a.started_at else None,
            }
            for a in assessments
        ],
        "before_after": before_after,
        "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }


def final_communication_report(db: Session, student: User, assessment: Assessment) -> dict:
    return {
        "title": "Final LSRW Communication Report",
        "user": student.to_public_dict(),
        "overall_communication_score": assessment.overall_score,
        "level": assessment.level,
        "scores": assessment.scores or {},
        "listening": (assessment.scores or {}).get("listening"),
        "speaking": (assessment.scores or {}).get("speaking"),
        "reading": (assessment.scores or {}).get("reading"),
        "writing": (assessment.scores or {}).get("writing"),
        "grammar": (assessment.scores or {}).get("grammar"),
        "vocabulary": (assessment.scores or {}).get("vocabulary"),
        "pronunciation": (assessment.scores or {}).get("pronunciation"),
        "fluency": (assessment.scores or {}).get("fluency"),
        "comprehension": (assessment.scores or {}).get("comprehension"),
        "confidence": (assessment.scores or {}).get("confidence"),
        "participation": (assessment.scores or {}).get("participation"),
        "strengths": assessment.strengths or [],
        "weaknesses": assessment.weaknesses or [],
        "mistakes": assessment.mistakes or [],
        "recommendations": assessment.recommendations or [],
        "summary": assessment.summary or "",
        "date": assessment.submitted_at.isoformat() if assessment.submitted_at else None,
    }


def discussion_report_payload(db: Session, discussion_id: int) -> Dict:
    analysis = db.query(DiscussionAnalysis).filter(DiscussionAnalysis.discussion_id == discussion_id).first()
    from app.models.discussion import GroupDiscussion

    d = db.query(GroupDiscussion).filter(GroupDiscussion.id == discussion_id).first()
    if not d:
        raise ValueError("Discussion not found")
    return {
        "discussion": d.public_dict,
        "group_report": d.group_report,
        "summary": d.summary,
        "individual_reports": analysis.individual_reports if analysis else {},
        "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }


def save_report(db: Session, student_id: int, report_type: str, title: str, report: dict) -> Report:
    r = Report(student_id=student_id, report_type=report_type, title=title, report=report)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def export_csv(rows: list, headers: list) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([row.get(h, "") for h in headers])
    return buf.getvalue().encode("utf-8")


def report_to_html(report: dict, title: str) -> str:
    """Simple HTML report for PDF export (browser print -> PDF)."""
    scores = report.get("scores", {})
    score_rows = "".join(
        f"<tr><td>{k.replace('_', ' ').title()}</td><td>{v}</td></tr>" for k, v in scores.items()
    )
    strengths = "".join(f"<li>{s}</li>" for s in report.get("strengths", []))
    weaknesses = "".join(f"<li>{w}</li>" for w in report.get("weaknesses", []))
    recs = "".join(f"<li>{r.get('title', r) if isinstance(r, dict) else r}</li>" for r in report.get("recommendations", []))
    return f"""<!DOCTYPE html><html><head><meta charset='utf-8'>
<style>body{{font-family:Arial,sans-serif;margin:40px}} h1{{color:#1e40af}}
table{{border-collapse:collapse;width:60%}} td,th{{border:1px solid #ccc;padding:8px;text-align:left}}
th{{background:#f3f4f6}}</style></head><body>
<h1>{title}</h1>
<p><b>User:</b> {report.get('user', {}).get('full_name', '')} ({report.get('user', {}).get('user_id', '')})</p>
<p><b>Overall Score:</b> {report.get('overall', '')} &nbsp; <b>Level:</b> {report.get('level', '')}</p>
<h2>Scores</h2><table><tr><th>Skill</th><th>Score</th></tr>{score_rows}</table>
<h2>Strengths</h2><ul>{strengths}</ul>
<h2>Weaknesses</h2><ul>{weaknesses}</ul>
<h2>Recommendations</h2><ul>{recs}</ul>
</body></html>"""