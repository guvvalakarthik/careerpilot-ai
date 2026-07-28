-- Root records are owned by a workspace member. Existing rows are assigned to
-- the oldest owner; the oldest member is a defensive fallback for legacy data.
ALTER TABLE "Application" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Task" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Document" ADD COLUMN "ownerId" TEXT;

UPDATE "Application" AS record SET "ownerId" = COALESCE(
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId" AND membership."role" = 'OWNER'
   ORDER BY membership."createdAt", membership."id" LIMIT 1),
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId"
   ORDER BY membership."createdAt", membership."id" LIMIT 1)
);

UPDATE "Contact" AS record SET "ownerId" = COALESCE(
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId" AND membership."role" = 'OWNER'
   ORDER BY membership."createdAt", membership."id" LIMIT 1),
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId"
   ORDER BY membership."createdAt", membership."id" LIMIT 1)
);

UPDATE "Task" AS record SET "ownerId" = COALESCE(
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId" AND membership."role" = 'OWNER'
   ORDER BY membership."createdAt", membership."id" LIMIT 1),
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId"
   ORDER BY membership."createdAt", membership."id" LIMIT 1)
);

UPDATE "Document" AS record SET "ownerId" = COALESCE(
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId" AND membership."role" = 'OWNER'
   ORDER BY membership."createdAt", membership."id" LIMIT 1),
  (SELECT membership."userId" FROM "Membership" AS membership
   WHERE membership."workspaceId" = record."workspaceId"
   ORDER BY membership."createdAt", membership."id" LIMIT 1)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Application" WHERE "ownerId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Contact" WHERE "ownerId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Task" WHERE "ownerId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Document" WHERE "ownerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill ownership: a legacy workspace has no members';
  END IF;
END $$;

ALTER TABLE "Application" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Application" ADD CONSTRAINT "Application_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Application_workspaceId_ownerId_idx" ON "Application"("workspaceId", "ownerId");
CREATE INDEX "Contact_workspaceId_ownerId_idx" ON "Contact"("workspaceId", "ownerId");
CREATE INDEX "Task_workspaceId_ownerId_idx" ON "Task"("workspaceId", "ownerId");
CREATE INDEX "Document_workspaceId_ownerId_idx" ON "Document"("workspaceId", "ownerId");
