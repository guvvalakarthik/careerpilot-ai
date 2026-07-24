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

function buildStorageKey(workspaceId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${workspaceId}/${timestamp}-${safeName}`;
}

export async function uploadToR2(
  workspaceId: string,
  file: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ storageKey: string; sizeBytes: number }> {
  const { bucketName } = getR2Config();
  const client = getR2Client();
  const storageKey = buildStorageKey(workspaceId, fileName);

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

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
