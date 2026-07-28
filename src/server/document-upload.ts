import { randomUUID } from "node:crypto";
import type { DocumentType } from "@prisma/client";
import { db } from "@/server/db";
import { recordAudit } from "@/server/api/audit";
import { deleteFromR2, uploadToR2 } from "@/server/r2";
import { resolveRecordOwner } from "@/server/api/ownership";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const documentTypes = new Set<DocumentType>([
  "RESUME",
  "COVER_LETTER",
  "CERTIFICATE",
  "PORTFOLIO",
  "OFFER_LETTER",
  "OTHER",
]);

const formats = {
  pdf: { extension: ".pdf", mimeType: "application/pdf" },
  docx: { extension: ".docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  txt: { extension: ".txt", mimeType: "text/plain" },
  png: { extension: ".png", mimeType: "image/png" },
  jpeg: { extension: ".jpg", mimeType: "image/jpeg" },
} as const;

type Format = keyof typeof formats;

export class DocumentUploadError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "DocumentUploadError";
  }
}

function startsWith(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectDocumentFormat(bytes: Buffer): Format | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) &&
    bytes.includes(Buffer.from("[Content_Types].xml")) &&
    bytes.includes(Buffer.from("word/"))
  ) return "docx";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";

  if (bytes.length > 0 && !bytes.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return "txt";
    } catch {
      return null;
    }
  }
  return null;
}

export function validateDocumentBytes(fileName: string, bytes: Buffer) {
  const normalizedName = fileName.trim();
  if (!normalizedName || normalizedName.length > 255 || /[\u0000-\u001f]/.test(normalizedName)) {
    throw new DocumentUploadError("Invalid file name", 400);
  }
  if (bytes.length === 0) throw new DocumentUploadError("File is empty", 400);
  if (bytes.length > MAX_DOCUMENT_BYTES) {
    throw new DocumentUploadError("File too large. Max 10MB.", 413);
  }

  const format = detectDocumentFormat(bytes);
  if (!format) {
    throw new DocumentUploadError("Unsupported or invalid file. Use PDF, DOCX, TXT, PNG, or JPEG.", 415);
  }

  const expected = formats[format];
  const lowerName = normalizedName.toLowerCase();
  const extensionMatches = format === "jpeg"
    ? lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")
    : lowerName.endsWith(expected.extension);
  if (!extensionMatches) {
    throw new DocumentUploadError("File extension does not match its contents", 415);
  }

  return { fileName: normalizedName, mimeType: expected.mimeType, extension: expected.extension };
}

export function buildDocumentStorageKey(workspaceId: string, extension: string) {
  return `workspaces/${workspaceId}/documents/${randomUUID()}${extension}`;
}

export async function createUploadedDocument(input: {
  workspaceId: string;
  userId: string;
  ownerId?: string;
  type: string;
  isResume: boolean;
  resumeLabel: string | null;
  fileName: string;
  bytes: Buffer;
}) {
  const membership = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    select: { id: true, role: true },
  });
  if (!membership) throw new DocumentUploadError("Not a member of this workspace", 403);
  const ownerId = await resolveRecordOwner({
    db,
    workspaceId: input.workspaceId,
    actorId: input.userId,
    actorRole: membership.role,
    requestedOwnerId: input.ownerId,
  });
  if (!documentTypes.has(input.type as DocumentType)) {
    throw new DocumentUploadError("Invalid document type", 400);
  }
  if (input.resumeLabel && input.resumeLabel.length > 100) {
    throw new DocumentUploadError("Resume label is too long", 400);
  }

  const validated = validateDocumentBytes(input.fileName, input.bytes);
  const storageKey = buildDocumentStorageKey(input.workspaceId, validated.extension);
  await uploadToR2(storageKey, input.bytes, validated.mimeType);

  try {
    const result = await db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          workspaceId: input.workspaceId,
          ownerId,
          type: input.type as DocumentType,
          fileName: validated.fileName,
          storageKey,
          mimeType: validated.mimeType,
          sizeBytes: input.bytes.length,
        },
      });
      const resumeVersion = input.isResume || input.type === "RESUME"
        ? await tx.resumeVersion.create({
            data: { documentId: document.id, version: 1, label: input.resumeLabel },
          })
        : null;
      return { document, resumeVersion };
    });

    await recordAudit({
      db,
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "document.create",
      entityType: "Document",
      entityId: result.document.id,
      metadata: { fileName: validated.fileName, type: input.type },
    }).catch(() => undefined);
    return result;
  } catch (error) {
    await deleteFromR2(storageKey).catch(() => undefined);
    throw error;
  }
}
