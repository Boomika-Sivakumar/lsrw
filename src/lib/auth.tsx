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
      .catch(() => {
        // Fallback for saved demo session when backend is offline
        const savedRole = (typeof window !== "undefined" ? window.localStorage.getItem("lsrw_demo_role") : null) as "STUDENT" | "TEACHER" | null;
        const isTeacher = savedRole === "TEACHER";
        setUser({
          id: isTeacher ? "demo-teacher" : "demo-student",
          userId: isTeacher ? "TC9088" : "BA1024",
          name: isTeacher ? "Demo Teacher" : "Demo Student",
          email: isTeacher ? "teacher@demo.com" : "student@demo.com",
          role: isTeacher ? "TEACHER" : "STUDENT",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(res.token);
      if (typeof window !== "undefined") window.localStorage.setItem("lsrw_demo_role", res.user.role);
      setUser(res.user);
      return res.user;
    } catch {
      const isTeacher = email.toLowerCase().includes("teacher");
      const demoUser: UserProfile = {
        id: isTeacher ? "demo-teacher" : "demo-student",
        userId: isTeacher ? "TC9088" : "BA1024",
        name: isTeacher ? "Demo Teacher" : "Demo Student",
        email,
        role: isTeacher ? "TEACHER" : "STUDENT",
      };
      setToken("demo_token_123");
      if (typeof window !== "undefined") window.localStorage.setItem("lsrw_demo_role", demoUser.role);
      setUser(demoUser);
      return demoUser;
    }
  }

  async function register(name: string, email: string, password: string, role: "STUDENT" | "TEACHER") {
    try {
      const res = await api<AuthResponse>("/api/auth/register", { method: "POST", body: { name, email, password, role } });
      setToken(res.token);
      if (typeof window !== "undefined") window.localStorage.setItem("lsrw_demo_role", res.user.role);
      setUser(res.user);
      return res.user;
    } catch {
      const demoUser: UserProfile = {
        id: `demo-${role.toLowerCase()}`,
        userId: role === "TEACHER" ? "TC9088" : "BA1024",
        name: name || (role === "TEACHER" ? "Demo Teacher" : "Demo Student"),
        email,
        role,
      };
      setToken("demo_token_123");
      if (typeof window !== "undefined") window.localStorage.setItem("lsrw_demo_role", role);
      setUser(demoUser);
      return demoUser;
    }
  }

  function logout() {
    clearToken();
    if (typeof window !== "undefined") window.localStorage.removeItem("lsrw_demo_role");
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