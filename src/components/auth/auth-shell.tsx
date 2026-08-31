import Link from "next/link";

export function AuthShell({
  brand,
  tagline,
  bullets,
  children,
}: {
  brand: string;
  tagline: string;
  bullets: { icon: string; title: string; desc: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-dark lg:block">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-gradient-brand opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gradient-sky opacity-20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
              <span className="text-lg font-black text-white">◉</span>
            </span>
            <span className="font-display text-base font-extrabold tracking-wide text-white">
              LSRW <span className="text-gradient">AI</span>
            </span>
          </Link>
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight text-white">{tagline}</h1>
            <div className="mt-8 space-y-4">
              {bullets.map((b) => (
                <div key={b.title} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl">{b.icon}</span>
                  <div>
                    <p className="font-bold text-white">{b.title}</p>
                    <p className="text-sm text-ink-300">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-400">{brand}</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-ink-50 px-4 py-12">{children}</div>
    </div>
  );
}