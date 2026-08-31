import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import type { TokenResponse } from "../../types";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(username, password);
  };

  const doLogin = async (u: string, p: string) => {
    setLoading(true);
    setError(null);
    try {
      const form = new URLSearchParams();
      form.append("username", u);
      form.append("password", p);
      const { data } = await api.post<TokenResponse>("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      login(data.access_token, data.user);
      toast(`Welcome back, ${data.user.full_name}!`);
      navigate(
        data.user.role === "admin"
          ? "/admin/users"
          : data.user.role === "teacher"
            ? "/teacher/dashboard"
            : "/student/dashboard",
      );
    } catch (err) {
      setError(errorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl">🎓</div>
          <h1 className="mt-2 text-2xl font-bold text-brand-800">LSRW Communication AI</h1>
          <p className="text-sm text-slate-500">Practice & Assessment Platform</p>
        </div>
        {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick login (demo accounts)
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex items-center justify-between rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={loading}
              onClick={() => doLogin("admin", "admin123")}
            >
              <span>👑 Admin</span>
              <span className="text-xs text-violet-200">admin / admin123</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-between rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              disabled={loading}
              onClick={() => doLogin("teacher1", "teacher123")}
            >
              <span>🎓 Teacher</span>
              <span className="text-xs text-brand-200">teacher1 / teacher123</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-between rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
              disabled={loading}
              onClick={() => doLogin("alice", "student123")}
            >
              <span>🧑‍🎓 Student</span>
              <span className="text-xs text-sky-200">alice / student123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
