import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  buildGumDetailResponse,
  resolveGumAccessTier,
} from "@/lib/gum-detail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const tier = resolveGumAccessTier(
      session?.user?.role,
      Boolean(session?.user?.id),
    );

    const gumItem = await prisma.gumItem.findFirst({
      where: {
        OR: [{ id }, { gum_code: id }],
      },
      include: {
        player: {
          select: {
            display_name: true,
            ppc_number: true,
            vault_level: true,
          },
        },
        org: {
          select: {
            id: true,
            name: true,
            short_name: true,
            org_code: true,
            sport: true,
            vault_level: true,
            city: true,
            state: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            evt_code: true,
            season_year: true,
            event_date: true,
            location: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!gumItem) {
      return NextResponse.json({ error: "GUM item not found" }, { status: 404 });
    }

    const [evidenceFiles, authorityLog] = await Promise.all([
      prisma.evidenceFile.findMany({
        where: { entity_id: gumItem.id },
        orderBy: { admitted_at: "desc" },
      }),
      prisma.itemAuthorityLog.findMany({
        where: { item_id: gumItem.id },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return NextResponse.json(
      buildGumDetailResponse(gumItem, evidenceFiles, authorityLog, tier),
    );
  } catch (error) {
    console.error("GUM detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GUM item" },
      { status: 500 },
    );
  }
}
