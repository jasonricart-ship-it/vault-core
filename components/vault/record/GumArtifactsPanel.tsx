import { VaultGlassCard } from "./VaultGlassCard";
import { VaultPadlock } from "./VaultPadlock";

export function GumArtifactsPanel() {
  return (
    <VaultGlassCard kicker="GUM Items" title="Issued Artifacts">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D1B2E]/80 p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />
        <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/[0.05]" />
        <div className="relative flex min-h-[140px] flex-col items-center justify-center text-center">
          <VaultPadlock size={48} />
          <p className="mt-5 text-sm text-white/45">
            No authenticated artifacts on record.
          </p>
          <p className="mt-2 text-xs tracking-[0.14em] text-[#B8972A]/50 uppercase">
            Behind glass • contained
          </p>
        </div>
      </div>
    </VaultGlassCard>
  );
}
