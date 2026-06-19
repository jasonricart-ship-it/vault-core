"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";
const CAPTURE_STORE_KEY = "vault-native-captures";

export type CapturePlayer = {
  id: string;
  display_name: string;
  ppc_number: string;
  primary_sport?: string | null;
};

type CaptureMetadata = {
  id: string;
  lat: number | null;
  lng: number | null;
  timestamp: string;
  deviceInfo: string;
  mediaType: "photo" | "video";
};

type StoredCaptureRecord = CaptureMetadata & {
  playerPpc?: string;
  uploadedAt?: string;
  evidenceClass?: string;
};

type PendingCapture = {
  file: File;
  previewUrl: string;
  metadata: CaptureMetadata;
};

type Phase = "camera" | "authenticated" | "share" | "success";

function readStoredCaptures(): StoredCaptureRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAPTURE_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCaptureRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredCapture(record: StoredCaptureRecord) {
  const existing = readStoredCaptures();
  existing.unshift(record);
  localStorage.setItem(CAPTURE_STORE_KEY, JSON.stringify(existing.slice(0, 20)));
}

function deviceInfoLabel() {
  const parts = [navigator.userAgent, navigator.platform].filter(Boolean);
  return parts.join(" · ");
}

async function readGeolocation(): Promise<{ lat: number | null; lng: number | null }> {
  if (!("geolocation" in navigator)) {
    return { lat: null, lng: null };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export function LiveCaptureScreen({ players }: { players: CapturePlayer[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdActiveRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
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

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Camera access is required for authenticated capture.");
    }
  }, []);

  useEffect(() => {
    if (phase === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [phase, startCamera, stopCamera]);

  const finalizeCapture = useCallback(async (file: File, mediaType: "photo" | "video") => {
    const [{ lat, lng }, timestamp] = await Promise.all([
      readGeolocation(),
      Promise.resolve(new Date().toISOString()),
    ]);

    const metadata: CaptureMetadata = {
      id: crypto.randomUUID(),
      lat,
      lng,
      timestamp,
      deviceInfo: deviceInfoLabel(),
      mediaType,
    };

    writeStoredCapture(metadata);

    const previewUrl = URL.createObjectURL(file);
    setPendingCapture({ file, previewUrl, metadata });
    setPhase("authenticated");

    window.setTimeout(() => {
      setPhase("share");
    }, 1400);
  }, []);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
    });

    if (!blob) return;

    const file = new File([blob], `vault-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    await finalizeCapture(file, "photo");
  }, [finalizeCapture]);

  const startVideoRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || holdActiveRef.current) return;

    holdActiveRef.current = true;
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        holdActiveRef.current = false;
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) return;
        const ext = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `vault-capture-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        void finalizeCapture(file, "video");
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      holdActiveRef.current = false;
      setIsRecording(false);
    }
  }, [finalizeCapture]);

  const stopVideoRecording = useCallback(() => {
    if (!holdActiveRef.current) return;
    recorderRef.current?.stop();
    recorderRef.current = null;
  }, []);

  const handleUpload = useCallback(async () => {
    if (!pendingCapture || !selectedPlayer) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", pendingCapture.file);
      formData.append("entity_type", "player");
      formData.append("entity_id", selectedPlayer.id);
      formData.append("is_native_capture", "true");
      formData.append("capture_device_id", pendingCapture.metadata.deviceInfo);

      if (pendingCapture.metadata.lat != null) {
        formData.append("capture_lat", String(pendingCapture.metadata.lat));
      }
      if (pendingCapture.metadata.lng != null) {
        formData.append("capture_lng", String(pendingCapture.metadata.lng));
      }
      formData.append("capture_timestamp", pendingCapture.metadata.timestamp);

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

      writeStoredCapture({
        ...pendingCapture.metadata,
        playerPpc: selectedPlayer.ppc_number,
        uploadedAt: new Date().toISOString(),
        evidenceClass: data.evidence_class,
      });

      setSuccessEvidenceClass(data.evidence_class ?? "E3");
      setSuccessPpcNumber(selectedPlayer.ppc_number);
      setPhase("success");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [pendingCapture, selectedPlayer]);

  const resetCapture = useCallback(() => {
    if (pendingCapture?.previewUrl) {
      URL.revokeObjectURL(pendingCapture.previewUrl);
    }
    setPendingCapture(null);
    setSelectedPlayer(null);
    setSearch("");
    setUploadError(null);
    setSuccessEvidenceClass(null);
    setSuccessPpcNumber(null);
    setPhase("camera");
  }, [pendingCapture]);

  useEffect(() => {
    return () => {
      if (pendingCapture?.previewUrl) {
        URL.revokeObjectURL(pendingCapture.previewUrl);
      }
    };
  }, [pendingCapture]);

  if (phase === "success" && successPpcNumber && successEvidenceClass) {
    return (
      <div style={screenStyle}>
        <div style={panelStyle}>
          <p style={eyebrowStyle}>Live Capture · The Vault™</p>
          <h1 style={titleStyle}>Evidence Admitted</h1>
          <p style={{ ...bodyStyle, marginTop: 16 }}>
            Evidence class assigned:{" "}
            <span style={{ color: GOLD }}>{successEvidenceClass}</span>
          </p>
          <Link href={`/vault/ppc/${encodeURIComponent(successPpcNumber)}`} style={primaryLinkStyle}>
            View {successPpcNumber} corridor →
          </Link>
          <button type="button" onClick={resetCapture} style={secondaryButtonStyle}>
            New capture
          </button>
        </div>
      </div>
    );
  }

  if (phase === "share" || phase === "authenticated") {
    return (
      <div style={screenStyle}>
        <div style={{ ...viewportShellStyle, position: "relative" }}>
          {pendingCapture && (
            pendingCapture.metadata.mediaType === "video" ? (
              <video
                src={pendingCapture.previewUrl}
                style={mediaPreviewStyle}
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pendingCapture.previewUrl} alt="Captured preview" style={mediaPreviewStyle} />
            )
          )}

          {(phase === "authenticated" || phase === "share") && (
            <div style={authenticatedOverlayStyle}>
              <span style={checkmarkStyle}>✓</span>
              <p style={authenticatedLabelStyle}>AUTHENTICATED</p>
            </div>
          )}

          {phase === "share" && (
            <div style={shareSheetStyle}>
              <p style={eyebrowStyle}>Share to player record</p>
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
                {uploading ? "Uploading…" : "Submit authenticated evidence"}
              </button>
              <button type="button" onClick={resetCapture} style={secondaryButtonStyle}>
                Discard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Live Capture · The Vault™</p>
        <h1 style={{ ...titleStyle, fontSize: 18, margin: 0 }}>Authenticated Capture</h1>
      </header>

      <div style={viewportShellStyle}>
        {cameraError ? (
          <div style={errorPanelStyle}>
            <p style={bodyStyle}>{cameraError}</p>
            <button type="button" onClick={() => void startCamera()} style={primaryButtonStyle}>
              Retry camera
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} style={videoStyle} playsInline muted autoPlay />
            <div style={viewfinderFrameStyle} aria-hidden />
            <div style={cornerTL} />
            <div style={cornerTR} />
            <div style={cornerBL} />
            <div style={cornerBR} />
            {isRecording && (
              <div style={recordingBadgeStyle}>
                <span style={recordingDotStyle} />
                REC
              </div>
            )}
          </>
        )}
      </div>

      <div style={controlsStyle}>
        <button
          type="button"
          onClick={() => void capturePhoto()}
          style={photoButtonStyle}
          aria-label="Capture photo"
        >
          <span style={photoInnerStyle} />
        </button>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            startVideoRecording();
          }}
          onPointerUp={stopVideoRecording}
          onPointerLeave={stopVideoRecording}
          onPointerCancel={stopVideoRecording}
          style={{
            ...videoButtonStyle,
            borderColor: isRecording ? "#FF6B6B" : GOLD,
          }}
          aria-label="Hold to record video"
        >
          {isRecording ? "Recording…" : "Hold · Video"}
        </button>
      </div>
      <p style={hintStyle}>Tap for photo · Hold for video</p>
    </div>
  );
}

