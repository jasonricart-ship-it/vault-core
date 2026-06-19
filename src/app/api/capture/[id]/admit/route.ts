import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set(["guardian", "super_admin"]);

function isGuardianOfPlayer(
  accountId: string,
  player: {
    guardian_account_id: string | null;
    player_guardians: { account_id: string }[];
  },
): boolean {
  if (player.guardian_account_id === accountId) return true;
  return player.player_guardians.some((guardian) => guardian.account_id === accountId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: sharedCaptureId } = await params;
    const body = await request.json();
    const decision = String(body.decision ?? "").trim().toLowerCase();

    if (decision !== "admit" && decision !== "decline") {
      return NextResponse.json(
        { error: 'decision must be "admit" or "decline"' },
        { status: 400 },
      );
    }

    const sharedCapture = await prisma.sharedCapture.findUnique({
      where: { id: sharedCaptureId },
    });

    if (!sharedCapture) {
      return NextResponse.json({ error: "Shared capture not found" }, { status: 404 });
    }

    const player = await prisma.player.findUnique({
      where: { id: sharedCapture.shared_to_player_id },
      select: {
        id: true,
        guardian_account_id: true,
        player_guardians: {
          where: { is_active: true },
          select: { account_id: true },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const isSuperAdmin = session.user.role === "super_admin";
    if (!isSuperAdmin && !isGuardianOfPlayer(session.user.id, player)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (decision === "admit") {
      const admittedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.sharedCapture.update({
          where: { id: sharedCaptureId },
          data: {
            admitted: true,
            admitted_at: admittedAt,
            admitted_by: session.user.id,
          },
        });

        await tx.guardianNotification.updateMany({
          where: {
            notification_type: "capture_share",
            reference_id: sharedCaptureId,
          },
          data: { is_read: true },
        });
      });

      return NextResponse.json({
        shared_capture_id: sharedCaptureId,
        decision: "admit",
        admitted_at: admittedAt.toISOString(),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.sharedCapture.delete({
        where: { id: sharedCaptureId },
      });

      await tx.guardianNotification.updateMany({
        where: {
          notification_type: "capture_share",
          reference_id: sharedCaptureId,
        },
        data: { is_read: true },
      });
    });

    return NextResponse.json({
      shared_capture_id: sharedCaptureId,
      decision: "decline",
      admitted_at: null,
    });
  } catch (error) {
    console.error("Capture admit/decline error:", error);
    return NextResponse.json(
      { error: "Failed to process capture decision" },
      { status: 500 },
    );
  }
}
