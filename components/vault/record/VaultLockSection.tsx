import { VaultPadlock } from "./VaultPadlock";
import { formatLevel } from "./utils";

export function VaultLockSection({ vaultLevel }: { vaultLevel: string }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="relative shrink-0 rounded-2xl border border-white/[0.06] bg-[#0D1B2E]/80 p-5 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
        <VaultPadlock size={80} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#B8972A] uppercase">
          Vault Lock — {formatLevel(vaultLevel)}
        </p>
        <p className="mt-4 text-sm leading-7 text-white/55">
          Record entered. Evidence and institutional connections pending.
        </p>
        <p className="mt-3 text-sm leading-7 text-white/40">
          The lock remains behind glass — dark, contained, not illuminated.
          Field-level authentication may advance as approved evidence and
          corroborated relationships accumulate.
        </p>
      </div>
    </div>
  );
}
