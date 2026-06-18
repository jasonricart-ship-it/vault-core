import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { generateNextGumCode } from "@/lib/gum";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const playerId = String(body.player_id ?? "").trim();
    const itemType = String(body.item_type ?? "").trim();
    const itemDescription = String(body.item_description ?? "").trim();
    const ownerStatementRaw = body.owner_statement;
    const ownerStatement =
      ownerStatementRaw == null || ownerStatementRaw === ""
        ? null
        : String(ownerStatementRaw).trim();
    const orgId = body.org_id ? String(body.org_id).trim() : null;
    const evtId = body.evt_id ? String(body.evt_id).trim() : null;

    if (!playerId || !itemType || !itemDescription) {
      return NextResponse.json(
        { error: "player_id, item_type, and item_description are required" },
        { status: 400 },
      );
    }

    if (ownerStatement && ownerStatement.length > 200) {
      return NextResponse.json(
        { error: "owner_statement must be 200 characters or fewer" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, ppc_number: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    if (evtId) {
      const event = await prisma.event.findUnique({
        where: { id: evtId },
        select: { id: true },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
    }

    const year = new Date().getFullYear();
    const gumCode = await generateNextGumCode(player.id, player.ppc_number, year);

    const gumItem = await prisma.gumItem.create({
      data: {
        gum_code: gumCode,
        player_id: player.id,
        org_id: orgId,
        event_id: evtId,
        item_type: itemType,
        item_description: itemDescription,
        owner_statement: ownerStatement,
        season_year: year,
        status: "pending",
        submitted_by: session.user.id,
        authority_account_id: session.user.id,
      },
      select: {
        id: true,
        gum_code: true,
        status: true,
      },
    });

    return NextResponse.json({
      gum_item_id: gumItem.id,
      gum_code: gumItem.gum_code,
      status: gumItem.status,
    });
  } catch (error) {
    console.error("GUM submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit GUM item" },
      { status: 500 },
    );
  }
}
