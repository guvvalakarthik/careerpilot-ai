import Link from "next/link";
import { Rocket, LogOut, User, LayoutDashboard } from "lucide-react";
import { auth } from "@/server/auth";
import { signOutAction } from "@/components/actions";

export async function AppSidebar() {
  const session = await auth();

  const navItems = [
    { href: "/dashboard", label: "Workspaces", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            CareerPilot<span className="text-indigo-500"> AI</span>
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Sign out at bottom */}
      <div className="border-t border-slate-200 p-3">
        {session?.user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
              {session.user.name?.[0]?.toUpperCase() ??
                session.user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {session.user.name ?? session.user.email}
              </p>
              <p className="truncate text-xs text-slate-400">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
