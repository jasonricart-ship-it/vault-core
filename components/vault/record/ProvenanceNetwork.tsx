import { AffiliationLightBar } from "./AffiliationLightBar";
import { VaultGlassCard } from "./VaultGlassCard";
import type { ProvenanceRow } from "./types";
import { formatLevel } from "./utils";

export function ProvenanceNetwork({
  rows,
  glowOpacity,
  vaultLevel,
}: {
  rows: ProvenanceRow[];
  glowOpacity: number;
  vaultLevel: string;
}) {
  return (
    <VaultGlassCard kicker="Provenance Network" title="Institutional Connections">
      {rows.length === 0 ? (
        <p className="text-sm text-white/45">
          No institutional connections are currently displayed.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <AffiliationLightBar
              key={row.key}
              row={row}
              glowOpacity={glowOpacity}
            />
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs leading-6 text-white/40">
        Connections exist at {formatLevel(vaultLevel)} level — light bars remain
        dim until archival maturity advances.
      </p>
    </VaultGlassCard>
  );
}
