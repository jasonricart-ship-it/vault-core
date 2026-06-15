import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateStrength } from "@/lib/strength";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { ppc_number: id },
    include: {
      org_affiliations: {
        include: {
          org: {
            include: {
              gov_affiliations: {
                include: { gov: true },
              },
            },
          },
        },
      },
      gum_items: true,
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const govAffiliationMap = new Map(
    player.org_affiliations.flatMap((affiliation) =>
      affiliation.org.gov_affiliations.map((govAffiliation) => [
        govAffiliation.id,
        govAffiliation,
      ]),
    ),
  );

  const gov_affiliations = [...govAffiliationMap.values()];

  const strength = calculateStrength({
    org_affiliations: player.org_affiliations,
    gov_affiliations,
    gum_items_count: player.gum_items.length,
  });

  return NextResponse.json({
    ...player,
    gov_affiliations,
    strength_score: strength.score,
    vault_level: strength.vault_level,
    bust_color: strength.bust_color,
  });
}
