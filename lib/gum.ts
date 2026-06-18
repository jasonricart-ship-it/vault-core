import { prisma } from "@/lib/db";

function gumPpcSegment(ppcNumber: string): string {
  return ppcNumber.startsWith("PPC-") ? ppcNumber.slice(4) : ppcNumber;
}

export async function generateNextGumCode(
  playerId: string,
  ppcNumber: string,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const ppcSegment = gumPpcSegment(ppcNumber);
  const prefix = `GUM-${ppcSegment}-${year}-`;

  const items = await prisma.gumItem.findMany({
    where: {
      player_id: playerId,
      gum_code: { startsWith: prefix },
    },
    select: { gum_code: true },
  });

  let highest = 0;
  for (const item of items) {
    const seq = parseInt(item.gum_code.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) {
      highest = Math.max(highest, seq);
    }
  }

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}
