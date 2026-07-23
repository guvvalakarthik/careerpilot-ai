import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const demoUser = await db.user.upsert({
    where: { email: "demo@careerpilot.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@careerpilot.dev",
      passwordHash,
    },
  });

  const workspace = await db.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Career Workspace",
      slug: "demo-workspace",
      memberships: {
        create: { userId: demoUser.id, role: "OWNER" },
      },
    },
  });

  await db.candidateProfile.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      headline: "Full-Stack Developer",
      summary: "Full-stack developer with Node.js, React and PostgreSQL experience.",
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Prisma"],
      yearsExperience: 1,
      locations: ["Bengaluru", "Remote"],
      desiredRoles: ["Backend Engineer", "Full-Stack Engineer"],
    },
  });

  console.log("Seed complete:", {
    user: demoUser.email,
    workspace: workspace.name,
    login: "demo@careerpilot.dev / demo1234",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
