"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { projectEvidenceClassForFile } from "@/lib/evidence-preview";
import type { GumSubmitContextPlayer } from "@/lib/gum-submit-context";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const STONE = "#1A1208";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const ITEM_TYPES = [
  "jersey",
  "stick",
  "puck",
  "helmet",
  "gloves",
  "skates",
  "equipment",
  "award",
  "document",
  "other",
] as const;

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
]);

const STEPS = [
  { id: 1, label: "Item Details" },
  { id: 2, label: "Evidence Upload" },
  { id: 3, label: "Review & Submit" },
] as const;

const fieldWrap: React.CSSProperties = {
  background: STONE,
  border: "0.5px solid #B8972A22",
  borderRadius: 2,
  padding: "10px 14px",
  marginBottom: 12,
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 9,
  color: GOLD,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: SERIF,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: PARCHMENT,
  fontSize: 14,
  fontFamily: SERIF,
  padding: 0,
};

export type { GumSubmitContextPlayer };

type GumSubmitFlowProps = {
  players: GumSubmitContextPlayer[];
  showPlayerSelector?: boolean;
};

type EvidenceEntry = {
  file: File;
  projectedClass: string;
  loading: boolean;
};

function classBadgeColor(evidenceClass: string) {
  const value = evidenceClass.toUpperCase();
  if (value.startsWith("E1")) return GOLD;
  if (value.startsWith("E2")) return "#C0C8D4";
  return "#6A6258";
}

