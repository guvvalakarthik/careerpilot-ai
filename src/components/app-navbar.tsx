import Link from "next/link";
import { Rocket, LogOut } from "lucide-react";
import { auth, signOut } from "@/server/auth";

export async function AppNavbar() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
            <Rocket className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            CareerPilot<span className="text-slate-400"> AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                {session.user.name?.[0]?.toUpperCase() ??
                  session.user.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-slate-600">
                {session.user.name ?? session.user.email}
              </span>
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
