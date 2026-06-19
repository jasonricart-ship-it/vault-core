import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

function resolvePrimaryGuardianAccountId(player: {
  guardian_account_id: string | null;
  player_guardians: { account_id: string; guardian_role: string }[];
}): string | null {
  if (player.guardian_account_id) {
    return player.guardian_account_id;
  }

  const primaryGuardian = player.player_guardians.find(
    (guardian) => guardian.guardian_role === "primary",
  );

  return primaryGuardian?.account_id ?? null;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: { id: true, is_verified: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.is_verified) {
      return NextResponse.json({ error: "Account must be verified" }, { status: 403 });
    }

    const body = await request.json();
    const evidenceFileId = String(body.evidence_file_id ?? "").trim();
    const sharedToPlayerId = String(body.shared_to_player_id ?? "").trim();
    const captureCredit = String(body.capture_credit ?? "").trim();

    if (!evidenceFileId) {
      return NextResponse.json({ error: "evidence_file_id is required" }, { status: 400 });
    }

    if (!sharedToPlayerId) {
      return NextResponse.json(
        { error: "shared_to_player_id is required" },
        { status: 400 },
      );
    }

    if (!captureCredit) {
      return NextResponse.json({ error: "capture_credit is required" }, { status: 400 });
    }

    const [evidenceFile, player] = await Promise.all([
      prisma.evidenceFile.findUnique({
        where: { id: evidenceFileId },
        select: {
          id: true,
          evidence_class: true,
          metadata_verified: true,
          is_native_capture: true,
        },
      }),
      prisma.player.findUnique({
        where: { id: sharedToPlayerId },
        select: {
          id: true,
          display_name: true,
          ppc_number: true,
          is_minor: true,
          guardian_account_id: true,
          player_guardians: {
            where: { is_active: true },
            select: { account_id: true, guardian_role: true },
          },
        },
      }),
    ]);

    if (!evidenceFile) {
      return NextResponse.json({ error: "Evidence file not found" }, { status: 404 });
    }

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sharedCapture = await tx.sharedCapture.create({
        data: {
          evidence_file_id: evidenceFile.id,
          captured_by_account: account.id,
          shared_to_player_id: player.id,
          capture_mode: "live_capture",
          metadata_verified: evidenceFile.metadata_verified,
          evidence_class: evidenceFile.evidence_class,
          admitted: false,
          visibility: "member",
          capture_credit: captureCredit,
        },
        select: { id: true },
      });

      let notificationSent = false;

      if (player.is_minor) {
        const guardianAccountId = resolvePrimaryGuardianAccountId(player);

        if (guardianAccountId) {
          await tx.guardianNotification.create({
            data: {
              account_id: guardianAccountId,
              notification_type: "capture_share",
              reference_id: sharedCapture.id,
              message: `${captureCredit} shared a live capture to ${player.display_name} (${player.ppc_number}). Review and admit the capture to the permanent record.`,
            },
          });
          notificationSent = true;
        }
      }

      return { sharedCaptureId: sharedCapture.id, notificationSent };
    });

    return NextResponse.json({
      shared_capture_id: result.sharedCaptureId,
      notification_sent: result.notificationSent,
    });
  } catch (error) {
    console.error("Capture share error:", error);
    return NextResponse.json({ error: "Failed to share capture" }, { status: 500 });
  }
}
