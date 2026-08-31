"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Loader2, ArrowLeft, Sparkles, Users, CheckCircle2, Send, Pencil, Trash2, ArrowUp, ArrowDown, RotateCcw, Plus } from "lucide-react";

interface Question {
  id: string;
  questionNumber: number;
  type: string;
  prompt: string;
  script?: string | null;
  expectedAnswer?: string | null;
  options?: unknown;
  criteria?: string[] | null;
}

interface Detail {
  id: string;
  skill: string;
  title: string;
  description: string | null;
  difficulty: string;
  deadline: string | null;
  criteria: string[] | null;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
  publishedAt: string | null;
  targetStudentIds: string[] | null;
  questions: Question[];
  stats: { submitted: number; graded: number; totalStudents: number | null; averageScore: number | null; highestScore: number | null; lowestScore: number | null };
}

interface Submission {
  id: string;
  student: { id: string; name: string; userId: string; email: string };
  status: string;
  score: number | null;
  content: unknown;
  feedback: unknown;
  submittedAt: string;
  gradedAt: string | null;
}

interface ReportData {
  assignment: { id: string; title: string; skill: string };
  analytics: { totalStudents: number | null; submitted: number; pending: number; averageScore: number | null; highestScore: number | null; lowestScore: number | null; completionPercent: number | null };
  reports: Submission[];
}

interface Student {
  id: string;
  name: string;
  userId: string;
}

