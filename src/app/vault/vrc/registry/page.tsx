import { VrcRegistryFloor } from "@/components/vault/VrcRegistryFloor";
import { getSession } from "@/auth.config";
import type { VrcRegistryEntry } from "@/lib/vrc-registry";
import { prisma } from "@/lib/db";

async function loadVrcRegistryList(): Promise<VrcRegistryEntry[]> {
  const collectors = await prisma.vaultRegistryCollector.findMany({
    orderBy: [{ exhibit_status: "asc" }, { vrc_number: "asc" }],
    select: {
      id: true,
      vrc_number: true,
      display_name: true,
      vault_level: true,
      bust_color: true,
      collector_focus: true,
      exhibit_status: true,
      strength_score: true,
      is_guardian: true,
      created_at: true,
    },
  });

  return collectors.map((collector) => ({
    id: collector.id,
    vrc_number: collector.vrc_number,
    display_name: collector.display_name,
    vault_level: collector.vault_level,
    bust_color: collector.bust_color,
    collector_focus: collector.collector_focus,
    exhibit_status: collector.exhibit_status,
    strength_score: collector.strength_score,
    is_guardian: collector.is_guardian,
    created_at: collector.created_at.toISOString(),
  }));
}

export default async function VrcRegistryPage() {
  const session = await getSession();
  let canRegister = false;

  if (session?.user?.id) {
    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: { is_verified: true },
    });
    canRegister = account?.is_verified ?? false;
  }

  const collectors = await loadVrcRegistryList();

  return <VrcRegistryFloor collectors={collectors} canRegister={canRegister} />;
}
