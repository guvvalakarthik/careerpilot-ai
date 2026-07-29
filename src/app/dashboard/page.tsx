import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { Building2, Briefcase, ArrowRight, Crown, Shield, GraduationCap } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateWorkspaceModal } from "./create-workspace-modal";

const roleBadge: Record<string, { icon: typeof Crown; className: string; label: string }> = {
  OWNER: { icon: Crown, className: "bg-[#e4f3f1] text-[#087f79]", label: "Owner" },
  COACH: { icon: Shield, className: "bg-[#eef5f4] text-[#005454]", label: "Coach" },
  SEEKER: { icon: GraduationCap, className: "bg-slate-100 text-slate-600", label: "Seeker" },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <AppSidebar />

      <main className="w-full px-4 pb-8 pt-24 sm:px-6 md:ml-[13.25rem] md:w-[calc(100%-13.25rem)] md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Workspaces
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {memberships.length === 0
                ? "Create your first workspace to get started."
                : `${memberships.length} workspace${memberships.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <CreateWorkspaceModal />
        </div>

        <section className="mt-8">
          {memberships.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">No workspaces yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                A workspace is your private hub for tracking job applications.
                Create one to start building your pipeline.
              </p>
              <div className="mt-5">
                <CreateWorkspaceModal />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {memberships.map((m) => {
                const badge = roleBadge[m.role] ?? roleBadge.SEEKER;
                const RoleIcon = badge.icon;
                return (
                  <Link
                    key={m.id}
                    href={`/dashboard/${m.workspace.id}`}
                    className="group rounded-xl border border-[#dce4e2] bg-white p-5 transition hover:border-[#9cc9c5] hover:shadow-[0_16px_40px_rgba(0,79,76,0.10)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#005454]">
                          <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight text-slate-900">
                            {m.workspace.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {m.workspace.slug}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center text-xs text-slate-400">
                      <span>Open workspace</span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
                    </div>
                  </Link>
                );
              })}

              {/* Create new card */}
              <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-[#b8d8d4] bg-[#f3f9f7]">
                <CreateWorkspaceModal />
              </div>
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
