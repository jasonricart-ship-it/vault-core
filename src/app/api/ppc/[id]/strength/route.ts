import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { applyGumOctagonBreakthrough } from "@/lib/gum-breakthrough";
import { prisma } from "@/lib/db";

const STAFF_ROLES = new Set(["authority", "super_admin", "org_admin"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const breakthrough = String(body.breakthrough ?? "").trim();

    if (breakthrough !== "gum_octagon") {
      return NextResponse.json(
        { error: "breakthrough must be gum_octagon" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({
      where: { ppc_number: id },
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

    const role = session.user.role;
    const isStaff = STAFF_ROLES.has(role);
    const isLinkedGuardian =
      role === "guardian" &&
      (player.guardian_account_id === session.user.id ||
        player.player_guardians.some((g) => g.account_id === session.user.id));

    if (!isStaff && !isLinkedGuardian) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await applyGumOctagonBreakthrough(player.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply breakthrough";
    const status =
      message === "Player not found"
        ? 404
        : message === "Octagon panels are not fully authenticated" ||
            message === "Breakthrough already claimed"
          ? 400
          : 500;

    if (status === 500) {
      console.error("PPC strength breakthrough error:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
