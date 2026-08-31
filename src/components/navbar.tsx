"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/group", label: "Group Discussion" },
  { href: "/assessment", label: "Assessment" },
  { href: "/teacher", label: "Teacher" },
];

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">L</span>
          LSRW AI
        </Link>

        {user && (
          <nav className="flex items-center gap-4 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-slate-600 hover:text-brand-700">
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="rounded-full bg-brand-50 px-3 py-1 font-mono font-semibold text-brand-700">
                {user.userId}
              </span>
              <span className="text-slate-500">{user.name}</span>
              <button onClick={logout} className="text-slate-500 hover:text-red-600">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-brand-700 hover:underline">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}