"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic2, Sparkles, TrendingUp, User } from "lucide-react";

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Practice", href: "/practice", icon: Mic2 },
  { label: "AI", href: "/mock-interview", icon: Sparkles },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Profile", href: "/reports", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/95 backdrop-blur-lg lg:hidden" aria-label="Bottom navigation">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-primary-600" : "text-ink-400 hover:text-ink-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}