import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { stale: 0, interviewReminders: 0, taskDue: 0 };

  try {
    // 1. Stale applications: no stage change in 14+ days
    const staleThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const staleApps = await db.application.findMany({
      where: {
        lastStageAt: { lt: staleThreshold },
        stage: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN"] },
      },
      include: {
        workspace: { include: { memberships: { select: { userId: true } } } },
        opportunity: { select: { title: true, company: { select: { name: true } } } },
      },
    });

    for (const app of staleApps) {
      const existing = await db.notification.findFirst({
        where: {
          workspaceId: app.workspaceId,
          type: "APPLICATION_STALE",
          title: { contains: app.id },
          readAt: null,
        },
      });
      if (existing) continue;

      const title = `Application stale: ${app.opportunity.title ?? "Untitled"}`;
      const body = `No stage change in 14+ days for ${app.opportunity.company?.name ?? "Unknown company"}`;

      for (const membership of app.workspace.memberships) {
        await db.notification.create({
          data: {
            workspaceId: app.workspaceId,
            userId: membership.userId,
            type: "APPLICATION_STALE",
            title: `${title} [${app.id}]`,
            body,
          },
        });
        results.stale++;
      }
    }

    // 2. Interview reminders: interview in 24-48 hours
    const interviewStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const interviewEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const upcomingInterviews = await db.interview.findMany({
      where: {
        scheduledAt: { gte: interviewStart, lte: interviewEnd },
        outcome: "PENDING",
      },
      include: {
        workspace: { include: { memberships: { select: { userId: true } } } },
        application: { include: { opportunity: { include: { company: true } } } },
      },
    });

    for (const iv of upcomingInterviews) {
      const existing = await db.notification.findFirst({
        where: {
          workspaceId: iv.workspaceId,
          type: "INTERVIEW_UPCOMING",
          title: { contains: iv.id },
          readAt: null,
        },
      });
      if (existing) continue;

      const title = `Interview tomorrow: ${iv.type.replace(/_/g, " ")} [${iv.id}]`;
      const body = `${iv.application.opportunity.title ?? "Untitled"} at ${iv.application.opportunity.company?.name ?? "Unknown"} on ${iv.scheduledAt.toLocaleString()}`;

      for (const membership of iv.workspace.memberships) {
        await db.notification.create({
          data: {
            workspaceId: iv.workspaceId,
            userId: membership.userId,
            type: "INTERVIEW_UPCOMING",
            title,
            body,
          },
        });
        results.interviewReminders++;
      }
    }

    // 3. Task due alerts: task due in 24 hours
    const taskEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dueTasks = await db.task.findMany({
      where: {
        dueAt: { gte: now, lte: taskEnd },
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      include: {
        workspace: { include: { memberships: { select: { userId: true } } } },
        application: { include: { opportunity: { include: { company: true } } } },
      },
    });

    for (const task of dueTasks) {
      const existing = await db.notification.findFirst({
        where: {
          workspaceId: task.workspaceId,
          type: "TASK_DUE",
          title: { contains: task.id },
          readAt: null,
        },
      });
      if (existing) continue;

      const title = `Task due soon: ${task.title} [${task.id}]`;
      const body = task.dueAt
        ? `Due by ${task.dueAt.toLocaleString()}${task.application?.opportunity ? ` - ${task.application.opportunity.title ?? ""}` : ""}`
        : undefined;

      for (const membership of task.workspace.memberships) {
        await db.notification.create({
          data: {
            workspaceId: task.workspaceId,
            userId: membership.userId,
            type: "TASK_DUE",
            title,
            body,
          },
        });
        results.taskDue++;
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron job failed" },
      { status: 500 },
    );
  }
}
