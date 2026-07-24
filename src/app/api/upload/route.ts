import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { uploadToR2, isR2Configured } from "@/server/r2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY." },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string | null;

  if (!file || !workspaceId) {
    return NextResponse.json({ error: "Missing file or workspaceId" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 413 });
  }

  const membership = await db.membership.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: session.user.id },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { storageKey, sizeBytes } = await uploadToR2(
      workspaceId,
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    return NextResponse.json({
      storageKey,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