export function GumSubmitFlow({
  players,
  showPlayerSelector = false,
}: GumSubmitFlowProps) {
  const [step, setStep] = useState(1);
  const [playerId, setPlayerId] = useState(
    showPlayerSelector ? "" : (players[0]?.id ?? ""),
  );
  const [itemType, setItemType] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [ownerStatement, setOwnerStatement] = useState("");
  const [evtId, setEvtId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgManual, setOrgManual] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ gum_code: string } | null>(null);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === playerId) ?? null,
    [players, playerId],
  );

  const selectedEvent = useMemo(
    () => selectedPlayer?.events.find((event) => event.id === evtId) ?? null,
    [selectedPlayer, evtId],
  );

  const selectedOrg = useMemo(
    () => selectedPlayer?.orgs.find((org) => org.id === orgId) ?? null,
    [selectedPlayer, orgId],
  );

  useEffect(() => {
    if (!selectedEvent || orgManual) return;
    setOrgId(selectedEvent.org_id);
  }, [selectedEvent, orgManual]);

  const ownerCharsLeft = 200 - ownerStatement.length;

  const addEvidenceFiles = useCallback(async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const valid = incoming.filter((file) => ACCEPTED_MIME_TYPES.has(file.type));

    if (valid.length !== incoming.length) {
      setError(
        "Some files were skipped. Accepted: JPEG, PNG, HEIC, MP4, MOV, PDF.",
      );
    } else {
      setError(null);
    }

    let addedFiles: File[] = [];

    setEvidence((current) => {
      const remaining = Math.max(0, 5 - current.length);
      const nextFiles = valid.slice(0, remaining);
      addedFiles = nextFiles;
      return [
        ...current,
        ...nextFiles.map((file) => ({
          file,
          projectedClass: "…",
          loading: true,
        })),
      ];
    });

    for (const file of addedFiles) {
      const projectedClass = await projectEvidenceClassForFile(file, false);
      setEvidence((current) =>
        current.map((entry) =>
          entry.file === file
            ? { ...entry, projectedClass, loading: false }
            : entry,
        ),
      );
    }
  }, []);

  const removeEvidence = (index: number) => {
    setEvidence((current) => current.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!playerId) return "Select a player.";
    if (!itemType) return "Select an item type.";
    if (!itemDescription.trim()) return "Enter an item description.";
    if (!ownerStatement.trim()) return "Owner statement is required.";
    if (ownerStatement.length > 200) {
      return "Owner statement must be 200 characters or fewer.";
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const message = validateStep1();
      if (message) {
        setError(message);
        return;
      }
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const handleSubmit = async () => {
    const message = validateStep1();
    if (message) {
      setError(message);
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const gumRes = await fetch("/api/gum/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          item_type: itemType,
          item_description: itemDescription.trim(),
          owner_statement: ownerStatement.trim(),
          org_id: orgId || null,
          evt_id: evtId || null,
        }),
      });

      const gumData = await gumRes.json();
      if (!gumRes.ok) {
        throw new Error(gumData.error ?? "Failed to submit GUM item");
      }

      for (const entry of evidence) {
        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("entity_type", "gum_item");
        formData.append("entity_id", gumData.gum_item_id);
        formData.append("declared_class", entry.projectedClass);

        const uploadRes = await fetch("/api/evidence/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          throw new Error(
            uploadData.error ??
              `Failed to upload evidence file: ${entry.file.name}`,
          );
        }
      }

      setSuccess({ gum_code: gumData.gum_code });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Submission failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <p
          style={{
            fontSize: 10,
            color: "#B8972A66",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 20px",
          }}
        >
          Submission received
        </p>
        <p
          style={{
            fontSize: 28,
            color: GOLD,
            letterSpacing: "0.12em",
            margin: "0 0 16px",
            fontFamily: SERIF,
          }}
        >
          {success.gum_code}
        </p>
        <p
          style={{
            fontSize: 14,
            color: PARCHMENT,
            lineHeight: 1.7,
            maxWidth: 420,
            margin: "0 auto 32px",
            fontFamily: SERIF,
          }}
        >
          Your item has been submitted for review. It will appear in your corridor
          once admitted.
        </p>
        {selectedPlayer && (
          <Link
            href={`/vault/ppc/${selectedPlayer.ppc_number}`}
            style={{
              display: "inline-block",
              border: `0.5px solid ${GOLD}`,
              color: GOLD,
              fontSize: 12,
              fontFamily: SERIF,
              letterSpacing: "0.2em",
              padding: "14px 28px",
              textTransform: "uppercase",
              textDecoration: "none",
              marginRight: 12,
            }}
          >
            View corridor
          </Link>
        )}
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            border: "0.5px solid #B8972A44",
            color: "#B8972A99",
            fontSize: 12,
            fontFamily: SERIF,
            letterSpacing: "0.2em",
            padding: "14px 28px",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
        aria-label="Submission steps"
      >
        {STEPS.map((entry) => {
          const active = step === entry.id;
          const complete = step > entry.id;
          return (
            <div
              key={entry.id}
              style={{
                border: `0.5px solid ${active || complete ? GOLD : "#B8972A33"}`,
                color: active ? GOLD : complete ? "#B8972A99" : "#B8972A55",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "8px 12px",
                fontFamily: SERIF,
                background: active ? "#B8972A11" : "transparent",
              }}
            >
              {entry.id}. {entry.label}
            </div>
          );
        })}
      </nav>

      {error && (
        <p
          style={{
            color: "#C47A6A",
            fontSize: 12,
            marginBottom: 16,
            fontFamily: SERIF,
          }}
        >
          {error}
        </p>
      )}

      {step === 1 && (
        <section>
          {(showPlayerSelector || players.length > 1) && (
            <div style={fieldWrap}>
              <label style={labelStyle} htmlFor="gum-player">
                Player
              </label>
              <select
                id="gum-player"
                value={playerId}
                onChange={(e) => {
                  setPlayerId(e.target.value);
                  setEvtId("");
                  setOrgId("");
                  setOrgManual(false);
                }}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {showPlayerSelector && <option value="">Select player…</option>}
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.display_name} ({player.ppc_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={fieldWrap}>
            <label style={labelStyle} htmlFor="gum-item-type">
              Item Type
            </label>
            <select
              id="gum-item-type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Select type…</option>
              {ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle} htmlFor="gum-description">
              Item Description
            </label>
            <input
              id="gum-description"
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Describe the artifact"
              style={inputStyle}
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle} htmlFor="gum-owner-statement">
              Owner Statement
            </label>
            <textarea
              id="gum-owner-statement"
              required
              maxLength={200}
              rows={4}
              value={ownerStatement}
              onChange={(e) => setOwnerStatement(e.target.value)}
              placeholder="Your statement of ownership and provenance"
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 88,
              }}
            />
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 10,
                color: ownerCharsLeft < 20 ? "#C47A6A" : "#B8972A88",
                textAlign: "right",
                fontFamily: SERIF,
              }}
            >
              {ownerCharsLeft} characters remaining
            </p>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle} htmlFor="gum-evt">
              Linked EVT (optional)
            </label>
            <select
              id="gum-evt"
              value={evtId}
              onChange={(e) => {
                setEvtId(e.target.value);
                setOrgManual(false);
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">No linked event</option>
              {selectedPlayer?.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {event.evt_code} ({event.season_year})
                </option>
              ))}
            </select>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle} htmlFor="gum-org">
              Linked ORG
            </label>
            <select
              id="gum-org"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setOrgManual(true);
              }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">No linked organization</option>
              {selectedPlayer?.orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.org_code})
                </option>
              ))}
            </select>
            {selectedEvent && !orgManual && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 10,
                  color: "#B8972A88",
                  fontFamily: SERIF,
                }}
              >
                Auto-populated from {selectedEvent.evt_code}
              </p>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <p
            style={{
              fontSize: 12,
              color: "#F5F2EC88",
              lineHeight: 1.6,
              marginBottom: 20,
              fontFamily: SERIF,
            }}
          >
            Upload up to 5 evidence files. JPEG, PNG, HEIC, MP4, MOV, and PDF are
            accepted. Projected evidence class is shown from embedded metadata.
          </p>

          <label
            style={{
              display: "block",
              border: `1px dashed ${GOLD}55`,
              padding: 28,
              textAlign: "center",
              cursor: evidence.length >= 5 ? "not-allowed" : "pointer",
              opacity: evidence.length >= 5 ? 0.5 : 1,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: GOLD,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: SERIF,
              }}
            >
              Select files ({evidence.length}/5)
            </span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/heic,video/mp4,video/quicktime,application/pdf"
              disabled={evidence.length >= 5}
              onChange={(e) => {
                if (e.target.files?.length) {
                  void addEvidenceFiles(e.target.files);
                  e.target.value = "";
                }
              }}
              style={{ display: "none" }}
            />
          </label>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {evidence.map((entry, index) => (
              <li
                key={`${entry.file.name}-${index}`}
                style={{
                  ...fieldWrap,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: PARCHMENT,
                      fontFamily: SERIF,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.file.name}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 10,
                      color: classBadgeColor(entry.projectedClass),
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: SERIF,
                    }}
                  >
                    {entry.loading
                      ? "Reading metadata…"
                      : `Projected: ${entry.projectedClass}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeEvidence(index)}
                  style={{
                    background: "transparent",
                    border: "0.5px solid #B8972A44",
                    color: "#B8972A99",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontFamily: SERIF,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 3 && (
        <section>
          <div
            style={{
              ...fieldWrap,
              marginBottom: 20,
            }}
          >
            <p style={{ ...labelStyle, marginBottom: 12 }}>Item summary</p>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: 10,
                fontFamily: SERIF,
                fontSize: 13,
                color: PARCHMENT,
              }}
            >
              <div>
                <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                  PLAYER
                </dt>
                <dd style={{ margin: "4px 0 0" }}>
                  {selectedPlayer?.display_name} ({selectedPlayer?.ppc_number})
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                  TYPE
                </dt>
                <dd style={{ margin: "4px 0 0", textTransform: "capitalize" }}>
                  {itemType}
                </dd>
              </div>
              <div>
                <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                  DESCRIPTION
                </dt>
                <dd style={{ margin: "4px 0 0" }}>{itemDescription}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                  OWNER STATEMENT
                </dt>
                <dd style={{ margin: "4px 0 0", lineHeight: 1.5 }}>
                  {ownerStatement}
                </dd>
              </div>
              {selectedEvent && (
                <div>
                  <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                    EVENT
                  </dt>
                  <dd style={{ margin: "4px 0 0" }}>
                    {selectedEvent.name} ({selectedEvent.evt_code})
                  </dd>
                </div>
              )}
              {selectedOrg && (
                <div>
                  <dt style={{ fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em" }}>
                    ORGANIZATION
                  </dt>
                  <dd style={{ margin: "4px 0 0" }}>
                    {selectedOrg.name} ({selectedOrg.org_code})
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div style={fieldWrap}>
            <p style={{ ...labelStyle, marginBottom: 12 }}>Evidence ({evidence.length})</p>
            {evidence.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#F5F2EC66", fontFamily: SERIF }}>
                No evidence files attached.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {evidence.map((entry, index) => (
                  <li
                    key={`${entry.file.name}-review-${index}`}
                    style={{
                      fontSize: 12,
                      color: PARCHMENT,
                      marginBottom: 8,
                      fontFamily: SERIF,
                    }}
                  >
                    {entry.file.name}{" "}
                    <span style={{ color: classBadgeColor(entry.projectedClass) }}>
                      · {entry.projectedClass}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 28,
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            style={{
              flex: 1,
              background: "transparent",
              border: "0.5px solid #B8972A44",
              color: "#B8972A99",
              fontSize: 12,
              fontFamily: SERIF,
              letterSpacing: "0.18em",
              padding: "14px 20px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Back
          </button>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              flex: 1,
              background: "transparent",
              border: `0.5px solid ${GOLD}`,
              color: GOLD,
              fontSize: 12,
              fontFamily: SERIF,
              letterSpacing: "0.18em",
              padding: "14px 20px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{
              flex: 1,
              background: submitting ? "#B8972A22" : "transparent",
              border: `0.5px solid ${GOLD}`,
              color: GOLD,
              fontSize: 12,
              fontFamily: SERIF,
              letterSpacing: "0.18em",
              padding: "14px 20px",
              cursor: submitting ? "wait" : "pointer",
              textTransform: "uppercase",
            }}
          >
            {submitting ? "Submitting…" : "Submit for admission"}
          </button>
        )}
      </div>
    </div>
  );
}
