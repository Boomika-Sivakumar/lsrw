import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import type { TokenResponse } from "../../types";

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

export function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "student",
    admin_code: "",
  });
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleGoal = (g: string) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<TokenResponse>("/auth/register", { ...form, goals });
      login(data.access_token, data.user);
      toast(`Account created! Your User ID is ${data.user.user_id}`);
      navigate(
        data.user.role === "admin"
          ? "/admin/users"
          : data.user.role === "teacher"
            ? "/teacher/dashboard"
            : "/student/dashboard",
      );
    } catch (err) {
      setError(errorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-800">Create Account</h1>
          <p className="text-sm text-slate-500">Join the LSRW Communication Platform</p>
        </div>
        {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username} onChange={(e) => set("username", e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={6} required />
          </div>
          {form.role === "admin" && (
            <div>
              <label className="label">Admin Registration Code</label>
              <input
                className="input"
                value={form.admin_code}
                onChange={(e) => set("admin_code", e.target.value)}
                required
                placeholder="Required to create an admin account"
              />
            </div>
          )}
          {form.role === "student" && (
            <div>
              <label className="label">Learning Goals (optional)</label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGoal(g)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      goals.includes(g) ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {g.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
