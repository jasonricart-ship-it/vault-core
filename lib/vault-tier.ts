import type { BustColor, VaultLevel } from "./types";

export function vaultLevelFromScore(score: number): VaultLevel {
  if (score >= 75) return "archival";
  if (score >= 50) return "established";
  if (score >= 25) return "documented";
  return "recorded";
}

export function bustColorFromVaultLevel(vaultLevel: VaultLevel): BustColor {
  if (vaultLevel === "archival") return "gold";
  if (vaultLevel === "established") return "silver";
  if (vaultLevel === "documented") return "bronze";
  return "grayscale";
}
