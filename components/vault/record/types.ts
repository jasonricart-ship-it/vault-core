export type OrgAffiliation = {
  season_year: number;
  verified_by_org: boolean;
  org: {
    name: string;
    org_code: string;
  };
};

export type GovAffiliation = {
  verified: boolean;
  gov: {
    name: string;
    gov_code: string;
    gov_tier: string;
  };
};

export type Achievement = {
  achievement_type: string;
  achievement_scope: string;
  medal_tier: string | null;
  season_year: number | null;
  notes: string | null;
  event: {
    name: string;
    evt_code: string;
  } | null;
  org: {
    name: string;
    org_code: string;
  } | null;
};

export type PlayerProfile = {
  ppc_number: string;
  display_name: string;
  preferred_name: string | null;
  primary_sport: string | null;
  jersey_number: string | null;
  strength_score: number;
  vault_level: string;
  bust_color: string;
  exhibit_status: string;
  org_affiliations: OrgAffiliation[];
  gov_affiliations: GovAffiliation[];
  achievements: Achievement[];
};

export type ProvenanceRow = {
  key: string;
  type: string;
  name: string;
  code: string;
  tier?: string;
  detail?: string;
  verified: boolean;
};
