import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  authenticationCheckmarkType,
  canViewGumItemVisibility,
} from "@/lib/gum-detail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const isAuthenticated = Boolean(session?.user?.id);
    const role = session?.user?.role;

    const player = await prisma.player.findUnique({
      where: { ppc_number: id },
      select: { id: true, ppc_number: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const items = await prisma.gumItem.findMany({
      where: { player_id: player.id },
      orderBy: [{ corridor_segment: "asc" }, { display_position: "asc" }],
      select: {
        id: true,
        gum_code: true,
        item_type: true,
        status: true,
        primary_evidence_class: true,
        visibility: true,
        display_position: true,
        corridor_segment: true,
        owner_statement: true,
        capturer_credit: true,
        admitted_at: true,
        org: {
          select: { name: true },
        },
        event: {
          select: { name: true },
        },
        player: {
          select: {
            display_name: true,
            ppc_number: true,
          },
        },
      },
    });

    const gum_items = items
      .filter((item) =>
        canViewGumItemVisibility(item.visibility, isAuthenticated, role),
      )
      .map((item) => ({
        id: item.id,
        gum_code: item.gum_code,
        item_type: item.item_type,
        status: item.status,
        evidence_class: item.primary_evidence_class,
        visibility: item.visibility,
        display_position: item.display_position,
        corridor_segment: item.corridor_segment,
        owner_statement: item.owner_statement,
        capturer_credit: item.capturer_credit,
        admitted_at: item.admitted_at,
        org_name: item.org?.name ?? null,
        event_name: item.event?.name ?? null,
        athlete_name: item.player?.display_name ?? null,
        ppc_number: item.player?.ppc_number ?? player.ppc_number,
        authentication_checkmark_type: authenticationCheckmarkType(
          item.primary_evidence_class,
        ),
      }));

    return NextResponse.json({ ppc_number: player.ppc_number, gum_items });
  } catch (error) {
    console.error("PPC GUM corridor error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GUM items" },
      { status: 500 },
    );
  }
}
