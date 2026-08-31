"use client";

import { Navbar } from "./navbar";
import { STUDENT_NAV, STUDENT_MOBILE_NAV } from "@/lib/nav";
import { ToastProvider } from "@/components/ui/toast";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const room = pathname.startsWith("/student/group-discussions/room");

  if (room) {
    return (
      <ToastProvider>
        <main>{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Navbar items={STUDENT_NAV} />
      <main className="container-page min-h-[calc(100vh-4rem)] pb-24 pt-8 lg:pb-12">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/95 backdrop-blur-lg lg:hidden" aria-label="Student bottom navigation">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {STUDENT_MOBILE_NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                  active ? "text-primary-600" : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <span className="text-base">{item.label === "Home" ? "🏠" : item.label === "Practice" ? "🎤" : item.label === "AI" ? "🤖" : item.label === "Progress" ? "📈" : "👤"}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </ToastProvider>
  );
}