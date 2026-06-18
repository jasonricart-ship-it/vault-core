import { prisma } from "@/lib/db";

export type AtriumHallPlayer = {
  id: string;
  ppc_number: string;
  display_name: string;
  preferred_name: string | null;
  primary_sport: string | null;
  vault_level: string;
  bust_color: string;
  exhibit_status: string;
  bust_image_key: string | null;
};

export type AtriumChampion = {
  id: string;
  achievement_type: string;
  achievement_scope: string;
  medal_tier: string | null;
  season_year: number | null;
  notes: string | null;
  awarded_at: string | null;
  player: {
    id: string;
    ppc_number: string;
    display_name: string;
    preferred_name: string | null;
    bust_color: string;
  } | null;
  event: {
    id: string;
    evt_code: string;
    name: string;
    season_year: number;
    location: string | null;
  } | null;
};

export type AtriumMvp = {
  id: string;
  achievement_type: string;
  achievement_scope: string;
  medal_tier: string | null;
  season_year: number | null;
  notes: string | null;
  awarded_at: string | null;
  player: {
    id: string;
    ppc_number: string;
    display_name: string;
    preferred_name: string | null;
    bust_color: string;
    primary_sport: string | null;
  } | null;
};

export type AtriumCaptain = {
  id: string;
  season_year: number;
  jersey_number: string | null;
  role: string | null;
  player: {
    id: string;
    ppc_number: string;
    display_name: string;
    preferred_name: string | null;
    primary_sport: string | null;
    bust_color: string;
  };
  org: {
    id: string;
    org_code: string;
    name: string;
    short_name: string | null;
    sport: string | null;
  };
};

export type AtriumStats = {
  totalActivePlayers: number;
  verifiedOrgs: number;
  verifiedGovs: number;
};

export type AtriumData = {
  hall: AtriumHallPlayer[];
  champions: AtriumChampion[];
  mvps: AtriumMvp[];
  captains: AtriumCaptain[];
  stats: AtriumStats;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export async function fetchAtriumData(): Promise<AtriumData> {
  const [hall, champions, mvps, captains, totalActivePlayers, verifiedOrgs, verifiedGovs] =
    await Promise.all([
      prisma.player.findMany({
        where: {
          visibility: "public",
          exhibit_status: "active",
          vault_level: { in: ["established", "archival"] },
        },
        select: {
          id: true,
          ppc_number: true,
          display_name: true,
          preferred_name: true,
          primary_sport: true,
          vault_level: true,
          bust_color: true,
          exhibit_status: true,
          bust_image_key: true,
        },
        orderBy: [{ vault_level: "desc" }, { display_name: "asc" }],
      }),
      prisma.achievement.findMany({
        where: { achievement_type: "champion" },
        include: {
          player: {
            select: {
              id: true,
              ppc_number: true,
              display_name: true,
              preferred_name: true,
              bust_color: true,
            },
          },
          event: {
            select: {
              id: true,
              evt_code: true,
              name: true,
              season_year: true,
              location: true,
            },
          },
        },
        orderBy: [{ season_year: "desc" }, { awarded_at: "desc" }],
      }),
      prisma.achievement.findMany({
        where: { achievement_type: "mvp" },
        include: {
          player: {
            select: {
              id: true,
              ppc_number: true,
              display_name: true,
              preferred_name: true,
              bust_color: true,
              primary_sport: true,
            },
          },
        },
        orderBy: [{ season_year: "desc" }, { awarded_at: "desc" }],
      }),
      prisma.playerOrgAffiliation.findMany({
        where: {
          is_captain: true,
          verified_by_org: true,
          status: "active",
        },
        include: {
          player: {
            select: {
              id: true,
              ppc_number: true,
              display_name: true,
              preferred_name: true,
              primary_sport: true,
              bust_color: true,
            },
          },
          org: {
            select: {
              id: true,
              org_code: true,
              name: true,
              short_name: true,
              sport: true,
            },
          },
        },
        orderBy: [{ season_year: "desc" }, { player: { display_name: "asc" } }],
      }),
      prisma.player.count({
        where: { exhibit_status: "active" },
      }),
      prisma.organization.count({
        where: { is_verified: true },
      }),
      prisma.governingBody.count({
        where: { is_verified: true },
      }),
    ]);

  return {
    hall,
    champions: champions.map((a) => ({
      id: a.id,
      achievement_type: a.achievement_type,
      achievement_scope: a.achievement_scope,
      medal_tier: a.medal_tier,
      season_year: a.season_year,
      notes: a.notes,
      awarded_at: toIso(a.awarded_at),
      player: a.player,
      event: a.event,
    })),
    mvps: mvps.map((a) => ({
      id: a.id,
      achievement_type: a.achievement_type,
      achievement_scope: a.achievement_scope,
      medal_tier: a.medal_tier,
      season_year: a.season_year,
      notes: a.notes,
      awarded_at: toIso(a.awarded_at),
      player: a.player,
    })),
    captains,
    stats: {
      totalActivePlayers,
      verifiedOrgs,
      verifiedGovs,
    },
  };
}
