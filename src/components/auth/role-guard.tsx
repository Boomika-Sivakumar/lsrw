"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui/skeleton";

type Role = "STUDENT" | "TEACHER";

/**
 * Client-side role guard. Renders children only when the signed-in user's role
 * matches `role`. Redirects to the role-appropriate login otherwise.
 * The backend independently enforces roles on every protected API.
 */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
    }
  }, [user, loading, router, role]);

  if (loading || !user || user.role !== role) return <PageSkeleton />;
  return <>{children}</>;
}