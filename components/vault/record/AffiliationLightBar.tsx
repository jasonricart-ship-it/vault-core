import type { ProvenanceRow } from "./types";

export function AffiliationLightBar({
  row,
  glowOpacity,
}: {
  row: ProvenanceRow;
  glowOpacity: number;
}) {
  return (
    <li className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0D1B2E]/70">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(184,151,42,${glowOpacity}) 35%, rgba(184,151,42,${glowOpacity * 0.7}) 65%, transparent 100%)`,
          boxShadow: `0 0 18px rgba(184,151,42,${glowOpacity * 0.6})`,
        }}
      />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.24em] text-[#B8972A] uppercase">
              {row.type}
            </span>
            {row.tier ? (
              <span className="rounded border border-[#B8972A]/20 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-[#B8972A]/75 uppercase">
                {row.tier}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-lg text-white/92">{row.name}</p>
          <p className="mt-1 font-mono text-sm text-[#B8972A]">{row.code}</p>
          {row.detail ? (
            <p className="mt-2 text-xs tracking-[0.08em] text-white/45 uppercase">
              {row.detail}
            </p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center self-start rounded-full border border-[#B8972A]/35 bg-[#B8972A]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-[#B8972A] uppercase sm:self-center">
          {row.verified ? "Verified" : "Pending"}
        </span>
      </div>
    </li>
  );
}
