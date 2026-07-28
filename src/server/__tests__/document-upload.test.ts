import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  transaction: vi.fn(),
  documentCreate: vi.fn(),
  resumeCreate: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    membership: { findUnique: mocks.membership },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/r2", () => ({
  uploadToR2: mocks.upload,
  deleteFromR2: mocks.remove,
}));
vi.mock("@/server/api/audit", () => ({ recordAudit: mocks.audit }));

import {
  buildDocumentStorageKey,
  createUploadedDocument,
  detectDocumentFormat,
  MAX_DOCUMENT_BYTES,
  validateDocumentBytes,
} from "@/server/document-upload";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01]);
const docx = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from("[Content_Types].xml word/document.xml"),
]);

describe("document upload security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membership.mockResolvedValue({ id: "membership-1" });
    mocks.upload.mockResolvedValue({ storageKey: "unused", sizeBytes: 10 });
    mocks.remove.mockResolvedValue(undefined);
    mocks.audit.mockResolvedValue(undefined);
    mocks.documentCreate.mockResolvedValue({ id: "doc-1", storageKey: "key" });
    mocks.resumeCreate.mockResolvedValue({ id: "resume-1", version: 1 });
    mocks.transaction.mockImplementation(async (callback) => callback({
      document: { create: mocks.documentCreate },
      resumeVersion: { create: mocks.resumeCreate },
    }));
  });

  it.each([
    ["pdf", Buffer.from("%PDF-1.7\n")],
    ["docx", docx],
    ["txt", Buffer.from("plain UTF-8 text")],
    ["png", png],
    ["jpeg", jpeg],
  ])("detects %s from bytes", (format, bytes) => {
    expect(detectDocumentFormat(bytes)).toBe(format);
  });

  it("rejects extension spoofing and oversized files", () => {
    expect(() => validateDocumentBytes("malware.pdf", png)).toThrow("extension does not match");
    expect(() => validateDocumentBytes("large.txt", Buffer.alloc(MAX_DOCUMENT_BYTES + 1, 0x61))).toThrow("File too large");
  });

  it("generates unpredictable keys under the workspace prefix", () => {
    const first = buildDocumentStorageKey("ws-1", ".pdf");
    const second = buildDocumentStorageKey("ws-1", ".pdf");
    expect(first).toMatch(/^workspaces\/ws-1\/documents\/[0-9a-f-]+\.pdf$/);
    expect(second).not.toBe(first);
  });

  it("creates document and resume metadata in one transaction", async () => {
    const result = await createUploadedDocument({
      workspaceId: "ws-1",
      userId: "user-1",
      type: "RESUME",
      isResume: true,
      resumeLabel: "Backend",
      fileName: "resume.pdf",
      bytes: Buffer.from("%PDF-1.7\n"),
    });

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^workspaces\/ws-1\/documents\//),
      expect.any(Buffer),
      "application/pdf",
    );
    expect(mocks.documentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws-1",
        fileName: "resume.pdf",
        mimeType: "application/pdf",
      }),
    });
    expect(mocks.resumeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ documentId: "doc-1", version: 1, label: "Backend" }),
    });
    expect(result.resumeVersion).toMatchObject({ id: "resume-1" });
  });

  it("removes the uploaded object when the database transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(createUploadedDocument({
      workspaceId: "ws-1",
      userId: "user-1",
      type: "OTHER",
      isResume: false,
      resumeLabel: null,
      fileName: "notes.txt",
      bytes: Buffer.from("safe text"),
    })).rejects.toThrow("database unavailable");

    expect(mocks.remove).toHaveBeenCalledWith(
      expect.stringMatching(/^workspaces\/ws-1\/documents\//),
    );
  });

  it("rejects uploads outside the authenticated workspace", async () => {
    mocks.membership.mockResolvedValueOnce(null);
    await expect(createUploadedDocument({
      workspaceId: "guessed-workspace",
      userId: "user-1",
      type: "OTHER",
      isResume: false,
      resumeLabel: null,
      fileName: "notes.txt",
      bytes: Buffer.from("safe text"),
    })).rejects.toMatchObject({ status: 403 });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
