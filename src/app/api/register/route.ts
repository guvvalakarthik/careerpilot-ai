import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { recordAudit } from "@/server/api/audit";
import { sendEmail, welcomeEmailHtml } from "@/server/email";

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await recordAudit({
    db,
    userId: user.id,
    action: "user.register",
    entityType: "User",
    entityId: user.id,
  });

  // Send welcome email (fire-and-forget — don't block registration)
  sendEmail({
    to: user.email,
    subject: "Welcome to CareerPilot AI 🚀",
    html: welcomeEmailHtml(user.name),
  }).catch((err) => console.error("[email] Welcome email failed:", err));

  return NextResponse.json({ id: user.id }, { status: 201 });
}
