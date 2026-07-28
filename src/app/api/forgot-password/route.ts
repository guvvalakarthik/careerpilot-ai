import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/server/db";
import { sendEmail, passwordResetEmailHtml } from "@/server/email";
import { limitHttpRequest } from "@/server/rate-limit";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const limited = await limitHttpRequest(req, "passwordReset");
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Always return 200 to prevent email enumeration
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Delete any existing tokens for this email, then insert new one
  await db.verificationToken.deleteMany({ where: { identifier: user.email } });
  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires,
    },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // Send email (fire-and-forget)
  sendEmail({
    to: user.email,
    subject: "Reset your CareerPilot AI password",
    html: passwordResetEmailHtml(user.name, resetUrl),
  }).catch((err) => console.error("[email] Password reset email failed:", err));

  return NextResponse.json({ ok: true });
}
