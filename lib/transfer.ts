export const TRANSFER_TYPES = ["sale", "gift", "consignment", "estate"] as const;

export type TransferType = (typeof TRANSFER_TYPES)[number];

export type TransferAuthorityItem = {
  id: string;
  gum_code: string;
  item_type: string;
  item_description: string;
  status: string;
  authority_type: string;
  vault_level: string;
  is_authenticated: boolean;
  player_display_name: string | null;
  player_ppc: string | null;
};

export type TransferCurrentUser = {
  account_id: string;
  display_name: string;
};

export type TransferRecipient = {
  account_id: string;
  display_name: string;
  registry_type: "ppc" | "vrc";
  registry_number: string;
};