const screenStyle: CSSProperties = {
  minHeight: "100dvh",
  background: BG,
  color: PARCHMENT,
  fontFamily: SERIF,
  display: "flex",
  flexDirection: "column",
};

const headerStyle: CSSProperties = {
  padding: "16px 20px 8px",
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

const viewportShellStyle: CSSProperties = {
  position: "relative",
  flex: 1,
  margin: "8px 16px 0",
  borderRadius: 8,
  overflow: "hidden",
  background: "#111",
  minHeight: "52dvh",
};

const videoStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  minHeight: "52dvh",
};

const mediaPreviewStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  minHeight: "52dvh",
};

const viewfinderFrameStyle: CSSProperties = {
  position: "absolute",
  inset: "10%",
  border: `2px solid ${GOLD}`,
  boxShadow: `0 0 0 9999px rgba(10, 9, 8, 0.35), inset 0 0 24px rgba(184, 151, 42, 0.15)`,
  pointerEvents: "none",
};

const cornerBase: CSSProperties = {
  position: "absolute",
  width: 28,
  height: 28,
  borderColor: GOLD,
  borderStyle: "solid",
  pointerEvents: "none",
};

const cornerTL: CSSProperties = {
  ...cornerBase,
  top: "10%",
  left: "10%",
  borderWidth: "3px 0 0 3px",
};

