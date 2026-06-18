import type { BustColor, VaultLevel } from "./types";

export type StrengthResult = {
  score: number;
  vault_level: VaultLevel;
  bust_color: BustColor;
  breakdown: Record<string, number>;
};

function countQualifyingGovNChains(orgAffiliations: any[]): string[] {
  console.log(
    "countQualifyingGovNChains orgAffiliations:",
    JSON.stringify(orgAffiliations, null, 2),
  );

  const qualifyingChains: string[] = [];

  for (const orgAff of orgAffiliations) {
    const org = orgAff.org ?? orgAff.organization;
    if (!org) continue;

    const orgCode = org.org_code ?? org.name ?? "unknown-org";
    const orgGovAffs =
      org.org_gov_affiliations ?? org.gov_affiliations ?? org.govAffiliations ?? [];

    for (const govAff of orgGovAffs) {
      if (govAff.status !== "active") continue;

      let gov = govAff.gov ?? govAff.governing_body ?? govAff.governingBody;
      if (!gov) continue;

      const chainParts = [orgCode];

      while (gov) {
        chainParts.push(gov.gov_code ?? gov.name);
        if (gov.gov_tier === "GOV-N" && gov.is_verified) {
          qualifyingChains.push(chainParts.join(" → "));
          break;
        }
        gov = gov.parent_gov ?? gov.parentGov ?? gov.parent;
      }
    }
  }

  console.log("countQualifyingGovNChains qualifyingChains:", qualifyingChains);
  return qualifyingChains;
}

export function calculateStrength(player: any): StrengthResult {
  let score = 0;
  const breakdown: Record<string, number> = {};

  const add = (key: string, points: number) => {
    if (points === 0) return;
    breakdown[key] = points;
    score += points;
  };

  // ── Base registration ──────────────────────────────────────────────────
  add("player_registered", 10);

  // ── Org affiliations ───────────────────────────────────────────────────
  const orgAffiliations = player?.org_affiliations ?? [];

  countQualifyingGovNChains(orgAffiliations);

  const hasActiveOrg = orgAffiliations.some(
    (a: any) => a.status === "active",
  );
  const hasVerifiedOrg = orgAffiliations.some(
    (a: any) => a.verified_by_org === true,
  );

  if (hasActiveOrg) add("org_active_registered", 10);
  if (hasVerifiedOrg) add("org_active_verified", 15);

  // ── GOV chain — walk up through org affiliations ───────────────────────
  // Each org can have org_gov_affiliations which link to a GoverningBody
  // That GoverningBody may have a parent_gov (GOV-R → GOV-N)
  // We collect all unique GOV tiers reachable through the player's orgs

  let hasGovL = false;
  let hasGovR = false;
  let hasGovN = false;

  for (const orgAff of orgAffiliations) {
    const org = orgAff.org ?? orgAff.organization;
    if (!org) continue;

    const orgGovAffs =
      org.org_gov_affiliations ?? org.gov_affiliations ?? org.govAffiliations ?? [];

    for (const govAff of orgGovAffs) {
      if (govAff.status !== "active") continue;

      const gov = govAff.gov ?? govAff.governing_body ?? govAff.governingBody;
      if (!gov) continue;

      // Check this gov's tier
      if (gov.gov_tier === "GOV-L" && gov.is_verified) hasGovL = true;
      if (gov.gov_tier === "GOV-R" && gov.is_verified) hasGovR = true;
      if (gov.gov_tier === "GOV-N" && gov.is_verified) hasGovN = true;

      // Walk up to parent — GOV-R's parent is GOV-N
      const parent = gov.parent_gov ?? gov.parentGov ?? gov.parent;
      if (parent && parent.is_verified) {
        if (parent.gov_tier === "GOV-R") hasGovR = true;
        if (parent.gov_tier === "GOV-N") hasGovN = true;

        const grandparent = parent.parent_gov ?? parent.parentGov ?? parent.parent;
        if (grandparent && grandparent.is_verified) {
          if (grandparent.gov_tier === "GOV-N") hasGovN = true;
        }
      }
    }
  }

  if (hasGovL) add("gov_l_active", 5);
  if (hasGovR) add("gov_r_active", 10);
  if (hasGovN) add("gov_n_active", 20);

  // ── Annual renewal ─────────────────────────────────────────────────────
  if (player?.annual_renewal_current === true) {
    add("annual_renewal_current", 5);
  }

  // ── Evidence ───────────────────────────────────────────────────────────
  const evidencePhotos = player?.evidence_photos ?? 0;
  const nativeCapture = player?.native_capture ?? false;

  if (evidencePhotos > 0) add("evidence_photo", 10);
  if (nativeCapture) add("native_capture", 20);

  // ── GUM items ──────────────────────────────────────────────────────────
  const gumCount = player?.gum_items_count ?? 0;
  if (gumCount > 0) add("gum_item_present", 10);

  // ── Event participation ────────────────────────────────────────────────
  const events = player?.event_participation ?? [];
  const hasEvent = events.length > 0;
  const hasVerifiedEvent = events.some((e: any) => e.verified === true);
  const hasGovNEvent = events.some(
    (e: any) => e.event?.authority_level === "GOV-N",
  );

  if (hasEvent) add("evt_documented", 5);
  if (hasVerifiedEvent) add("evt_verified", 10);
  if (hasGovNEvent) add("evt_gov_n_bonus", 5);

  // ── Cap ────────────────────────────────────────────────────────────────
  score = Math.min(score, 100);

  // ── Vault level ────────────────────────────────────────────────────────
  let vault_level: VaultLevel = "recorded";
  if (score >= 75) vault_level = "archival";
  else if (score >= 50) vault_level = "established";
  else if (score >= 25) vault_level = "documented";

  // ── Bust color ─────────────────────────────────────────────────────────
  const bust_color: BustColor =
    vault_level === "archival"
      ? "gold"
      : vault_level === "established"
        ? "silver"
        : vault_level === "documented"
          ? "bronze"
          : "grayscale";

  return { score, vault_level, bust_color, breakdown };
}
