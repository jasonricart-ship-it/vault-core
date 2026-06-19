"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  GOV_TIERS,
  GOV_TIER_LABELS,
  type GovRegistryEntry,
  type GovRegistryOption,
  type GovTier,
} from "@/lib/gov-registry";

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
  govTier: GovTier;
  jurisdiction: string;
  parentGovId: string;
};

const EMPTY_FORM: RegisterForm = {
  name: "",
  shortName: "",
  sport: "",
  govTier: "GOV-N",
  jurisdiction: "",
  parentGovId: "",
};

function StatusMark({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span style={verifiedMarkStyle} title="Verified governing body">
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

export function GovRegistryFloor({
  governingBodies,
  govOptions,
  canRegister,
}: {
  governingBodies: GovRegistryEntry[];
  govOptions: GovRegistryOption[];
  canRegister: boolean;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const groupedByTier = useMemo(() => {
    const groups: Record<GovTier, GovRegistryEntry[]> = {
      "GOV-N": [],
      "GOV-R": [],
      "GOV-L": [],
    };

    for (const gov of governingBodies) {
      const tier = GOV_TIERS.includes(gov.gov_tier as GovTier)
        ? (gov.gov_tier as GovTier)
        : "GOV-L";
      groups[tier].push(gov);
    }

    for (const tier of GOV_TIERS) {
      groups[tier].sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    return groups;
  }, [governingBodies]);

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
      const response = await fetch("/api/gov/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          short_name: form.shortName,
          sport: form.sport,
          gov_tier: form.govTier,
          jurisdiction: form.jurisdiction,
          parent_gov_id: form.parentGovId || null,
        }),
      });

      const data = (await response.json()) as {
        gov_code?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed");
      }

      setSuccessCode(data.gov_code ?? null);
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
        <Link href="/vault/institutions/registry" style={upLinkStyle}>
          ↓ Organizations
        </Link>
        <p style={eyebrowStyle}>Institutional Registry · Upper Floor</p>
        <h1 style={titleStyle}>GOV Registration</h1>
        <p style={subtitleStyle}>
          Governing bodies on file, grouped by tier. Verified bodies carry the gold checkmark.
        </p>
        {canRegister && (
          <button type="button" onClick={() => setShowForm(true)} style={registerButtonStyle}>
            Register Your Governing Body
          </button>
        )}
      </header>

      <main style={listStyle}>
        {governingBodies.length === 0 ? (
          <div style={emptyStyle}>
            <p style={bodyStyle}>No governing bodies registered yet.</p>
          </div>
        ) : (
          GOV_TIERS.map((tier) => {
            const entries = groupedByTier[tier];
            if (entries.length === 0) return null;

            return (
              <section key={tier} style={tierSectionStyle}>
                <h2 style={tierHeadingStyle}>
                  {tier}
                  <span style={tierLabelStyle}> · {GOV_TIER_LABELS[tier]}</span>
                </h2>
                <div style={tierListStyle}>
                  {entries.map((gov) => {
                    const expanded = expandedId === gov.id;
                    return (
                      <article key={gov.id} style={cardStyle}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : gov.id)}
                          style={cardHeaderButtonStyle}
                        >
                          <div style={cardHeaderRowStyle}>
                            <StatusMark verified={gov.is_verified} />
                            <div style={{ flex: 1, textAlign: "left" }}>
                              <p style={govCodeStyle}>{gov.gov_code}</p>
                              <h3 style={govNameStyle}>{gov.name}</h3>
                            </div>
                            <span style={chevronStyle}>{expanded ? "▴" : "▾"}</span>
                          </div>
                          <div style={metaRowStyle}>
                            <span>{gov.sport ?? "—"}</span>
                            <span>·</span>
                            <span>{gov.jurisdiction ?? "—"}</span>
                            <span>·</span>
                            <span>
                              {gov.child_org_count} org{gov.child_org_count === 1 ? "" : "s"}
                            </span>
                          </div>
                        </button>

                        {expanded && (
                          <div style={detailPanelStyle}>
                            <dl style={detailGridStyle}>
                              <div>
                                <dt style={labelStyle}>Short name</dt>
                                <dd style={valueStyle}>{gov.short_name ?? "—"}</dd>
                              </div>
                              <div>
                                <dt style={labelStyle}>Vault level</dt>
                                <dd style={valueStyle}>{gov.vault_level}</dd>
                              </div>
                              <div>
                                <dt style={labelStyle}>Strength score</dt>
                                <dd style={valueStyle}>{gov.strength_score}</dd>
                              </div>
                              <div>
                                <dt style={labelStyle}>Verification</dt>
                                <dd style={valueStyle}>
                                  {gov.is_verified ? "Verified" : "Pending review"}
                                </dd>
                              </div>
                            </dl>

                            <div style={detailBlockStyle}>
                              <p style={sectionLabelStyle}>Parent governing body</p>
                              {!gov.parent ? (
                                <p style={hintStyle}>No parent on file.</p>
                              ) : (
                                <p style={affiliationItemStyle}>
                                  <span style={{ color: GOLD }}>{gov.parent.gov_code}</span>
                                  {" · "}
                                  {gov.parent.name}
                                  {" · "}
                                  {gov.parent.gov_tier}
                                </p>
                              )}
                            </div>

                            <div style={detailBlockStyle}>
                              <p style={sectionLabelStyle}>Child governing bodies</p>
                              {gov.children.length === 0 ? (
                                <p style={hintStyle}>No child governing bodies on file.</p>
                              ) : (
                                <ul style={affiliationListStyle}>
                                  {gov.children.map((child) => (
                                    <li key={child.id} style={affiliationItemStyle}>
                                      <span style={{ color: GOLD }}>{child.gov_code}</span>
                                      {" · "}
                                      {child.name}
                                      {" · "}
                                      {child.gov_tier}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div style={detailBlockStyle}>
                              <p style={sectionLabelStyle}>Affiliated organizations</p>
                              {gov.org_affiliations.length === 0 ? (
                                <p style={hintStyle}>No affiliated organizations on file.</p>
                              ) : (
                                <ul style={affiliationListStyle}>
                                  {gov.org_affiliations.map((affiliation) => (
                                    <li
                                      key={`${gov.id}-${affiliation.org_code}`}
                                      style={affiliationItemStyle}
                                    >
                                      <span style={{ color: GOLD }}>{affiliation.org_code}</span>
                                      {" · "}
                                      {affiliation.name}
                                      {" · "}
                                      {formatOrgType(affiliation.org_type)}
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
                  })}
                </div>
              </section>
            );
          })
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
            aria-labelledby="gov-register-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p style={eyebrowStyle}>Vault authority admission</p>
            <h2 id="gov-register-title" style={{ ...titleStyle, fontSize: 20, marginBottom: 16 }}>
              Register Governing Body
            </h2>

            {successCode ? (
              <div style={successBoxStyle}>
                <p style={{ ...bodyStyle, color: PARCHMENT }}>
                  Governing body admitted to the registry.
                </p>
                <p style={{ ...govCodeStyle, marginTop: 12 }}>{successCode}</p>
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
                  <span style={labelStyle}>Governing body name *</span>
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
                  <span style={labelStyle}>Gov tier *</span>
                  <select
                    required
                    value={form.govTier}
                    onChange={(event) =>
                      updateField("govTier", event.target.value as GovTier)
                    }
                    style={inputStyle}
                  >
                    {GOV_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier} — {GOV_TIER_LABELS[tier]}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Jurisdiction *</span>
                  <input
                    required
                    placeholder="United States, Ohio, Midwest…"
                    value={form.jurisdiction}
                    onChange={(event) => updateField("jurisdiction", event.target.value)}
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Parent governing body</span>
                  <select
                    value={form.parentGovId}
                    onChange={(event) => updateField("parentGovId", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">None</option>
                    {govOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.gov_code} · {option.name} ({option.gov_tier})
                      </option>
                    ))}
                  </select>
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
  gap: 24,
};

const tierSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const tierHeadingStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
  paddingBottom: 8,
  borderBottom: "1px solid #B8972A33",
};

const tierLabelStyle: CSSProperties = {
  color: "#F5F2EC66",
  fontWeight: 400,
};

const tierListStyle: CSSProperties = {
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

const govCodeStyle: CSSProperties = {
  fontSize: 10,
  color: GOLD,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  margin: 0,
};

const govNameStyle: CSSProperties = {
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

const detailBlockStyle: CSSProperties = {
  marginBottom: 16,
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
  margin: 0,
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
