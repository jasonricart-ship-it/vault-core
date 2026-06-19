"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

type GuardianNotification = {
  id: string;
  notification_type: string;
  message: string;
  created_at: string;
  shared_capture: {
    id: string;
    admitted: boolean;
    capturer_name: string;
    capture_credit: string | null;
    evidence_class: string;
    thumbnail_url: string | null;
    player: {
      ppc_number: string;
      display_name: string;
    } | null;
  } | null;
};

export function GuardianNotificationsPanel() {
  const [notifications, setNotifications] = useState<GuardianNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/guardian/notifications", { cache: "no-store" });
      const data = (await response.json()) as {
        notifications?: GuardianNotification[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load notifications");
      }

      const pending = (data.notifications ?? []).filter(
        (notification) =>
          notification.notification_type === "capture_share" &&
          notification.shared_capture &&
          !notification.shared_capture.admitted,
      );

      setNotifications(pending);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleDecision = async (sharedCaptureId: string, decision: "admit" | "decline") => {
    setActingOn(sharedCaptureId);
    setError(null);

    try {
      const response = await fetch(
        `/api/capture/${encodeURIComponent(sharedCaptureId)}/admit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to process decision");
      }

      setNotifications((current) =>
        current.filter((notification) => notification.shared_capture?.id !== sharedCaptureId),
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error ? decisionError.message : "Failed to process decision",
      );
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return <p style={bodyStyle}>Loading pending captures…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <p style={errorStyle}>{error}</p>}

      {notifications.length === 0 ? (
        <div style={emptyStyle}>
          <p style={bodyStyle}>No pending capture shares.</p>
          <p style={hintStyle}>
            When someone shares a live capture of your player, it will appear here for review.
          </p>
        </div>
      ) : (
        notifications.map((notification) => {
          const capture = notification.shared_capture;
          if (!capture) return null;

          const busy = actingOn === capture.id;

          return (
            <article key={notification.id} style={cardStyle}>
              {capture.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={capture.thumbnail_url}
                  alt="Capture preview"
                  style={thumbnailStyle}
                />
              ) : (
                <div style={thumbnailPlaceholderStyle}>
                  <span style={{ fontSize: 11, letterSpacing: "0.14em", color: "#B8972A88" }}>
                    LIVE CAPTURE
                  </span>
                </div>
              )}

              <div style={{ padding: "16px 16px 18px" }}>
                <p style={eyebrowStyle}>Shared capture · Review required</p>
                <h2 style={cardTitleStyle}>{capture.player?.display_name ?? "Your player"}</h2>
                <p style={metaStyle}>
                  {capture.player?.ppc_number ?? "—"} · Evidence {capture.evidence_class}
                </p>

                <dl style={detailsStyle}>
                  <div>
                    <dt style={labelStyle}>Captured by</dt>
                    <dd style={valueStyle}>{capture.capturer_name}</dd>
                  </div>
                  <div>
                    <dt style={labelStyle}>Capture credit</dt>
                    <dd style={valueStyle}>{capture.capture_credit ?? "—"}</dd>
                  </div>
                </dl>

                <div style={actionsStyle}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDecision(capture.id, "admit")}
                    style={{
                      ...admitButtonStyle,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? "Processing…" : "Admit"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDecision(capture.id, "decline")}
                    style={{
                      ...declineButtonStyle,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            </article>
          );
        })
      )}

      <button type="button" onClick={() => void loadNotifications()} style={refreshButtonStyle}>
        Refresh
      </button>

      <Link href="/vault/player-wing" style={backLinkStyle}>
        ← Return to the Player Wing
      </Link>
    </div>
  );
}

const bodyStyle: CSSProperties = {
  fontSize: 14,
  color: "#F5F2EC99",
  lineHeight: 1.6,
  margin: 0,
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: "#B8972A66",
  lineHeight: 1.6,
  margin: "8px 0 0",
};

const errorStyle: CSSProperties = {
  fontSize: 13,
  color: "#FF9B9B",
  margin: 0,
};

const emptyStyle: CSSProperties = {
  padding: "32px 20px",
  borderRadius: 8,
  border: "1px solid #B8972A22",
  background: "#14100C",
  textAlign: "center",
};

const cardStyle: CSSProperties = {
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid #B8972A33",
  background: "#14100C",
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
};

const thumbnailStyle: CSSProperties = {
  width: "100%",
  height: 220,
  objectFit: "cover",
  display: "block",
  background: "#0A0908",
};

const thumbnailPlaceholderStyle: CSSProperties = {
  width: "100%",
  height: 220,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(180deg, #1A1208 0%, #0A0908 100%)",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 500,
  color: PARCHMENT,
  margin: "0 0 6px",
  fontFamily: SERIF,
};

const metaStyle: CSSProperties = {
  fontSize: 12,
  color: "#F5F2EC77",
  margin: "0 0 16px",
};

const detailsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  margin: "0 0 18px",
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
};

const actionsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const admitButtonStyle: CSSProperties = {
  padding: "14px 12px",
  borderRadius: 8,
  border: "none",
  background: GOLD,
  color: BG,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const declineButtonStyle: CSSProperties = {
  padding: "14px 12px",
  borderRadius: 8,
  border: "1px solid #B8972A55",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const refreshButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid #B8972A33",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const backLinkStyle: CSSProperties = {
  fontSize: 12,
  color: "#B8972A66",
  textDecoration: "none",
  textAlign: "center",
  display: "block",
  marginTop: 8,
  paddingBottom: "env(safe-area-inset-bottom, 16px)",
};
