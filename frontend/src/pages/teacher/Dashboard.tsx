import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, ProgressBar } from "../../components/ui";

interface TeacherDashboard {
  total_students: number;
  active_students: number;
  class_average: number;
  averages: Record<string, number>;
  strongest_skill: string;
  weakest_skill: string;
  common_mistakes: Array<{ category: string; text: string; count: number }>;
  level_distribution: Record<string, number>;
  recent_discussions: Array<{ id: number; session_code: string; topic: string; status: string; participants: number }>;
  recent_assignments: Array<{ id: number; title: string; skill: string; status: string }>;
  students: Array<{ id: number; full_name: string; user_id: string | null; overall: number | null; level: string }>;
}

export function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/teachers/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner label="Loading dashboard…" />;

  const topSkills = Object.entries(data.averages).filter(([, v]) => v > 0).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500">Class overview and performance analytics</p>
        </div>
        <Link to="/teacher/assignments" className="btn btn-primary">+ New Assignment</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="Total Students"><div className="text-2xl font-bold text-brand-700">{data.total_students}</div></Card>
        <Card title="Active Students"><div className="text-2xl font-bold text-brand-700">{data.active_students}</div></Card>
        <Card title="Class Average"><div className="text-2xl font-bold text-brand-700">{data.class_average}</div></Card>
        <Card title="Strongest / Weakest">
          <Badge tone="green">{data.strongest_skill || "—"}</Badge>
          <div className="mt-1" />
          <Badge tone="rose">{data.weakest_skill || "—"}</Badge>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Average Skill Scores">
          <div className="space-y-2">
            {topSkills.map(([name, value]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span className="capitalize">{name}</span>
                  <span className="font-medium">{Math.round(value)}</span>
                </div>
                <ProgressBar value={value} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Common Mistakes">
          {data.common_mistakes.length ? (
            <div className="space-y-2">
              {data.common_mistakes.slice(0, 6).map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <Badge tone="amber">{m.category}</Badge>
                    <span className="ml-2 text-slate-600">{m.text}</span>
                  </div>
                  <span className="font-medium">×{m.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No mistakes recorded yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent Group Discussions">
          {data.recent_discussions.length ? (
            <div className="space-y-2">
              {data.recent_discussions.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700">{d.topic}</div>
                    <div className="text-xs text-slate-400 font-mono">{d.session_code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{d.status}</Badge>
                    <span className="text-xs text-slate-400">{d.participants} participants</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No discussions yet.</p>
          )}
        </Card>

        <Card title="Recent Assignments">
          {data.recent_assignments.length ? (
            <div className="space-y-2">
              {data.recent_assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="font-medium text-slate-700">{a.title}</div>
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{a.skill}</Badge>
                    <Badge>{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No assignments yet.</p>
          )}
        </Card>
      </div>

      <Card title="Student Roster">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-400">
                <th className="py-2">User ID</th>
                <th>Name</th>
                <th>Level</th>
                <th>Overall</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="py-2 font-mono text-brand-600">{s.user_id || "—"}</td>
                  <td className="font-medium">{s.full_name}</td>
                  <td>{s.level}</td>
                  <td>{s.overall ?? "—"}</td>
                  <td className="text-right">
                    <Link to={`/teacher/students/${s.id}`} className="text-brand-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}