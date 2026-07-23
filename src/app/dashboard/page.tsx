import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { db } from "@/server/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Signed in as {session.user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Your workspaces</h2>
        {memberships.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No workspaces yet. Workspace creation UI arrives Thursday (Week 1).
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {memberships.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <span className="font-medium">{m.workspace.name}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
