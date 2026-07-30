import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { WorkspaceTabs } from "./workspace-tabs";
import { ownedApplicationScope, ownerScope } from "@/server/api/ownership";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { workspaceId } = await params;
  const membership = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    include: { workspace: true },
  });
  if (!membership) notFound();

  const members = await db.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  const [companies, opportunities, applications, contacts, interviews, tasks] = await Promise.all([
    db.company.count({ where: { workspaceId } }),
    db.jobOpportunity.count({ where: { workspaceId, ...ownedApplicationScope(membership.role, session.user.id) } }),
    db.application.count({ where: { workspaceId, ...ownerScope(membership.role, session.user.id) } }),
    db.contact.count({ where: { workspaceId, ...ownerScope(membership.role, session.user.id) } }),
    db.interview.count({ where: { workspaceId, ...ownedApplicationScope(membership.role, session.user.id) } }),
    db.task.count({ where: { workspaceId, ...ownerScope(membership.role, session.user.id), status: "OPEN" } }),
  ]);

  return (
    <WorkspaceTabs
      workspaceId={workspaceId}
      workspaceName={membership.workspace.name}
      workspaceSlug={membership.workspace.slug}
      role={membership.role}
      currentUserId={session.user.id}
      userName={session.user.email === "demo@careerpilot.dev" ? "Karthik" : session.user.name ?? "Karthik"}
      userEmail={session.user.email ?? ""}
      members={JSON.parse(JSON.stringify(members))}
      stats={{ companies, opportunities, applications, contacts, interviews, tasks }}
    />
  );
}
