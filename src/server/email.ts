import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

const client = apiKey ? new Resend(apiKey) : null;

export function isEmailConfigured() {
  return !!apiKey;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send to", to);
    return null;
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[email] Send threw:", err);
    return null;
  }
}

// ---------- Email templates ----------

export function welcomeEmailHtml(name: string | null) {
  const firstName = name?.split(" ")[0] ?? "there";
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #4f46e5;">CareerPilot AI</h1>
    </div>
    <h2 style="font-size: 20px; font-weight: 600;">Welcome aboard, ${firstName}! 🚀</h2>
    <p style="color: #475569; line-height: 1.6; margin-top: 12px;">
      Your job search pipeline is ready. Here's what you can do right now:
    </p>
    <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
      <li><strong>Quick Capture</strong> — Paste a job URL or JD to instantly add it to your pipeline</li>
      <li><strong>Pipeline Board</strong> — Drag applications across 10 stages</li>
      <li><strong>AI Assistant</strong> — Ask questions about your applications and get interview prep</li>
      <li><strong>Candidate Profile</strong> — Add your skills for AI fit scoring</li>
    </ul>
    <a href="${process.env.AUTH_URL ?? "http://localhost:3000"}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 24px;">
      Go to your dashboard
    </a>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      CareerPilot AI — Built for job seekers, by job seekers.
    </p>
  </body>
</html>`;
}

export function passwordResetEmailHtml(name: string | null, resetUrl: string) {
  const firstName = name?.split(" ")[0] ?? "there";
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #4f46e5;">CareerPilot AI</h1>
    </div>
    <h2 style="font-size: 20px; font-weight: 600;">Reset your password</h2>
    <p style="color: #475569; line-height: 1.6; margin-top: 12px;">
      Hi ${firstName}, we received a request to reset your password.
    </p>
    <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 24px;">
      Reset password
    </a>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      CareerPilot AI — Built for job seekers, by job seekers.
    </p>
  </body>
</html>`;
}

export function interviewReminderHtml(
  name: string | null,
  company: string,
  role: string,
  interviewType: string,
  scheduledAt: string,
) {
  const firstName = name?.split(" ")[0] ?? "there";
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #4f46e5;">CareerPilot AI</h1>
    </div>
    <h2 style="font-size: 20px; font-weight: 600;">Upcoming interview reminder 📅</h2>
    <p style="color: #475569; line-height: 1.6; margin-top: 12px;">
      Hi ${firstName}, you have an interview coming up:
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-top: 16px;">
      <p style="margin: 4px 0;"><strong>Company:</strong> ${company}</p>
      <p style="margin: 4px 0;"><strong>Role:</strong> ${role}</p>
      <p style="margin: 4px 0;"><strong>Type:</strong> ${interviewType}</p>
      <p style="margin: 4px 0;"><strong>When:</strong> ${scheduledAt}</p>
    </div>
    <a href="${process.env.AUTH_URL ?? "http://localhost:3000"}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 24px;">
      View in dashboard
    </a>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      CareerPilot AI — Built for job seekers, by job seekers.
    </p>
  </body>
</html>`;
}

export function staleAlertHtml(
  name: string | null,
  staleCount: number,
  staleApps: { title: string; company: string; daysStale: number }[],
) {
  const firstName = name?.split(" ")[0] ?? "there";
  const appList = staleApps
    .map(
      (a) =>
        `<li style="margin: 6px 0;"><strong>${a.title}</strong> at ${a.company} — ${a.daysStale} days with no update</li>`,
    )
    .join("");
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #4f46e5;">CareerPilot AI</h1>
    </div>
    <h2 style="font-size: 20px; font-weight: 600;">${staleCount} application${staleCount > 1 ? "s" : ""} need attention ⚠️</h2>
    <p style="color: #475569; line-height: 1.6; margin-top: 12px;">
      Hi ${firstName}, these applications have been sitting in the same stage for a while:
    </p>
    <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
      ${appList}
    </ul>
    <a href="${process.env.AUTH_URL ?? "http://localhost:3000"}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 24px;">
      Review your pipeline
    </a>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      CareerPilot AI — Built for job seekers, by job seekers.
    </p>
  </body>
</html>`;
}
