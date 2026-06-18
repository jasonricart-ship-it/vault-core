import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { renewPlayerRecord } from "@/lib/ppc-renewal";

const STAFF_ROLES = new Set(["authority", "super_admin"]);

async function canRenewPlayer(
  sessionUserId: string,
  role: string,
  player: {
    id: string;
    is_minor: boolean;
    guardian_account_id: string | null;
    player_guardians: { account_id: string }[];
  },
): Promise<boolean> {
  if (STAFF_ROLES.has(role)) return true;

  if (role === "guardian") {
    return (
      player.guardian_account_id === sessionUserId ||
      player.player_guardians.some((guardian) => guardian.account_id === sessionUserId)
    );
  }

  if (role === "player") {
    const account = await prisma.account.findUnique({
      where: { id: sessionUserId },
      select: { linked_player_id: true },
    });

    if (!account || account.linked_player_id !== player.id) {
      return false;
    }

    if (!player.is_minor) {
      return true;
    }

    const guardianIds = [
      player.guardian_account_id,
      ...player.player_guardians.map((guardian) => guardian.account_id),
    ].filter((id): id is string => Boolean(id));

    if (guardianIds.length === 0) {
      return false;
    }

    const delegate = await prisma.accountDelegate.findFirst({
      where: {
        delegate_account_id: sessionUserId,
        account_id: { in: guardianIds },
        revoked_at: null,
        minor_access_level: { gte: 3 },
      },
      select: { id: true },
    });

    return delegate != null;
  }

  return false;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ppcNumber } = await params;

    const player = await prisma.player.findUnique({
      where: { ppc_number: ppcNumber },
      select: {
        id: true,
        is_minor: true,
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

    const allowed = await canRenewPlayer(
      session.user.id,
      session.user.role,
      player,
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await renewPlayerRecord(ppcNumber);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to renew player record";
    const status = message === "Player not found" ? 404 : 500;

    if (status === 500) {
      console.error("PPC renewal error:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
