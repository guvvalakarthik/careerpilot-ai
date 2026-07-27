import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import Link from "next/link";
import {
  Rocket,
  Target,
  KanbanSquare,
  Brain,
  Users,
  TrendingUp,
  ArrowRight,
  Zap,
  FileSearch,
  MessageSquareMore,
  BarChart3,
  CheckCircle2,
  Clock,
  Layers,
  Star,
  Quote,
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              CareerPilot<span className="text-indigo-500"> AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/40 via-white to-white" />
        <div className="absolute inset-0 -z-10 bg-grid-pattern" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Zap className="h-3.5 w-3.5" />
              AI-powered job search pipeline
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Stop guessing.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Start tracking.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              CareerPilot AI turns your chaotic job search into a structured pipeline.
              Capture opportunities in one click, track every application through
              interviews, and let AI handle the busywork.
            </p>
            <div className="mt-10 flex items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:from-indigo-700 hover:to-indigo-600"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
              >
                Demo login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              The job search is broken
            </h2>
            <p className="mt-4 text-slate-600">
              You apply to dozens of roles across LinkedIn, company sites, and referrals.
              Then you lose track of what you applied to, when to follow up, and what stage
              each application is in. Spreadsheets get stale. Sticky notes disappear.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "Scattered applications",
                desc: "20+ tabs open, no idea which ones you actually applied to.",
              },
              {
                icon: Clock,
                title: "Missed follow-ups",
                desc: "You forget to send that thank-you note or check back after 2 weeks.",
              },
              {
                icon: TrendingUp,
                title: "Zero visibility",
                desc: "No pipeline view. No stats. No idea how your search is actually going.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Icon className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              One pipeline. Full control.
            </h2>
            <p className="mt-4 text-slate-600">
              CareerPilot AI gives you a single board to capture, track, and manage every
              job application — from first click to signed offer.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Quick Capture",
                desc: "Paste a job URL or JD. We create the opportunity and add it to your pipeline instantly.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: KanbanSquare,
                title: "Pipeline Board",
                desc: "Drag-and-drop Kanban with 10 stages — from Captured to Accepted. Always know where things stand.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: FileSearch,
                title: "AI Extraction",
                desc: "Automatically pull company, role, skills, and salary from raw job descriptions.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: MessageSquareMore,
                title: "Smart Outreach",
                desc: "AI-drafted LinkedIn messages and follow-up reminders so you never go silent.",
                color: "bg-green-50 text-green-600",
              },
              {
                icon: Target,
                title: "Fit Scoring",
                desc: "AI compares your profile against the JD and scores how well you fit before you apply.",
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                icon: Users,
                title: "Multi-player",
                desc: "Invite a coach or mentor to review your applications. Role-based access for everyone.",
                color: "bg-orange-50 text-orange-600",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                desc: "Track application volume, response rates, and pipeline velocity over time.",
                color: "bg-teal-50 text-teal-600",
              },
              {
                icon: Brain,
                title: "AI Assistant",
                desc: "Ask questions about your pipeline, get interview prep, and generate cover letters.",
                color: "bg-pink-50 text-pink-600",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/60 p-6 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50/50 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-slate-600">
              Three steps from chaos to clarity.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Capture",
                desc: "See a job you like? Paste the URL or JD into Quick Capture. It lands in your pipeline at the Captured stage.",
              },
              {
                step: "02",
                title: "Track",
                desc: "Drag applications across 10 stages as you progress. Every move is logged with a timestamp and optional note.",
              },
              {
                step: "03",
                title: "Land it",
                desc: "AI helps you prep for interviews, draft follow-ups, and score your fit. Move from Offer to Accepted.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-bold text-indigo-100">{item.step}</div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Job seekers love CareerPilot
            </h2>
            <p className="mt-4 text-slate-600">
              Join thousands of professionals taking control of their job search.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: "I went from 20 scattered browser tabs to a clean pipeline. Landed 3 interviews in my first week using it.",
                name: "Sarah Chen",
                role: "Frontend Engineer",
                initials: "SC",
              },
              {
                quote: "The AI extraction is a game-changer. Paste a JD and it pulls everything — company, skills, salary. No more manual data entry.",
                name: "Marcus Johnson",
                role: "Full Stack Developer",
                initials: "MJ",
              },
              {
                quote: "My career coach can see my entire pipeline and point out exactly where I'm getting stuck. The multi-player aspect is brilliant.",
                name: "Priya Patel",
                role: "New Grad, CS",
                initials: "PP",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Quote className="mt-4 h-6 w-6 text-indigo-200" />
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {t.quote}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
            <div>
              <p className="text-3xl font-bold text-slate-900">10</p>
              <p className="text-xs text-slate-400">Pipeline stages</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-3xl font-bold text-slate-900">1-click</p>
              <p className="text-xs text-slate-400">Quick Capture</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-3xl font-bold text-slate-900">AI</p>
              <p className="text-xs text-slate-400">Extraction & scoring</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-3xl font-bold text-slate-900">3</p>
              <p className="text-xs text-slate-400">Roles per workspace</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-8 py-16 text-center shadow-xl">
            <div className="absolute inset-0 bg-grid-dark" />
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Ready to take control of your job search?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-indigo-200">
                Join CareerPilot AI today. It&apos;s free during beta.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-md transition hover:shadow-lg hover:bg-indigo-50"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Try the demo
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-indigo-200">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Setup in 2 minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500">
              <Rocket className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              CareerPilot AI
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/login" className="transition hover:text-slate-600">Sign in</Link>
            <Link href="/register" className="transition hover:text-slate-600">Get started</Link>
            <span>Built for job seekers, by job seekers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
