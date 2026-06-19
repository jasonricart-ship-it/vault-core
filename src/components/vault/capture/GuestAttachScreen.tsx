"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  GUEST_ATTACH_ACCEPT,
  parseGuestAttachExif,
  type GuestAttachExifPreview,
} from "@/lib/evidence-exif-client";
import type { CapturePlayer } from "@/components/vault/capture/LiveCaptureScreen";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";
const GUEST_ATTACH_STORE_KEY = "vault-guest-attaches";

type StoredGuestAttach = GuestAttachExifPreview & {
  id: string;
  fileName: string;
  deviceInfo: string;
  playerPpc?: string;
  uploadedAt?: string;
  evidenceClass?: string;
};

type PendingGuestFile = {
  file: File;
  previewUrl: string;
  exif: GuestAttachExifPreview;
};

type Phase = "pick" | "review" | "share" | "success";

function readStoredGuestAttaches(): StoredGuestAttach[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_ATTACH_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGuestAttach[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredGuestAttach(record: StoredGuestAttach) {
  const existing = readStoredGuestAttaches();
  existing.unshift(record);
  localStorage.setItem(GUEST_ATTACH_STORE_KEY, JSON.stringify(existing.slice(0, 20)));
}

function deviceInfoLabel() {
  return [navigator.userAgent, navigator.platform].filter(Boolean).join(" · ");
}

function formatCoordinates(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "Not found in file metadata";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Not found in file metadata";
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function GuestAttachScreen({ players }: { players: CapturePlayer[] }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [pending, setPending] = useState<PendingGuestFile | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<CapturePlayer | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successEvidenceClass, setSuccessEvidenceClass] = useState<string | null>(null);
  const [successPpcNumber, setSuccessPpcNumber] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;
    return players.filter(
      (player) =>
        player.ppc_number.toLowerCase().includes(query) ||
        player.display_name.toLowerCase().includes(query) ||
        (player.primary_sport ?? "").toLowerCase().includes(query),
    );
  }, [players, search]);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;

    setPickError(null);
    setParsing(true);

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/quicktime",
    ]);

    if (!allowedTypes.has(file.type)) {
      setPickError("Unsupported file type. Use JPEG, PNG, HEIC, MP4, or MOV.");
      setParsing(false);
      return;
    }

    try {
      const exif = await parseGuestAttachExif(file);
      const previewUrl = URL.createObjectURL(file);
      setPending({ file, previewUrl, exif });
      setPhase("review");

      writeStoredGuestAttach({
        id: crypto.randomUUID(),
        fileName: file.name,
        deviceInfo: deviceInfoLabel(),
        ...exif,
      });
    } catch {
      setPickError("Could not read file metadata.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!pending || !selectedPlayer) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", pending.file);
      formData.append("entity_type", "player");
      formData.append("entity_id", selectedPlayer.id);
      formData.append("is_native_capture", "false");

      const response = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        evidence_class?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      writeStoredGuestAttach({
        id: crypto.randomUUID(),
        fileName: pending.file.name,
        deviceInfo: deviceInfoLabel(),
        ...pending.exif,
        playerPpc: selectedPlayer.ppc_number,
        uploadedAt: new Date().toISOString(),
        evidenceClass: data.evidence_class,
      });

      setSuccessEvidenceClass(data.evidence_class ?? pending.exif.projectedClass);
      setSuccessPpcNumber(selectedPlayer.ppc_number);
      setPhase("success");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [pending, selectedPlayer]);

  const resetFlow = useCallback(() => {
    if (pending?.previewUrl) {
      URL.revokeObjectURL(pending.previewUrl);
    }
    setPending(null);
    setSelectedPlayer(null);
    setSearch("");
    setUploadError(null);
    setPickError(null);
    setSuccessEvidenceClass(null);
    setSuccessPpcNumber(null);
    setPhase("pick");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [pending]);

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) {
        URL.revokeObjectURL(pending.previewUrl);
      }
    };
  }, [pending]);

  if (phase === "success" && successPpcNumber && successEvidenceClass) {
    return (
      <div style={screenStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>Guest Attach · The Vault™</p>
          <h1 style={titleStyle}>Evidence Submitted</h1>
          <p style={{ ...bodyStyle, marginTop: 16 }}>
            Evidence class assigned:{" "}
            <span style={{ color: GOLD }}>{successEvidenceClass}</span>
          </p>
          <Link
            href={`/vault/ppc/${encodeURIComponent(successPpcNumber)}`}
            style={primaryLinkStyle}
          >
            View {successPpcNumber} corridor →
          </Link>
          <button type="button" onClick={resetFlow} style={secondaryButtonStyle}>
            Attach another file
          </button>
        </div>
      </div>
    );
  }

  if ((phase === "review" || phase === "share") && pending) {
    const isE2 = pending.exif.projectedClass === "E2";

    return (
      <div style={screenStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Guest Attach · The Vault™</p>
          <h1 style={{ ...titleStyle, fontSize: 18, margin: 0 }}>Metadata Review</h1>
        </header>

        <div style={previewShellStyle}>
          {pending.exif.mediaType === "video" ? (
            <video
              src={pending.previewUrl}
              style={previewMediaStyle}
              controls
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.previewUrl} alt="Selected file preview" style={previewMediaStyle} />
          )}
        </div>

        <div style={reviewPanelStyle}>
          <dl style={metaGridStyle}>
            <div>
              <dt style={labelStyle}>GPS coordinates</dt>
              <dd style={valueStyle}>
                {formatCoordinates(pending.exif.lat, pending.exif.lng)}
              </dd>
            </div>
            <div>
              <dt style={labelStyle}>Timestamp</dt>
              <dd style={valueStyle}>{formatTimestamp(pending.exif.timestamp)}</dd>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <dt style={labelStyle}>Projected evidence class</dt>
              <dd style={{ ...valueStyle, color: isE2 ? "#C0C8D4" : "#F5F2EC99" }}>
                {pending.exif.projectedClass}
              </dd>
            </div>
          </dl>

          <div style={isE2 ? e2BannerStyle : e3BannerStyle}>
            {isE2 ? (
              <>
                <span style={bannerMarkStyle}>◐</span>
                <p style={bannerTextStyle}>
                  Metadata verified. This capture will receive a silver checkmark.
                </p>
              </>
            ) : (
              <>
                <span style={bannerMarkStyle}>○</span>
                <p style={bannerTextStyle}>
                  This file has no verifiable metadata. It will be permanently marked
                  self-reported.
                </p>
              </>
            )}
          </div>

          {phase === "review" && (
            <button
              type="button"
              onClick={() => setPhase("share")}
              style={primaryButtonStyle}
            >
              Continue to share
            </button>
          )}

          {phase === "share" && (
            <>
              <p style={{ ...eyebrowStyle, marginTop: 20 }}>Share to player record</p>
              <input
                type="search"
                placeholder="Search PPC number or name…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={searchInputStyle}
              />
              <div style={playerListStyle}>
                {filteredPlayers.length === 0 ? (
                  <p style={bodyStyle}>No matching player records.</p>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayer(player)}
                      style={{
                        ...playerRowStyle,
                        borderColor: selectedPlayer?.id === player.id ? GOLD : "#B8972A33",
                        backgroundColor:
                          selectedPlayer?.id === player.id ? "#B8972A18" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 10, color: GOLD, letterSpacing: "0.12em" }}>
                        {player.ppc_number}
                      </span>
                      <span style={{ fontSize: 14, color: PARCHMENT }}>{player.display_name}</span>
                    </button>
                  ))
                )}
              </div>
              {uploadError && <p style={errorStyle}>{uploadError}</p>}
              <button
                type="button"
                disabled={!selectedPlayer || uploading}
                onClick={() => void handleUpload()}
                style={{
                  ...primaryButtonStyle,
                  opacity: !selectedPlayer || uploading ? 0.5 : 1,
                }}
              >
                {uploading ? "Uploading…" : "Submit to player record"}
              </button>
            </>
          )}

          <button type="button" onClick={resetFlow} style={secondaryButtonStyle}>
            Choose a different file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Guest Attach · The Vault™</p>
        <h1 style={{ ...titleStyle, fontSize: 18, margin: 0 }}>Attach from camera roll</h1>
        <p style={hintStyle}>
          Select a photo or video already captured on your device. The Vault reads embedded EXIF
          metadata before submission.
        </p>
      </header>

      <div style={pickerPanelStyle}>
        <input
          ref={inputRef}
          type="file"
          accept={GUEST_ATTACH_ACCEPT}
          style={{ display: "none" }}
          onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          disabled={parsing}
          onClick={() => inputRef.current?.click()}
          style={{
            ...pickButtonStyle,
            opacity: parsing ? 0.6 : 1,
          }}
        >
          {parsing ? "Reading metadata…" : "Choose photo or video"}
        </button>

        <p style={fileTypesStyle}>JPEG · PNG · HEIC · MP4 · MOV</p>

        {pickError && <p style={errorStyle}>{pickError}</p>}
      </div>
    </div>
  );
}

