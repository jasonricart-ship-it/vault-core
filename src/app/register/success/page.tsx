"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RegisterShell } from "@/components/register/RegisterShell";

function SuccessContent() {
  const searchParams = useSearchParams();
  const ppcNumber = searchParams.get("ppc");

  if (!ppcNumber) {
    return (
      <RegisterShell step="Complete" title="Registration Incomplete">
        <p className="text-sm text-slate-600">
          No PPC number was assigned. Please complete the registration flow.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800"
        >
          Start Registration
        </Link>
      </RegisterShell>
    );
  }

  return (
    <RegisterShell
      step="Step 3 of 3"
      title="Welcome to The Vault"
      subtitle="Your record is now live within the archival system."
    >
      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#B8972A] uppercase">
          Assigned Registry Identifier
        </p>
        <p className="mt-4 font-mono text-4xl font-semibold tracking-[0.08em] text-[#B8972A] sm:text-5xl">
          {ppcNumber}
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Vault level: <span className="font-semibold text-slate-900">Recorded</span>
        </p>

        <div className="mx-auto mt-8 max-w-[200px] overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 grayscale">
          <Image
            src="/images/PPC-BeauRicart-SculptureBust-GreyScale.png"
            alt="Archival bust placeholder"
            width={400}
            height={400}
            className="h-auto w-full object-contain opacity-80"
          />
        </div>
        <p className="mt-3 text-xs tracking-[0.12em] text-slate-400 uppercase">
          Bust locked — grayscale
        </p>

        <Link
          href={`/vault/ppc/${encodeURIComponent(ppcNumber)}`}
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-[#B8972A]/30 bg-[#0D1B2E] px-4 py-3.5 text-sm font-semibold tracking-[0.12em] text-[#B8972A] uppercase transition hover:bg-[#152238] sm:w-auto sm:px-8"
        >
          View Your PPC Record
        </Link>
      </div>
    </RegisterShell>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
