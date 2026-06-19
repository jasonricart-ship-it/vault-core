import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

/**
 * Phase 5 stub — AI archival bust generation pipeline.
 *
 * Production path will enqueue AWS Rekognition face analysis + bust compositing
 * from enrollment_photo_key. This route only validates enrollment and writes a
 * placeholder bust_image_key so corridor rendering can wire against the field.
 */
export async function POST(
  _request: Request,
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

    const { id: ppcNumber } = await params;

    const player = await prisma.player.findUnique({
      where: { ppc_number: ppcNumber },
      select: {
        ppc_number: true,
        enrollment_photo_key: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (!player.enrollment_photo_key?.trim()) {
      return NextResponse.json(
        {
          error:
            "No enrollment photo on file. Submit a headshot through the Vault app to generate your archival bust.",
        },
        { status: 400 },
      );
    }

    const bustImageKey = `bust/stub/${player.ppc_number}.png`;

    await prisma.player.update({
      where: { ppc_number: ppcNumber },
      data: { bust_image_key: bustImageKey },
    });

    return NextResponse.json({
      ppc_number: player.ppc_number,
      bust_image_key: bustImageKey,
      status: "queued",
      message:
        "Bust generation queued. This feature connects to AWS Rekognition in Phase 5 final.",
    });
  } catch (error) {
    console.error("Bust generation stub error:", error);
    return NextResponse.json(
      { error: "Failed to queue bust generation" },
      { status: 500 },
    );
  }
}
