"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { TEACHER_NAV } from "@/lib/nav";
import { GraduationCap, LogOut, Menu, X, Bell } from "lucide-react";

export function TeacherShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Teacher navigation">
      {TEACHER_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            isActive(item.href) ? "bg-primary-50 text-primary-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen lg:pl-64">
        {/* DESKTOP SIDEBAR */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-200/70 bg-white lg:flex">
          <div className="flex items-center gap-2.5 border-b border-ink-100 px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
              <span className="text-lg font-black text-white">◉</span>
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm font-extrabold text-ink-900">
                LSRW <span className="text-gradient">AI</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Teacher Portal</span>
            </div>
          </div>
          {nav}
          <div className="border-t border-ink-100 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                {user?.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{user?.name}</p>
                <p className="truncate font-mono text-[11px] text-primary-600">{user?.userId}</p>
              </div>
              <button onClick={logout} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE TOP BAR */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-ink-600 hover:bg-ink-100" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-sm font-extrabold text-ink-900">
              LSRW <span className="text-gradient">AI</span> <span className="text-ink-400">· Teacher</span>
            </span>
          </div>
          <button className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gradient-brand" />
          </button>
        </header>

        {/* MOBILE DRAWER */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-lift animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-4">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary-600" />
                  <span className="font-display text-sm font-extrabold text-ink-900">Teacher Portal</span>
                </span>
                <button className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" onClick={() => setOpen(false)} aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
              <div className="border-t border-ink-100 p-4">
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}