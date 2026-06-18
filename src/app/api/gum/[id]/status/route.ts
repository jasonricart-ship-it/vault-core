import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { isAllowedStatusTransition } from "@/lib/gum-detail";

const ALLOWED_ROLES = new Set(["evaluator", "authority", "super_admin"]);

export async function PATCH(
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

    const { id } = await params;
    const body = await request.json();
    const nextStatus = String(body.status ?? "").trim();
    const evaluatorNotesRaw = body.evaluator_notes;
    const evaluatorNotes =
      evaluatorNotesRaw == null || String(evaluatorNotesRaw).trim() === ""
        ? undefined
        : String(evaluatorNotesRaw).trim();

    if (!nextStatus) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const gumItem = await prisma.gumItem.findFirst({
      where: {
        OR: [{ id }, { gum_code: id }],
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!gumItem) {
      return NextResponse.json({ error: "GUM item not found" }, { status: 404 });
    }

    if (!isAllowedStatusTransition(gumItem.status, nextStatus, true)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from "${gumItem.status}" to "${nextStatus}"`,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await prisma.gumItem.update({
      where: { id: gumItem.id },
      data: {
        status: nextStatus,
        ...(evaluatorNotes !== undefined ? { evaluator_notes: evaluatorNotes } : {}),
        ...(nextStatus === "authenticated"
          ? {
              admitted_at: now,
              is_authenticated: true,
              authenticated_at: now,
            }
          : {}),
      },
      select: {
        id: true,
        gum_code: true,
        status: true,
        evaluator_notes: true,
        admitted_at: true,
        is_authenticated: true,
        authenticated_at: true,
      },
    });

    return NextResponse.json({
      gum_item_id: updated.id,
      gum_code: updated.gum_code,
      status: updated.status,
      evaluator_notes: updated.evaluator_notes,
      admitted_at: updated.admitted_at,
    });
  } catch (error) {
    console.error("GUM status update error:", error);
    return NextResponse.json(
      { error: "Failed to update GUM item status" },
      { status: 500 },
    );
  }
}
