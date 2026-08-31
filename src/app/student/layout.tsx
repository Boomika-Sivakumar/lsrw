"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { StudentShell } from "@/components/layout/student-shell";

const AUTH_PATHS = ["/student/login", "/student/register"];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <RoleGuard role="STUDENT">
      <StudentShell>{children}</StudentShell>
    </RoleGuard>
  );
}