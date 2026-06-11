import { VaultGlassCard } from "./VaultGlassCard";

const METRICS = [
  { label: "E1 / Docs", value: "0" },
  { label: "E2 / Photos", value: "0" },
  { label: "E3 / Provenance", value: "—" },
  { label: "Visibility", value: "public" },
] as const;

export function EvidencePanel() {
  return (
    <VaultGlassCard kicker="On File — Evidence" title="Evidence">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-white/[0.07] bg-[#0D1B2E]/70 p-4 text-center"
          >
            <p className="text-[10px] tracking-[0.18em] text-[#B8972A] uppercase">
              {metric.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-white/85">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-7 text-white/45">
        Public view reflects counts only. Evidence retained within the archive.
      </p>
    </VaultGlassCard>
  );
}
