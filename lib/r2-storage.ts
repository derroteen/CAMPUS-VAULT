import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const r2Client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      })
    : null;

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!r2Client) {
    throw new Error("R2 client is not configured");
  }

  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID environment variable is not set");
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL environment variable is not set");
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Cloudflare's public development URL is r2.dev. This assumes the dashboard
  // is showing the standard pub-<accountId>.r2.dev form; if your bucket's
  // public access page shows a different host, update this URL accordingly.
  return `${publicUrl}/${key}`;
}