import { prisma } from "@/lib/db";

const playerSelect = {
  id: true,
  display_name: true,
  ppc_number: true,
  org_affiliations: {
    where: { status: "active" as const },
    orderBy: { season_year: "desc" as const },
    select: {
      org: {
        select: {
          id: true,
          name: true,
          org_code: true,
        },
      },
    },
  },
  event_participation: {
    orderBy: { created_at: "desc" as const },
    select: {
      event: {
        select: {
          id: true,
          name: true,
          evt_code: true,
          season_year: true,
          org_id: true,
          org: {
            select: {
              id: true,
              name: true,
              org_code: true,
            },
          },
        },
      },
    },
  },
};

type PlayerRow = {
  id: string;
  display_name: string;
  ppc_number: string;
  org_affiliations: {
    org: { id: string; name: string; org_code: string };
  }[];
  event_participation: {
    event: {
      id: string;
      name: string;
      evt_code: string;
      season_year: number;
      org_id: string;
      org: { id: string; name: string; org_code: string };
    };
  }[];
};

export type GumSubmitContextPlayer = {
  id: string;
  display_name: string;
  ppc_number: string;
  events: {
    id: string;
    name: string;
    evt_code: string;
    season_year: number;
    org_id: string;
    org_name: string;
  }[];
  orgs: {
    id: string;
    name: string;
    org_code: string;
  }[];
};

export function mapPlayerToSubmitContext(player: PlayerRow): GumSubmitContextPlayer {
  const orgMap = new Map<string, { id: string; name: string; org_code: string }>();

  for (const affiliation of player.org_affiliations) {
    orgMap.set(affiliation.org.id, affiliation.org);
  }

  const events = player.event_participation.map((participation) => ({
    id: participation.event.id,
    name: participation.event.name,
    evt_code: participation.event.evt_code,
    season_year: participation.event.season_year,
    org_id: participation.event.org_id,
    org_name: participation.event.org.name,
  }));

  for (const participation of player.event_participation) {
    orgMap.set(participation.event.org.id, participation.event.org);
  }

  return {
    id: player.id,
    display_name: player.display_name,
    ppc_number: player.ppc_number,
    events,
    orgs: [...orgMap.values()],
  };
}

export async function loadGumSubmitContext(
  accountId: string,
  role: string,
): Promise<GumSubmitContextPlayer[]> {
  const isSuperAdmin = role === "super_admin";

  const players = await prisma.player.findMany({
    where: isSuperAdmin
      ? undefined
      : {
          OR: [
            { guardian_account_id: accountId },
            {
              player_guardians: {
                some: {
                  account_id: accountId,
                  is_active: true,
                },
              },
            },
          ],
        },
    orderBy: { ppc_number: "asc" },
    select: playerSelect,
  });

  return players.map(mapPlayerToSubmitContext);
}
