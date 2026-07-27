-- CreateTable
CREATE TABLE "SkillRelationship" (
    "id" TEXT NOT NULL,
    "skillA" TEXT NOT NULL,
    "skillB" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "reason" TEXT,
    "estimatedTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillRelationship_skillA_idx" ON "SkillRelationship"("skillA");

-- CreateIndex
CREATE INDEX "SkillRelationship_skillB_idx" ON "SkillRelationship"("skillB");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRelationship_skillA_skillB_relationship_key" ON "SkillRelationship"("skillA", "skillB", "relationship");
