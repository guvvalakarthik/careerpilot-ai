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
