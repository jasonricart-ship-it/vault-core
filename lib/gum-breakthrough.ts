import { prisma } from "@/lib/db";
import {
  GUM_OCTAGON_PANELS,
  isGumOctagonComplete,
} from "@/lib/gum-octagon";
import { bustColorFromVaultLevel, vaultLevelFromScore } from "@/lib/vault-tier";

export { GUM_OCTAGON_PANELS, isGumOctagonComplete };

const BREAKTHROUGH_STRENGTH_BONUS = 5;

export async function applyGumOctagonBreakthrough(playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      ppc_number: true,
      strength_score: true,
      corridor_breakthrough_at: true,
    },
  });

  if (!player) {
    throw new Error("Player not found");
  }

  if (player.corridor_breakthrough_at) {
    throw new Error("Breakthrough already claimed");
  }

  const segmentItems = await prisma.gumItem.findMany({
    where: { player_id: playerId, corridor_segment: 1 },
    select: {
      id: true,
      corridor_segment: true,
      display_position: true,
      status: true,
      primary_evidence_class: true,
      admitted_at: true,
    },
  });

  if (!isGumOctagonComplete(segmentItems)) {
    throw new Error("Octagon panels are not fully authenticated");
  }

  const featured = segmentItems
    .filter((item) => item.status === "authenticated")
    .sort((a, b) => {
      const aGold = a.primary_evidence_class?.toUpperCase().startsWith("E1") ? 1 : 0;
      const bGold = b.primary_evidence_class?.toUpperCase().startsWith("E1") ? 1 : 0;
      if (bGold !== aGold) return bGold - aGold;
      const aTime = a.admitted_at?.getTime() ?? 0;
      const bTime = b.admitted_at?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, 2);

  const nextStrength = Math.min(100, player.strength_score + BREAKTHROUGH_STRENGTH_BONUS);
  const vaultLevel = vaultLevelFromScore(nextStrength);
  const bustColor = bustColorFromVaultLevel(vaultLevel);
  const breakthroughAt = new Date();

  const relocatedIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];

    for (const [index, item] of featured.entries()) {
      await tx.gumItem.update({
        where: { id: item.id },
        data: {
          corridor_segment: 2,
          display_position: index + 1,
        },
      });
      ids.push(item.id);
    }

    await tx.player.update({
      where: { id: playerId },
      data: {
        strength_score: nextStrength,
        vault_level: vaultLevel,
        bust_color: bustColor,
        corridor_breakthrough_at: breakthroughAt,
      },
    });

    return ids;
  });

  const rankPosition =
    (await prisma.player.count({
      where: {
        exhibit_status: "active",
        display_name: { not: "Reserved" },
        strength_score: { gt: nextStrength },
      },
    })) + 1;

  return {
    ppc_number: player.ppc_number,
    strength_score: nextStrength,
    vault_level: vaultLevel,
    bust_color: bustColor,
    strength_bonus: BREAKTHROUGH_STRENGTH_BONUS,
    breakthrough_at: breakthroughAt.toISOString(),
    relocated_item_ids: relocatedIds,
    ranking_position: rankPosition,
  };
}
