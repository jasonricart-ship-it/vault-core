import { prisma } from "@/lib/db";

export type PlayerWingPlayer = {
  ppc_number: string;
  preferred_name: string | null;
  first_name: string;
  vault_level: string;
  bust_color: string;
};

export type PlayerWingAchievement = {
  achievement_type: string;
  event_name: string;
  season_year: number | null;
  preferred_name: string | null;
  first_name: string;
  ppc_number: string;
};

export type PlayerWingGumItem = {
  gum_code: string;
  item_description: string;
  is_authenticated: boolean;
};

export type PlayerWingData = {
  recentPlayers: PlayerWingPlayer[];
  recentAchievements: PlayerWingAchievement[];
  recentGumItems: PlayerWingGumItem[];
};

export async function fetchPlayerWingData(): Promise<PlayerWingData> {
  const [recentPlayers, achievementRows, recentGumItems] = await Promise.all([
    prisma.player.findMany({
      where: {
        exhibit_status: "active",
        display_name: { not: "Reserved" },
        visibility: { in: ["public", "member"] },
      },
      orderBy: { created_at: "desc" },
      take: 6,
      select: {
        ppc_number: true,
        preferred_name: true,
        first_name: true,
        vault_level: true,
        bust_color: true,
      },
    }),
    prisma.achievement.findMany({
      where: {
        ppc_id: { not: null },
        evt_id: { not: null },
      },
      orderBy: { created_at: "desc" },
      take: 3,
      include: {
        player: {
          select: {
            preferred_name: true,
            first_name: true,
            ppc_number: true,
          },
        },
        event: {
          select: {
            name: true,
            season_year: true,
          },
        },
      },
    }),
    prisma.gumItem.findMany({
      orderBy: { created_at: "desc" },
      take: 3,
      select: {
        gum_code: true,
        item_description: true,
        is_authenticated: true,
      },
    }),
  ]);

  const recentAchievements: PlayerWingAchievement[] = achievementRows
    .filter((a) => a.player && a.event)
    .map((a) => ({
      achievement_type: a.achievement_type,
      event_name: a.event!.name,
      season_year: a.season_year ?? a.event!.season_year,
      preferred_name: a.player!.preferred_name,
      first_name: a.player!.first_name,
      ppc_number: a.player!.ppc_number,
    }));

  return { recentPlayers, recentAchievements, recentGumItems };
}
