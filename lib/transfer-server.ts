import { prisma } from "@/lib/db";
import type { TransferAuthorityItem, TransferCurrentUser, TransferRecipient } from "@/lib/transfer";

function normalizeRegistryNumber(raw: string) {
  const trimmed = raw.trim().toUpperCase();
  if (/^(PPC|VRC)-\d+$/.test(trimmed)) {
    const [prefix, digits] = trimmed.split("-");
    return `${prefix}-${digits.padStart(5, "0")}`;
  }
  return trimmed;
}

async function resolvePlayerAccount(
  playerId: string,
  guardianAccountId: string | null,
): Promise<string | null> {
  const linkedAccount = await prisma.account.findFirst({
    where: { linked_player_id: playerId },
    select: { id: true },
  });
  if (linkedAccount) return linkedAccount.id;

  if (guardianAccountId) return guardianAccountId;

  const primaryGuardian = await prisma.playerGuardian.findFirst({
    where: { player_id: playerId, guardian_role: "primary" },
    select: { account_id: true },
  });

  return primaryGuardian?.account_id ?? null;
}

export async function resolveRegistryRecipient(
  raw: string,
): Promise<TransferRecipient | null> {
  const normalized = normalizeRegistryNumber(raw);

  if (normalized.startsWith("PPC-")) {
    const player = await prisma.player.findUnique({
      where: { ppc_number: normalized },
      select: {
        id: true,
        display_name: true,
        ppc_number: true,
        guardian_account_id: true,
      },
    });

    if (!player || player.display_name === "Reserved") return null;

    const accountId = await resolvePlayerAccount(player.id, player.guardian_account_id);
    if (!accountId) return null;

    return {
      account_id: accountId,
      display_name: player.display_name,
      registry_type: "ppc",
      registry_number: player.ppc_number,
    };
  }

  if (normalized.startsWith("VRC-")) {
    const collector = await prisma.vaultRegistryCollector.findUnique({
      where: { vrc_number: normalized },
      select: {
        account_id: true,
        display_name: true,
        vrc_number: true,
      },
    });

    if (!collector?.account_id || collector.display_name === "Reserved") return null;

    return {
      account_id: collector.account_id,
      display_name: collector.display_name,
      registry_type: "vrc",
      registry_number: collector.vrc_number,
    };
  }

  return null;
}

export async function loadTransferAuthorityItems(
  accountId: string,
): Promise<TransferAuthorityItem[]> {
  const items = await prisma.gumItem.findMany({
    where: {
      authority_account_id: accountId,
      is_frozen: false,
    },
    orderBy: [{ updated_at: "desc" }, { gum_code: "asc" }],
    select: {
      id: true,
      gum_code: true,
      item_type: true,
      item_description: true,
      status: true,
      authority_type: true,
      vault_level: true,
      is_authenticated: true,
      player: {
        select: {
          display_name: true,
          ppc_number: true,
        },
      },
    },
  });

  const itemIds = items.map((item) => item.id);
  const openTransfers =
    itemIds.length === 0
      ? []
      : await prisma.itemAuthorityLog.findMany({
          where: {
            item_id: { in: itemIds },
            confirmed_by_to: false,
          },
          select: { item_id: true },
        });

  const blockedIds = new Set(openTransfers.map((entry) => entry.item_id));

  return items
    .filter((item) => !blockedIds.has(item.id))
    .map((item) => ({
      id: item.id,
      gum_code: item.gum_code,
      item_type: item.item_type,
      item_description: item.item_description,
      status: item.status,
      authority_type: item.authority_type,
      vault_level: item.vault_level,
      is_authenticated: item.is_authenticated,
      player_display_name: item.player?.display_name ?? null,
      player_ppc: item.player?.ppc_number ?? null,
    }));
}

export async function loadTransferCurrentUser(
  accountId: string,
): Promise<TransferCurrentUser | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      display_name: true,
      email: true,
    },
  });

  if (!account) return null;

  return {
    account_id: account.id,
    display_name: account.display_name?.trim() || account.email,
  };
}
