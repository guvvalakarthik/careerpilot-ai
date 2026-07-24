import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const candidateRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.candidateProfile.findUnique({
      where: { userId: ctx.userId },
    });
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        headline: z.string().max(120).optional().nullable(),
        summary: z.string().max(2000).optional().nullable(),
        skills: z.array(z.string()).max(50).optional(),
        yearsExperience: z.number().min(0).max(60).optional().nullable(),
        locations: z.array(z.string()).max(10).optional(),
        desiredRoles: z.array(z.string()).max(10).optional(),
        minSalary: z.number().int().min(0).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.candidateProfile.upsert({
        where: { userId: ctx.userId },
        create: {
          userId: ctx.userId,
          headline: input.headline ?? null,
          summary: input.summary ?? null,
          skills: input.skills ?? [],
          yearsExperience: input.yearsExperience ?? null,
          locations: input.locations ?? [],
          desiredRoles: input.desiredRoles ?? [],
          minSalary: input.minSalary ?? null,
        },
        update: {
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.skills !== undefined ? { skills: input.skills } : {}),
          ...(input.yearsExperience !== undefined ? { yearsExperience: input.yearsExperience } : {}),
          ...(input.locations !== undefined ? { locations: input.locations } : {}),
          ...(input.desiredRoles !== undefined ? { desiredRoles: input.desiredRoles } : {}),
          ...(input.minSalary !== undefined ? { minSalary: input.minSalary } : {}),
        },
      });
    }),
});
