import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Role } from "@prisma/client";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  checkRateLimit,
  RateLimitExceededCause,
  RateLimitUnavailableError,
  type RateLimitPolicy,
} from "@/server/rate-limit";

export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth();
  return { db, session, headers: opts.headers };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        rateLimit:
          error.cause instanceof RateLimitExceededCause
            ? {
                retryAfter: error.cause.result.retryAfter,
                limit: error.cause.result.limit,
                remaining: error.cause.result.remaining,
                reset: error.cause.result.reset,
              }
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Requires a logged-in user. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id },
  });
});

/**
 * Requires a logged-in user who is a member of the workspace passed as
 * `workspaceId` in the input. Attaches the membership (with role) to context.
 */
export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput();
  const workspaceId = (rawInput as { workspaceId?: string })?.workspaceId;
  if (!workspaceId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId is required" });
  }

  const membership = await ctx.db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
  });
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" });
  }

  return next({ ctx: { ...ctx, membership, workspaceId } });
});

/** Factory for role-gated procedures, e.g. requireRole(["OWNER"]). */
export function requireRole(roles: Role[]) {
  return workspaceProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.membership.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient role" });
    }
    return next();
  });
}
export function requireRateLimitedRole(roles: Role[], policy: RateLimitPolicy) {
  return requireRole(roles).use(async ({ ctx, next }) => {
    try {
      const result = await checkRateLimit(
        policy,
        `${ctx.userId}:${ctx.workspaceId}`,
      );
      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests",
          cause: new RateLimitExceededCause(result),
        });
      }
      return next();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if (error instanceof RateLimitUnavailableError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Rate limiting unavailable",
          cause: error,
        });
      }
      throw error;
    }
  });
}
