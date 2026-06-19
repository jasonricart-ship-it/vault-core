"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type { VrcRegistryEntry } from "@/lib/vrc-registry";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

type RegisterForm = {
  firstName: string;
  lastName: string;
  middleName: string;
  collectorFocus: string;
};

const EMPTY_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  collectorFocus: "",
};

function StatusMark({ active }: { active: boolean }) {
  if (active) {
    return (
      <span style={activeMarkStyle} title="Active collector">
        ✓
      </span>
    );
  }
  return (
    <span style={inactiveMarkStyle} title="Inactive collector">
      ○
    </span>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function VrcRegistryFloor({
  collectors,
  canRegister,
}: {
  collectors: VrcRegistryEntry[];
  canRegister: boolean;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNumber, setSuccessNumber] = useState<string | null>(null);

  const sortedCollectors = useMemo(
    () =>
      [...collectors].sort((a, b) => {
        const aActive = a.exhibit_status === "active";
        const bActive = b.exhibit_status === "active";
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.vrc_number.localeCompare(b.vrc_number);
      }),
    [collectors],
  );

  const updateField = useCallback(
    <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setSuccessNumber(null);

    try {
      const response = await fetch("/api/vrc/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          middle_name: form.middleName || undefined,
          collector_focus: form.collectorFocus || undefined,
        }),
      });

      const data = (await response.json()) as {
        vrc_number?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      setSuccessNumber(data.vrc_number ?? null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openForm = () => {
    setFormError(null);
    setSuccessNumber(null);
    setShowForm(true);
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Collector Registry · VRC Wing</p>
        <h1 style={titleStyle}>VRC Registry</h1>
        <p style={subtitleStyle}>
          Vault Registry Collectors on file. Active collectors carry the gold checkmark.
        </p>
        <button type="button" onClick={openForm} style={registerButtonStyle}>
          Register as a Collector
        </button>
      </header>

      <main style={listStyle}>
        {sortedCollectors.length === 0 ? (
          <div style={emptyStyle}>
            <p style={bodyStyle}>No collectors registered yet.</p>
          </div>
        ) : (
          sortedCollectors.map((collector) => {
            const expanded = expandedId === collector.id;
            const isActive = collector.exhibit_status === "active";
            return (
              <article key={collector.id} style={cardStyle}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : collector.id)}
                  style={cardHeaderButtonStyle}
                >
                  <div style={cardHeaderRowStyle}>
                    <StatusMark active={isActive} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={vrcNumberStyle}>{collector.vrc_number}</p>
                      <h2 style={collectorNameStyle}>{collector.display_name}</h2>
                    </div>
                    <span style={chevronStyle}>{expanded ? "▴" : "▾"}</span>
                  </div>
                  <div style={metaRowStyle}>
                    <span>{formatLabel(collector.vault_level)}</span>
                    <span>·</span>
                    <span>{formatLabel(collector.bust_color)}</span>
                    <span>·</span>
                    <span>{collector.collector_focus ?? "—"}</span>
                    <span>·</span>
                    <span style={{ color: isActive ? GOLD : "#F5F2EC77" }}>
                      {formatLabel(collector.exhibit_status)}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div style={detailPanelStyle}>
                    <dl style={detailGridStyle}>
                      <div>
                        <dt style={labelStyle}>Strength score</dt>
                        <dd style={valueStyle}>{collector.strength_score}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>Guardian</dt>
                        <dd style={valueStyle}>
                          {collector.is_guardian ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <dt style={labelStyle}>Registered</dt>
                        <dd style={valueStyle}>{formatDate(collector.created_at)}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <footer style={footerStyle}>
        <Link href="/vault/vrc" style={backLinkStyle}>
          ← Back to Collector Wing
        </Link>
      </footer>

      {showForm && (
        <div style={modalOverlayStyle} role="presentation" onClick={() => setShowForm(false)}>
          <div
            style={modalPanelStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vrc-register-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p style={eyebrowStyle}>New collector</p>
            <h2 id="vrc-register-title" style={{ ...titleStyle, fontSize: 20, marginBottom: 16 }}>
              Register as a Collector
            </h2>

            {!canRegister ? (
              <div style={noticeBoxStyle}>
                <p style={bodyStyle}>
                  A verified account is required to register as a Vault Registry Collector.
                </p>
                <Link
                  href="/login?callbackUrl=/vault/vrc/registry"
                  style={{ ...registerButtonStyle, display: "inline-block", marginTop: 20, textDecoration: "none" }}
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ ...secondaryButtonStyle, marginTop: 12, width: "100%" }}
                >
                  Close
                </button>
              </div>
            ) : successNumber ? (
              <div style={successBoxStyle}>
                <p style={{ ...bodyStyle, color: PARCHMENT }}>
                  Collector registration complete.
                </p>
                <p style={{ ...vrcNumberStyle, marginTop: 12 }}>{successNumber}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSuccessNumber(null);
                  }}
                  style={{ ...registerButtonStyle, marginTop: 20 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} style={formStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>First name *</span>
                  <input
                    required
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Last name *</span>
                  <input
                    required
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Middle name</span>
                  <input
                    value={form.middleName}
                    onChange={(event) => updateField("middleName", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Collector focus</span>
                  <input
                    placeholder="e.g. Sports memorabilia · Athletic provenance"
                    value={form.collectorFocus}
                    onChange={(event) => updateField("collectorFocus", event.target.value)}
                    style={inputStyle}
                  />
                </label>

                {formError && <p style={errorStyle}>{formError}</p>}

                <div style={formActionsStyle}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={registerButtonStyle}>
                    {submitting ? "Submitting…" : "Submit registration"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  background: BG,
  color: PARCHMENT,
  fontFamily: SERIF,
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.012) 2px,
      rgba(255,255,255,0.012) 4px
    )
  `,
};

const headerStyle: CSSProperties = {
  padding: "calc(24px + env(safe-area-inset-top, 0px)) 20px 20px",
  textAlign: "center",
  borderBottom: "1px solid #B8972A22",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 10,
  color: "#B8972A88",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 400,
  color: GOLD,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  fontSize: 13,
  color: "#F5F2EC88",
  lineHeight: 1.6,
  maxWidth: 520,
  margin: "12px auto 20px",
};

const registerButtonStyle: CSSProperties = {
  padding: "14px 22px",
  borderRadius: 8,
  border: "none",
  background: GOLD,
  color: BG,
  fontFamily: SERIF,
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const listStyle: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 16px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const emptyStyle: CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  border: "1px solid #B8972A22",
  borderRadius: 10,
  background: "#14100C",
};

const bodyStyle: CSSProperties = {
  fontSize: 14,
  color: "#F5F2EC99",
  margin: 0,
};

const cardStyle: CSSProperties = {
  borderRadius: 10,
  overflow: "hidden",
  border: "1px solid #B8972A33",
  background: "#14100C",
};

const cardHeaderButtonStyle: CSSProperties = {
  width: "100%",
  padding: "16px 16px 14px",
  border: "none",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  cursor: "pointer",
  textAlign: "left",
};

const cardHeaderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
};

const activeMarkStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  flexShrink: 0,
  boxShadow: "0 0 12px rgba(184, 151, 42, 0.35)",
};

const inactiveMarkStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid #F5F2EC33",
  color: "#F5F2EC44",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  flexShrink: 0,
};

const vrcNumberStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const collectorNameStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  margin: "4px 0 0",
  color: PARCHMENT,
};

const chevronStyle: CSSProperties = {
  fontSize: 12,
  color: "#B8972A88",
  paddingTop: 4,
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 10,
  fontSize: 11,
  color: "#F5F2EC77",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const detailPanelStyle: CSSProperties = {
  padding: "0 16px 18px",
  borderTop: "1px solid #B8972A22",
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  margin: "16px 0",
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

const footerStyle: CSSProperties = {
  padding: "16px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
  textAlign: "center",
};

const backLinkStyle: CSSProperties = {
  fontSize: 12,
  color: "#B8972A88",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textDecoration: "none",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(10, 9, 8, 0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 50,
};

const modalPanelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "90dvh",
  overflowY: "auto",
  padding: "24px 20px",
  borderRadius: 12,
  border: "1px solid #B8972A44",
  background: "#14100C",
  boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
};

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 6,
  border: "1px solid #B8972A44",
  background: "#0A0908",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 14,
};

const formActionsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 8,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #B8972A44",
  background: "transparent",
  color: PARCHMENT,
  fontFamily: SERIF,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: "#FF9B9B",
  margin: 0,
};

const successBoxStyle: CSSProperties = {
  padding: "20px 16px",
  borderRadius: 8,
  border: "1px solid #B8972A44",
  background: "#0A0908",
  textAlign: "center",
};

const noticeBoxStyle: CSSProperties = {
  ...successBoxStyle,
  textAlign: "center",
};
