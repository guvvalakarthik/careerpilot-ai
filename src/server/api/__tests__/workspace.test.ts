/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockCtx, setupTrpcMocks } from "./test-utils";

setupTrpcMocks();

import { workspaceRouter } from "@/server/api/routers/workspace";

describe("workspace router", () => {
  let mockDb: any;
  let ctx: any;

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = createMockCtx(mockDb);
  });

  it("list returns workspaces for user", async () => {
    mockDb.membership.findMany.mockResolvedValue([
      { workspace: { id: "ws-1", name: "Test", _count: { memberships: 1 } } },
    ]);

    const result = await (workspaceRouter.list as any).query({ ctx, input: { userId: "user-1" } });

    expect(result).toHaveLength(1);
    expect(result[0].workspace.name).toBe("Test");
  });

  it("transfers ownership atomically and demotes the current owner", async () => {
    mockDb.membership.findUnique.mockResolvedValue({ id: "mem-2", userId: "user-2", role: "SEEKER" });

    const result = await (workspaceRouter.transferOwnership as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", memberUserId: "user-2" },
    });

    expect(result).toEqual({ ok: true, newOwnerId: "user-2" });
    expect(mockDb.membership.update).toHaveBeenNthCalledWith(1, {
      where: { workspaceId_userId: { workspaceId: "ws-1", userId: "user-2" } },
      data: { role: "OWNER" },
    });
    expect(mockDb.membership.update).toHaveBeenNthCalledWith(2, {
      where: { workspaceId_userId: { workspaceId: "ws-1", userId: "user-1" } },
      data: { role: "COACH" },
    });
    expect(mockDb.$transaction).toHaveBeenCalledOnce();
  });

  it("requires an exact workspace name before deletion", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: "ws-1", name: "Test Workspace", documents: [] });

    await expect(
      (workspaceRouter.delete as any).mutate({
        ctx,
        input: { workspaceId: "ws-1", confirmationName: "wrong" },
      }),
    ).rejects.toThrow("Workspace name does not match");
    expect(mockDb.workspace.delete).not.toHaveBeenCalled();
  });

  it("deletes a workspace after typed confirmation", async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ id: "ws-1", name: "Test Workspace", documents: [] });

    const result = await (workspaceRouter.delete as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", confirmationName: "Test Workspace" },
    });

    expect(mockDb.workspace.delete).toHaveBeenCalledWith({ where: { id: "ws-1" } });
    expect(result).toEqual({ ok: true, storageCleanupFailures: 0 });
  });

  it("stats returns counts", async () => {
    const result = await (workspaceRouter.stats as any).query({ ctx, input: { workspaceId: "ws-1" } });

    expect(result).toEqual({
      companies: 0,
      opportunities: 0,
      applications: 0,
      contacts: 0,
      interviews: 0,
      tasks: 0,
    });
  });
});
