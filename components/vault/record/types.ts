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

export type PlayerProfile = {
  ppc_number: string;
  display_name: string;
  preferred_name: string | null;
  primary_sport: string | null;
  jersey_number: string | null;
  vault_level: string;
  bust_color: string;
  exhibit_status: string;
  org_affiliations: OrgAffiliation[];
  gov_affiliations: GovAffiliation[];
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
