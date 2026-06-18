import { prisma } from "@/lib/db";

export async function generateNextEvtCode(
  orgId: string,
  orgCode: string,
  seasonYear: number,
): Promise<string> {
  const prefix = `EVT-${orgCode}-${seasonYear}-`;

  const events = await prisma.event.findMany({
    where: {
      org_id: orgId,
      season_year: seasonYear,
      evt_code: { startsWith: prefix },
    },
    select: { evt_code: true },
  });

  let highest = 0;
  for (const event of events) {
    const seq = parseInt(event.evt_code.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) {
      highest = Math.max(highest, seq);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
