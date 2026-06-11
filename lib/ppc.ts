import { prisma } from "@/lib/db";

const PPC_PATTERN = /^PPC-(\d+)$/;

export async function generateNextPpcNumber(): Promise<string> {
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

  return `PPC-${String(highest + 1).padStart(4, "0")}`;
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
