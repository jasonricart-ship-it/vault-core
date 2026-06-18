import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchLatestEvidence,
  resolveLatestAchievement,
  resolveLatestSeason,
} from "@/lib/ppc-corridors";
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
                include: {
                  gov: {
                    include: {
                      parent: {
                        include: {
                          parent: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      gum_items: true,
      achievements: {
        include: {
          event: true,
          org: true,
        },
        orderBy: [{ awarded_at: "desc" }, { created_at: "desc" }],
      },
      event_participation: {
        include: {
          event: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      hall_of_fame_nominations: {
        orderBy: {
          created_at: "desc",
        },
      },
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

  const gumItemIds = player.gum_items.map((g) => g.id);
  const [latest_evidence, latest_achievement, latest_season] = await Promise.all([
    fetchLatestEvidence(player.id, gumItemIds),
    Promise.resolve(resolveLatestAchievement(player)),
    Promise.resolve(resolveLatestSeason(player)),
  ]);

  return NextResponse.json({
    ...player,
    gov_affiliations,
    strength_score: player.strength_score,
    vault_level: player.vault_level,
    bust_color: player.bust_color,
    calculated_strength: strength,
    latest_evidence,
    latest_achievement,
    latest_season,
  });
}
