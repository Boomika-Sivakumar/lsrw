"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Library, Plus, Trash2, Pencil, Save, X } from "lucide-react";

interface Question {
  id: string;
  skill: string;
  type: string;
  difficulty: string;
  prompt: string;
  options?: string[] | null;
  correctAnswer?: unknown;
  explanation?: string | null;
  createdAt: string;
}

const EMPTY = { skill: "READING", type: "MULTIPLE_CHOICE", difficulty: "MEDIUM", prompt: "", options: "", explanation: "" };

export default function TeacherQuestionsPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    api<Question[]>(`/api/teacher/questions${filter ? `?skill=${filter}` : ""}`)
      .then(setQuestions)
      .catch((e) => toast("error", e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        skill: form.skill,
        type: form.type,
        difficulty: form.difficulty,
        prompt: form.prompt,
        explanation: form.explanation || undefined,
        ...(["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(form.type) ? { options: form.options.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      };
      if (editingId) await api(`/api/teacher/questions/${editingId}`, { method: "PUT", body: payload });
      else await api("/api/teacher/questions", { method: "POST", body: payload });
      toast("success", editingId ? "Question updated" : "Question created");
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/teacher/questions/${id}`, { method: "DELETE" });
      toast("success", "Question deleted");
      load();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function edit(q: Question) {
    setEditingId(q.id);
    setForm({
      skill: q.skill,
      type: q.type,
      difficulty: q.difficulty,
      prompt: q.prompt,
      options: Array.isArray(q.options) ? q.options.join(", ") : "",
      explanation: q.explanation ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const counts = useMemo(
    () => ({ READING: 0, LISTENING: 0, SPEAKING: 0, WRITING: 0 } as Record<string, number>),
    []
  );
  questions.forEach((q) => (counts[q.skill] = (counts[q.skill] ?? 0) + 1));

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Question Bank" subtitle="Create and reuse LSRW questions for assignments, assessments and practice." icon={<Library className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader
          title={editingId ? "Edit question" : "Create question"}
          subtitle={editingId ? "Editing an existing question" : "Add a question to your bank"}
          icon={editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        />
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-ink-700">Skill</label>
            <select value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500">
              {["READING", "LISTENING", "SPEAKING", "WRITING"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500">
              {["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "WRITING_PROMPT", "SPEAKING_TOPIC", "LISTENING_PROMPT"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500">
              {["EASY", "MEDIUM", "HARD"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-semibold text-ink-700">Question / Prompt</label>
            <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
          {["MULTIPLE_CHOICE", "TRUE_FALSE"].includes(form.type) && (
            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold text-ink-700">Options (comma separated)</label>
              <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Option A, Option B, Option C" className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
            </div>
          )}
          <div className="sm:col-span-3">
            <label className="block text-sm font-semibold text-ink-700">Explanation (optional)</label>
            <input value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
          <div className="flex gap-3 sm:col-span-3">
            <button onClick={submit} disabled={saving || !form.prompt.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : editingId ? "Update question" : "Create question"}
            </button>
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm(EMPTY); }} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                <X className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {["", "READING", "LISTENING", "SPEAKING", "WRITING"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${filter === s ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-500 hover:bg-ink-200"}`}>
            {s || "All"} {s && <span className="ml-1 opacity-60">({counts[s] ?? 0})</span>}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={`Questions (${questions.length})`} subtitle="Your reusable question bank" icon="📚" />
        <div className="divide-y divide-ink-50">
          {questions.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No questions yet. Create your first one above.</p>}
          {questions.map((q) => (
            <div key={q.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{q.skill}</Badge>
                  <Badge tone={q.difficulty === "HARD" ? "warning" : q.difficulty === "MEDIUM" ? "default" : "success"}>{q.difficulty}</Badge>
                  <span className="font-mono text-[11px] uppercase tracking-wide text-ink-400">{q.type.replace("_", " ")}</span>
                </div>
                <p className="text-sm font-semibold text-ink-800">{q.prompt}</p>
                {Array.isArray(q.options) && (
                  <p className="mt-1 text-xs text-ink-500">Options: {q.options.join(" · ")}</p>
                )}
                {q.explanation && <p className="mt-1 text-xs text-ink-400">💡 {q.explanation}</p>}
              </div>
              <div className="flex flex-none gap-2">
                <button onClick={() => edit(q)} className="rounded-lg p-2 text-ink-400 hover:bg-primary-50 hover:text-primary-600" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(q.id)} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}