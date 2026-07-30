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

  it("moves an application backward to correct its pipeline stage", async () => {
    mockDb.application.findFirst.mockResolvedValue({
      id: "app-1",
      stage: "APPLIED",
      appliedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    mockDb.application.update.mockResolvedValue({ id: "app-1", stage: "CAPTURED" });

    const result = await (applicationRouter.changeStage as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", applicationId: "app-1", toStage: "CAPTURED", note: "Corrected" },
    });

    expect(result.stage).toBe("CAPTURED");
    expect(mockDb.decisionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "app-1",
        fromStage: "APPLIED",
        toStage: "CAPTURED",
        note: "Corrected",
      }),
    });
  });

  it("persists saved state for an owned application", async () => {
    mockDb.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.application.update.mockResolvedValue({ id: "app-1", isSaved: true });

    const result = await (applicationRouter.setSaved as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", applicationId: "app-1", saved: true },
    });

    expect(mockDb.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { isSaved: true },
    });
    expect(result.isSaved).toBe(true);
  });

  it("starts tailoring idempotently and creates one actionable task", async () => {
    mockDb.application.findFirst.mockResolvedValue({
      id: "app-1",
      ownerId: "user-1",
      tailoringStartedAt: null,
      opportunity: { title: "Product Analyst" },
    });
    mockDb.application.update.mockResolvedValue({ id: "app-1", tailoringStartedAt: new Date() });
    mockDb.task.findUnique.mockResolvedValue(null);
    mockDb.task.upsert.mockResolvedValue({ id: "tailoring-app-1", title: "Tailor application for Product Analyst" });

    const result = await (applicationRouter.startTailoring as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", applicationId: "app-1" },
    });

    expect(mockDb.task.upsert).toHaveBeenCalledOnce();
    expect(result.createdTask).toBe(true);
    expect(result.task.id).toBe("tailoring-app-1");

    mockDb.task.findUnique.mockResolvedValue(result.task);
    const repeated = await (applicationRouter.startTailoring as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", applicationId: "app-1" },
    });

    expect(mockDb.task.upsert).toHaveBeenCalledTimes(2);
    expect(repeated.createdTask).toBe(false);
  });
});
