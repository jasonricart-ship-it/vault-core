import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { getEvidenceDownloadUrl } from "@/lib/evidence-s3";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.guardianNotification.findMany({
      where: {
        account_id: session.user.id,
        is_read: false,
      },
      orderBy: { created_at: "desc" },
    });

    const sharedCaptureIds = notifications
      .filter((notification) => notification.notification_type === "capture_share")
      .map((notification) => notification.reference_id);

    const sharedCaptures =
      sharedCaptureIds.length === 0
        ? []
        : await prisma.sharedCapture.findMany({
            where: { id: { in: sharedCaptureIds } },
          });

    const evidenceFileIds = [...new Set(sharedCaptures.map((capture) => capture.evidence_file_id))];
    const playerIds = [...new Set(sharedCaptures.map((capture) => capture.shared_to_player_id))];
    const capturerIds = [...new Set(sharedCaptures.map((capture) => capture.captured_by_account))];

    const [evidenceFiles, players, capturers] = await Promise.all([
      evidenceFileIds.length === 0
        ? Promise.resolve([])
        : prisma.evidenceFile.findMany({
            where: { id: { in: evidenceFileIds } },
            select: {
              id: true,
              evidence_class: true,
              file_type: true,
              file_key: true,
              is_native_capture: true,
              capture_timestamp: true,
            },
          }),
      playerIds.length === 0
        ? Promise.resolve([])
        : prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: {
              id: true,
              ppc_number: true,
              display_name: true,
            },
          }),
      capturerIds.length === 0
        ? Promise.resolve([])
        : prisma.account.findMany({
            where: { id: { in: capturerIds } },
            select: {
              id: true,
              display_name: true,
              email: true,
            },
          }),
    ]);

    const captureById = new Map(sharedCaptures.map((capture) => [capture.id, capture]));
    const evidenceById = new Map(evidenceFiles.map((file) => [file.id, file]));
    const playerById = new Map(players.map((player) => [player.id, player]));
    const capturerById = new Map(capturers.map((account) => [account.id, account]));

    const thumbnailUrls = new Map<string, string>();
    await Promise.all(
      evidenceFiles.map(async (file) => {
        if (!file.file_type.startsWith("image/")) return;
        try {
          const url = await getEvidenceDownloadUrl(file.file_key, 3600);
          thumbnailUrls.set(file.id, url);
        } catch {
          // Thumbnail unavailable if S3 is not configured.
        }
      }),
    );

    return NextResponse.json({
      notifications: notifications.map((notification) => {
        const sharedCapture = captureById.get(notification.reference_id);
        const evidenceFile = sharedCapture
          ? evidenceById.get(sharedCapture.evidence_file_id)
          : undefined;
        const player = sharedCapture
          ? playerById.get(sharedCapture.shared_to_player_id)
          : undefined;
        const capturer = sharedCapture
          ? capturerById.get(sharedCapture.captured_by_account)
          : undefined;

        return {
          id: notification.id,
          notification_type: notification.notification_type,
          reference_id: notification.reference_id,
          message: notification.message,
          is_read: notification.is_read,
          created_at: notification.created_at.toISOString(),
          shared_capture: sharedCapture
            ? {
                id: sharedCapture.id,
                evidence_file_id: sharedCapture.evidence_file_id,
                captured_by_account: sharedCapture.captured_by_account,
                capturer_name:
                  capturer?.display_name ?? capturer?.email ?? "Unknown capturer",
                shared_to_player_id: sharedCapture.shared_to_player_id,
                capture_mode: sharedCapture.capture_mode,
                metadata_verified: sharedCapture.metadata_verified,
                evidence_class: sharedCapture.evidence_class,
                shared_at: sharedCapture.shared_at.toISOString(),
                admitted: sharedCapture.admitted,
                admitted_at: sharedCapture.admitted_at?.toISOString() ?? null,
                capture_credit: sharedCapture.capture_credit,
                visibility: sharedCapture.visibility,
                thumbnail_url: evidenceFile ? thumbnailUrls.get(evidenceFile.id) ?? null : null,
                player: player ?? null,
                evidence_file: evidenceFile
                  ? {
                      id: evidenceFile.id,
                      evidence_class: evidenceFile.evidence_class,
                      file_type: evidenceFile.file_type,
                      is_native_capture: evidenceFile.is_native_capture,
                      capture_timestamp:
                        evidenceFile.capture_timestamp?.toISOString() ?? null,
                    }
                  : null,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Guardian notifications error:", error);
    return NextResponse.json(
      { error: "Failed to load guardian notifications" },
      { status: 500 },
    );
  }
}
