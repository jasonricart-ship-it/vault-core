export function VaultWordmark() {
  return (
    <div className="relative inline-flex items-center gap-4 rounded-sm border border-[#B8972A]/60 bg-[#0D1B2E]/40 px-5 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0 rounded-sm border border-[#B8972A]/20" />
      <div className="pointer-events-none absolute -inset-px rounded-sm border border-[#B8972A]/30" />

      <svg
        width="52"
        height="58"
        viewBox="0 0 52 58"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M26 2L4 12V28C4 42.5 13.2 52.8 26 56C38.8 52.8 48 42.5 48 28V12L26 2Z"
          stroke="#B8972A"
          strokeWidth="1.5"
          fill="rgba(184,151,42,0.08)"
        />
        <rect x="20" y="26" width="12" height="11" rx="2" fill="#3a3f45" stroke="#B8972A" strokeWidth="0.8" />
        <path
          d="M22 26V22.5C22 19.4624 24.4624 17 27.5 17C30.5376 17 33 19.4624 33 22.5V26"
          stroke="#6b7078"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="14" r="1.2" fill="#B8972A" opacity="0.7" />
        <circle cx="26" cy="11" r="1.2" fill="#B8972A" opacity="0.9" />
        <circle cx="32" cy="14" r="1.2" fill="#B8972A" opacity="0.7" />
      </svg>

      <div className="text-left">
        <div
          className="text-[1.65rem] leading-none font-semibold tracking-[0.06em] text-[#B8972A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          THE VAULT
        </div>
        <div className="mt-1.5 text-[0.62rem] tracking-[0.28em] text-[#B8972A]/80 uppercase">
          GUM™ | Authentication Systems
        </div>
      </div>
    </div>
  );
}
