import { afterEach, describe, expect, it, vi } from "vitest";
import { requestRagSourceIndex } from "../events";

const originalRagEnabled = process.env.RAG_ENABLED;

afterEach(() => {
  process.env.RAG_ENABLED = originalRagEnabled;
  vi.restoreAllMocks();
});

describe("RAG event publishing", () => {
  it("does not contact Inngest while the feature flag is disabled", async () => {
    process.env.RAG_ENABLED = "false";
    const sender = { send: vi.fn() };

    await expect(
      requestRagSourceIndex(
        {
          workspaceId: "workspace-1",
          type: "DOCUMENT",
          sourceId: "document-1",
        },
        sender as never,
      ),
    ).resolves.toEqual({ queued: false, reason: "disabled" });
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("sends only source identifiers when enabled", async () => {
    process.env.RAG_ENABLED = "true";
    const sender = {
      send: vi.fn().mockResolvedValue({ ids: ["event-1"] }),
    };

    await expect(
      requestRagSourceIndex(
        {
          workspaceId: "workspace-1",
          type: "JOB_OPPORTUNITY",
          sourceId: "job-1",
        },
        sender as never,
      ),
    ).resolves.toEqual({ queued: true, ids: ["event-1"] });
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "careerpilot/rag.source.requested",
        data: {
          workspaceId: "workspace-1",
          type: "JOB_OPPORTUNITY",
          sourceId: "job-1",
        },
      }),
    );
  });
  it("returns a recoverable result when event delivery fails", async () => {
    process.env.RAG_ENABLED = "true";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sender = {
      send: vi.fn().mockRejectedValue(new Error("temporary outage")),
    };

    await expect(
      requestRagSourceIndex(
        {
          workspaceId: "workspace-1",
          type: "DOCUMENT",
          sourceId: "document-1",
        },
        sender as never,
      ),
    ).resolves.toEqual({ queued: false, reason: "delivery_failed" });
  });

  it("bounds event delivery time so mutations can complete", async () => {
    process.env.RAG_ENABLED = "true";
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sender = { send: vi.fn(() => new Promise(() => undefined)) };

    try {
      const result = requestRagSourceIndex(
        {
          workspaceId: "workspace-1",
          type: "JOB_OPPORTUNITY",
          sourceId: "job-1",
        },
        sender as never,
        25,
      );
      await vi.advanceTimersByTimeAsync(25);
      await expect(result).resolves.toEqual({
        queued: false,
        reason: "delivery_timeout",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
