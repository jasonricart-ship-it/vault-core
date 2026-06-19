export type EvtRegistryGovAffiliation = {
  gov_code: string;
  name: string;
  gov_tier: string;
};

export type EvtRegistryEntry = {
  id: string;
  evt_code: string;
  name: string;
  season_year: number;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  registration_status: string;
  org_id: string;
  org_code: string;
  org_name: string;
  gov_affiliation: EvtRegistryGovAffiliation | null;
  player_participation_count: number;
  achievements_count: number;
};

export type EvtRegistryOrgOption = {
  id: string;
  org_code: string;
  name: string;
};

export type EvtRegistryGovOption = {
  id: string;
  gov_code: string;
  name: string;
  gov_tier: string;
};

export type EvtRegistryOrgGroup = {
  org_id: string;
  org_code: string;
  org_name: string;
  events: EvtRegistryEntry[];
};
