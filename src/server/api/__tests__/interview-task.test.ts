/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockCtx, setupTrpcMocks } from "./test-utils";

setupTrpcMocks();

import { interviewRouter } from "@/server/api/routers/interview";
import { taskRouter } from "@/server/api/routers/task";

describe("interview router", () => {
  let mockDb: any;
  let ctx: any;

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = createMockCtx(mockDb);
  });

  it("list returns interviews ordered by scheduledAt", async () => {
    mockDb.interview.findMany.mockResolvedValue([
      { id: "iv-1", type: "TECHNICAL", scheduledAt: new Date(), outcome: "PENDING" },
    ]);

    const result = await (interviewRouter.list as any).query({ ctx, input: { workspaceId: "ws-1" } });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("TECHNICAL");
  });

  it("lets a seeker delete an interview on their own application", async () => {
    ctx = createMockCtx(mockDb, "SEEKER");
    mockDb.interview.findFirst.mockResolvedValue({ id: "iv-1" });

    await (interviewRouter.delete as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", interviewId: "iv-1" },
    });

    expect(mockDb.interview.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "iv-1",
        workspaceId: "ws-1",
        application: { ownerId: "user-1" },
      }),
      select: { id: true },
    });
    expect(mockDb.interview.delete).toHaveBeenCalledWith({ where: { id: "iv-1" } });
  });

  it("create throws NOT_FOUND when application doesn't exist", async () => {
    mockDb.application.findFirst.mockResolvedValue(null);

    await expect(
      (interviewRouter.create as any).mutate({
        ctx,
        input: {
          workspaceId: "ws-1",
          applicationId: "missing",
          type: "TECHNICAL",
          scheduledAt: new Date().toISOString(),
          durationMins: 60,
        },
      }),
    ).rejects.toThrow();
  });

  it("create succeeds when application exists", async () => {
    mockDb.application.findFirst.mockResolvedValue({ id: "app-1" });
    mockDb.interview.create.mockResolvedValue({ id: "iv-1", type: "TECHNICAL" });

    const result = await (interviewRouter.create as any).mutate({
      ctx,
      input: {
        workspaceId: "ws-1",
        applicationId: "app-1",
        type: "TECHNICAL",
        scheduledAt: new Date().toISOString(),
        durationMins: 60,
      },
    });

    expect(result.id).toBe("iv-1");
  });

  it("cancel sets outcome to CANCELLED", async () => {
    mockDb.interview.findFirst.mockResolvedValue({ id: "iv-1", outcome: "PENDING" });
    mockDb.interview.update.mockResolvedValue({ id: "iv-1", outcome: "CANCELLED" });

    const result = await (interviewRouter.cancel as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", interviewId: "iv-1" },
    });

    expect(mockDb.interview.update).toHaveBeenCalledWith({
      where: { id: "iv-1" },
      data: { outcome: "CANCELLED" },
    });
    expect(result.outcome).toBe("CANCELLED");
  });
});

describe("task router", () => {
  let mockDb: any;
  let ctx: any;

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = createMockCtx(mockDb);
  });

  it("list returns tasks", async () => {
    mockDb.task.findMany.mockResolvedValue([
      { id: "task-1", title: "Follow up", status: "OPEN" },
    ]);

    const result = await (taskRouter.list as any).query({ ctx, input: { workspaceId: "ws-1" } });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Follow up");
  });

  it("includes overdue tasks when upcoming work is requested", async () => {
    await (taskRouter.list as any).query({
      ctx,
      input: { workspaceId: "ws-1", upcoming: true },
    });

    expect(mockDb.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: { not: null },
          status: { in: ["OPEN", "IN_PROGRESS"] },
        }),
      }),
    );
  });

  it("lets a seeker delete their own task", async () => {
    ctx = createMockCtx(mockDb, "SEEKER");
    mockDb.task.findFirst.mockResolvedValue({ id: "task-1" });

    await (taskRouter.delete as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", taskId: "task-1" },
    });

    expect(mockDb.task.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "task-1", workspaceId: "ws-1", ownerId: "user-1" }),
      select: { id: true },
    });
    expect(mockDb.task.delete).toHaveBeenCalledWith({ where: { id: "task-1" } });
  });

  it("create succeeds without applicationId", async () => {
    mockDb.task.create.mockResolvedValue({ id: "task-1", title: "Test task" });

    const result = await (taskRouter.create as any).mutate({
      ctx,
      input: {
        workspaceId: "ws-1",
        applicationId: null,
        title: "Test task",
      },
    });

    expect(result.id).toBe("task-1");
  });

  it("update throws NOT_FOUND when task doesn't exist", async () => {
    mockDb.task.findFirst.mockResolvedValue(null);

    await expect(
      (taskRouter.update as any).mutate({
        ctx,
        input: { workspaceId: "ws-1", taskId: "missing", status: "DONE" },
      }),
    ).rejects.toThrow();
  });

  it("update sets completedAt when status is DONE", async () => {
    mockDb.task.findFirst.mockResolvedValue({ id: "task-1", status: "OPEN" });
    mockDb.task.update.mockResolvedValue({ id: "task-1", status: "DONE" });

    await (taskRouter.update as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", taskId: "task-1", status: "DONE" },
    });

    expect(mockDb.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DONE", completedAt: expect.any(Date) }),
      }),
    );
  });
});
