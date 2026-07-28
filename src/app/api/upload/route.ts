import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isR2Configured } from "@/server/r2";
import { limitHttpRequest } from "@/server/rate-limit";
import {
  createUploadedDocument,
  DocumentUploadError,
  MAX_DOCUMENT_BYTES,
} from "@/server/document-upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 storage is not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const workspaceId = formData.get("workspaceId");
    const type = formData.get("type");
    const ownerId = formData.get("ownerId");
    const resumeLabel = formData.get("resumeLabel");
    const isResume = formData.get("isResume") === "true";

    if (!(file instanceof File) || typeof workspaceId !== "string" || typeof type !== "string") {
      throw new DocumentUploadError("Missing file, workspaceId, or type", 400);
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new DocumentUploadError("File too large. Max 10MB.", 413);
    }

    const limited = await limitHttpRequest(req, "upload", `${session.user.id}:${workspaceId}`);
    if (limited) return limited;

    const result = await createUploadedDocument({
      workspaceId,
      userId: session.user.id,
      ownerId: typeof ownerId === "string" && ownerId ? ownerId : undefined,
      type,
      isResume,
      resumeLabel: typeof resumeLabel === "string" && resumeLabel.trim() ? resumeLabel.trim() : null,
      fileName: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Document upload failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
