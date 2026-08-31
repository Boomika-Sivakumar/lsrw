import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
export const metadata: Metadata = {
  title: "LSRW Communication AI — Practice & Assessment Platform",
  description:
    "AI-powered Listening, Speaking, Reading and Writing practice with personalized feedback, group discussions, mock interviews and progress tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

