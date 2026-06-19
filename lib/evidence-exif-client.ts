import exifr from "exifr";
import { assignEvidenceClass } from "@/lib/evidence-class";

export type GuestAttachExifPreview = {
  lat: number | null;
  lng: number | null;
  timestamp: string | null;
  metadataVerified: boolean;
  projectedClass: string;
  mediaType: "photo" | "video";
};

export async function parseGuestAttachExif(file: File): Promise<GuestAttachExifPreview> {
  const mediaType = file.type.startsWith("video/") ? "video" : "photo";

  if (!file.type.startsWith("image/")) {
    return {
      lat: null,
      lng: null,
      timestamp: null,
      metadataVerified: false,
      projectedClass: "E3",
      mediaType,
    };
  }

  try {
    const exif = await exifr.parse(file, {
      gps: true,
      reviveValues: true,
      pick: ["latitude", "longitude", "DateTimeOriginal"],
    });

    if (!exif || typeof exif !== "object") {
      return {
        lat: null,
        lng: null,
        timestamp: null,
        metadataVerified: false,
        projectedClass: "E3",
        mediaType,
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
    const timestampDate =
      exif.DateTimeOriginal instanceof Date &&
      !Number.isNaN(exif.DateTimeOriginal.getTime())
        ? exif.DateTimeOriginal
        : null;

    const metadataVerified =
      lat !== null && lng !== null && timestampDate !== null;

    return {
      lat,
      lng,
      timestamp: timestampDate?.toISOString() ?? null,
      metadataVerified,
      projectedClass: assignEvidenceClass(false, metadataVerified),
      mediaType,
    };
  } catch {
    return {
      lat: null,
      lng: null,
      timestamp: null,
      metadataVerified: false,
      projectedClass: "E3",
      mediaType,
    };
  }
}

export const GUEST_ATTACH_ACCEPT =
  "image/jpeg,image/png,image/heic,video/mp4,video/quicktime,.heic,.mov";
