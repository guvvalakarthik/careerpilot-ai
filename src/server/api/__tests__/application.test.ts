/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockCtx, setupTrpcMocks } from "./test-utils";

setupTrpcMocks();

import { applicationRouter } from "@/server/api/routers/application";

describe("application router", () => {
  let mockDb: any;
  let ctx: any;

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = createMockCtx(mockDb);
  });

  it("list returns applications", async () => {
    mockDb.application.findMany.mockResolvedValue([
      { id: "app-1", stage: "APPLIED", opportunity: { title: "Eng", company: { name: "Co" } } },
    ]);

    const result = await (applicationRouter.list as any).query({ ctx, input: { workspaceId: "ws-1" } });

    expect(result).toHaveLength(1);
    expect(result[0].stage).toBe("APPLIED");
  });

  it("get throws NOT_FOUND when application doesn't exist", async () => {
    mockDb.application.findFirst.mockResolvedValue(null);

    await expect(
      (applicationRouter.get as any).query({ ctx, input: { workspaceId: "ws-1", applicationId: "missing" } }),
    ).rejects.toThrow();
  });

  it("get returns application with includes", async () => {
    mockDb.application.findFirst.mockResolvedValue({
      id: "app-1",
      stage: "APPLIED",
      opportunity: { title: "Eng", company: { name: "Co" } },
      interviews: [],
      tasks: [],
      decisions: [],
      outreach: [],
      resumeLinks: [],
    });

    const result = await (applicationRouter.get as any).query({ ctx, input: { workspaceId: "ws-1", applicationId: "app-1" } });

    expect(result.id).toBe("app-1");
    expect(result.opportunity.title).toBe("Eng");
  });
});
