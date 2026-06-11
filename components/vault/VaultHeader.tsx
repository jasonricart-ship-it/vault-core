"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VaultWordmark } from "./VaultWordmark";

const PRIMARY_NAV = [
  { label: "PPC", href: "/vault/ppc/PPC-0247", key: "ppc" },
  { label: "GUM", href: "#", key: "gum" },
  { label: "ORG", href: "#", key: "org" },
  { label: "GOV", href: "#", key: "gov" },
  { label: "EVT", href: "#", key: "evt" },
] as const;

const SECONDARY_NAV = [
  { label: "Evidence", href: "#" },
  { label: "Formats", href: "#" },
  { label: "Principles", href: "#" },
  { label: "Petition", href: "#" },
] as const;

function navClass(active: boolean) {
  return [
    "rounded-lg border px-4 py-2 text-xs font-semibold tracking-[0.28em] uppercase transition-colors",
    active
      ? "border-[#B8972A]/45 bg-[#B8972A]/10 text-[#B8972A]"
      : "border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white",
  ].join(" ");
}

function ctaClass() {
  return [
    "rounded-md border border-white/15 bg-white/[0.02] px-4 py-2",
    "text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    "hover:bg-white/[0.06] hover:text-white",
  ].join(" ");
}

export function VaultHeader() {
  const pathname = usePathname() ?? "";

  const activeKey = pathname.includes("/vault/ppc")
    ? "ppc"
    : pathname.includes("/vault/gum")
      ? "gum"
      : pathname.includes("/vault/org")
        ? "org"
        : pathname.includes("/vault/gov")
          ? "gov"
          : pathname.includes("/vault/evt")
            ? "evt"
            : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D1B2E] text-white">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="grid grid-cols-3 items-center">
          <div>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs tracking-[0.22em] uppercase hover:bg-white/10"
            >
              Exit
            </Link>
          </div>

          <div className="flex justify-center">
            <Link href="/vault/ppc/PPC-0247" aria-label="The Vault">
              <VaultWordmark />
            </Link>
          </div>

          <div className="flex justify-end">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Members&apos; Atelier
            </Link>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={navClass(activeKey === item.key)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-5 text-center text-[11px] tracking-[0.35em] text-[#B8972A]/55 uppercase">
          Archival Division
        </p>

        <nav className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {SECONDARY_NAV.map((item) => (
            <Link key={item.label} href={item.href} className={ctaClass()}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-xs tracking-[0.18em] text-[#B8972A]/70 uppercase">
            Viewer: <span className="font-semibold text-[#B8972A]">public</span>
          </span>
          {(["public", "verified", "internal"] as const).map((mode, index) => (
            <span
              key={mode}
              className={[
                "rounded-md border px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase",
                index === 0
                  ? "border-[#B8972A]/35 bg-[#B8972A]/8 text-[#B8972A]"
                  : "border-white/15 bg-white/[0.02] text-white/40",
              ].join(" ")}
            >
              {mode}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
