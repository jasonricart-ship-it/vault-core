import type { BustColor } from "@/lib/types";

export function getBustFilter(bustColor: string): string | undefined {
  switch (bustColor as BustColor) {
    case "grayscale":
      return "grayscale(100%)";
    case "bronze":
      return "sepia(60%) saturate(150%) hue-rotate(5deg)";
    case "silver":
      return "grayscale(30%) brightness(110%)";
    case "gold":
      return undefined;
    default:
      return "grayscale(100%)";
  }
}

export function formatVaultLevel(level: string) {
  return level.replace(/_/g, " ");
}

export function vaultLevelRank(level: string) {
  switch (level) {
    case "archival":
      return 0;
    case "established":
      return 1;
    case "documented":
      return 2;
    default:
      return 3;
  }
}
