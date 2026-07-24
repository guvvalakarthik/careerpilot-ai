import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { db } from "@/server/db";
import Link from "next/link";
import { Building2, Briefcase, Users, ArrowRight, LogOut } from "lucide-react";
import { CreateWorkspaceModal } from "./create-workspace-modal";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Signed in as {session.user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateWorkspaceModal />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Your workspaces</h2>

        {memberships.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No workspaces yet. Create one to start tracking your job search.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/${m.workspace.id}`}
                className="group rounded-xl border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight">
                        {m.workspace.name}
                      </h3>
                      <p className="text-xs text-gray-400">
                        /{m.workspace.slug}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.role === "OWNER"
                        ? "bg-purple-50 text-purple-700"
                        : m.role === "COACH"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {m.role}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Users className="h-3.5 w-3.5" />
                  <span>Open workspace</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
