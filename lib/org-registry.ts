export const ORG_TYPES = [
  "team",
  "club",
  "school",
  "academy",
  "tournament",
  "association",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export type OrgRegistryGovAffiliation = {
  gov_code: string;
  name: string;
  gov_tier: string;
  affiliation_type: string;
  verified: boolean;
};

export type OrgRegistryEntry = {
  id: string;
  org_code: string;
  name: string;
  short_name: string | null;
  sport: string | null;
  org_type: string;
  state: string | null;
  city: string | null;
  registration_status: string;
  is_verified: boolean;
  vault_level: string;
  strength_score: number;
  player_count: number;
  gov_affiliations: OrgRegistryGovAffiliation[];
};
