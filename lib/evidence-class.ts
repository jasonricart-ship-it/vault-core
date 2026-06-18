export function assignEvidenceClass(
  isNativeCapture: boolean,
  metadataVerified: boolean,
): string {
  if (isNativeCapture && metadataVerified) return "E1-Photo";
  if (!isNativeCapture && metadataVerified) return "E2";
  return "E3";
}

export function evidenceClassRank(evidenceClass: string): number {
  const value = evidenceClass.toUpperCase();
  if (value.startsWith("E1")) return 3;
  if (value.startsWith("E2")) return 2;
  return 1;
}
