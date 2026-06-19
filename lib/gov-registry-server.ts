import { prisma } from "@/lib/db";
import { sportCodeFor } from "@/lib/org-registry-server";
import { GOV_TIERS, type GovTier } from "@/lib/gov-registry";

function tierLetterFor(govTier: string): string {
  const normalized = govTier.trim().toUpperCase();
  if (normalized.startsWith("GOV-")) {
    return normalized.slice(4);
  }
  return normalized.slice(0, 1);
}

export function isValidGovTier(value: string): value is GovTier {
  return (GOV_TIERS as readonly string[]).includes(value);
}

export async function generateNextGovCode(sport: string, govTier: string): Promise<string> {
  const sportCode = sportCodeFor(sport);
  const tierLetter = tierLetterFor(govTier);
  const prefix = `GOV-${sportCode}-${tierLetter}-`;

  const existing = await prisma.governingBody.findMany({
    where: { gov_code: { startsWith: prefix } },
    select: { gov_code: true },
  });

  let highest = 0;
  for (const gov of existing) {
    const seqRaw = gov.gov_code.slice(prefix.length);
    const seq = parseInt(seqRaw, 10);
    if (Number.isFinite(seq)) {
      highest = Math.max(highest, seq);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
