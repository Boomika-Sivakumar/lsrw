import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  user_id: string;
  is_active: boolean;
  created_at: string | null;
}

interface AdminStats {
  total_users: number;
  students: number;
  teachers: number;
  admins: number;
}

const ROLE_TONES: Record<string, "slate" | "blue" | "violet" | "green"> = {
  admin: "violet",
  teacher: "blue",
  student: "green",
};

export function AdminConsole() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
    ])
      .then(([s, u]) => {
        setStats(s.data);
        setUsers(u.data);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = (u: AdminUser) => {
    if (!window.confirm(`Delete ${u.full_name} (${u.username})? All their records (assessments, practice, discussions, assignments) will be permanently removed.`)) return;
    setBusyId(u.id);
    setError(null);
    api
      .delete(`/admin/users/${u.id}`)
      .then((res) => {
        toast(`Deleted ${res.data.deleted}`);
        load();
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setBusyId(null));
  };

  const toggleRole = (u: AdminUser) => {
    const target = u.role === "student" ? "teacher" : "student";
    if (!window.confirm(`Change ${u.full_name}'s role from ${u.role} to ${target}?`)) return;
    setBusyId(u.id);
    setError(null);
    api
      .put(`/admin/users/${u.id}/role`, { role: target })
      .then((res) => {
        toast(`${u.full_name} is now ${res.data.role}`);
        load();
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setBusyId(null));
  };

  if (loading) return <Spinner label="Loading admin console…" />;

  const filtered = filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Console</h1>
        <p className="text-sm text-slate-500">Manage accounts: delete student/teacher records and change roles.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card title="Total Users"><div className="text-3xl font-bold text-brand-700">{stats.total_users}</div></Card>
          <Card title="Students"><div className="text-3xl font-bold text-sky-600">{stats.students}</div></Card>
          <Card title="Teachers"><div className="text-3xl font-bold text-indigo-600">{stats.teachers}</div></Card>
          <Card title="Admins"><div className="text-3xl font-bold text-violet-600">{stats.admins}</div></Card>
        </div>
      )}

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <Card
        title="User Accounts"
        action={
          <div className="flex gap-1">
            {(["all", "student", "teacher", "admin"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${filter === f ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Role</th>
                <th className="pb-2 pr-3 font-medium">User ID</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-700">{u.full_name}</div>
                    <div className="text-xs text-slate-400">@{u.username}</div>
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{u.email}</td>
                  <td className="py-2 pr-3"><Badge tone={ROLE_TONES[u.role]}>{u.role}</Badge></td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{u.user_id || "—"}</td>
                  <td className="py-2">
                    {u.role !== "admin" && (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={busyId === u.id}
                          onClick={() => toggleRole(u)}
                        >
                          Make {u.role === "student" ? "teacher" : "student"}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === u.id}
                          onClick={() => confirmDelete(u)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {u.role === "admin" && <span className="text-xs text-slate-400">Protected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        ⚠️ Deleting an account removes all associated records permanently. This cannot be undone.
      </div>
    </div>
  );
}