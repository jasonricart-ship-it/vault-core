"use client";

import { useState } from "react";
import { CaptureModeToggle } from "@/components/vault/capture/CaptureModeToggle";
import { GuestAttachScreen } from "@/components/vault/capture/GuestAttachScreen";
import {
  LiveCaptureScreen,
  type CapturePlayer,
} from "@/components/vault/capture/LiveCaptureScreen";

const BG = "#0A0908";

export function CapturePageClient({ players }: { players: CapturePlayer[] }) {
  const [mode, setMode] = useState<"live" | "guest">("live");

  return (
    <div style={{ minHeight: "100dvh", background: BG }}>
      <CaptureModeToggle mode={mode} onChange={setMode} />
      {mode === "live" ? (
        <LiveCaptureScreen players={players} />
      ) : (
        <GuestAttachScreen players={players} />
      )}
    </div>
  );
}
