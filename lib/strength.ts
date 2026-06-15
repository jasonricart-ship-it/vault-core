import type { BustColor, VaultLevel } from "./types";

export type StrengthResult = {
  score: number;
  vault_level: VaultLevel;
  bust_color: BustColor;
};

export function calculateStrength(player: any): StrengthResult {
  let score = 0;

  const orgAffiliations = player?.org_affiliations ?? [];
  const govAffiliations = player?.gov_affiliations ?? [];

  // Org affiliations
  if (orgAffiliations.length > 0) score += 20;
  if (orgAffiliations.some((a: any) => a.org?.registration_status === "active")) {
    score += 10;
  }

  // Gov affiliations
  const hasGovR = govAffiliations.some((a: any) => a.gov?.gov_tier === "GOV-R");
  const hasGovN = govAffiliations.some((a: any) => a.gov?.gov_tier === "GOV-N");
  if (hasGovR) score += 15;
  if (hasGovN) score += 20;

  // Evidence (placeholder — will connect to real evidence table in Phase 3)
  const evidencePhotos = player?.evidence_photos ?? 0;
  const evidenceDocs = player?.evidence_docs ?? 0;
  if (evidencePhotos > 0) score += 10;
  if (evidenceDocs > 0) score += 10;

  // GUM items
  const gumCount = player?.gum_items_count ?? 0;
  if (gumCount > 0) score += 15;

  // Cap at 100
  score = Math.min(score, 100);

  // Derive level
  let vault_level: VaultLevel = "recorded";
  if (score >= 75) vault_level = "archival";
  else if (score >= 50) vault_level = "established";
  else if (score >= 25) vault_level = "documented";

  // Derive bust color
  const bust_color: BustColor =
    vault_level === "archival"
      ? "gold"
      : vault_level === "established"
        ? "silver"
        : vault_level === "documented"
          ? "bronze"
          : "grayscale";

  return { score, vault_level, bust_color };
}
