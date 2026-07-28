import { handlers } from "@/server/auth";
import { limitHttpRequest } from "@/server/rate-limit";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (new URL(request.url).pathname.endsWith("/callback/credentials")) {
    const limited = await limitHttpRequest(request, "login");
    if (limited) return limited;
  }
  return handlers.POST(request);
}
