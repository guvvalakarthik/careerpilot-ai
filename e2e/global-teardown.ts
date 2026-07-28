import { PrismaClient } from "@prisma/client";

export default async function globalTeardown() {
  const db = new PrismaClient();
  try {
    await db.workspace.deleteMany({ where: { name: { startsWith: "E2E Workspace " } } });
    await db.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
  } finally {
    await db.$disconnect();
  }
}
