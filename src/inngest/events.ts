import { randomUUID } from "node:crypto";
import type { RagSourceLocator } from "@/server/rag/indexing";
import { getRagConfig } from "@/server/rag/config";
import {
  inngest,
  ragSourceDeleted,
  ragSourceRequested,
  ragWorkspaceBackfillRequested,
} from "./client";

type InngestSender = Pick<typeof inngest, "send">;

class EventDeliveryTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Inngest event delivery exceeded ${timeoutMs}ms`);
    this.name = "EventDeliveryTimeoutError";
  }
}

function eventPublishTimeoutMs() {
  const configured = Number(process.env.INNGEST_PUBLISH_TIMEOUT_MS ?? 2_000);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 10_000)
    : 2_000;
}

function sendWithTimeout(
  sender: InngestSender,
  events: Parameters<InngestSender["send"]>[0],
  timeoutMs: number,
) {
  return new Promise<Awaited<ReturnType<InngestSender["send"]>>>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new EventDeliveryTimeoutError(timeoutMs)),
      timeoutMs,
    );
    sender.send(events).then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function sendWhenRagEnabled(
  events: Parameters<InngestSender["send"]>[0],
  sender: InngestSender = inngest,
  timeoutMs = eventPublishTimeoutMs(),
) {
  if (!getRagConfig().enabled) {
    return { queued: false as const, reason: "disabled" as const };
  }

  try {
    const result = await sendWithTimeout(sender, events, timeoutMs);
    return { queued: true as const, ids: result.ids };
  } catch (error) {
    console.error(
      "RAG indexing event delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      queued: false as const,
      reason:
        error instanceof EventDeliveryTimeoutError
          ? ("delivery_timeout" as const)
          : ("delivery_failed" as const),
    };
  }
}

export function requestRagSourceIndex(
  locator: RagSourceLocator,
  sender?: InngestSender,
  timeoutMs?: number,
) {
  return sendWhenRagEnabled(
    ragSourceRequested.create(locator, { id: randomUUID() }),
    sender,
    timeoutMs,
  );
}

export function requestRagSourceDeletion(
  locator: RagSourceLocator,
  sender?: InngestSender,
  timeoutMs?: number,
) {
  return sendWhenRagEnabled(
    ragSourceDeleted.create(locator, { id: randomUUID() }),
    sender,
    timeoutMs,
  );
}

export function requestRagWorkspaceBackfill(
  data: { workspaceId: string; requestedBy: string },
  sender?: InngestSender,
  timeoutMs?: number,
) {
  return sendWhenRagEnabled(
    ragWorkspaceBackfillRequested.create(data, { id: randomUUID() }),
    sender,
    timeoutMs,
  );
}

export async function requestCandidateProfileIndex(
  input: { profileId: string; userId: string },
  sender: InngestSender = inngest,
  timeoutMs = eventPublishTimeoutMs(),
) {
  if (!getRagConfig().enabled) {
    return { queued: false as const, reason: "disabled" as const };
  }

  const { db } = await import("@/server/db");
  const memberships = await db.membership.findMany({
    where: { userId: input.userId },
    select: { workspaceId: true },
  });
  if (!memberships.length) {
    return { queued: false as const, reason: "no_workspaces" as const };
  }

  return sendWhenRagEnabled(
    memberships.map(({ workspaceId }) =>
      ragSourceRequested.create(
        {
          workspaceId,
          type: "CANDIDATE_PROFILE",
          sourceId: input.profileId,
        },
        { id: randomUUID() },
      ),
    ),
    sender,
    timeoutMs,
  );
}
