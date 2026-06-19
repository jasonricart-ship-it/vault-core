import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import exifr from "exifr";
import { assignEvidenceClass } from "@/lib/evidence-class";

const EVIDENCE_BUCKET = "vault-evidence";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export type ExtractedMetadata = {
  captureLat: number | null;
  captureLng: number | null;
  captureTimestamp: Date | null;
  metadataVerified: boolean;
};

export function extensionFromFile(file: File): string {
  const fromName = extname(file.name).replace(/^\./, "").toLowerCase();
  if (fromName) return fromName;

  const mime = file.type.toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}

export function buildEvidenceFileKey(
  entityType: string,
  entityId: string,
  ext: string,
): string {
  return `evidence/${entityType}/${entityId}/${randomUUID()}.${ext}`;
}

export async function uploadEvidenceToS3(
  fileKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: EVIDENCE_BUCKET,
      Key: fileKey,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
}

export async function extractImageMetadata(
  buffer: Buffer,
): Promise<ExtractedMetadata> {
  try {
    const exif = await exifr.parse(buffer, {
      gps: true,
      reviveValues: true,
      pick: ["latitude", "longitude", "DateTimeOriginal"],
    });

    if (!exif || typeof exif !== "object") {
      return {
        captureLat: null,
        captureLng: null,
        captureTimestamp: null,
        metadataVerified: false,
      };
    }

    const lat =
      typeof exif.latitude === "number" && Number.isFinite(exif.latitude)
        ? exif.latitude
        : null;
    const lng =
      typeof exif.longitude === "number" && Number.isFinite(exif.longitude)
        ? exif.longitude
        : null;
    const timestamp =
      exif.DateTimeOriginal instanceof Date &&
      !Number.isNaN(exif.DateTimeOriginal.getTime())
        ? exif.DateTimeOriginal
        : null;

    const metadataVerified =
      lat !== null && lng !== null && timestamp !== null;

    return {
      captureLat: lat,
      captureLng: lng,
      captureTimestamp: timestamp,
      metadataVerified,
    };
  } catch {
    return {
      captureLat: null,
      captureLng: null,
      captureTimestamp: null,
      metadataVerified: false,
    };
  }
}

export { assignEvidenceClass } from "@/lib/evidence-class";

export function parseBooleanField(value: FormDataEntryValue | null): boolean {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function parseClientCaptureMetadata(
  formData: FormData,
  isNativeCapture: boolean,
): ExtractedMetadata | null {
  if (!isNativeCapture) return null;

  const latRaw = String(formData.get("capture_lat") ?? "").trim();
  const lngRaw = String(formData.get("capture_lng") ?? "").trim();
  const timestampRaw = String(formData.get("capture_timestamp") ?? "").trim();

  if (!latRaw || !lngRaw || !timestampRaw) return null;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const timestamp = new Date(timestampRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return {
    captureLat: lat,
    captureLng: lng,
    captureTimestamp: timestamp,
    metadataVerified: true,
  };
}
