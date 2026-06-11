import type { PlayerProfile, ProvenanceRow } from "./types";

export function formatLevel(value: string) {
  return value.replace(/_/g, " ");
}

export function recordedGlowOpacity(vaultLevel: string) {
  if (vaultLevel === "recorded") return 0.08;
  if (vaultLevel === "documented") return 0.28;
  if (vaultLevel === "established") return 0.55;
  return 0.08;
}

export function buildProvenanceRows(player: PlayerProfile): ProvenanceRow[] {
  const orgRows: ProvenanceRow[] = player.org_affiliations.map((affiliation) => ({
    key: `org-${affiliation.org.org_code}-${affiliation.season_year}`,
    type: "ORG",
    name: affiliation.org.name,
    code: affiliation.org.org_code,
    detail: `Season ${affiliation.season_year}`,
    verified: affiliation.verified_by_org,
  }));

  const govRows: ProvenanceRow[] = player.gov_affiliations.map((affiliation) => ({
    key: `gov-${affiliation.gov.gov_code}`,
    type: affiliation.gov.gov_tier,
    name: affiliation.gov.name,
    code: affiliation.gov.gov_code,
    tier: affiliation.gov.gov_tier,
    verified: affiliation.verified,
  }));

  return [...orgRows, ...govRows];
}
