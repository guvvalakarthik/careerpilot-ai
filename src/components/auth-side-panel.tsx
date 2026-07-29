import Link from "next/link";
import { Navigation, Quote } from "lucide-react";

type AuthSidePanelProps = {
  quote: string;
  author: string;
  authorRole: string;
  initials: string;
  badge?: string;
};

export function AuthSidePanel({
  quote,
  author,
  authorRole,
  initials,
  badge = "Free during beta",
}: AuthSidePanelProps) {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#004f4c] p-12 lg:flex">
      <div className="absolute inset-0 bg-grid-dark" />
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#005454] ring-1 ring-white/20">
            <Navigation className="h-4 w-4 text-[#005454]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            CareerPilot<span className="text-teal-400"> AI</span>
          </span>
        </Link>
      </div>

      <div className="relative z-10 max-w-md">
        <Quote className="h-8 w-8 text-teal-400/60" />
        <blockquote className="mt-4 text-xl font-medium leading-relaxed text-slate-200">
          {quote}
        </blockquote>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#087f79] text-sm font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{author}</p>
            <p className="text-xs text-slate-400">{authorRole}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {badge}
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          No credit card required
        </div>
      </div>
    </div>
  );
}
