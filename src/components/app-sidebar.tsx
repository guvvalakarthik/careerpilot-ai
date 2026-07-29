import Link from "next/link";
import { Navigation, LogOut, User, LayoutDashboard } from "lucide-react";
import { auth } from "@/server/auth";
import { signOutAction } from "@/components/actions";

export async function AppSidebar() {
  const session = await auth();

  const navItems = [
    { href: "/dashboard", label: "Workspaces", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "Profile", icon: User },
  ];

  return (
    <aside className="fixed inset-x-0 top-0 z-40 flex h-16 flex-row border-b border-[#005454] bg-[#004f4c] md:inset-y-0 md:left-0 md:h-auto md:w-[13.25rem] md:flex-col md:border-b-0 md:border-r">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Navigation className="h-4 w-4 text-[#005454]" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            CareerPilot<span className="text-teal-300"> AI</span>
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="ml-auto flex flex-none items-center gap-1 px-3 py-2 md:ml-0 md:block md:flex-1 md:space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profile + Sign out at bottom */}
      <div className="hidden border-t border-white/15 p-3 md:block">
        {session?.user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
              {session.user.name?.[0]?.toUpperCase() ??
                session.user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {session.user.name ?? session.user.email}
              </p>
              <p className="truncate text-xs text-white/55">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
