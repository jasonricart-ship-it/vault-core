import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { getEvidenceDownloadUrl } from "@/lib/evidence-s3";

const REVIEW_ROLES = new Set(["evaluator", "authority", "super_admin"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!REVIEW_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const gumItem = await prisma.gumItem.findFirst({
      where: {
        OR: [{ id }, { gum_code: id }],
      },
      include: {
        player: {
          select: {
            id: true,
            display_name: true,
            ppc_number: true,
            vault_level: true,
            primary_sport: true,
          },
        },
        org: true,
        event: true,
      },
    });

    if (!gumItem) {
      return NextResponse.json({ error: "GUM item not found" }, { status: 404 });
    }

    const evidenceFiles = await prisma.evidenceFile.findMany({
      where: { entity_id: gumItem.id },
      orderBy: { admitted_at: "desc" },
    });

    const evidenceWithUrls = await Promise.all(
      evidenceFiles.map(async (file) => ({
        id: file.id,
        evidence_class: file.evidence_class,
        file_type: file.file_type,
        original_filename: file.original_filename,
        file_size_bytes: file.file_size_bytes,
        file_key: file.file_key,
        is_native_capture: file.is_native_capture,
        metadata_verified: file.metadata_verified,
        capture_timestamp: file.capture_timestamp,
        admitted_at: file.admitted_at,
        download_url: await getEvidenceDownloadUrl(file.file_key),
      })),
    );

    const authorityLog = await prisma.itemAuthorityLog.findMany({
      where: { item_id: gumItem.id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      gum_item: {
        ...gumItem,
        evidence_files: evidenceWithUrls,
        item_authority_log: authorityLog,
      },
    });
  } catch (error) {
    console.error("GUM review detail error:", error);
    return NextResponse.json(
      { error: "Failed to load GUM item" },
      { status: 500 },
    );
  }
}
