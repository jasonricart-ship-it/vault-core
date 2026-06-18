import exifr from "exifr";
import { assignEvidenceClass } from "@/lib/evidence-class";

export async function projectEvidenceClassForFile(
  file: File,
  isNativeCapture = false,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return "E3";
  }

  try {
    const exif = await exifr.parse(file, {
      gps: true,
      reviveValues: true,
      pick: ["latitude", "longitude", "DateTimeOriginal"],
    });

    if (!exif || typeof exif !== "object") {
      return "E3";
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

    return assignEvidenceClass(isNativeCapture, metadataVerified);
  } catch {
    return "E3";
  }
}
