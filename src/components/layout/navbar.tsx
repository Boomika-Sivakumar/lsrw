"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bell, ChevronDown, Flame, LogOut, Menu, X } from "lucide-react";

import type { NavItem } from "@/lib/nav";

const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Practice", href: "/practice" },
  { label: "Assessment", href: "/assessment" },
  { label: "Group Discussion", href: "/group" },
  { label: "Mock Interview", href: "/mock-interview" },
  { label: "Progress", href: "/progress" },
  { label: "Reports", href: "/reports" },
];

export function Logo({ onDark }: { onDark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-lift">
        <span className="text-lg font-black text-white">◉</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-base font-extrabold tracking-wide ${onDark ? "text-white" : "text-ink-900"}`}>
          LSRW <span className="text-gradient">AI</span>
        </span>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${onDark ? "text-ink-400" : "text-ink-400"}`}>
          Communication
        </span>
      </span>
    </Link>
  );
}

export function Navbar({ items = DEFAULT_NAV }: { items?: NavItem[] }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-200/60 bg-white/80 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive(item.href) ? "bg-primary-50 text-primary-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === "TEACHER" && (
                <Link
                  href="/teacher"
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive("/teacher") ? "bg-violet-50 text-violet-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  }`}
                >
                  Teacher
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <button className="hidden items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 sm:inline-flex" aria-label="7 day streak">
                  <Flame className="h-4 w-4 fill-amber-500 text-amber-500" /> 7
                </button>
                <button className="relative rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gradient-brand" />
                </button>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-ink-100"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-sm font-semibold text-ink-800 md:block">{user.name}</span>
                  <ChevronDown className="hidden h-4 w-4 text-ink-400 md:block" />
                </button>
              </>
            )}
            {!user && (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100">
                  Login
                </Link>
                <Link href="/register" className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-lift hover:opacity-95">
                  Sign Up Free
                </Link>
              </div>
            )}
            <button className="rounded-lg p-2 text-ink-600 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {menuOpen && user && (
          <div className="absolute right-4 top-14 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-lift animate-scale-in">
            <div className="border-b border-ink-100 px-3 py-2">
              <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
              <p className="truncate font-mono text-xs text-primary-600">{user.userId}</p>
            </div>
            <button
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-lift animate-fade-in-up">
            <div className="flex items-center justify-between">
              <Logo />
              <button className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    isActive(item.href) ? "bg-primary-50 text-primary-700" : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === "TEACHER" && (
                <Link href="/teacher" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50">
                  Teacher Dashboard
                </Link>
              )}
              {!user && (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-ink-600 hover:bg-ink-100">
                    Login
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-lift">
                    Sign Up Free
                  </Link>
                </>
              )}
            </nav>
            {user && (
              <button onClick={() => { logout(); setMobileOpen(false); }} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}