const screenStyle: CSSProperties = {
  minHeight: "calc(100dvh - 64px)",
  background: BG,
  color: PARCHMENT,
  fontFamily: SERIF,
  display: "flex",
  flexDirection: "column",
};

const headerStyle: CSSProperties = {
  padding: "8px 20px 12px",
  textAlign: "center",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A88",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: "0 0 6px",
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 400,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const bodyStyle: CSSProperties = {
  fontSize: 13,
  color: "#F5F2EC99",
  lineHeight: 1.6,
  margin: 0,
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: "#F5F2EC77",
  lineHeight: 1.6,
  margin: "10px 0 0",
};

const pickerPanelStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
  gap: 12,
};

const pickButtonStyle: CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "18px 20px",
  borderRadius: 10,
  border: `2px solid ${GOLD}`,
  background: "#14100C",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const fileTypesStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A66",
  letterSpacing: "0.14em",
  margin: 0,
};

const previewShellStyle: CSSProperties = {
  margin: "0 16px",
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #B8972A33",
  background: "#111",
  maxHeight: 280,
};

const previewMediaStyle: CSSProperties = {
  width: "100%",
  maxHeight: 280,
  objectFit: "contain",
  display: "block",
  background: "#0A0908",
};

const reviewPanelStyle: CSSProperties = {
  padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
  flex: 1,
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
  margin: "0 0 16px",
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A88",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: 0,
};

