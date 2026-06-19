import { prisma } from "@/lib/db";

const SPORT_CODE_MAP: Record<string, string> = {
  Volleyball: "VB",
  "Ice Hockey": "HK",
  Basketball: "BK",
  Soccer: "SC",
  Baseball: "BB",
  Lacrosse: "LX",
  Football: "FB",
  Wrestling: "WR",
  Tennis: "TN",
  Swimming: "SW",
  Other: "OT",
};

const STATE_CODE_MAP: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

function sportCodeFor(sport: string): string {
  const trimmed = sport.trim();
  if (SPORT_CODE_MAP[trimmed]) return SPORT_CODE_MAP[trimmed];
  const letters = trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 2) || "OT";
}

export function normalizeStateCode(state: string): string {
  const trimmed = state.trim();
  if (!trimmed) return "XX";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_CODE_MAP[trimmed] ?? trimmed.slice(0, 2).toUpperCase();
}

export async function generateNextOrgCode(sport: string, state: string): Promise<string> {
  const sportCode = sportCodeFor(sport);
  const stateCode = normalizeStateCode(state);
  const prefix = `ORG-${sportCode}-${stateCode}-`;

  const existing = await prisma.organization.findMany({
    where: { org_code: { startsWith: prefix } },
    select: { org_code: true },
  });

  let highest = 0;
  for (const org of existing) {
    const seqRaw = org.org_code.slice(prefix.length);
    const seq = parseInt(seqRaw, 10);
    if (Number.isFinite(seq)) {
      highest = Math.max(highest, seq);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
