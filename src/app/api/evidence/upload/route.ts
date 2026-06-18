import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  assignEvidenceClass,
  buildEvidenceFileKey,
  extensionFromFile,
  extractImageMetadata,
  parseBooleanField,
  uploadEvidenceToS3,
} from "@/lib/evidence";

const ALLOWED_ROLES = new Set(["guardian", "authority", "evaluator"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const entityType = String(formData.get("entity_type") ?? "").trim();
    const entityId = String(formData.get("entity_id") ?? "").trim();
    const declaredClassRaw = formData.get("declared_class");
    const declaredClass =
      declaredClassRaw == null || String(declaredClassRaw).trim() === ""
        ? null
        : String(declaredClassRaw).trim();
    const isNativeCapture = parseBooleanField(formData.get("is_native_capture"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entity_type and entity_id are required" },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "file is empty" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionFromFile(file);
    const fileKey = buildEvidenceFileKey(entityType, entityId, ext);

    await uploadEvidenceToS3(fileKey, buffer, file.type);

    const metadata = await extractImageMetadata(buffer);
    const evidenceClass =
      declaredClass ??
      assignEvidenceClass(isNativeCapture, metadata.metadataVerified);

    const evidenceFile = await prisma.evidenceFile.create({
      data: {
        entity_type: entityType,
        entity_id: entityId,
        evidence_class: evidenceClass,
        file_key: fileKey,
        file_type: file.type || ext,
        original_filename: file.name || null,
        file_size_bytes: file.size,
        is_native_capture: isNativeCapture,
        capture_lat: metadata.captureLat,
        capture_lng: metadata.captureLng,
        capture_timestamp: metadata.captureTimestamp,
        metadata_verified: metadata.metadataVerified,
        metadata_verified_at: metadata.metadataVerified ? new Date() : null,
      },
      select: {
        id: true,
        evidence_class: true,
        metadata_verified: true,
        file_key: true,
      },
    });

    return NextResponse.json({
      evidence_file_id: evidenceFile.id,
      evidence_class: evidenceFile.evidence_class,
      metadata_verified: evidenceFile.metadata_verified,
      file_key: evidenceFile.file_key,
    });
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload evidence file" },
      { status: 500 },
    );
  }
}
