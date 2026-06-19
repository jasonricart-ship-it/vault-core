export const GOV_TIERS = ["GOV-N", "GOV-R", "GOV-L"] as const;

export type GovTier = (typeof GOV_TIERS)[number];

export const GOV_TIER_LABELS: Record<GovTier, string> = {
  "GOV-N": "National",
  "GOV-R": "Regional",
  "GOV-L": "Local",
};

export type GovRegistryParent = {
  id: string;
  gov_code: string;
  name: string;
  gov_tier: string;
};

export type GovRegistryChild = {
  id: string;
  gov_code: string;
  name: string;
  gov_tier: string;
};

export type GovRegistryOrgAffiliation = {
  org_code: string;
  name: string;
  org_type: string;
  sport: string | null;
  affiliation_type: string;
  verified: boolean;
};

export type GovRegistryEntry = {
  id: string;
  gov_code: string;
  name: string;
  short_name: string | null;
  sport: string | null;
  gov_tier: string;
  jurisdiction: string | null;
  registration_status: string;
  is_verified: boolean;
  vault_level: string;
  strength_score: number;
  child_org_count: number;
  parent: GovRegistryParent | null;
  children: GovRegistryChild[];
  org_affiliations: GovRegistryOrgAffiliation[];
};

export type GovRegistryOption = {
  id: string;
  gov_code: string;
  name: string;
  gov_tier: string;
};
