export type GumAccessTier = "public" | "member" | "authority";

const AUTHORITY_ROLES = new Set(["authority", "super_admin", "evaluator"]);

const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["under_review"],
  under_review: ["authenticated", "rejected"],
};

const EVALUATOR_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["under_review", "authenticated", "rejected", "pending"],
  under_review: ["authenticated", "rejected", "pending"],
};

export function resolveGumAccessTier(
  role: string | undefined,
  isAuthenticated: boolean,
): GumAccessTier {
  if (role && AUTHORITY_ROLES.has(role)) return "authority";
  if (isAuthenticated) return "member";
  return "public";
}

export function isAllowedStatusTransition(
  currentStatus: string,
  nextStatus: string,
  evaluator = false,
): boolean {
  const allowed = evaluator
    ? EVALUATOR_STATUS_TRANSITIONS[currentStatus]
    : STATUS_TRANSITIONS[currentStatus];
  return allowed?.includes(nextStatus) ?? false;
}

export function evidenceVisibilityForTier(tier: GumAccessTier): string[] | null {
  if (tier === "authority") return null;
  if (tier === "member") return ["public", "member"];
  return ["public"];
}

export function canViewGumItemVisibility(
  itemVisibility: string,
  isAuthenticated: boolean,
  role?: string,
): boolean {
  if (itemVisibility === "public") return true;
  if (itemVisibility === "member") return isAuthenticated;
  if (itemVisibility === "authority") {
    return role === "authority" || role === "super_admin";
  }
  return false;
}

export function authenticationCheckmarkType(
  primaryEvidenceClass: string | null | undefined,
): "gold" | "silver" | "dim" {
  if (!primaryEvidenceClass) return "dim";
  const value = primaryEvidenceClass.toUpperCase();
  if (value.startsWith("E1")) return "gold";
  if (value.startsWith("E2")) return "silver";
  return "dim";
}

type GumRecord = Record<string, unknown>;
type EvidenceRecord = Record<string, unknown>;
type AuthorityLogRecord = Record<string, unknown>;

const PUBLIC_GUM_FIELDS = new Set([
  "id",
  "gum_code",
  "item_type",
  "item_description",
  "gum_classification",
  "is_authenticated",
  "vault_level",
  "status",
  "sport",
  "season_year",
  "primary_evidence_class",
  "display_position",
  "corridor_segment",
  "has_swatch",
  "plate_tier",
  "visibility",
  "revealed_by_owner",
  "created_at",
]);

const AUTHORITY_ONLY_GUM_FIELDS = new Set([
  "submitted_by",
  "authority_account_id",
  "authority_type",
  "authority_since",
  "authority_notes",
  "evaluator_notes",
  "is_frozen",
  "frozen_reason",
  "frozen_at",
  "frozen_by",
  "authenticated_at",
  "player_id",
  "org_id",
  "event_id",
]);

const PUBLIC_EVIDENCE_FIELDS = new Set([
  "id",
  "evidence_class",
  "file_type",
  "admitted_at",
  "metadata_verified",
]);

const MEMBER_EVIDENCE_FIELDS = new Set([
  "entity_type",
  "entity_id",
  "file_key",
  "original_filename",
  "file_size_bytes",
  "is_native_capture",
  "capture_timestamp",
  "visibility",
  "notes",
]);

function pickFields<T extends Record<string, unknown>>(
  record: T,
  allowed: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in record) result[key] = record[key];
  }
  return result;
}

function omitFields<T extends Record<string, unknown>>(
  record: T,
  omitted: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...record };
  for (const key of omitted) {
    delete result[key];
  }
  return result;
}

export function shapePlayer(
  player: {
    display_name: string;
    ppc_number: string;
    vault_level: string;
  } | null,
) {
  if (!player) return null;
  return {
    display_name: player.display_name,
    ppc_number: player.ppc_number,
    vault_level: player.vault_level,
  };
}

export function shapeOrg(
  org: {
    id: string;
    name: string;
    short_name: string | null;
    org_code: string;
    sport: string | null;
    vault_level: string;
    city: string | null;
    state: string | null;
  } | null,
  tier: GumAccessTier,
) {
  if (!org) return null;
  if (tier === "public") {
    return {
      id: org.id,
      name: org.name,
      short_name: org.short_name,
    };
  }
  return {
    id: org.id,
    name: org.name,
    short_name: org.short_name,
    org_code: org.org_code,
    sport: org.sport,
    vault_level: org.vault_level,
    city: org.city,
    state: org.state,
  };
}

export function shapeEvent(
  event: {
    id: string;
    name: string;
    evt_code: string;
    season_year: number;
    event_date: Date | null;
    location: string | null;
    city: string | null;
    state: string | null;
  } | null,
  tier: GumAccessTier,
) {
  if (!event) return null;
  if (tier === "public") {
    return {
      id: event.id,
      name: event.name,
      season_year: event.season_year,
    };
  }
  return {
    id: event.id,
    name: event.name,
    evt_code: event.evt_code,
    season_year: event.season_year,
    event_date: event.event_date,
    location: event.location,
    city: event.city,
    state: event.state,
  };
}

export function shapeEvidenceFiles(
  files: EvidenceRecord[],
  tier: GumAccessTier,
): EvidenceRecord[] {
  const visibilities = evidenceVisibilityForTier(tier);
  const filtered =
    visibilities == null
      ? files
      : files.filter((file) => visibilities.includes(String(file.visibility)));

  if (tier === "authority") return filtered;

  if (tier === "member") {
    const allowed = new Set([...PUBLIC_EVIDENCE_FIELDS, ...MEMBER_EVIDENCE_FIELDS]);
    return filtered.map((file) => pickFields(file, allowed));
  }

  return filtered.map((file) => pickFields(file, PUBLIC_EVIDENCE_FIELDS));
}

export function shapeAuthorityLog(
  logs: AuthorityLogRecord[],
  tier: GumAccessTier,
): AuthorityLogRecord[] {
  if (tier === "public") return [];
  return logs;
}

export function shapeGumItem(
  gumItem: GumRecord,
  tier: GumAccessTier,
): GumRecord {
  const isAuthenticated =
    gumItem.status === "authenticated" || gumItem.is_authenticated === true;

  if (tier === "authority") return gumItem;

  if (tier === "member") {
    return omitFields(gumItem, AUTHORITY_ONLY_GUM_FIELDS);
  }

  const shaped = pickFields(gumItem, PUBLIC_GUM_FIELDS);

  if (isAuthenticated) {
    if (gumItem.owner_statement != null) {
      shaped.owner_statement = gumItem.owner_statement;
    }
    if (gumItem.capturer_credit != null) {
      shaped.capturer_credit = gumItem.capturer_credit;
    }
  }

  return shaped;
}

export function buildGumDetailResponse(
  gumItem: GumRecord & {
    player: Parameters<typeof shapePlayer>[0];
    org: Parameters<typeof shapeOrg>[0];
    event: Parameters<typeof shapeEvent>[0];
  },
  evidenceFiles: EvidenceRecord[],
  authorityLog: AuthorityLogRecord[],
  tier: GumAccessTier,
) {
  const { player, org, event, ...gumFields } = gumItem;

  return {
    gum_item: {
      ...shapeGumItem(gumFields, tier),
      player: shapePlayer(player),
      org: shapeOrg(org, tier),
      event: shapeEvent(event, tier),
      evidence_files: shapeEvidenceFiles(evidenceFiles, tier),
      item_authority_log: shapeAuthorityLog(authorityLog, tier),
    },
  };
}
