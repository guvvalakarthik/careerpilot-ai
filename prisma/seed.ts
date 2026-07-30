import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedRecruiterDemo } from "./demo-data";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const demoUser = await db.user.upsert({
    where: { email: "demo@careerpilot.dev" },
    update: { name: "Demo User", passwordHash },
    create: {
      name: "Demo User",
      email: "demo@careerpilot.dev",
      passwordHash,
    },
  });

  const workspace = await db.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: { name: "Demo Career Workspace" },
    create: {
      name: "Demo Career Workspace",
      slug: "demo-workspace",
      memberships: {
        create: { userId: demoUser.id, role: "OWNER" },
      },
    },
  });

  await db.membership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: demoUser.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      role: "OWNER",
    },
  });

  await db.candidateProfile.upsert({
    where: { userId: demoUser.id },
    update: {
      headline: "Product & Data Analyst",
      summary: "Product-minded analyst building reliable decisions with SQL, experimentation, dashboards, and stakeholder context.",
      skills: ["SQL", "Python", "TypeScript", "Product Analytics", "Experimentation", "PostgreSQL"],
      yearsExperience: 2.2,
      locations: ["Bengaluru", "Remote"],
      desiredRoles: ["Product Analyst", "Data Analyst", "Business Analyst"],
      minSalary: 1_400_000,
    },
    create: {
      userId: demoUser.id,
      headline: "Product & Data Analyst",
      summary: "Product-minded analyst building reliable decisions with SQL, experimentation, dashboards, and stakeholder context.",
      skills: ["SQL", "Python", "TypeScript", "Product Analytics", "Experimentation", "PostgreSQL"],
      yearsExperience: 2.2,
      locations: ["Bengaluru", "Remote"],
      desiredRoles: ["Product Analyst", "Data Analyst", "Business Analyst"],
      minSalary: 1_400_000,
    },
  });

  const demo = await seedRecruiterDemo(db, {
    userId: demoUser.id,
    workspaceId: workspace.id,
  });

  console.log("Seed complete:", {
    user: demoUser.email,
    workspace: workspace.name,
    login: "demo@careerpilot.dev / demo1234",
    demo,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());