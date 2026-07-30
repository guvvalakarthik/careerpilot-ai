import type { ApplicationStage, PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1_000;
const daysFrom = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

type DemoRole = {
  key: string;
  company: string;
  website: string;
  industry: string;
  title: string;
  location: string;
  stage: ApplicationStage;
  fitScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  salaryRange: string;
  capturedDaysAgo: number;
};

const demoRoles: DemoRole[] = [
  {
    key: "atlassian-product-analyst",
    company: "Atlassian",
    website: "https://www.atlassian.com",
    industry: "Software",
    title: "Product Analyst",
    location: "Bengaluru · Hybrid",
    stage: "INTERVIEWING",
    fitScore: 92,
    requiredSkills: ["SQL", "Looker", "Product Analytics", "Experimentation"],
    missingSkills: ["Amplitude"],
    salaryRange: "₹14L – ₹22L",
    capturedDaysAgo: 18,
  },
  {
    key: "razorpay-business-analyst",
    company: "Razorpay",
    website: "https://razorpay.com",
    industry: "Fintech",
    title: "Business Analyst",
    location: "Bengaluru · Hybrid",
    stage: "APPLIED",
    fitScore: 86,
    requiredSkills: ["SQL", "Excel", "Requirements Analysis"],
    missingSkills: ["Payments"],
    salaryRange: "₹10L – ₹16L",
    capturedDaysAgo: 12,
  },
  {
    key: "freshworks-data-analyst",
    company: "Freshworks",
    website: "https://www.freshworks.com",
    industry: "SaaS",
    title: "Junior Data Analyst",
    location: "Bengaluru · Hybrid",
    stage: "READY_TO_APPLY",
    fitScore: 81,
    requiredSkills: ["SQL", "Python", "Data Visualization"],
    missingSkills: ["dbt"],
    salaryRange: "₹6L – ₹10L",
    capturedDaysAgo: 7,
  },
  {
    key: "meesho-strategy-analyst",
    company: "Meesho",
    website: "https://www.meesho.io",
    industry: "Commerce",
    title: "Strategy Analyst",
    location: "Bengaluru · On-site",
    stage: "RESEARCHING",
    fitScore: 78,
    requiredSkills: ["Market Research", "Excel", "SQL", "Strategy"],
    missingSkills: ["Marketplace Economics"],
    salaryRange: "₹9L – ₹14L",
    capturedDaysAgo: 5,
  },
  {
    key: "swiggy-data-analyst",
    company: "Swiggy",
    website: "https://www.swiggy.com",
    industry: "Consumer Technology",
    title: "Data Analyst II",
    location: "Bengaluru · Hybrid",
    stage: "OFFER",
    fitScore: 89,
    requiredSkills: ["SQL", "Python", "Experimentation", "Dashboards"],
    missingSkills: [],
    salaryRange: "₹18L – ₹25L",
    capturedDaysAgo: 32,
  },
  {
    key: "cred-product-operations",
    company: "CRED",
    website: "https://cred.club",
    industry: "Fintech",
    title: "Product Operations Analyst",
    location: "Bengaluru · On-site",
    stage: "REJECTED",
    fitScore: 74,
    requiredSkills: ["Operations", "SQL", "Stakeholder Management"],
    missingSkills: ["Credit Products"],
    salaryRange: "₹12L – ₹18L",
    capturedDaysAgo: 45,
  },
];

export async function seedRecruiterDemo(
  db: PrismaClient,
  input: { userId: string; workspaceId: string },
) {
  const now = new Date();
  const applicationIds = new Map<string, string>();

  // Keep repeated local/CI seeds deterministic, including cleanup of tasks
  // created by earlier versions of the tailoring flow.
  await db.task.deleteMany({
    where: {
      workspaceId: input.workspaceId,
      OR: [
        { id: { startsWith: "tailoring-demo-application-" } },
        { title: { startsWith: "Tailor application for" } },
      ],
    },
  });

  for (const role of demoRoles) {
    const companyId = `demo-company-${role.key}`;
    const opportunityId = `demo-opportunity-${role.key}`;
    const applicationId = `demo-application-${role.key}`;
    const createdAt = daysFrom(now, -role.capturedDaysAgo);

    await db.company.upsert({
      where: { id: companyId },
      update: {
        name: role.company,
        website: role.website,
        industry: role.industry,
      },
      create: {
        id: companyId,
        workspaceId: input.workspaceId,
        name: role.company,
        website: role.website,
        industry: role.industry,
      },
    });

    await db.jobOpportunity.upsert({
      where: { id: opportunityId },
      update: {
        companyId,
        title: role.title,
        location: role.location,
        requiredSkills: role.requiredSkills,
        preferredSkills: [],
        salaryRange: role.salaryRange,
        applicationDeadline: daysFrom(now, 14),
      },
      create: {
        id: opportunityId,
        workspaceId: input.workspaceId,
        companyId,
        title: role.title,
        rawInput: `${role.title} at ${role.company}. Skills: ${role.requiredSkills.join(", ")}.`,
        sourceUrl: `${role.website}/careers`,
        location: role.location,
        employmentType: "Full-time",
        requiredSkills: role.requiredSkills,
        preferredSkills: [],
        experienceRequired: "2–4 years",
        salaryRange: role.salaryRange,
        applicationDeadline: daysFrom(now, 14),
        createdAt,
      },
    });

    await db.application.upsert({
      where: { id: applicationId },
      update: {
        stage: role.stage,
        isSaved: role.key === 'atlassian-product-analyst',
        tailoringStartedAt: null,
        fitScore: role.fitScore,
        missingSkills: role.missingSkills,
        lastStageAt: daysFrom(now, -Math.min(role.capturedDaysAgo, 4)),
        appliedAt: ["APPLIED", "INTERVIEWING", "OFFER", "ACCEPTED", "REJECTED"].includes(role.stage)
          ? daysFrom(now, -Math.max(1, role.capturedDaysAgo - 4))
          : null,
      },
      create: {
        id: applicationId,
        workspaceId: input.workspaceId,
        ownerId: input.userId,
        opportunityId,
        stage: role.stage,
        isSaved: role.key === 'atlassian-product-analyst',
        tailoringStartedAt: null,
        fitScore: role.fitScore,
        fitReasons: {
          summary: `${role.fitScore}% explainable fit based on the seeded candidate profile.`,
          matchedSkills: role.requiredSkills.filter((skill) => !role.missingSkills.includes(skill)),
        },
        missingSkills: role.missingSkills,
        createdAt,
        lastStageAt: daysFrom(now, -Math.min(role.capturedDaysAgo, 4)),
        appliedAt: ["APPLIED", "INTERVIEWING", "OFFER", "ACCEPTED", "REJECTED"].includes(role.stage)
          ? daysFrom(now, -Math.max(1, role.capturedDaysAgo - 4))
          : null,
      },
    });
    applicationIds.set(role.key, applicationId);
  }

  await db.contact.upsert({
    where: { id: "demo-contact-atlassian" },
    update: {
      name: "Ananya Rao",
      role: "Senior Product Analyst",
      relationship: "Alumni connection",
      nextAction: "Send interview follow-up",
    },
    create: {
      id: "demo-contact-atlassian",
      workspaceId: input.workspaceId,
      ownerId: input.userId,
      companyId: "demo-company-atlassian-product-analyst",
      name: "Ananya Rao",
      role: "Senior Product Analyst",
      email: "ananya@example.com",
      relationship: "Alumni connection",
      nextAction: "Send interview follow-up",
      lastInteraction: daysFrom(now, -2),
    },
  });

  const interviewApplicationId = applicationIds.get("atlassian-product-analyst");
  if (interviewApplicationId) {
    await db.interview.upsert({
      where: { id: "demo-interview-atlassian" },
      update: { scheduledAt: daysFrom(now, 2), outcome: "PENDING" },
      create: {
        id: "demo-interview-atlassian",
        workspaceId: input.workspaceId,
        applicationId: interviewApplicationId,
        type: "SYSTEM_DESIGN",
        scheduledAt: daysFrom(now, 2),
        durationMins: 60,
        interviewer: "Product Analytics Panel",
        notes: "Prepare experimentation trade-offs and dashboard architecture.",
      },
    });

    await db.task.upsert({
      where: { id: "demo-task-atlassian-prep" },
      update: { dueAt: daysFrom(now, 1), status: "IN_PROGRESS" },
      create: {
        id: "demo-task-atlassian-prep",
        workspaceId: input.workspaceId,
        ownerId: input.userId,
        applicationId: interviewApplicationId,
        interviewId: "demo-interview-atlassian",
        title: "Prepare experimentation case study",
        description: "Practice metric selection, guardrails, and rollout analysis.",
        status: "IN_PROGRESS",
        dueAt: daysFrom(now, 1),
      },
    });
  }

  return {
    applications: demoRoles.length,
    interviews: interviewApplicationId ? 1 : 0,
    contacts: 1,
  };
}
