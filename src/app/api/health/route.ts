import { buildHealthReport } from "@/server/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await buildHealthReport();
  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Server-Timing": `db;dur=${report.checks.database.latencyMs}`,
    },
  });
}
