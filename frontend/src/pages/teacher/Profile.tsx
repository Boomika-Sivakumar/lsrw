import { Card } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";

export function TeacherProfile() {
  const { user } = useAuth();
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
      <Card title="Tools">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Create & generate AI assignments for your class</li>
          <li>Host real-time group discussions with AI moderation</li>
          <li>Track individual & class analytics and export CSV/HTML reports</li>
        </ul>
      </Card>
    </div>
  );
}