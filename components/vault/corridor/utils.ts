import type {
  GovBody,
  PlayerData,
  ProvenanceLink,
  CorridorEvent,
  OrgAffiliationDetail,
} from "./types";

export type VaultTier = "recorded" | "documented" | "established" | "archival";

export const CORRIDOR = {
  bg: "#0A0908",
  stone: "#1A1208",
  gold: "#B8972A",
  parchment: "#F5F2EC",
  track: "#2A1E10",
  serif: "Georgia, 'Times New Roman', serif",
} as const;

export function vaultTierColors(tier: string) {
  switch (tier as VaultTier) {
    case "archival":
      return { fill: "#D4A92A", border: "#A67B1F", text: "#6B5010" };
    case "established":
      return { fill: "#B0B8C4", border: "#7A8490", text: "#4A5260" };
    case "documented":
      return { fill: "#C8A87A", border: "#9A7A52", text: "#6B5438" };
    default:
      return { fill: "#888780", border: "#5A5A55", text: "#3A3A38" };
  }
}

export function vaultTierLabel(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function capitalize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCorridorDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function achievementTypeLabel(type: string) {
  switch (type.toLowerCase()) {
    case "mvp":
      return "Most Valuable Player";
    case "champion":
      return "Champion";
    case "all_star":
      return "All-Star";
    case "captain":
      return "Captain";
    default:
      return capitalize(type);
  }
}

export function evidenceClassBadge(evidenceClass: string) {
  const c = evidenceClass.toUpperCase();
  if (c === "E1") return "✓ AUTHENTICATED";
  if (c === "E2") return "◐ DOCUMENTED+";
  return null;
}

export function getInitials(player: PlayerData) {
  if (player.first_name && player.last_name) {
    return `${player.first_name[0]}${player.last_name[0]}`.toUpperCase();
  }
  const cleaned = player.display_name.replace(/"/g, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function primaryOrgName(player: PlayerData) {
  const active =
    player.org_affiliations.find((a) => a.status === "active") ??
    player.org_affiliations[0];
  return active?.org.name ?? null;
}

type GovNode = GovBody;

function collectGovNodes(gov: GovNode | null | undefined, verified: boolean) {
  const nodes: { code: string; tier: string; verified: boolean }[] = [];
  let current = gov;
  while (current) {
    nodes.unshift({
      code: current.gov_code,
      tier: current.gov_tier,
      verified: verified && current.is_verified,
    });
    current = current.parent ?? null;
  }
  return nodes;
}

export function buildOrgGovChain(aff: OrgAffiliationDetail) {
  const govAffs = aff.org.gov_affiliations ?? [];
  let best: { code: string; verified: boolean }[] = [];

  for (const oga of govAffs) {
    if (oga.status !== "active") continue;
    const nodes = collectGovNodes(oga.gov, oga.verified);
    const chain = [
      ...nodes.map((n) => ({ code: n.code, verified: n.verified })),
      { code: aff.org.org_code, verified: aff.verified_by_org },
    ];
    if (chain.length > best.length) best = chain;
  }

  if (best.length === 0) {
    best = [{ code: aff.org.org_code, verified: aff.verified_by_org }];
  }

  return best;
}

function addGovToChain(
  gov: GovBody | null | undefined,
  affiliationVerified: boolean,
  seen: Set<string>,
  govN: ProvenanceLink[],
  govR: ProvenanceLink[],
) {
  if (!gov) return;

  const nodes: GovBody[] = [];
  let current: GovBody | null | undefined = gov;
  while (current) {
    nodes.unshift(current);
    current = current.parent ?? null;
  }

  for (const node of nodes) {
    const tier = node.gov_tier;
    if (tier !== "GOV-N" && tier !== "GOV-R") continue;

    const key = `${tier}-${node.gov_code}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const link: ProvenanceLink = {
      name: node.name,
      tag: tier,
      points: tier === "GOV-N" ? "+20" : "+10",
      verified: affiliationVerified && node.is_verified,
    };

    if (tier === "GOV-N") govN.push(link);
    else govR.push(link);
  }
}

export function buildProvenanceChain(player: PlayerData): ProvenanceLink[] {
  const links: ProvenanceLink[] = [];
  const seen = new Set<string>();

  const govN: ProvenanceLink[] = [];
  const govR: ProvenanceLink[] = [];

  for (const ga of player.gov_affiliations ?? []) {
    addGovToChain(ga.gov, ga.verified, seen, govN, govR);
  }

  for (const aff of player.org_affiliations ?? []) {
    for (const oga of aff.org.gov_affiliations ?? []) {
      if (oga.status !== "active") continue;
      addGovToChain(oga.gov, oga.verified, seen, govN, govR);
    }
  }

  links.push(...govN, ...govR);

  for (const aff of player.org_affiliations ?? []) {
    const key = `ORG-${aff.org.org_code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      name: aff.org.name,
      tag: "ORG",
      points: aff.verified_by_org ? "+15" : "+10",
      verified: aff.verified_by_org,
    });
  }

  const events = buildCorridorEvents(player);
  if (events.length === 0) {
    links.push({
      name: "No events on record",
      tag: "EVT",
      points: "",
      verified: false,
      dim: true,
    });
  } else {
    for (const evt of events) {
      links.push({
        name: evt.name,
        tag: "EVT",
        points: evt.verified ? "+10" : "+5",
        verified: evt.verified,
      });
    }
  }

  return links;
}

export function buildCorridorEvents(player: PlayerData): CorridorEvent[] {
  const byKey = new Map<string, CorridorEvent>();

  for (const p of player.event_participation ?? []) {
    if (!p.event) continue;
    const key = p.event.evt_code;
    const existing = byKey.get(key) ?? {
      id: key,
      name: p.event.name,
      season_year: p.event.season_year,
      event_type: inferEventType(p.event.evt_code, p.event.name),
      is_champion: false,
      is_mvp: false,
      is_all_star: false,
      verified: p.verified,
    };
    existing.is_champion ||= p.is_champion;
    existing.is_mvp ||= p.is_mvp;
    existing.is_all_star ||= p.is_all_star;
    existing.verified ||= p.verified;
    byKey.set(key, existing);
  }

  for (const a of player.achievements ?? []) {
    if (!a.event) continue;
    const key = a.event.evt_code;
    const existing = byKey.get(key) ?? {
      id: key,
      name: a.event.name,
      season_year: a.season_year ?? a.event.season_year ?? 0,
      event_type: inferEventType(a.event.evt_code, a.event.name),
      is_champion: false,
      is_mvp: false,
      is_all_star: false,
      verified: true,
    };
    if (a.achievement_type === "champion") existing.is_champion = true;
    if (a.achievement_type === "mvp") existing.is_mvp = true;
    if (a.achievement_type === "all_star") existing.is_all_star = true;
    byKey.set(key, existing);
  }

  return [...byKey.values()].sort((a, b) => b.season_year - a.season_year);
}

function inferEventType(code: string, name: string) {
  const upper = `${code} ${name}`.toUpperCase();
  if (upper.includes("CHAMP")) return "Championship";
  if (upper.includes("TOURN")) return "Tournament";
  if (upper.includes("LEAGUE")) return "League";
  return "Event";
}
