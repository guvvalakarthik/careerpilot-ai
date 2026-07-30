/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/api/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/r2", () => ({
  isR2Configured: vi.fn(() => false),
  deleteFromR2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/api/trpc", () => {
  function createChainableProcedure(middleware: (ctx: any) => any = (ctx) => ctx) {
    const chain: any = {
      use(fn: any) {
        return createChainableProcedure(async (ctx: any) => {
          const result = await middleware(ctx);
          return fn({ ctx: result, next: async ({ ctx }: any) => ctx });
        });
      },
      input() {
        return this;
      },
      query(handler: any) {
        return {
          query: async ({ ctx, input }: any) => {
            const enrichedCtx = await middleware(ctx);
            return handler({ ctx: enrichedCtx, input });
          },
        };
      },
      mutation(handler: any) {
        return {
          mutate: async ({ ctx, input }: any) => {
            const enrichedCtx = await middleware(ctx);
            return handler({ ctx: enrichedCtx, input });
          },
        };
      },
    };
    return chain;
  }

  return {
    createTRPCRouter: (obj: Record<string, any>) => obj,
    protectedProcedure: createChainableProcedure((ctx: any) => ({
      ...ctx,
      userId: ctx.session?.user?.id ?? "user-1",
    })),
    workspaceProcedure: createChainableProcedure(async (ctx: any) => {
      return {
        ...ctx,
        userId: ctx.session?.user?.id ?? "user-1",
        membership: { role: "OWNER", userId: "user-1", workspaceId: "ws-1" },
        workspaceId: "ws-1",
      };
    }),
    requireRole: (roles: string[]) =>
      createChainableProcedure((ctx: any) => {
        if (!roles.includes(ctx.membership?.role ?? "OWNER")) {
          throw new Error("FORBIDDEN: Insufficient role");
        }
        return ctx;
      }),
  };
});

type MockDb = Record<string, any>;

export function createMockDb(overrides: Partial<MockDb> = {}): MockDb {
  const base = {
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    workspace: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "ws-1", name: "Test Workspace" }),
      update: vi.fn().mockResolvedValue({ id: "ws-1" }),
      delete: vi.fn().mockResolvedValue({ id: "ws-1" }),
    },
    membership: {
      findUnique: vi.fn().mockResolvedValue({ id: "mem-1", role: "OWNER", userId: "user-1", workspaceId: "ws-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "mem-1", role: "OWNER" }),
      update: vi.fn().mockResolvedValue({ id: "mem-1" }),
      delete: vi.fn().mockResolvedValue({ id: "mem-1" }),
      count: vi.fn().mockResolvedValue(1),
    },
    application: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "app-1" }),
      update: vi.fn().mockResolvedValue({ id: "app-1" }),
      delete: vi.fn().mockResolvedValue({ id: "app-1" }),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    jobOpportunity: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "opp-1" }),
      update: vi.fn().mockResolvedValue({ id: "opp-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    company: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "comp-1", name: "Test Co" }),
      count: vi.fn().mockResolvedValue(0),
    },
    contact: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "contact-1" }),
      update: vi.fn().mockResolvedValue({ id: "contact-1" }),
      delete: vi.fn().mockResolvedValue({ id: "contact-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    interview: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "iv-1" }),
      update: vi.fn().mockResolvedValue({ id: "iv-1" }),
      delete: vi.fn().mockResolvedValue({ id: "iv-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "task-1" }),
      create: vi.fn().mockResolvedValue({ id: "task-1" }),
      update: vi.fn().mockResolvedValue({ id: "task-1" }),
      delete: vi.fn().mockResolvedValue({ id: "task-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    document: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "doc-1" }),
      delete: vi.fn().mockResolvedValue({ id: "doc-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    resumeVersion: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "rv-1", version: 1 }),
      count: vi.fn().mockResolvedValue(0),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(0),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    aiRun: {
      create: vi.fn().mockResolvedValue({ id: "ai-1" }),
      update: vi.fn().mockResolvedValue({ id: "ai-1" }),
    },
    candidateProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    outreachMessage: {
      create: vi.fn().mockResolvedValue({ id: "om-1" }),
      update: vi.fn().mockResolvedValue({ id: "om-1" }),
    },
    decisionEvent: {
      create: vi.fn().mockResolvedValue({ id: "de-1" }),
    },
  };

  return { ...base, ...overrides };
}

export function createMockCtx(db: MockDb, role: string = "OWNER") {
  return {
    db,
    session: { user: { id: "user-1", email: "test@test.com", name: "Test User" } },
    userId: "user-1",
    membership: { id: "mem-1", role, userId: "user-1", workspaceId: "ws-1" },
    workspaceId: "ws-1",
    headers: new Headers(),
  };
}

export function setupTrpcMocks() {
  // Mocks are set up at the top level of this file via vi.mock().
  // This function is kept for backward compatibility - calling it is a no-op
  // but ensures the file is imported before router modules.
}
