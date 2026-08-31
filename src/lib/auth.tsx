"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, setToken } from "./api";
import type { UserProfile, AuthResponse } from "@/lib/shared";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (name: string, email: string, password: string, role: "STUDENT" | "TEACHER") => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof window !== "undefined" ? window.localStorage.getItem("lsrw_token") : null;
    if (!t) {
      setLoading(false);
      return;
    }
    api<UserProfile>("/api/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function register(name: string, email: string, password: string, role: "STUDENT" | "TEACHER") {
    const res = await api<AuthResponse>("/api/auth/register", { method: "POST", body: { name, email, password, role } });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}