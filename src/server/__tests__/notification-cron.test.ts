import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  staleApps: vi.fn(),
  interviews: vi.fn(),
  tasks: vi.fn(),
  existingNotification: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    application: { findMany: mocks.staleApps },
    interview: { findMany: mocks.interviews },
    task: { findMany: mocks.tasks },
    notification: {
      findFirst: mocks.existingNotification,
      create: mocks.createNotification,
    },
  },
}));

vi.mock("@/server/cron-auth", () => ({
  isValidCronAuthorization: vi.fn(() => true),
}));

import { GET } from "@/app/api/cron/notifications/route";

describe("notification cron ownership", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.existingNotification.mockResolvedValue(null);
    mocks.createNotification.mockResolvedValue({ id: "notification-1" });
    mocks.staleApps.mockResolvedValue([
      {
        id: "app-1",
        workspaceId: "ws-1",
        ownerId: "application-owner",
        opportunity: { title: "Engineer", company: { name: "Acme" } },
      },
    ]);
    mocks.interviews.mockResolvedValue([
      {
        id: "interview-1",
        workspaceId: "ws-1",
        type: "TECHNICAL",
        scheduledAt: new Date("2026-08-01T10:00:00.000Z"),
        application: {
          ownerId: "interview-owner",
          opportunity: { title: "Engineer", company: { name: "Acme" } },
        },
      },
    ]);
    mocks.tasks.mockResolvedValue([
      {
        id: "task-1",
        workspaceId: "ws-1",
        ownerId: "task-owner",
        title: "Follow up",
        dueAt: new Date("2026-08-01T10:00:00.000Z"),
        application: null,
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("excludes archived applications and notifies only each record owner", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cron/notifications", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.staleApps).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          stage: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN", "ARCHIVED"] },
        }),
      }),
    );
    expect(mocks.createNotification).toHaveBeenCalledTimes(3);
    expect(mocks.createNotification.mock.calls.map(([call]) => call.data.userId)).toEqual([
      "application-owner",
      "interview-owner",
      "task-owner",
    ]);
  });
});
