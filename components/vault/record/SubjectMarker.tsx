import Image from "next/image";

export function SubjectMarker({
  ppcNumber,
  displayName,
  isGrayscale,
}: {
  ppcNumber: string;
  displayName: string;
  isGrayscale: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[280px]">
        <div className="pointer-events-none absolute inset-0 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
        <div
          className={`relative overflow-hidden rounded-[20px] border border-[#B8972A]/15 bg-[linear-gradient(180deg,#1a2a42_0%,#0f1a2c_55%,#0a121f_100%)] p-5 ${isGrayscale ? "grayscale" : ""}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 6px)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-4 top-4 h-10 rounded-full bg-white/10 blur-2xl" />

          <div className="relative mx-auto max-w-[220px]">
            <Image
              src="/images/PPC-BeauRicart-SculptureBust-GreyScale.png"
              alt={`Archival bust of ${displayName}`}
              width={900}
              height={900}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </div>
      </div>

      <div className="mt-4 w-full max-w-[280px] rounded-xl border border-[#B8972A]/20 bg-[linear-gradient(180deg,#1c2d45,#152238)] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <p className="text-sm font-medium tracking-[0.02em] text-white/85">
          {displayName}
        </p>
        <p className="mt-1 font-mono text-xs tracking-[0.28em] text-[#B8972A] uppercase">
          {ppcNumber}
        </p>
      </div>

      {isGrayscale ? (
        <p className="mt-3 text-center text-xs tracking-[0.12em] text-white/40">
          Bust locked — grayscale
        </p>
      ) : null}
    </div>
  );
}
