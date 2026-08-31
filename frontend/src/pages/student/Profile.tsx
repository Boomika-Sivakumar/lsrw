import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

const GOALS = [
  "improve-spoken-english",
  "interview-communication",
  "workplace-communication",
  "presentation-skills",
  "grammar",
  "vocabulary",
  "pronunciation",
  "reading",
  "writing",
];

export function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState("Beginner");
  const [target, setTarget] = useState("Advanced");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/students/me/dashboard")
      .then((res) => {
        setGoals(res.data.goals || []);
        setLevel(res.data.level);
        setTarget(res.data.target_level);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const save = async () => {
    await api.put("/students/me/goals", { goals });
    toast("Goals updated!");
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card title="Account">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-400">Name</div>
            <div className="font-medium">{user?.full_name}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">User ID</div>
            <div className="font-mono font-semibold text-brand-600">{user?.user_id}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Email</div>
            <div className="font-medium">{user?.email}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Username</div>
            <div className="font-medium">{user?.username}</div>
          </div>
        </div>
      </Card>

      <Card title="Communication Level">
        <div className="flex items-center gap-3">
          <Badge tone="violet">{level}</Badge>
          <span className="text-sm text-slate-500">Target:</span>
          <select
            className="input max-w-[180px]"
            value={target}
            onChange={async (e) => {
              const t = e.target.value;
              await api.put("/students/me/goals", { goals, target_level: t }).catch(() => {});
              setTarget(t);
              toast("Target level updated");
            }}
          >
            <option>Beginner</option>
            <option>Elementary</option>
            <option>Intermediate</option>
            <option>Upper Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
      </Card>

      <Card title="Learning Goals">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                goals.includes(g) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {g.replace(/-/g, " ")}
            </button>
          ))}
        </div>
        <button className="btn btn-primary mt-4" onClick={save}>Save Goals</button>
      </Card>
    </div>
  );
}