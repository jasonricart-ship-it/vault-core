import { prisma } from "@/lib/db";
import { calculateStrength } from "@/lib/strength";

function addOneYear(from: Date): Date {
  const next = new Date(from);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function isOrgGovAffiliationExpiredOrDue(
  affiliation: {
    status: string;
    end_date: Date | null;
    org: { annual_renewal_due: Date | null };
    gov: { annual_renewal_due: Date | null };
  },
  now: Date,
): boolean {
  if (affiliation.status !== "active") return true;
  if (affiliation.end_date && affiliation.end_date < now) return true;
  if (affiliation.org.annual_renewal_due && affiliation.org.annual_renewal_due <= now) {
    return true;
  }
  if (affiliation.gov.annual_renewal_due && affiliation.gov.annual_renewal_due <= now) {
    return true;
  }
  return false;
}

async function loadPlayerForStrength(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
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
      event_participation: {
        include: {
          event: {
            include: {
              org: {
                include: {
                  gov_affiliations: {
                    include: {
                      gov: {
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
    },
  });
}

export async function renewPlayerRecord(ppcNumber: string) {
  const player = await prisma.player.findUnique({
    where: { ppc_number: ppcNumber },
    select: { id: true, ppc_number: true },
  });

  if (!player) {
    throw new Error("Player not found");
  }

  const now = new Date();
  const renewalDue = addOneYear(now);

  const activeAffiliations = await prisma.playerOrgAffiliation.findMany({
    where: { player_id: player.id, status: "active" },
    select: { id: true, org_id: true },
  });

  const orgIds = [...new Set(activeAffiliations.map((affiliation) => affiliation.org_id))];

  const orgGovAffiliations =
    orgIds.length === 0
      ? []
      : await prisma.orgGovAffiliation.findMany({
          where: { org_id: { in: orgIds } },
          include: {
            org: { select: { annual_renewal_due: true } },
            gov: { select: { annual_renewal_due: true } },
          },
        });

  const anyAffiliationsExpired = orgGovAffiliations.some((affiliation) =>
    isOrgGovAffiliationExpiredOrDue(affiliation, now),
  );

  const playerForStrength = await loadPlayerForStrength(player.id);
  if (!playerForStrength) {
    throw new Error("Player not found");
  }

  const strength = calculateStrength({
    org_affiliations: playerForStrength.org_affiliations,
    gum_items_count: playerForStrength.gum_items.length,
    event_participation: playerForStrength.event_participation,
    annual_renewal_current: activeAffiliations.length > 0,
  });

  await prisma.$transaction(async (tx) => {
    if (activeAffiliations.length > 0) {
      await tx.playerOrgAffiliation.updateMany({
        where: { id: { in: activeAffiliations.map((affiliation) => affiliation.id) } },
        data: {
          last_renewed_at: now,
          annual_renewal_due: renewalDue,
        },
      });
    }

    await tx.player.update({
      where: { id: player.id },
      data: {
        strength_score: strength.score,
        vault_level: strength.vault_level,
        bust_color: strength.bust_color,
      },
    });
  });

  return {
    ppc_number: player.ppc_number,
    renewed_at: now.toISOString(),
    affiliations_renewed: activeAffiliations.length,
    any_affiliations_expired: anyAffiliationsExpired,
    new_strength_score: strength.score,
  };
}
