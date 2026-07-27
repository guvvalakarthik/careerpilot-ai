import { redirect, notFound } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceTabs } from "./workspace-tabs";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { workspaceId } = await params;

  const membership = await db.membership.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: session.user.id },
    },
    include: { workspace: true },
  });

  if (!membership) notFound();

  const members = await db.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const stats = await Promise.all([
    db.company.count({ where: { workspaceId } }),
    db.jobOpportunity.count({ where: { workspaceId } }),
    db.application.count({ where: { workspaceId } }),
    db.contact.count({ where: { workspaceId } }),
    db.interview.count({ where: { workspaceId } }),
    db.task.count({ where: { workspaceId, status: "OPEN" } }),
  ]);

  const [companies, opportunities, applications, contacts, interviews, tasks] = stats;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="ml-60 w-[calc(100%-15rem)] px-8 py-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspaces
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {membership.workspace.name}
            </h1>
            <p className="text-sm text-slate-400">{membership.workspace.slug}</p>
          </div>
        </div>

        <WorkspaceTabs
          workspaceId={workspaceId}
          role={membership.role}
          currentUserId={session.user.id}
          members={JSON.parse(JSON.stringify(members))}
          stats={{ companies, opportunities, applications, contacts, interviews, tasks }}
        />
      </main>
    </div>
  );
}
