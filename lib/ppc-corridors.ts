import { prisma } from "@/lib/db";
import type {
  CorridorPlayerSummary,
  LatestAchievementRecord,
  LatestEvidenceRecord,
  LatestSeasonRecord,
} from "@/components/vault/corridor/types";

export async function fetchActivePublicPlayers(): Promise<CorridorPlayerSummary[]> {
  return prisma.player.findMany({
    where: {
      exhibit_status: "active",
      display_name: { not: "Reserved" },
      visibility: { in: ["public", "member"] },
    },
    orderBy: [{ strength_score: "desc" }, { ppc_number: "asc" }],
    select: {
      ppc_number: true,
      display_name: true,
      first_name: true,
      last_name: true,
      preferred_name: true,
      primary_sport: true,
      vault_level: true,
      strength_score: true,
    },
  });
}

type PlayerWithRelations = {
  id: string;
  org_affiliations: {
    season_year: number;
    org: { name: string };
  }[];
  achievements: {
    achievement_type: string;
    season_year: number | null;
    awarded_at: Date | null;
    created_at: Date;
    event: { name: string } | null;
    org: { name: string } | null;
  }[];
  event_participation: {
    verified: boolean;
    is_champion: boolean;
    is_mvp: boolean;
    is_all_star: boolean;
    outcome: string | null;
    created_at: Date;
    org_id: string | null;
    event: { name: string; season_year: number; event_date: Date | null };
  }[];
  gum_items: { id: string }[];
};

export async function fetchLatestEvidence(
  playerId: string,
  gumItemIds: string[],
): Promise<LatestEvidenceRecord | null> {
  const entityIds = [playerId, ...gumItemIds];

  const [evidenceFiles, sharedCaptures] = await Promise.all([
    prisma.evidenceFile.findMany({
      where: {
        entity_id: { in: entityIds },
      },
      orderBy: { admitted_at: "desc" },
      take: 5,
    }),
    prisma.sharedCapture.findMany({
      where: {
        shared_to_player_id: playerId,
        admitted: true,
      },
      orderBy: { admitted_at: "desc" },
      take: 5,
    }),
  ]);

  type Candidate = {
    admitted_at: Date;
    evidence_class: string;
    file_type: string;
    evt_name: string | null;
    shared_capture: LatestEvidenceRecord["shared_capture"];
  };

  const candidates: Candidate[] = evidenceFiles.map((ef) => ({
    admitted_at: ef.admitted_at,
    evidence_class: ef.evidence_class,
    file_type: ef.file_type,
    evt_name: ef.notes ?? null,
    shared_capture: null,
  }));

  for (const sc of sharedCaptures) {
    const ef = evidenceFiles.find((e) => e.id === sc.evidence_file_id);
    candidates.push({
      admitted_at: sc.admitted_at ?? sc.shared_at,
      evidence_class: sc.evidence_class,
      file_type: ef?.file_type ?? "capture",
      evt_name: ef?.notes ?? null,
      shared_capture: {
        capture_credit: sc.capture_credit,
        admitted: sc.admitted,
      },
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.admitted_at.getTime() - a.admitted_at.getTime());
  const best = candidates[0]!;

  return {
    evidence_class: best.evidence_class,
    admitted_at: best.admitted_at.toISOString(),
    file_type: best.file_type,
    evt_name: best.evt_name,
    shared_capture: best.shared_capture,
  };
}

export function resolveLatestAchievement(
  player: PlayerWithRelations,
): LatestAchievementRecord | null {
  const fromAchievements = player.achievements.map((a) => ({
    achievement_type: a.achievement_type,
    event_name: a.event?.name ?? null,
    season_year: a.season_year,
    org_name: a.org?.name ?? null,
    verified: true,
    sortDate: a.awarded_at ?? a.created_at,
  }));

  const fromEvents = player.event_participation.flatMap((ep) => {
    const types: string[] = [];
    if (ep.is_champion) types.push("champion");
    if (ep.is_mvp) types.push("mvp");
    if (ep.is_all_star) types.push("all_star");
    return types.map((achievement_type) => ({
      achievement_type,
      event_name: ep.event.name,
      season_year: ep.event.season_year,
      org_name:
        player.org_affiliations.find((a) => a.season_year === ep.event.season_year)?.org.name ??
        null,
      verified: ep.verified,
      sortDate: ep.created_at,
    }));
  });

  const all = [...fromAchievements, ...fromEvents];
  if (all.length === 0) return null;

  all.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  const best = all[0]!;

  return {
    achievement_type: best.achievement_type,
    event_name: best.event_name,
    season_year: best.season_year,
    org_name: best.org_name,
    verified: best.verified,
    awarded_at: best.sortDate.toISOString(),
  };
}

export function resolveLatestSeason(
  player: PlayerWithRelations,
): LatestSeasonRecord | null {
  const currentYear = new Date().getFullYear();
  const activeYears = [currentYear, currentYear - 1];

  const sorted = [...player.event_participation].sort(
    (a, b) => b.event.season_year - a.event.season_year || b.created_at.getTime() - a.created_at.getTime(),
  );

  const current = sorted.find((ep) => activeYears.includes(ep.event.season_year));
  const pick = current ?? sorted[0];
  if (!pick) return null;

  const org_name =
    player.org_affiliations.find((a) => a.season_year === pick.event.season_year)?.org.name ?? null;

  const hasOutcome = !!pick.outcome || pick.is_champion || pick.is_mvp;
  const eventPast =
    pick.event.event_date != null && pick.event.event_date.getTime() < Date.now();

  return {
    org_name,
    season_year: pick.event.season_year,
    event_name: pick.event.name,
    outcome: pick.outcome ?? (pick.is_champion ? "Champion" : pick.is_mvp ? "MVP" : null),
    status: hasOutcome || eventPast ? "SEASON COMPLETE" : "IN PROGRESS",
  };
}
