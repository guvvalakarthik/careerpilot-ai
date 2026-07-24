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
} from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              CareerPilot<span className="text-slate-400"> AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              AI-powered job search pipeline
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Stop guessing.
              <br />
              <span className="text-slate-400">Start tracking.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              CareerPilot AI turns your chaotic job search into a structured pipeline.
              Capture opportunities in one click, track every application through
              interviews, and let AI handle the busywork.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Demo login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
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

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
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
                  className="rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <Icon className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20">
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

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="rounded-xl border border-slate-200 p-6 transition hover:shadow-md"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-slate-600">
              Three steps from chaos to clarity.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
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
                <div className="text-5xl font-bold text-slate-200">{item.step}</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl bg-slate-900 px-8 py-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ready to take control of your job search?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Join CareerPilot AI today. It&apos;s free during beta.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Try the demo
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
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
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900">
              <Rocket className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              CareerPilot AI
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Built for job seekers, by job seekers.
          </p>
        </div>
      </footer>
    </div>
  );
}
