import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME ?? "careerpilot-documents";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function getR2Client(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadToR2(
  storageKey: string,
  file: Buffer,
  mimeType: string,
): Promise<{ storageKey: string; sizeBytes: number }> {
  const { bucketName } = getR2Config();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: file,
      ContentType: mimeType,
    }),
  );

  return { storageKey, sizeBytes: file.byteLength };
}

export async function getDownloadUrl(storageKey: string, expiresIn = 3600): Promise<string> {
  const { bucketName } = getR2Config();
  const client = getR2Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucketName, Key: storageKey }),
    { expiresIn },
  );
}

export async function deleteFromR2(storageKey: string): Promise<void> {
  const { bucketName } = getR2Config();
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({ Bucket: bucketName, Key: storageKey }),
  );
}

export async function fetchFileBufferFromR2(storageKey: string): Promise<Buffer> {
  const { bucketName } = getR2Config();
  const client = getR2Client();

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: storageKey }),
  );

  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function fetchFileTextFromR2(
  storageKey: string,
  mimeType: string,
): Promise<string> {
  const buffer = await fetchFileBufferFromR2(storageKey);

  if (mimeType === "application/pdf" || storageKey.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
    const result = await parser.getText();
    const text = result.pages.map((p: { text: string }) => p.text).join("\n");
    await parser.destroy();
    return text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    storageKey.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType.startsWith("text/") || storageKey.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Text extraction is not supported for ${mimeType}.`);
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
