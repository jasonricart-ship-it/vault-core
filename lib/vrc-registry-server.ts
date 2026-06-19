import { prisma } from "@/lib/db";

const VRC_PATTERN = /^VRC-(\d+)$/;

export function buildCollectorDisplayName(
  firstName: string,
  lastName: string,
  middleName?: string | null,
): string {
  const first = firstName.trim();
  const last = lastName.trim();
  const middle = middleName?.trim();
  if (middle) return `${first} ${middle} ${last}`;
  return `${first} ${last}`;
}

export async function generateNextVrcNumber(minNumber = 101): Promise<string> {
  const collectors = await prisma.vaultRegistryCollector.findMany({
    where: { vrc_number: { startsWith: "VRC-" } },
    select: { vrc_number: true },
  });

  let highest = 0;
  for (const collector of collectors) {
    const match = collector.vrc_number.match(VRC_PATTERN);
    if (match) {
      highest = Math.max(highest, parseInt(match[1], 10));
    }
  }

  const next = Math.max(highest + 1, minNumber);
  return `VRC-${String(next).padStart(5, "0")}`;
}