const cornerTR: CSSProperties = {
  ...cornerBase,
  top: "10%",
  right: "10%",
  borderWidth: "3px 3px 0 0",
};

const cornerBL: CSSProperties = {
  ...cornerBase,
  bottom: "10%",
  left: "10%",
  borderWidth: "0 0 3px 3px",
};

const cornerBR: CSSProperties = {
  ...cornerBase,
  bottom: "10%",
  right: "10%",
  borderWidth: "0 3px 3px 0",
};

const controlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 28,
  padding: "20px 24px 8px",
};

const photoButtonStyle: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  border: `3px solid ${GOLD}`,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const photoInnerStyle: CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: "50%",
  background: GOLD,
};

const videoButtonStyle: CSSProperties = {
  minWidth: 120,
  padding: "14px 18px",
  borderRadius: 999,
  border: `2px solid ${GOLD}`,
  background: "#1A1208",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
  touchAction: "none",
};

const hintStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 11,
  color: "#B8972A66",
  letterSpacing: "0.12em",
  margin: "0 0 24px",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const authenticatedOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(10, 9, 8, 0.55)",
  pointerEvents: "none",
};

const checkmarkStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: `2px solid ${GOLD}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  color: GOLD,
  marginBottom: 12,
  boxShadow: "0 0 24px rgba(184, 151, 42, 0.35)",
};

const authenticatedLabelStyle: CSSProperties = {
  fontSize: 14,
  letterSpacing: "0.22em",
  color: GOLD,
  margin: 0,
  textTransform: "uppercase",
};

const shareSheetStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
  background: "linear-gradient(to top, rgba(10,9,8,0.98) 70%, transparent)",
};

const searchInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: 10,
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

const errorPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "52dvh",
  padding: 24,
  gap: 16,
};

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: "#FF9B9B",
  margin: "8px 0 0",
};

const recordingBadgeStyle: CSSProperties = {
  position: "absolute",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(0,0,0,0.55)",
  color: "#FF6B6B",
  fontSize: 11,
  letterSpacing: "0.14em",
};

const recordingDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#FF6B6B",
};
