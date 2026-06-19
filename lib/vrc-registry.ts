export type VrcRegistryEntry = {
  id: string;
  vrc_number: string;
  display_name: string;
  vault_level: string;
  bust_color: string;
  collector_focus: string | null;
  exhibit_status: string;
  strength_score: number;
  is_guardian: boolean;
  created_at: string;
};
