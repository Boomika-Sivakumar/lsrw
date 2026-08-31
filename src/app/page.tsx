import Link from "next/link";
import { ArrowRight, Brain, Headphones, Mic, PenLine, BookOpen, Sparkles, Users, BarChart3, Award, MessageSquare } from "lucide-react";
import { ScoreRing } from "@/components/ui/score-ring";
import { ProgressBar } from "@/components/ui/progress-bar";

const SKILLS = [
  { icon: Headphones, label: "Listening", desc: "Comprehension, note-taking, and audio exercises", grad: "from-sky-500 to-cyan-500" },
  { icon: Mic, label: "Speaking", desc: "Pronunciation, fluency, confidence, live AI coach", grad: "from-violet-500 to-purple-500" },
  { icon: BookOpen, label: "Reading", desc: "Comprehension and read-aloud fluency", grad: "from-emerald-500 to-teal-500" },
  { icon: PenLine, label: "Writing", desc: "Emails, essays, reports with corrections", grad: "from-amber-500 to-orange-500" },
];

const FEATURES = [
  { icon: Users, title: "AI Group Discussions", desc: "Real-time multi-user discussions. The AI identifies every speaker, moderates, and scores each participant.", grad: "from-violet-500 to-purple-500" },
  { icon: Sparkles, title: "Mock Interviews", desc: "Practice realistic interviews with instant answer-quality analysis.", grad: "from-sky-500 to-cyan-500" },
  { icon: Brain, title: "AI Insights & Feedback", desc: "Strengths, weaknesses, and a personalized learning path after every session.", grad: "from-primary-500 to-violet-500" },
  { icon: BarChart3, title: "Progress Analytics", desc: "Track before/after scores across fluency, vocabulary, confidence and more.", grad: "from-emerald-500 to-cyan-500" },
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="bg-gradient-hero">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-1.5 text-xs font-bold text-primary-700 shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Communication Training
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Improve Your <span className="text-gradient">Communication.</span>
              <br />
              Powered by <span className="relative inline-block">AI<span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-gradient-brand" /></span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-ink-500 sm:text-lg">
              Practice Listening, Speaking, Reading and Writing with personalized AI feedback
              and real-world communication scenarios.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-7 py-3.5 font-bold text-white shadow-lift transition-all hover:-translate-y-0.5 hover:opacity-95">
                Start Free Assessment <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-7 py-3.5 font-bold text-ink-800 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary-400">
                Explore Practice
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-500">
              <span className="flex items-center gap-2"><span className="text-lg">🎯</span> 67+ use cases</span>
              <span className="flex items-center gap-2"><span className="text-lg">🤖</span> Real-time AI analysis</span>
              <span className="flex items-center gap-2"><span className="text-lg">📊</span> Personalized progress</span>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-md animate-fade-in-up">
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
            <div className="relative rounded-3xl border border-ink-200/70 bg-white/90 p-6 shadow-lift backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">AI Communication Score</p>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                  ↑ 8% this month
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <ScoreRing value={82} size={170} from="#6366F1" to="#8B5CF6">
                  <span className="font-display text-5xl font-extrabold text-ink-900">82</span>
                  <span className="text-xs font-semibold text-ink-400">/ 100</span>
                </ScoreRing>
              </div>
              <p className="mt-1 text-center text-sm font-bold text-primary-600">Advanced</p>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink-600">🎤 Speaking</span>
                    <span className="text-ink-900">82%</span>
                  </div>
                  <ProgressBar value={82} color="bg-gradient-brand" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink-600">🎧 Listening</span>
                    <span className="text-ink-900">76%</span>
                  </div>
                  <ProgressBar value={76} color="bg-gradient-sky" />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink-600">✍️ Writing</span>
                    <span className="text-ink-900">85%</span>
                  </div>
                  <ProgressBar value={85} color="bg-gradient-amber" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-violet-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">🤖 AI Feedback</p>
                <p className="mt-1 text-sm font-medium text-ink-700">
                  "Excellent confidence! Your vocabulary is strong — keep building on grammar next."
                </p>
              </div>
            </div>

            {/* floating elements */}
            <div className="absolute -left-8 top-10 hidden animate-float rounded-2xl border border-ink-200 bg-white px-4 py-2.5 shadow-lift sm:block">
              <span className="text-lg">🎤</span>
              <span className="ml-2 text-xs font-bold text-ink-700">Mic Ready</span>
            </div>
            <div className="absolute -right-6 bottom-32 hidden animate-float-slow rounded-2xl border border-ink-200 bg-white px-4 py-2.5 shadow-lift sm:block">
              <span className="text-lg">💬</span>
              <span className="ml-2 text-xs font-bold text-emerald-600">+12% Fluency ↑</span>
            </div>
            <div className="absolute -right-4 top-24 hidden animate-float rounded-2xl border border-ink-200 bg-white px-4 py-2.5 shadow-lift [animation-delay:1s] sm:block">
              <span className="text-lg">🎧</span>
              <span className="ml-2 text-xs font-bold text-ink-700">Listening</span>
            </div>
          </div>
        </div>
      </section>

      {/* LSRW SKILLS */}
      <section className="container-page py-16">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-500">Master the 4 skills</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">One platform. Every communication skill.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-500">
            From comprehension to confidence — train each skill with an AI coach that understands exactly where you stand.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s) => (
            <div key={s.label} className="group rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft ${s.grad}`}>
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-lg font-extrabold text-ink-900">{s.label}</h3>
              <p className="mt-1 text-sm text-ink-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container-page pb-16">
        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-25 ${f.grad}`} />
              <div className="flex items-start gap-4">
                <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft ${f.grad}`}>
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DARK CTA */}
      <section className="bg-gradient-dark py-16">
        <div className="container-page text-center">
          <span className="text-4xl">🎯</span>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
            Not just a score — <span className="text-gradient">a path to improve.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-300">
            AI tells you where you are, what you're good at, what to improve, and exactly what to practice next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-ink-900 transition-all hover:-translate-y-0.5">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/25 px-7 py-3.5 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10">
              I already have an account
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs font-semibold text-ink-400">
            <span className="flex items-center gap-2"><Award className="h-4 w-4 text-amber-400" /> Individual reports</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary-400" /> Group leaderboards</span>
            <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-emerald-400" /> Speaker-level analysis</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-white py-10">
        <div className="container-page flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
              <span className="text-sm font-black text-white">◉</span>
            </span>
            <span className="font-display text-sm font-extrabold text-ink-900">LSRW COMMUNICATION AI</span>
          </div>
          <p className="text-xs text-ink-400">© {new Date().getFullYear()} LSRW Communication AI. AI-powered communication training.</p>
        </div>
      </footer>
    </div>
  );
}