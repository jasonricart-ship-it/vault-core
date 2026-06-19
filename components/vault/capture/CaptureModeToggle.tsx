"use client";

import type { CSSProperties } from "react";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

export type CaptureMode = "live" | "guest";

export function CaptureModeToggle({
  mode,
  onChange,
}: {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
}) {
  return (
    <div style={wrapStyle}>
      <button
        type="button"
        onClick={() => onChange("live")}
        style={mode === "live" ? activeTabStyle : tabStyle}
      >
        Live Capture
      </button>
      <button
        type="button"
        onClick={() => onChange("guest")}
        style={mode === "guest" ? activeTabStyle : tabStyle}
      >
        Guest Attach
      </button>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  padding: "12px 16px calc(8px + env(safe-area-inset-top, 0px))",
  background: "linear-gradient(to bottom, #0A0908 85%, transparent)",
  position: "sticky",
  top: 0,
  zIndex: 30,
};

const tabStyle: CSSProperties = {
  padding: "12px 10px",
  borderRadius: 8,
  border: "1px solid #B8972A33",
  background: "#14100C",
  color: "#F5F2EC99",
  fontFamily: SERIF,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  borderColor: GOLD,
  background: "#B8972A22",
  color: PARCHMENT,
};