const valueStyle: CSSProperties = {
  fontSize: 14,
  color: PARCHMENT,
  margin: "4px 0 0",
  lineHeight: 1.5,
};

const e2BannerStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "14px 14px",
  borderRadius: 8,
  border: "1px solid #C0C8D466",
  background: "#C0C8D414",
  marginBottom: 16,
};

const e3BannerStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: "14px 14px",
  borderRadius: 8,
  border: "1px solid #B8972A44",
  background: "#B8972A12",
  marginBottom: 16,
};

const bannerMarkStyle: CSSProperties = {
  fontSize: 18,
  color: GOLD,
  lineHeight: 1,
  flexShrink: 0,
};

const bannerTextStyle: CSSProperties = {
  fontSize: 13,
  color: PARCHMENT,
  lineHeight: 1.55,
  margin: 0,
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "#14100C",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 14,
};

const playerListStyle: CSSProperties = {
  maxHeight: 180,
  overflowY: "auto",
  margin: "12px 0",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const playerRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 4,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #B8972A33",
  background: "transparent",
  cursor: "pointer",
  fontFamily: SERIF,
  textAlign: "left",
};

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "14px 16px",
  borderRadius: 6,
  border: "none",
  background: GOLD,
  color: BG,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: 8,
  padding: "12px 16px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const primaryLinkStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 24,
  padding: "14px 16px",
  borderRadius: 6,
  background: GOLD,
  color: BG,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  textAlign: "center",
  textDecoration: "none",
};

const panelStyle: CSSProperties = {
  margin: "auto",
  padding: "48px 24px",
  maxWidth: 420,
  width: "100%",
  textAlign: "center",
};

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: "#FF9B9B",
  margin: "8px 0 0",
  textAlign: "center",
};
