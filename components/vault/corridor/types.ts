export type GovBody = {
  gov_code: string;
  name: string;
  gov_tier: string;
  is_verified: boolean;
  parent?: GovBody | null;
};

export type OrgGovAffiliation = {
  status: string;
  verified: boolean;
  gov: GovBody;
};

export type OrgAffiliationDetail = {
  season_year: number;
  jersey_number: string | null;
  status: string;
  verified_by_org: boolean;
  is_captain?: boolean;
  org: {
    name: string;
    org_code: string;
    gov_affiliations?: OrgGovAffiliation[];
  };
};

export type GovAffiliationDetail = {
  verified: boolean;
  gov: GovBody;
};

export type GumItemRecord = {
  gum_code: string;
  item_description: string;
  gum_classification: string;
  vault_level: string;
  revealed_by_owner: boolean;
};

export type AchievementRecord = {
  achievement_type: string;
  achievement_scope: string;
  medal_tier: string | null;
  season_year: number | null;
  notes: string | null;
  event: {
    name: string;
    evt_code: string;
    season_year?: number;
  } | null;
  org: {
    name: string;
    org_code: string;
  } | null;
};

export type HallOfFameNominationRecord = {
  id: string;
  nomination_notes: string | null;
  career_highlights: string | null;
  status: string;
};

export type EventParticipationRecord = {
  verified: boolean;
  is_champion: boolean;
  is_mvp: boolean;
  is_all_star: boolean;
  outcome?: string | null;
  event: {
    name: string;
    evt_code: string;
    season_year: number;
  };
  org_name?: string | null;
};

export type LatestEvidenceRecord = {
  evidence_class: string;
  admitted_at: string;
  file_type: string;
  evt_name: string | null;
  shared_capture: {
    capture_credit: string | null;
    admitted: boolean;
  } | null;
};

export type LatestAchievementRecord = {
  achievement_type: string;
  event_name: string | null;
  season_year: number | null;
  org_name: string | null;
  verified: boolean;
  awarded_at: string | null;
};

export type LatestSeasonRecord = {
  org_name: string | null;
  season_year: number;
  event_name: string;
  outcome: string | null;
  status: "IN PROGRESS" | "SEASON COMPLETE";
};

export type PlayerData = {
  ppc_number: string;
  display_name: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  primary_sport: string | null;
  jersey_number: string | null;
  strength_score: number;
  vault_level: string;
  bust_color: string;
  exhibit_status: string;
  org_affiliations: OrgAffiliationDetail[];
  gov_affiliations: GovAffiliationDetail[];
  gum_items: GumItemRecord[];
  achievements: AchievementRecord[];
  event_participation?: EventParticipationRecord[];
  hall_of_fame_nominations?: HallOfFameNominationRecord[];
  latest_evidence?: LatestEvidenceRecord | null;
  latest_achievement?: LatestAchievementRecord | null;
  latest_season?: LatestSeasonRecord | null;
};

export type ProvenanceLink = {
  name: string;
  tag: string;
  points: string;
  verified: boolean;
  dim?: boolean;
};

export type CorridorEvent = {
  id: string;
  name: string;
  season_year: number;
  event_type: string;
  is_champion: boolean;
  is_mvp: boolean;
  is_all_star: boolean;
  verified: boolean;
};

export type CorridorPlayerSummary = {
  ppc_number: string;
  display_name: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  primary_sport: string | null;
  vault_level: string;
};