const SKILL_EMOJI: Record<string, string> = { LISTENING: "🎧", SPEAKING: "🎤", READING: "📖", WRITING: "✍️" };

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"submissions" | "reports">("submissions");
  const [selectedReport, setSelectedReport] = useState<Submission | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [assignMode, setAssignMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [showAssign, setShowAssign] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ prompt: "", script: "", expectedAnswer: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s, r] = await Promise.all([
        api<Detail>(`/api/teacher/assignments/${id}`),
        api<Submission[]>(`/api/teacher/assignments/${id}/submissions`),
        api<ReportData>(`/api/teacher/assignments/${id}/reports`),
      ]);
      setDetail(d);
      setSubmissions(s);
      setReport(r);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { void load(); }, [load]);

  const published = detail?.status === "PUBLISHED";
  const needsScript = detail?.skill === "LISTENING" || detail?.skill === "READING";

  async function publish() {
    if (!detail) return;
    setSaving(true);
    try {
      await api(`/api/teacher/assignments/${detail.id}/publish`, { method: "POST", body: {} });
      toast("success", "Assignment published");
      await load();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  async function saveTargets() {
    if (!detail) return;
    setSaving(true);
    try {
      await api(`/api/teacher/assignments/${detail.id}`, { method: "PUT", body: { targetStudentIds: assignMode === "all" ? [] : selected } });
      setShowAssign(false);
      toast("success", "Students updated");
      await load();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to update students");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(qid: string) {
    if (!detail) return;
    if (!confirm("Delete this question?")) return;
    try {
      await api(`/api/teacher/assignments/${detail.id}/questions/${qid}`, { method: "DELETE" });
      await load();
      toast("success", "Question deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete question");
    }
  }

  async function regenerateQuestion(qid: string) {
    if (!detail) return;
    try {
      await api(`/api/teacher/assignments/${detail.id}/questions/${qid}/regenerate`, { method: "POST", body: {} });
      await load();
      toast("success", "Question regenerated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    }
  }

  async function saveQuestion() {
    if (!detail || !editingId) return;
    setSaving(true);
    try {
      await api(`/api/teacher/assignments/${detail.id}/questions/${editingId}`, {
        method: "PUT",
        body: { prompt: editForm.prompt, script: editForm.script || undefined, expectedAnswer: editForm.expectedAnswer || undefined },
      });
      setEditingId(null);
      await load();
      toast("success", "Question updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update question");
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    if (!detail || !editForm.prompt.trim()) return;
    setSaving(true);
    try {
      await api(`/api/teacher/assignments/${detail.id}/questions`, {
        method: "POST",
        body: { type: detail.skill, prompt: editForm.prompt, script: editForm.script || undefined, expectedAnswer: editForm.expectedAnswer || undefined },
      });
      setEditForm({ prompt: "", script: "", expectedAnswer: "" });
      await load();
      toast("success", "Question added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSaving(false);
    }
  }

  async function moveQuestion(index: number, dir: -1 | 1) {
    if (!detail) return;
    const q = detail.questions;
    const target = index + dir;
    if (target < 0 || target >= q.length) return;
    const next = [...q];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    try {
      await api(`/api/teacher/assignments/${detail.id}/questions/reorder`, { method: "PUT", body: { questionIds: next.map((x) => x.id) } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  function openReport(s: Submission) {
    setSelectedReport(s);
  }

  if (loading) return <PageSkeleton />;
  if (!detail) return <p className="p-8 text-ink-500">Assignment not found.</p>;

  const stats = detail.stats;
  const a = report?.analytics;

  const renderQuestionList = (editable: boolean) => (
    <div className="mt-4 space-y-3">
      {detail.questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl border border-ink-100 p-4">
          {editable && editingId === q.id ? (
            <div className="space-y-3">
              <textarea value={editForm.prompt} onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })} rows={2} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
              {needsScript && <textarea value={editForm.script} onChange={(e) => setEditForm({ ...editForm, script: e.target.value })} rows={2} placeholder={detail.skill === "LISTENING" ? "Audio script…" : "Passage…"} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />}
              {needsScript && <input value={editForm.expectedAnswer} onChange={(e) => setEditForm({ ...editForm, expectedAnswer: e.target.value })} placeholder="Expected answer…" className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />}
              <div className="flex gap-2">
                <Button size="sm" onClick={saveQuestion} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="primary">Q{q.questionNumber}</Badge>
                  <Badge tone="ai">{q.type}</Badge>
                </div>
                <p className="text-sm font-semibold text-ink-900">{q.prompt}</p>
                {q.script && <p className="mt-1 rounded-lg bg-ink-50 px-3 py-2 text-xs italic text-ink-600">{q.script}</p>}
                {q.expectedAnswer && <p className="mt-1 text-xs text-emerald-700">✔ {q.expectedAnswer}</p>}
              </div>
              {editable && (
                <div className="flex flex-none items-center gap-1">
                  <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => moveQuestion(i, 1)} disabled={i === detail.questions.length - 1} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => regenerateQuestion(q.id)} className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50" aria-label="Regenerate"><RotateCcw className="h-4 w-4" /></button>
                  <button onClick={() => { setEditingId(q.id); setEditForm({ prompt: q.prompt, script: q.script ?? "", expectedAnswer: q.expectedAnswer ?? "" }); }} className="rounded-lg p-1.5 text-sky-500 hover:bg-sky-50" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteQuestion(q.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/teacher/assignments" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"><ArrowLeft className="h-4 w-4" /> All Assignments</Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow={`${SKILL_EMOJI[detail.skill]} ${detail.skill} Assignment`} title={detail.title} subtitle={detail.description ?? undefined} icon={<Send className="h-6 w-6" />} gradient="bg-gradient-brand" />
        <div className="flex gap-2">
          {!published && <Button variant="outline" onClick={() => setShowAssign(true)} disabled={saving}><Users className="h-4 w-4" /> Assign Students</Button>}
          {!published && <Button variant="gradient" onClick={publish} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Publish</Button>}
          {published && <Button variant="soft" onClick={() => setShowAssign(true)} disabled={saving}><Users className="h-4 w-4" /> Manage Students</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">{detail.skill}</Badge>
        <Badge tone={detail.difficulty === "HARD" ? "warning" : detail.difficulty === "MEDIUM" ? "default" : "success"}>{detail.difficulty}</Badge>
        {detail.aiGenerated && <Badge tone="ai">AI Generated</Badge>}
        <Badge tone={published ? "success" : "warning"}>{detail.status}</Badge>
        <span className="text-sm font-semibold text-ink-500">📝 {detail.questions.length} questions</span>
        {detail.deadline && <span className="text-sm font-semibold text-ink-500">⏰ Due {new Date(detail.deadline).toLocaleDateString()}</span>}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* DRAFT: question editing + publish */}
      {!published && (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-ink-900">Questions</h3>
                <p className="text-sm text-ink-500">Edit before publishing — questions stay fixed afterwards.</p>
              </div>
              <Button variant="soft" size="sm" onClick={() => setEditForm({ prompt: "", script: "", expectedAnswer: "" })}><Plus className="h-4 w-4" /> Add Question</Button>
            </div>
            {renderQuestionList(true)}
            {detail.questions.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-400">No questions yet — add or generate them in the create flow.</p>}
          </Card>
        </>
      )}

      {showAssign && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Assign Students</h3>
          <div className="mt-3 flex gap-3">
            <button onClick={() => setAssignMode("all")} className={`flex-1 rounded-2xl border-2 p-3 text-center ${assignMode === "all" ? "border-primary-500 bg-primary-50" : "border-ink-200"}`}><p className="text-sm font-bold">👨‍🏫 Entire class</p></button>
            <button onClick={() => setAssignMode("selected")} className={`flex-1 rounded-2xl border-2 p-3 text-center ${assignMode === "selected" ? "border-primary-500 bg-primary-50" : "border-ink-200"}`}><p className="text-sm font-bold">🎯 Selected students</p></button>
          </div>
          {assignMode === "selected" && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-ink-100 divide-y divide-ink-50">
              {students.length === 0 && <p className="p-4 text-sm text-ink-400">Loading students…</p>}
              {students.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-ink-50">
                    <input type="checkbox" checked={checked} onChange={() => setSelected((prev) => checked ? prev.filter((x) => x !== s.id) : [...prev, s.id])} className="h-4 w-4 accent-primary-600" />
                    <span className="font-mono text-xs text-ink-400">{s.userId}</span>
                    <span className="text-sm font-semibold text-ink-800">{s.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={saveTargets} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAssign(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* PUBLISHED: stats + submissions + reports */}
      {published && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Submissions</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{stats.submitted}</p>
              <div className="mt-2"><ProgressBar value={stats.submitted} color="bg-gradient-brand" /></div>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Graded</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{stats.graded}</p>
              {a?.completionPercent != null && <p className="mt-2 text-xs font-semibold text-ink-400">{a.completionPercent}% completion</p>}
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Average Score</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{stats.averageScore != null ? `${stats.averageScore}%` : "—"}</p>
              {stats.highestScore != null && <p className="mt-2 text-xs font-semibold text-emerald-600">High {stats.highestScore}% · Low {stats.lowestScore}%</p>}
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Assigned To</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{a?.totalStudents != null ? `${a.totalStudents}` : "All"}</p>
              <p className="mt-2 text-xs font-semibold text-ink-400">{a?.pending ?? 0} still pending</p>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button variant={tab === "submissions" ? "gradient" : "ghost"} size="sm" onClick={() => setTab("submissions")}><Send className="h-4 w-4" /> Submissions ({submissions.length})</Button>
            <Button variant={tab === "reports" ? "gradient" : "ghost"} size="sm" onClick={() => setTab("reports")}><CheckCircle2 className="h-4 w-4" /> Reports & Analytics</Button>
          </div>

          {tab === "submissions" && (
            <Card>
              {submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-3xl">🕒</p>
                  <p className="mt-2 font-bold text-ink-800">No submissions yet</p>
                  <p className="text-sm text-ink-500">Students will appear here once they submit.</p>
                </div>
              ) : (
                <div className="divide-y divide-ink-50">
                  <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wide text-ink-400 sm:grid">
                    <span>Student</span><span>Status</span><span>Score</span><span>Submitted</span>
                  </div>
                  {submissions.map((s) => (
                    <button key={s.id} onClick={() => openReport(s)} className="grid w-full grid-cols-1 gap-2 px-6 py-4 text-left transition-colors hover:bg-ink-50/60 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4">
                      <div>
                        <p className="text-sm font-bold text-ink-900">{s.student.name}</p>
                        <p className="font-mono text-xs text-ink-400">{s.student.userId}</p>
                      </div>
                      <Badge tone={s.status === "GRADED" ? "success" : s.status === "SUBMITTED" ? "warning" : "default"}>{s.status}</Badge>
                      <span className={`text-sm font-extrabold ${s.score != null ? "text-primary-600" : "text-ink-300"}`}>{s.score != null ? `${s.score}%` : "—"}</span>
                      <span className="text-xs text-ink-500">{new Date(s.submittedAt).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === "reports" && (
            <>
              {report && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Class Average</p><p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{a?.averageScore != null ? `${a.averageScore}%` : "—"}</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Highest</p><p className="mt-1 font-display text-3xl font-extrabold text-emerald-600">{a?.highestScore != null ? `${a.highestScore}%` : "—"}</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Lowest</p><p className="mt-1 font-display text-3xl font-extrabold text-red-500">{a?.lowestScore != null ? `${a.lowestScore}%` : "—"}</p></Card>
                  <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Completion</p><p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{a?.completionPercent != null ? `${a.completionPercent}%` : "—"}</p></Card>
                </div>
              )}
              <Card>
                <div className="border-b border-ink-100 px-6 py-4">
                  <h3 className="font-display text-lg font-extrabold text-ink-900">Per-Student Reports</h3>
                  <p className="text-sm text-ink-500">Click a student to view their detailed AI feedback.</p>
                </div>
                {report && report.reports.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-3xl">📊</p>
                    <p className="mt-2 font-bold text-ink-800">No graded reports yet</p>
                    <p className="text-sm text-ink-500">Reports appear once AI evaluation completes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-ink-50">
                    {report?.reports.map((s) => (
                      <button key={s.id} onClick={() => openReport(s)} className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-4 text-left hover:bg-ink-50/60">
                        <div>
                          <p className="text-sm font-bold text-ink-900">{s.student.name}</p>
                          <p className="font-mono text-xs text-ink-400">{s.student.userId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge tone={s.status === "GRADED" ? "success" : "warning"}>{s.status}</Badge>
                          <span className="text-sm font-extrabold text-primary-600">{s.score != null ? `${s.score}%` : "—"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedReport(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-extrabold text-ink-900">{selectedReport.student.name}</h3>
                <p className="font-mono text-xs text-ink-400">{selectedReport.student.userId}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="rounded-full p-2 text-ink-400 hover:bg-ink-100">✕</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone={selectedReport.status === "GRADED" ? "success" : "warning"}>{selectedReport.status}</Badge>
              {selectedReport.score != null && <span className="font-display text-3xl font-extrabold text-primary-600">{selectedReport.score}%</span>}
            </div>
            {!!selectedReport.feedback && typeof selectedReport.feedback === "object" && (
              <ReportContent feedback={selectedReport.feedback as Record<string, unknown>} />
            )}
            {!selectedReport.feedback && <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-500">AI evaluation is still pending for this submission.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportContent({ feedback }: { feedback: Record<string, unknown> }) {
  const metrics = (feedback.metrics as { metric: string; score: number }[] | undefined) ?? [];
  const perQuestion = (feedback.perQuestion as { questionNumber: number; scores: { metric: string; score: number }[]; overallScore: number; feedback: string; strengths: string[]; improvements: string[] }[] | undefined) ?? [];
  const feedbackText = (feedback.feedback as string | undefined) ?? "";
  const strengths = (feedback.strengths as string[] | undefined) ?? [];
  const improvements = (feedback.improvements as string[] | undefined) ?? [];

  return (
    <div className="mt-4 space-y-5">
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.metric} className="rounded-xl bg-ink-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{m.metric}</p>
              <p className="font-display text-xl font-extrabold text-ink-900">{m.score}<span className="text-sm">%</span></p>
            </div>
          ))}
        </div>
      )}
      {feedbackText && <div className="rounded-xl bg-primary-50 p-4 text-sm text-ink-800"><strong>Overall feedback:</strong> {feedbackText}</div>}
      {perQuestion.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-display font-extrabold text-ink-900">Per-Question Feedback</h4>
          {perQuestion.map((q) => (
            <div key={q.questionNumber} className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">Question {q.questionNumber}</p>
                <span className="text-sm font-extrabold text-primary-600">{q.overallScore}%</span>
              </div>
              {q.scores.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.scores.map((s) => <Badge key={s.metric} tone={s.score >= 70 ? "success" : s.score >= 50 ? "warning" : "danger"}>{s.metric}: {s.score}%</Badge>)}
                </div>
              )}
              {q.feedback && <p className="mt-2 text-sm text-ink-600">{q.feedback}</p>}
              {q.strengths.length > 0 && <p className="mt-1 text-xs text-emerald-700">Strengths: {q.strengths.join(", ")}</p>}
              {q.improvements.length > 0 && <p className="mt-1 text-xs text-amber-700">Improve: {q.improvements.join(", ")}</p>}
            </div>
          ))}
        </div>
      )}
      {strengths.length > 0 && <p className="text-sm text-emerald-700"><strong>Strengths:</strong> {strengths.join(", ")}</p>}
      {improvements.length > 0 && <p className="text-sm text-amber-700"><strong>Improvements:</strong> {improvements.join(", ")}</p>}
    </div>
  );
}