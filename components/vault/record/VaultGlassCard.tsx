import type { ReactNode } from "react";

export function VaultGlassCard({
  kicker,
  title,
  children,
  className = "",
}: {
  kicker: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111f33]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B8972A]/25 to-transparent" />
      <div className="relative p-6 sm:p-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#B8972A] uppercase">
          {kicker}
        </p>
        {title ? (
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>
        ) : null}
        <div className={title ? "mt-6" : "mt-4"}>{children}</div>
      </div>
    </section>
  );
}
