import type { Prisma, PrismaClient } from "@prisma/client";

interface AuditParams {
  db: PrismaClient;
  workspaceId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Writes an audit record. Never throws - auditing must not break the main flow. */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await params.db.auditEvent.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}
