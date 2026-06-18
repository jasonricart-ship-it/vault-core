import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const EVIDENCE_BUCKET = "vault-evidence";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export async function getEvidenceDownloadUrl(
  fileKey: string,
  expiresIn = 3600,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: EVIDENCE_BUCKET,
      Key: fileKey,
    }),
    { expiresIn },
  );
}
