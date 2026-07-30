/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from "vitest";
import { createMockCtx, createMockDb, setupTrpcMocks } from "./test-utils";

setupTrpcMocks();

import { contactRouter } from "@/server/api/routers/contact";

describe("contact router", () => {
  let mockDb: any;
  let ctx: any;

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = createMockCtx(mockDb, "SEEKER");
  });

  it("lets a seeker delete their own contact", async () => {
    mockDb.contact.findFirst.mockResolvedValue({ id: "contact-1" });

    await (contactRouter.delete as any).mutate({
      ctx,
      input: { workspaceId: "ws-1", contactId: "contact-1" },
    });

    expect(mockDb.contact.findFirst).toHaveBeenCalledWith({
      where: {
        id: "contact-1",
        workspaceId: "ws-1",
        ownerId: "user-1",
      },
      select: { id: true },
    });
    expect(mockDb.contact.delete).toHaveBeenCalledWith({ where: { id: "contact-1" } });
  });

  it("does not delete a contact outside the seeker's owner scope", async () => {
    mockDb.contact.findFirst.mockResolvedValue(null);

    await expect(
      (contactRouter.delete as any).mutate({
        ctx,
        input: { workspaceId: "ws-1", contactId: "peer-contact" },
      }),
    ).rejects.toThrow("Contact not found");
    expect(mockDb.contact.delete).not.toHaveBeenCalled();
  });
});
