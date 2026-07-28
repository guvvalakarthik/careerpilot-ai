import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
import { db } from "@/server/db";
import { appRouter } from "@/server/api/root";

const runDatabaseTests = process.env.RUN_DB_INTEGRATION === "1";
const suite = runDatabaseTests ? describe : describe.skip;
const marker = `rbac-${Date.now()}`;

function caller(userId: string) {
  return appRouter.createCaller({
    db,
    headers: new Headers(),
    session: {
      user: { id: userId, email: `${userId}@test.invalid` },
      expires: new Date(Date.now() + 60_000).toISOString(),
    },
  });
}

suite("tenant RBAC integration", () => {
  let ownerId: string;
  let coachId: string;
  let seekerAId: string;
  let seekerBId: string;
  let outsiderId: string;
  let workspaceId: string;
  let otherWorkspaceId: string;
  let seekerAApplicationId: string;
  let seekerBApplicationId: string;
  let outsiderApplicationId: string;
  let seekerAContactId: string;

  beforeAll(async () => {
    const users = await Promise.all(
      ["owner", "coach", "seeker-a", "seeker-b", "outsider"].map((name) =>
        db.user.create({ data: { email: `${marker}-${name}@test.invalid`, name } }),
      ),
    );
    [ownerId, coachId, seekerAId, seekerBId, outsiderId] = users.map((user) => user.id);

    const workspace = await db.workspace.create({
      data: {
        name: "RBAC integration",
        slug: `${marker}-primary`,
        memberships: {
          create: [
            { userId: ownerId, role: "OWNER" },
            { userId: coachId, role: "COACH" },
            { userId: seekerAId, role: "SEEKER" },
            { userId: seekerBId, role: "SEEKER" },
          ],
        },
      },
    });
    workspaceId = workspace.id;

    const otherWorkspace = await db.workspace.create({
      data: {
        name: "Other tenant",
        slug: `${marker}-other`,
        memberships: { create: { userId: outsiderId, role: "OWNER" } },
      },
    });
    otherWorkspaceId = otherWorkspace.id;

    async function createApplication(targetWorkspaceId: string, targetOwnerId: string, title: string) {
      const opportunity = await db.jobOpportunity.create({
        data: { workspaceId: targetWorkspaceId, title, rawInput: title },
      });
      return db.application.create({
        data: {
          workspaceId: targetWorkspaceId,
          ownerId: targetOwnerId,
          opportunityId: opportunity.id,
        },
      });
    }

    seekerAApplicationId = (await createApplication(workspaceId, seekerAId, "Seeker A role")).id;
    seekerBApplicationId = (await createApplication(workspaceId, seekerBId, "Seeker B role")).id;
    outsiderApplicationId = (await createApplication(otherWorkspaceId, outsiderId, "Other tenant role")).id;
    seekerAContactId = (
      await db.contact.create({ data: { workspaceId, ownerId: seekerAId, name: "A contact" } })
    ).id;
  });

  afterAll(async () => {
    await db.workspace.deleteMany({ where: { slug: { startsWith: marker } } });
    await db.user.deleteMany({ where: { email: { startsWith: marker } } });
    await db.$disconnect();
  });

  it("limits seekers to their own records while coaches see the workspace", async () => {
    const seekerRows = await caller(seekerAId).application.list({ workspaceId });
    expect(seekerRows.map((row) => row.id)).toEqual([seekerAApplicationId]);

    const coachRows = await caller(coachId).application.list({ workspaceId });
    expect(new Set(coachRows.map((row) => row.id))).toEqual(
      new Set([seekerAApplicationId, seekerBApplicationId]),
    );
  });

  it("hides guessed peer and cross-tenant IDs", async () => {
    await expect(
      caller(seekerAId).application.get({ workspaceId, applicationId: seekerBApplicationId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller(seekerAId).application.get({ workspaceId, applicationId: outsiderApplicationId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets elevated roles create on behalf of a workspace member", async () => {
    const result = await caller(coachId).opportunity.quickCapture({
      workspaceId,
      ownerId: seekerAId,
      rawInput: "Delegated capture",
      title: "Delegated role",
    });
    expect(result.application.ownerId).toBe(seekerAId);
  });

  it("rejects linked records with different owners", async () => {
    await expect(
      caller(coachId).contact.createOutreach({
        workspaceId,
        contactId: seekerAContactId,
        applicationId: seekerBApplicationId,
        body: "Should be rejected",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents coaches from inviting privileged roles", async () => {
    await expect(
      caller(coachId).workspace.inviteMember({
        workspaceId,
        email: `${marker}-outsider@test.invalid`,
        role: "OWNER",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents removing or demoting the last owner", async () => {
    await expect(
      caller(ownerId).workspace.changeRole({ workspaceId, memberUserId: ownerId, role: "COACH" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(ownerId).workspace.removeMember({ workspaceId, memberUserId: ownerId }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
