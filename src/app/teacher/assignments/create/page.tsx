"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Loader2, Sparkles, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Save, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface Question {
  id: string;
  questionNumber: number;
  type: string;
  prompt: string;
  script?: string | null;
  expectedAnswer?: string | null;
  criteria?: string[] | null;
}

interface Student {
  id: string;
  name: string;
  userId: string;
}

const SKILL_EMOJI: Record<string, string> = { LISTENING: "🎧", SPEAKING: "🎤", READING: "📖", WRITING: "✍️" };
const SKILLS = ["LISTENING", "SPEAKING", "READING", "WRITING"];
const STEP_LABELS = ["Details", "Questions", "Generate", "Review", "Students", "Preview"];

const DEFAULT_COUNTS = [5, 10, 15, 20];

export default function CreateAssignmentPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState<string>("LISTENING");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [count, setCount] = useState(10);

  const [assignmentId, setAssignmentId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [assignMode, setAssignMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);

  const [error, setError] = useState("");

  // question editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ prompt: string; script: string; expectedAnswer: string; criteria: string }>({ prompt: "", script: "", expectedAnswer: "", criteria: "" });
  const [adding, setAdding] = useState(false);

  const reloadQuestions = useCallback(async (id: string) => {
    const detail = await api<{ questions: Question[] }>(`/api/teacher/assignments/${id}`);
    setQuestions(detail.questions);
  }, []);

  async function createDraft() {
    if (!title.trim()) { toast("error", "Please enter an assignment title"); return; }
    setSaving(true);
    setError("");
    try {
      const a = await api<{ id: string }>("/api/teacher/assignments", {
        method: "POST",
        body: { skill, title: title.trim(), description: description.trim() || undefined, difficulty },
      });
      setAssignmentId(a.id);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  }

  async function generateQuestions() {
    if (!assignmentId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await api<{ questions: { prompt: string; script?: string; expectedAnswer?: string }[] }>("/api/teacher/assignments/generate", {
        method: "POST",
        body: { skill, numberOfQuestions: count, title, description: description || undefined, level: "INTERMEDIATE" },
      });
      for (const q of res.questions) {
        await api(`/api/teacher/assignments/${assignmentId}/questions`, {
          method: "POST",
          body: { type: skill, prompt: q.prompt, script: q.script, expectedAnswer: q.expectedAnswer },
        });
      }
      await reloadQuestions(assignmentId);
      toast("success", `Generated ${res.questions.length} questions with AI`);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Question generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function addManualQuestion() {
    if (!editForm.prompt.trim()) { toast("error", "Question text is required"); return; }
    setSaving(true);
    setError("");
    try {
      const criteria = editForm.criteria.split(",").map((s) => s.trim()).filter(Boolean);
      await api(`/api/teacher/assignments/${assignmentId}/questions`, {
        method: "POST",
        body: { type: skill, prompt: editForm.prompt, script: editForm.script || undefined, expectedAnswer: editForm.expectedAnswer || undefined, criteria: criteria.length ? criteria : undefined },
      });
      await reloadQuestions(assignmentId);
      setEditForm({ prompt: "", script: "", expectedAnswer: "", criteria: "" });
      setAdding(false);
      toast("success", "Question added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion() {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const criteria = editForm.criteria.split(",").map((s) => s.trim()).filter(Boolean);
      await api(`/api/teacher/assignments/${assignmentId}/questions/${editingId}`, {
        method: "PUT",
        body: { prompt: editForm.prompt, script: editForm.script || undefined, expectedAnswer: editForm.expectedAnswer || undefined, criteria: criteria.length ? criteria : undefined },
      });
      await reloadQuestions(assignmentId);
      setEditingId(null);
      toast("success", "Question updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update question");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    try {
      await api(`/api/teacher/assignments/${assignmentId}/questions/${qid}`, { method: "DELETE" });
      await reloadQuestions(assignmentId);
      toast("success", "Question deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete question");
    }
  }

  async function regenerateQuestion(qid: string) {
    setError("");
    try {
      await api(`/api/teacher/assignments/${assignmentId}/questions/${qid}/regenerate`, { method: "POST", body: {} });
      await reloadQuestions(assignmentId);
      toast("success", "Question regenerated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    }
  }

  async function moveQuestion(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [q] = next.splice(index, 1);
    next.splice(target, 0, q);
    try {
      await api(`/api/teacher/assignments/${assignmentId}/questions/reorder`, { method: "PUT", body: { questionIds: next.map((x) => x.id) } });
      await reloadQuestions(assignmentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditForm({ prompt: q.prompt, script: q.script ?? "", expectedAnswer: q.expectedAnswer ?? "", criteria: (q.criteria ?? []).join(", ") });
  }

  async function saveTargets() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/teacher/assignments/${assignmentId}`, { method: "PUT", body: { targetStudentIds: assignMode === "all" ? [] : selected } });
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save student selection");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    try {
      await api(`/api/teacher/assignments/${assignmentId}`, { method: "PUT", body: { status: "DRAFT" } });
      toast("success", "Draft saved");
      router.push("/teacher/assignments");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/teacher/assignments/${assignmentId}/publish`, { method: "POST", body: {} });
      toast("success", "Assignment published");
      router.push(`/teacher/assignments/${assignmentId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish assignment");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (step !== 5) return;
    api<Student[]>("/api/teacher/students").then(setStudents).catch(() => setStudents([]));
  }, [step]);

  const needsScript = skill === "LISTENING" || skill === "READING";

  const canNext =
    (step === 1 && title.trim().length >= 2) ||
    (step === 2 && count >= 1) ||
    (step === 4 && questions.length > 0);

  function goNext() {
    if (step === 1) { void createDraft(); return; }
    if (step === 2) { setStep(3); return; }
    if (step === 4) { setStep(5); return; }
    if (step === 5) { void saveTargets(); return; }
    if (step < 6) setStep(step + 1);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader eyebrow="Teacher" title="Create Assignment" subtitle="Build an AI-powered LSRW assignment step by step." icon={<Sparkles className="h-6 w-6" />} gradient="bg-gradient-brand" />
        {assignmentId && (
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4" /> Save Draft
          </Button>
        )}
      </div>

      {/* STEPPER */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-primary-600 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-400"}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{n}</span>}
                {label}
              </span>
              {n < STEP_LABELS.length && <span className="text-ink-300">→</span>}
            </div>
          );
        })}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* STEP 1 — DETAILS */}
      {step === 1 && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Basic Details</h3>
          <p className="text-sm text-ink-500">Describe the assignment and pick the skill.</p>
          <div className="mt-5 grid gap-5">
            <div>
              <label className="block text-sm font-semibold text-ink-700">Assignment Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. "Communication Skills - Week 1"' className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700">Description / Instructions</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder='e.g. "Complete all questions carefully."' className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700">Select Skill</label>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SKILLS.map((s) => (
                  <button key={s} onClick={() => setSkill(s)} className={`rounded-2xl border-2 p-4 text-center transition-all ${skill === s ? "border-primary-500 bg-primary-50" : "border-ink-200 bg-white hover:border-primary-300"}`}>
                    <span className="text-2xl">{SKILL_EMOJI[s]}</span>
                    <p className="mt-1 text-sm font-bold text-ink-800">{s.charAt(0) + s.slice(1).toLowerCase()}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500">
                {["EASY", "MEDIUM", "HARD"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2 — COUNT */}
      {step === 2 && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Number of Questions</h3>
          <p className="text-sm text-ink-500">How many questions should this {skill.toLowerCase()} assignment have?</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEFAULT_COUNTS.map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`rounded-2xl border-2 p-5 text-center transition-all ${count === n ? "border-primary-500 bg-primary-50" : "border-ink-200 hover:border-primary-300"}`}>
                <p className="font-display text-3xl font-extrabold text-ink-900">{n}</p>
                <p className="text-xs font-semibold text-ink-400">questions</p>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-ink-700">Custom number</label>
            <input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="mt-1.5 w-40 rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
        </Card>
      )}

      {/* STEP 3 — GENERATE */}
      {step === 3 && (
        <Card className="p-6 text-center">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Generate Questions with AI</h3>
          <p className="text-sm text-ink-500">The AI will create {count} fresh {skill.toLowerCase()} questions for “{title}”.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button variant="gradient" size="xl" onClick={generateQuestions} disabled={generating}>
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {generating ? "AI is creating your questions…" : "✨ Generate Questions with AI"}
            </Button>
            <button onClick={() => { setAdding(true); setStep(4); }} className="text-sm font-semibold text-primary-600 hover:underline">
              or add a question manually
            </button>
          </div>
        </Card>
      )}

      {/* STEP 4 — REVIEW */}
      {step === 4 && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink-900">Review Questions</h3>
              <p className="text-sm text-ink-500">Edit, reorder, regenerate or delete before publishing. Questions stay fixed after publishing.</p>
            </div>
            <Button variant="soft" size="sm" onClick={() => setAdding((v) => !v)}><Plus className="h-4 w-4" /> Add Question</Button>
          </div>

          {adding && (
            <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50/50 p-4">
              <p className="text-sm font-bold text-ink-800">New {skill} question</p>
              <div className="mt-3 grid gap-3">
                <textarea value={editForm.prompt} onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })} rows={2} placeholder={skill === "WRITING" ? "Writing prompt…" : skill === "SPEAKING" ? "Speaking topic…" : "Question…"} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                {needsScript && (
                  <textarea value={editForm.script} onChange={(e) => setEditForm({ ...editForm, script: e.target.value })} rows={2} placeholder={skill === "LISTENING" ? "Audio script…" : "Passage…"} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                )}
                {needsScript && (
                  <input value={editForm.expectedAnswer} onChange={(e) => setEditForm({ ...editForm, expectedAnswer: e.target.value })} placeholder="Expected answer…" className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                )}
                <input value={editForm.criteria} onChange={(e) => setEditForm({ ...editForm, criteria: e.target.value })} placeholder="Criteria (comma separated): accuracy, comprehension" className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addManualQuestion} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-300 p-10 text-center">
              <p className="text-3xl">🤖</p>
              <p className="mt-2 text-sm font-semibold text-ink-600">No questions yet</p>
              <p className="text-sm text-ink-400">Generate with AI or add manually.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-2xl border border-ink-100 p-4">
                  {editingId === q.id ? (
                    <div className="space-y-3">
                      <textarea value={editForm.prompt} onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })} rows={2} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                      {needsScript && <textarea value={editForm.script} onChange={(e) => setEditForm({ ...editForm, script: e.target.value })} rows={2} placeholder={skill === "LISTENING" ? "Audio script…" : "Passage…"} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />}
                      {needsScript && <input value={editForm.expectedAnswer} onChange={(e) => setEditForm({ ...editForm, expectedAnswer: e.target.value })} placeholder="Expected answer…" className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />}
                      <input value={editForm.criteria} onChange={(e) => setEditForm({ ...editForm, criteria: e.target.value })} placeholder="Criteria (comma separated)" className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveQuestion} disabled={saving}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <div className="flex flex-none items-center gap-1">
                          <button onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                          <button onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                          <button onClick={() => regenerateQuestion(q.id)} className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50" aria-label="Regenerate"><RotateCcw className="h-4 w-4" /></button>
                          <button onClick={() => startEdit(q)} className="rounded-lg p-1.5 text-sky-500 hover:bg-sky-50" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteQuestion(q.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* STEP 5 — STUDENTS */}
      {step === 5 && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Assign Students</h3>
          <p className="text-sm text-ink-500">Choose who receives this assignment.</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setAssignMode("all")} className={`flex-1 rounded-2xl border-2 p-4 text-center ${assignMode === "all" ? "border-primary-500 bg-primary-50" : "border-ink-200"}`}>
              <p className="text-2xl">👨‍🏫</p>
              <p className="mt-1 text-sm font-bold">Entire class</p>
            </button>
            <button onClick={() => setAssignMode("selected")} className={`flex-1 rounded-2xl border-2 p-4 text-center ${assignMode === "selected" ? "border-primary-500 bg-primary-50" : "border-ink-200"}`}>
              <p className="text-2xl">🎯</p>
              <p className="mt-1 text-sm font-bold">Selected students</p>
            </button>
          </div>

          {assignMode === "selected" && (
            <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl border border-ink-100 divide-y divide-ink-50">
              {students.length === 0 && <p className="p-4 text-sm text-ink-400">No students found.</p>}
              {students.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-ink-50">
                    <input type="checkbox" checked={checked} onChange={() => setSelected((prev) => checked ? prev.filter((x) => x !== s.id) : [...prev, s.id])} className="h-4 w-4 accent-primary-600" />
                    <span className="font-mono text-xs text-ink-400">{s.userId}</span>
                    <span className="text-sm font-semibold text-ink-800">{s.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* STEP 6 — PREVIEW */}
      {step === 6 && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-extrabold text-ink-900">Assignment Preview</h3>
          <div className="mt-4 grid gap-4 rounded-2xl bg-ink-50 p-5 sm:grid-cols-2">
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Title</p><p className="font-bold text-ink-900">{title}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Skill</p><p className="font-bold text-ink-900">{SKILL_EMOJI[skill]} {skill}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Questions</p><p className="font-bold text-ink-900">{questions.length}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Difficulty</p><p className="font-bold text-ink-900">{difficulty}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Instructions</p><p className="text-ink-700">{description || "—"}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Assigned to</p><p className="text-ink-700">{assignMode === "all" ? "Entire class" : `${selected.length} selected student(s)`}</p></div>
          </div>
          <div className="mt-5 space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-ink-100 p-3 text-sm">
                <Badge tone="primary" className="mr-2">Q{q.questionNumber}</Badge>
                <span className="font-semibold text-ink-800">{q.prompt}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* NAV */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}><ChevronLeft className="h-4 w-4" /> Back</Button>
        ) : <span />}
        {step < 6 && (
          <Button variant="gradient" onClick={goNext} disabled={saving || !canNext}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {step === 6 && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={saveDraft} disabled={saving}><Save className="h-4 w-4" /> Save Draft</Button>
            <Button variant="gradient" onClick={publish} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Publish Assignment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}