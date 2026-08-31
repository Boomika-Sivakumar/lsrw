"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeacherShell } from "@/components/layout/teacher-shell";

const AUTH_PATHS = ["/teacher/login", "/teacher/register"];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <RoleGuard role="TEACHER">
      <TeacherShell>{children}</TeacherShell>
    </RoleGuard>
  );
}