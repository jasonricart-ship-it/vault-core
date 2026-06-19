"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import type {
  EvtRegistryEntry,
  EvtRegistryGovOption,
  EvtRegistryOrgGroup,
  EvtRegistryOrgOption,
} from "@/lib/evt-registry";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

type RegisterForm = {
  orgId: string;
  govId: string;
  name: string;
  seasonYear: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
  state: string;
};

const EMPTY_FORM: RegisterForm = {
  orgId: "",
  govId: "",
  name: "",
  seasonYear: String(new Date().getFullYear()),
  startDate: "",
  endDate: "",
  location: "",
  city: "",
  state: "",
};

function StatusMark({ active }: { active: boolean }) {
  if (active) {
    return (
      <span style={verifiedMarkStyle} title="Active event">
        ✓
      </span>
    );
  }
  return (
    <span style={pendingMarkStyle} title="Inactive event">
      ○
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isActiveEvent(status: string) {
  return status.toLowerCase() === "active";
}

export function EvtRegistryFloor({
  events,
  orgOptions,
  govOptions,
  canRegister,
}: {
  events: EvtRegistryEntry[];
  orgOptions: EvtRegistryOrgOption[];
  govOptions: EvtRegistryGovOption[];
  canRegister: boolean;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const groupedByOrg = useMemo(() => {
    const groups = new Map<string, EvtRegistryOrgGroup>();

    for (const event of events) {
      const existing = groups.get(event.org_id);
      if (existing) {
        existing.events.push(event);
      } else {
        groups.set(event.org_id, {
          org_id: event.org_id,
          org_code: event.org_code,
          org_name: event.org_name,
          events: [event],
        });
      }
    }

    return [...groups.values()].sort((a, b) => a.org_name.localeCompare(b.org_name));
  }, [events]);

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
    setSuccessCode(null);

    try {
      const response = await fetch("/api/evt/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: form.orgId,
          gov_id: form.govId || null,
          name: form.name,
          season_year: Number(form.seasonYear),
          start_date: form.startDate,
          end_date: form.endDate,
          location: form.location || null,
          city: form.city || null,
          state: form.state || null,
        }),
      });

      const data = (await response.json()) as {
        evt_code?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      setSuccessCode(data.evt_code ?? null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <nav style={navLinksStyle}>
          <Link href="/vault/institutions/registry" style={upLinkStyle}>
            ↓ Organizations
          </Link>
          <Link href="/vault/institutions/registry/gov" style={upLinkStyle}>
            ↑ Governing Bodies
          </Link>
        </nav>
        <p style={eyebrowStyle}>Institutional Registry · Event Floor</p>
        <h1 style={titleStyle}>EVT Registration</h1>
        <p style={subtitleStyle}>
          Events on file, grouped by organization. Active events carry the gold checkmark.
        </p>
        {canRegister && (
          <button type="button" onClick={() => setShowForm(true)} style={registerButtonStyle}>
            Register an Event
          </button>
        )}
      </header>

      <main style={listStyle}>
        {events.length === 0 ? (
          <div style={emptyStyle}>
            <p style={bodyStyle}>No events registered yet.</p>
          </div>
        ) : (
          groupedByOrg.map((group) => (
            <section key={group.org_id} style={orgSectionStyle}>
              <h2 style={orgHeadingStyle}>
                <span style={{ color: GOLD }}>{group.org_code}</span>
                <span style={orgLabelStyle}> · {group.org_name}</span>
              </h2>
              <div style={orgListStyle}>
                {group.events.map((evt) => {
                  const expanded = expandedId === evt.id;
                  const active = isActiveEvent(evt.registration_status);

                  return (
                    <article key={evt.id} style={cardStyle}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : evt.id)}
                        style={cardHeaderButtonStyle}
                      >
                        <div style={cardHeaderRowStyle}>
                          <StatusMark active={active} />
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <p style={evtCodeStyle}>{evt.evt_code}</p>
                            <h3 style={evtNameStyle}>{evt.name}</h3>
                          </div>
                          <span style={chevronStyle}>{expanded ? "▴" : "▾"}</span>
                        </div>
                        <div style={metaRowStyle}>
                          <span>{evt.season_year}</span>
                          <span>·</span>
                          <span>{formatDate(evt.start_date)}</span>
                          <span>→</span>
                          <span>{formatDate(evt.end_date)}</span>
                          <span>·</span>
                          <span>{evt.location ?? evt.city ?? "—"}</span>
                          {evt.city && evt.state && (
                            <>
                              <span>·</span>
                              <span>
                                {evt.city}, {evt.state}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span style={{ color: active ? GOLD : "#F5F2EC77" }}>
                            {evt.registration_status}
                          </span>
                        </div>
                      </button>

                      {expanded && (
                        <div style={detailPanelStyle}>
                          <dl style={detailGridStyle}>
                            <div>
                              <dt style={labelStyle}>Organization</dt>
                              <dd style={valueStyle}>
                                {evt.org_code} · {evt.org_name}
                              </dd>
                            </div>
                            <div>
                              <dt style={labelStyle}>Gov affiliation</dt>
                              <dd style={valueStyle}>
                                {evt.gov_affiliation ? (
                                  <>
                                    {evt.gov_affiliation.gov_code} · {evt.gov_affiliation.name} ·{" "}
                                    {evt.gov_affiliation.gov_tier}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt style={labelStyle}>Player participation</dt>
                              <dd style={valueStyle}>{evt.player_participation_count}</dd>
                            </div>
                            <div>
                              <dt style={labelStyle}>Achievements</dt>
                              <dd style={valueStyle}>{evt.achievements_count}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <footer style={footerStyle}>
        <Link href="/vault/institutions" style={backLinkStyle}>
          ← Return to the Lobby
        </Link>
      </footer>

      {showForm && canRegister && (
        <div style={modalOverlayStyle} role="presentation" onClick={() => setShowForm(false)}>
          <div
            style={modalPanelStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evt-register-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p style={eyebrowStyle}>Event admission</p>
            <h2 id="evt-register-title" style={{ ...titleStyle, fontSize: 20, marginBottom: 16 }}>
              Register Event
            </h2>

            {successCode ? (
              <div style={successBoxStyle}>
                <p style={{ ...bodyStyle, color: PARCHMENT }}>Event registered successfully.</p>
                <p style={{ ...evtCodeStyle, marginTop: 12 }}>{successCode}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSuccessCode(null);
                  }}
                  style={{ ...registerButtonStyle, marginTop: 20 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} style={formStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Organization *</span>
                  <select
                    required
                    value={form.orgId}
                    onChange={(event) => updateField("orgId", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select organization…</option>
                    {orgOptions.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.org_code} · {org.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Governing body</span>
                  <select
                    value={form.govId}
                    onChange={(event) => updateField("govId", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">None</option>
                    {govOptions.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {gov.gov_code} · {gov.name} ({gov.gov_tier})
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Event name *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Season year *</span>
                  <input
                    required
                    type="number"
                    min={1900}
                    max={9999}
                    value={form.seasonYear}
                    onChange={(event) => updateField("seasonYear", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <div style={twoColStyle}>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>Start date *</span>
                    <input
                      required
                      type="date"
                      value={form.startDate}
                      onChange={(event) => updateField("startDate", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>End date *</span>
                    <input
                      required
                      type="date"
                      value={form.endDate}
                      onChange={(event) => updateField("endDate", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Location</span>
                  <input
                    value={form.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <div style={twoColStyle}>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>City</span>
                    <input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>State</span>
                    <input
                      value={form.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                </div>

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

const navLinksStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
};

const upLinkStyle: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textDecoration: "none",
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
  gap: 24,
};

const orgSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const orgHeadingStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: PARCHMENT,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
  paddingBottom: 8,
  borderBottom: "1px solid #B8972A33",
};

const orgLabelStyle: CSSProperties = {
  color: "#F5F2EC66",
  fontWeight: 400,
};

const orgListStyle: CSSProperties = {
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

const verifiedMarkStyle: CSSProperties = {
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

const pendingMarkStyle: CSSProperties = {
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

const evtCodeStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const evtNameStyle: CSSProperties = {
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
  margin: "16px 0 0",
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

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
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
