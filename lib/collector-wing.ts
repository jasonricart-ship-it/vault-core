import { authenticationCheckmarkType } from "@/lib/gum-detail";
import { prisma } from "@/lib/db";

export type TransferStatus =
  | "submitted"
  | "under_review"
  | "chain_confirmed"
  | "awaiting_possession"
  | "transfer_complete";

export type AuthenticationMark = "gold" | "silver" | "dim";

export type CollectorWingCollector = {
  vrc_number: string;
  display_name: string;
  vault_level: string;
  bust_color: string;
  collector_focus: string | null;
};

export type CollectorWingTransitItem = {
  gum_code: string;
  item_type: string;
  item_description: string;
  status: string;
  is_authenticated: boolean;
  transfer_status: TransferStatus;
  authentication_mark: AuthenticationMark;
};

export function deriveTransferStatus(item: {
  status: string;
  is_authenticated: boolean;
  admitted_at: Date | null;
}): TransferStatus {
  if (item.status === "pending" || item.status === "rejected") {
    return "submitted";
  }
  if (item.status === "under_review") {
    return "under_review";
  }
  if (item.status === "authenticated") {
    if (item.admitted_at) {
      return "transfer_complete";
    }
    if (item.is_authenticated) {
      return "awaiting_possession";
    }
    return "chain_confirmed";
  }
  return "submitted";
}

export type CollectorWingUserVrc = {
  vrc_number: string;
  display_name: string;
  vault_level: string;
};

export type CollectorWingData = {
  collectors: CollectorWingCollector[];
  transitItems: CollectorWingTransitItem[];
  userVrc: CollectorWingUserVrc | null;
};

export async function fetchCollectorWingData(
  accountId: string | undefined,
): Promise<CollectorWingData> {
  const [collectors, transitItems, userVrcRecord] = await Promise.all([
    prisma.vaultRegistryCollector.findMany({
      where: {
        exhibit_status: "active",
        display_name: { not: "Reserved" },
        visibility: { in: ["public", "member"] },
      },
      orderBy: { created_at: "desc" },
      take: 8,
      select: {
        vrc_number: true,
        display_name: true,
        vault_level: true,
        bust_color: true,
        collector_focus: true,
      },
    }),
    prisma.gumItem.findMany({
      where: {
        status: { in: ["pending", "under_review", "authenticated", "rejected"] },
        is_frozen: false,
      },
      orderBy: { updated_at: "desc" },
      take: 4,
      select: {
        gum_code: true,
        item_type: true,
        item_description: true,
        status: true,
        is_authenticated: true,
        admitted_at: true,
        primary_evidence_class: true,
      },
    }),
    accountId
      ? prisma.account.findUnique({
          where: { id: accountId },
          select: {
            linked_vrc_id: true,
            vault_registry_collector: {
              select: {
                vrc_number: true,
                display_name: true,
                vault_level: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  let userVrc: CollectorWingUserVrc | null =
    userVrcRecord?.vault_registry_collector ?? null;

  if (!userVrc && userVrcRecord?.linked_vrc_id) {
    userVrc = await prisma.vaultRegistryCollector.findUnique({
      where: { id: userVrcRecord.linked_vrc_id },
      select: {
        vrc_number: true,
        display_name: true,
        vault_level: true,
      },
    });
  }

  return {
    collectors,
    transitItems: transitItems.map((item) => ({
      gum_code: item.gum_code,
      item_type: item.item_type,
      item_description: item.item_description,
      status: item.status,
      is_authenticated: item.is_authenticated,
      transfer_status: deriveTransferStatus(item),
      authentication_mark: authenticationCheckmarkType(item.primary_evidence_class),
    })),
    userVrc,
  };
}
