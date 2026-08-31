import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

interface Word {
  id: number;
  word: string;
  definition: string;
  example: string;
  category: string;
  status: "new" | "learning" | "known";
  times_practiced: number;
  times_seen: number;
  last_reviewed: string | null;
  created_at: string | null;
}

const STATUS_TONES: Record<string, "blue" | "amber" | "green"> = {
  new: "blue",
  learning: "amber",
  known: "green",
};

export function VocabularyPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [level, setLevel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [seedLoading, setSeedLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/students/me/vocabulary")
      .then((res) => setWords(res.data.words))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seed = async () => {
    setSeedLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ added: number; level: string }>("/students/me/vocabulary/seed");
      setLevel(data.level);
      toast(`Added ${data.added} new words (${data.level} level)`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSeedLoading(false);
    }
  };

  const setStatus = async (w: Word, status: string) => {
    try {
      await api.post(`/students/me/vocabulary/${w.id}/status`, { status });
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const practice = async () => {
    if (!selected.size) return;
    try {
      await api.post("/students/me/vocabulary/practice", { word_ids: [...selected] });
      toast(`Practiced ${selected.size} word${selected.size === 1 ? "" : "s"} 💪`);
      setSelected(new Set());
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const counts = words.reduce(
    (acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (loading) return <Spinner label="Loading vocabulary…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vocabulary Builder</h1>
          <p className="text-sm text-slate-500">
            Level-appropriate words tailored to your progress. Learn, practice, and make them your own.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={seed} disabled={seedLoading}>
            {seedLoading ? "Generating…" : "Generate suggestions"}
          </button>
          <button className="btn btn-outline" onClick={practice} disabled={!selected.size}>
            Practice selected ({selected.size})
          </button>
        </div>
      </div>

      {level && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="violet">Suggested for: {level}</Badge>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {(["new", "learning", "known"] as const).map((s) => (
          <Card key={s} title={s[0].toUpperCase() + s.slice(1)}>
            <div className="text-3xl font-bold text-brand-700">{counts[s] || 0}</div>
          </Card>
        ))}
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      {words.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-slate-400">
            No words yet. Click <span className="font-medium">Generate suggestions</span> to start building your vocabulary.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {words.map((w) => (
            <div key={w.id} className="card flex flex-wrap items-center gap-4 p-4">
              <input
                type="checkbox"
                checked={selected.has(w.id)}
                onChange={() => toggle(w.id)}
                className="h-4 w-4 accent-indigo-600"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-800">{w.word}</span>
                  <Badge tone={STATUS_TONES[w.status]}>{w.status}</Badge>
                  <Badge>{w.category}</Badge>
                </div>
                <p className="text-sm text-slate-600">{w.definition}</p>
                <p className="text-sm italic text-slate-500">"{w.example}"</p>
                <p className="mt-1 text-xs text-slate-400">Practiced {w.times_practiced}× · Seen {w.times_seen}×</p>
              </div>
              <div className="flex flex-col gap-1">
                {w.status !== "known" && (
                  <button className="btn btn-sm btn-outline" onClick={() => setStatus(w, "known")}>
                    Mark known
                  </button>
                )}
                {w.status === "known" && (
                  <button className="btn btn-sm btn-outline" onClick={() => setStatus(w, "learning")}>
                    Review again
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}