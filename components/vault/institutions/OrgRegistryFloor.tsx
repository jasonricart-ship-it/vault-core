"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ORG_TYPES, type OrgRegistryEntry } from "@/lib/org-registry";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const SPORTS = [
  "Volleyball",
  "Ice Hockey",
  "Basketball",
  "Soccer",
  "Baseball",
  "Lacrosse",
  "Football",
  "Wrestling",
  "Tennis",
  "Swimming",
  "Other",
] as const;

type RegisterForm = {
  name: string;
  shortName: string;
  sport: string;
  orgType: string;
  state: string;
  city: string;
  adminEmail: string;
};

const EMPTY_FORM: RegisterForm = {
  name: "",
  shortName: "",
  sport: "",
  orgType: "club",
  state: "",
  city: "",
  adminEmail: "",
};

function StatusMark({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span style={verifiedMarkStyle} title="Verified organization">
        ✓
      </span>
    );
  }
  return (
    <span style={pendingMarkStyle} title="Pending verification">
      ○
    </span>
  );
}

function formatOrgType(value: string) {
  return value.replace(/_/g, " ").toUpperCase();
}

export function OrgRegistryFloor({ organizations }: { organizations: OrgRegistryEntry[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const sortedOrgs = useMemo(
    () =>
      [...organizations].sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [organizations],
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
    setSuccessCode(null);

    try {
      const response = await fetch("/api/org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          short_name: form.shortName,
          sport: form.sport,
          org_type: form.orgType,
          state: form.state,
          city: form.city,
          admin_email: form.adminEmail,
        }),
      });

      const data = (await response.json()) as {
        org_code?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      setSuccessCode(data.org_code ?? null);
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
          <Link href="/vault/institutions/registry/gov" style={upLinkStyle}>
            ↑ Governing Bodies
          </Link>
          <Link href="/vault/institutions/registry/evt" style={upLinkStyle}>
            ↑ Events
          </Link>
        </nav>
        <p style={eyebrowStyle}>Institutional Registry · Ground Floor</p>
        <h1 style={titleStyle}>ORG Registration</h1>
        <p style={subtitleStyle}>
          Registered organizations on file. Verified institutions carry the gold checkmark.
        </p>
        <button type="button" onClick={() => setShowForm(true)} style={registerButtonStyle}>
          Register Your Organization
        </button>
      </header>

      <main style={listStyle}>
        {sortedOrgs.length === 0 ? (
          <div style={emptyStyle}>
            <p style={bodyStyle}>No organizations registered yet.</p>
          </div>
        ) : (
          sortedOrgs.map((org) => {
            const expanded = expandedId === org.id;
            return (
              <article key={org.id} style={cardStyle}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : org.id)}
                  style={cardHeaderButtonStyle}
                >
                  <div style={cardHeaderRowStyle}>
                    <StatusMark verified={org.is_verified} />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={orgCodeStyle}>{org.org_code}</p>
                      <h2 style={orgNameStyle}>{org.name}</h2>
                    </div>
                    <span style={chevronStyle}>{expanded ? "▴" : "▾"}</span>
                  </div>
                  <div style={metaRowStyle}>
                    <span>{org.sport ?? "—"}</span>
                    <span>·</span>
                    <span>{formatOrgType(org.org_type)}</span>
                    <span>·</span>
                    <span>{org.state ?? "—"}</span>
                    <span>·</span>
                    <span style={{ color: org.is_verified ? GOLD : "#F5F2EC77" }}>
                      {org.registration_status}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div style={detailPanelStyle}>
                    <dl style={detailGridStyle}>
                      <div>
                        <dt style={labelStyle}>Short name</dt>
                        <dd style={valueStyle}>{org.short_name ?? "—"}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>City</dt>
                        <dd style={valueStyle}>{org.city ?? "—"}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>Vault level</dt>
                        <dd style={valueStyle}>{org.vault_level}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>Strength score</dt>
                        <dd style={valueStyle}>{org.strength_score}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>Player affiliations</dt>
                        <dd style={valueStyle}>{org.player_count}</dd>
                      </div>
                      <div>
                        <dt style={labelStyle}>Verification</dt>
                        <dd style={valueStyle}>
                          {org.is_verified ? "Verified" : "Pending review"}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p style={sectionLabelStyle}>GOV affiliations</p>
                      {org.gov_affiliations.length === 0 ? (
                        <p style={hintStyle}>No governing body affiliations on file.</p>
                      ) : (
                        <ul style={affiliationListStyle}>
                          {org.gov_affiliations.map((affiliation) => (
                            <li key={`${org.id}-${affiliation.gov_code}`} style={affiliationItemStyle}>
                              <span style={{ color: GOLD }}>{affiliation.gov_code}</span>
                              {" · "}
                              {affiliation.name}
                              {" · "}
                              {affiliation.gov_tier}
                              {affiliation.verified ? " · verified" : " · unverified"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <footer style={footerStyle}>
        <Link href="/vault/institutions" style={backLinkStyle}>
          ← Return to the Lobby
        </Link>
      </footer>

      {showForm && (
        <div style={modalOverlayStyle} role="presentation" onClick={() => setShowForm(false)}>
          <div
            style={modalPanelStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-register-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p style={eyebrowStyle}>New institution</p>
            <h2 id="org-register-title" style={{ ...titleStyle, fontSize: 20, marginBottom: 16 }}>
              Register Organization
            </h2>

            {successCode ? (
              <div style={successBoxStyle}>
                <p style={{ ...bodyStyle, color: PARCHMENT }}>
                  Organization submitted for review.
                </p>
                <p style={{ ...orgCodeStyle, marginTop: 12 }}>{successCode}</p>
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
                  <span style={labelStyle}>Organization name *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Short name</span>
                  <input
                    value={form.shortName}
                    onChange={(event) => updateField("shortName", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Sport *</span>
                  <select
                    required
                    value={form.sport}
                    onChange={(event) => updateField("sport", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select sport…</option>
                    {SPORTS.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Organization type *</span>
                  <select
                    required
                    value={form.orgType}
                    onChange={(event) => updateField("orgType", event.target.value)}
                    style={inputStyle}
                  >
                    {ORG_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatOrgType(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={twoColStyle}>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>State *</span>
                    <input
                      required
                      placeholder="OH or Ohio"
                      value={form.state}
                      onChange={(event) => updateField("state", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>City</span>
                    <input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                </div>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Admin email *</span>
                  <input
                    required
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => updateField("adminEmail", event.target.value)}
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

const upLinkStyle: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textDecoration: "none",
};

const navLinksStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
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

const orgCodeStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const orgNameStyle: CSSProperties = {
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

const sectionLabelStyle: CSSProperties = {
  ...labelStyle,
  marginBottom: 8,
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: "#F5F2EC66",
  margin: 0,
};

const affiliationListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const affiliationItemStyle: CSSProperties = {
  fontSize: 13,
  color: "#F5F2EC99",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #B8972A22",
  background: "#0A0908",
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
