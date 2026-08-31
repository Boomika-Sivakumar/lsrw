"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { MobileNav } from "./mobile-nav";
import { ToastProvider } from "@/components/ui/toast";

const NO_NAV_PATHS = ["/login", "/register", "/group/room", "/student", "/teacher"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = NO_NAV_PATHS.some((p) => pathname.startsWith(p));

  return (
    <ToastProvider>
      {!bare && <Navbar />}
      <main className={bare ? "" : "container-page min-h-[calc(100vh-4rem)] pb-24 pt-8 lg:pb-12"}>{children}</main>
      {!bare && <MobileNav />}
    </ToastProvider>
  );
}