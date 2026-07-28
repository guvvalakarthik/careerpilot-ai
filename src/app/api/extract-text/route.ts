import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { limitHttpRequest } from "@/server/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;

  if (!file || !workspaceId) {
    return NextResponse.json({ error: "Missing file or workspaceId" }, { status: 400 });
  }

  const membership = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  const limited = await limitHttpRequest(req, "extract", `${session.user.id}:${workspaceId}`);
  if (limited) return limited;

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
  }

  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text: string;

    if (mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
      const result = await parser.getText();
      text = result.pages.map((p: { text: string }) => p.text).join("\n");
      await parser.destroy();
    } else {
      text = buffer.toString("utf-8");
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text. If it's a scanned PDF, try a text-based version." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: text.slice(0, 20000) });
  } catch {
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 },
    );
  }
}
