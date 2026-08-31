import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";

interface StudentRow {
  id: number;
  username: string;
  full_name: string;
  user_id: string;
  email: string;
  overall: number | null;
  level: string;
}

export function TeacherStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/teachers/students")
      .then((res) => setStudents(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!students.length) return <Spinner label="Loading students…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Students</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-400">
                <th className="py-2">User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Level</th>
                <th>Overall</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 font-mono text-brand-600">{s.user_id || "—"}</td>
                  <td className="font-medium">{s.full_name}</td>
                  <td className="text-slate-500">{s.email}</td>
                  <td><Badge tone="violet">{s.level}</Badge></td>
                  <td className="font-semibold">{s.overall ?? "—"}</td>
                  <td className="text-right">
                    <Link to={`/teacher/students/${s.id}`} className="text-brand-600 hover:underline">View Detail</Link>
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