export function VaultPadlock({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="vaultShell" x1="12" y1="10" x2="52" y2="52">
          <stop offset="0%" stopColor="#6A6A68" />
          <stop offset="18%" stopColor="#4C4C49" />
          <stop offset="48%" stopColor="#2E312F" />
          <stop offset="78%" stopColor="#444641" />
          <stop offset="100%" stopColor="#797973" />
        </linearGradient>
        <linearGradient id="vaultBody" x1="14" y1="24" x2="50" y2="56">
          <stop offset="0%" stopColor="#5F605A" />
          <stop offset="20%" stopColor="#3A3C39" />
          <stop offset="52%" stopColor="#202321" />
          <stop offset="78%" stopColor="#373933" />
          <stop offset="100%" stopColor="#68675F" />
        </linearGradient>
        <radialGradient id="vaultInnerLight" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#FFF2C8" stopOpacity="1" />
          <stop offset="45%" stopColor="#E7BE67" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#B9852E" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      <path
        d="M20 25V18.5C20 11.5964 25.5964 6 32.5 6C39.4036 6 45 11.5964 45 18.5V25"
        stroke="url(#vaultShell)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="14"
        y="23"
        width="36"
        height="29"
        rx="8"
        fill="url(#vaultBody)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      <rect
        x="17.5"
        y="26.5"
        width="29"
        height="22"
        rx="5.5"
        fill="url(#vaultInnerLight)"
        opacity="0.04"
      />
      <path
        d="M25 35.5C25 31.9101 27.9101 29 31.5 29H32.5C36.0899 29 39 31.9101 39 35.5C39 37.7487 37.8574 39.7306 36.1228 40.8993V44.5C36.1228 46.433 34.5577 48 32.6247 48H31.3753C29.4423 48 27.8772 46.433 27.8772 44.5V40.8993C26.1426 39.7306 25 37.7487 25 35.5Z"
        fill="rgba(12,16,14,0.58)"
      />
      <circle cx="32" cy="37.5" r="1.9" fill="rgba(236,239,241,0.18)" />
      <rect
        x="14"
        y="23"
        width="36"
        height="29"
        rx="8"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
