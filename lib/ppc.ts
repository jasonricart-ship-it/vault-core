import { prisma } from "@/lib/db";

const PPC_PATTERN = /^PPC-(\d+)$/;

export async function generateNextPpcNumber(minNumber = 1): Promise<string> {
  const players = await prisma.player.findMany({
    where: { ppc_number: { startsWith: "PPC-" } },
    select: { ppc_number: true },
  });

  let highest = 0;
  for (const player of players) {
    const match = player.ppc_number.match(PPC_PATTERN);
    if (match) {
      highest = Math.max(highest, parseInt(match[1], 10));
    }
  }

  const next = Math.max(highest + 1, minNumber);
  return `PPC-${String(next).padStart(5, "0")}`;
}

export function buildDisplayName(
  firstName: string,
  lastName: string,
  preferredName?: string | null,
): string {
  if (preferredName?.trim()) {
    return `${firstName.trim()} "${preferredName.trim()}" ${lastName.trim()}`;
  }
  return `${firstName.trim()} ${lastName.trim()}`;
}
