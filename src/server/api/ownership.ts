import type { PrismaClient, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

type Db = PrismaClient;

export function canManageAllRecords(role: Role) {
  return role === "OWNER" || role === "COACH";
}

export function ownerScope(role: Role, userId: string) {
  return canManageAllRecords(role) ? {} : { ownerId: userId };
}

export async function resolveRecordOwner(args: {
  db: Db;
  workspaceId: string;
  actorId: string;
  actorRole: Role;
  requestedOwnerId?: string;
}) {
  const ownerId = canManageAllRecords(args.actorRole)
    ? (args.requestedOwnerId ?? args.actorId)
    : args.actorId;

  const membership = await args.db.membership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: args.workspaceId,
        userId: ownerId,
      },
    },
    select: { userId: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record owner must be a member of this workspace",
    });
  }
  return ownerId;
}

export function ownedApplicationScope(role: Role, userId: string) {
  return canManageAllRecords(role)
    ? {}
    : { application: { ownerId: userId } };
}
