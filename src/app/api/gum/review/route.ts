import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

const REVIEW_ROLES = new Set(["evaluator", "authority", "super_admin"]);

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!REVIEW_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await prisma.gumItem.findMany({
      where: {
        status: { in: ["pending", "under_review"] },
      },
      orderBy: [{ created_at: "asc" }],
      select: {
        id: true,
        gum_code: true,
        item_type: true,
        status: true,
        primary_evidence_class: true,
        created_at: true,
        player: {
          select: {
            display_name: true,
            ppc_number: true,
          },
        },
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        gum_code: item.gum_code,
        item_type: item.item_type,
        status: item.status,
        primary_evidence_class: item.primary_evidence_class,
        submitted_at: item.created_at,
        player_name: item.player?.display_name ?? null,
        ppc_number: item.player?.ppc_number ?? null,
      })),
    });
  } catch (error) {
    console.error("GUM review list error:", error);
    return NextResponse.json(
      { error: "Failed to load review queue" },
      { status: 500 },
    );
  }
}
