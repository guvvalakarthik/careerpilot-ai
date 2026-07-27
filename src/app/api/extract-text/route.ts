import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

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
