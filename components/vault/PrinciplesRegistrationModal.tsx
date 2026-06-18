"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const STONE = "#1A1208";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const SPORTS = [
  "Ice Hockey",
  "Volleyball",
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

type PrinciplesRegistrationModalProps = {
  open: boolean;
  acknowledgedAt: string;
  onClose: () => void;
  onSuccess: (ppcNumber: string) => void;
};

export function PrinciplesRegistrationModal({
  open,
  acknowledgedAt,
  onClose,
  onSuccess,
}: PrinciplesRegistrationModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    ppc_number: string;
    first_name: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [primarySport, setPrimarySport] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianFirstName, setGuardianFirstName] = useState("");
  const [guardianLastName, setGuardianLastName] = useState("");

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setPreferredName("");
    setDateOfBirth("");
    setPrimarySport("");
    setGuardianEmail("");
    setGuardianFirstName("");
    setGuardianLastName("");
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/ppc/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          preferredName: preferredName || null,
          dateOfBirth,
          primarySport,
          guardianEmail,
          guardianFirstName,
          guardianLastName,
          acknowledgedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }

      setSuccess({
        ppc_number: data.ppc_number,
        first_name: data.first_name,
      });
      onSuccess(data.ppc_number);
    } catch {
      setError("Unable to reach the archive. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={handleClose}
      role="presentation"
    >
      <div
        style={{
          background: BG,
          border: "0.5px solid #B8972A44",
          borderRadius: 4,
          padding: 40,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
      >
        {success ? (
          <div style={{ textAlign: "center", fontFamily: SERIF }}>
            <p
              style={{
                fontSize: 24,
                color: GOLD,
                fontWeight: 700,
                letterSpacing: "0.2em",
                margin: "0 0 24px",
              }}
            >
              {success.ppc_number}
            </p>
            <p
              style={{
                fontSize: 14,
                color: PARCHMENT,
                fontStyle: "italic",
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              {success.first_name} has been entered into the permanent record.
            </p>
            <p
              style={{
                fontSize: 12,
                color: GOLD,
                letterSpacing: "0.18em",
                margin: "0 0 32px",
              }}
            >
              Your record is here. Forever.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/vault/ppc/${success.ppc_number}`)}
              style={{
                display: "block",
                width: "100%",
                background: "transparent",
                border: `0.5px solid ${GOLD}`,
                color: GOLD,
                fontSize: 13,
                fontFamily: SERIF,
                letterSpacing: "0.2em",
                padding: "14px 32px",
                cursor: "pointer",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              VIEW YOUR CORRIDOR
            </button>
            <button
              type="button"
              onClick={() => router.push("/vault/atrium")}
              style={{
                display: "block",
                width: "100%",
                background: "transparent",
                border: "0.5px solid #B8972A44",
                color: "#B8972A99",
                fontSize: 13,
                fontFamily: SERIF,
                letterSpacing: "0.2em",
                padding: "14px 32px",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              RETURN TO THE ATRIUM
            </button>
          </div>
        ) : (
          <>
            <h2
              id="register-modal-title"
              style={{
                fontSize: 16,
                color: GOLD,
                letterSpacing: "0.22em",
                fontWeight: "normal",
                textTransform: "uppercase",
                margin: "0 0 8px",
                fontFamily: SERIF,
              }}
            >
              Register a Player
            </h2>
            <p
              style={{
                fontSize: 10,
                color: "#B8972A66",
                letterSpacing: "0.18em",
                margin: "0 0 32px",
                fontFamily: SERIF,
              }}
            >
              Personal Player Collection · The Vault™
            </p>

            <form onSubmit={handleSubmit}>
              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-first-name">
                  First Name
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  required
                  placeholder="Legal first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-last-name">
                  Last Name
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-preferred-name">
                  Preferred Name
                </label>
                <input
                  id="reg-preferred-name"
                  type="text"
                  placeholder="Optional — nickname or callsign"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-dob">
                  Date of Birth
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-sport">
                  Primary Sport
                </label>
                <select
                  id="reg-sport"
                  required
                  value={primarySport}
                  onChange={(e) => setPrimarySport(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="" disabled>
                    Select sport
                  </option>
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport} style={{ background: STONE }}>
                      {sport}
                    </option>
                  ))}
                </select>
                <p
                  style={{
                    fontSize: 8,
                    color: "#F5F2EC66",
                    fontStyle: "italic",
                    margin: "8px 0 0",
                    lineHeight: 1.6,
                    fontFamily: SERIF,
                  }}
                >
                  Primary sport at enrollment. Additional sports may be submitted after registration
                  is approved.
                </p>
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-guardian-first-name">
                  Guardian First Name
                </label>
                <input
                  id="reg-guardian-first-name"
                  type="text"
                  required
                  value={guardianFirstName}
                  onChange={(e) => setGuardianFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-guardian-last-name">
                  Guardian Last Name
                </label>
                <input
                  id="reg-guardian-last-name"
                  type="text"
                  required
                  value={guardianLastName}
                  onChange={(e) => setGuardianLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle} htmlFor="reg-guardian-email">
                  Guardian Email
                </label>
                <input
                  id="reg-guardian-email"
                  type="email"
                  required
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  style={inputStyle}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "#F5F2EC44",
                    margin: "8px 0 0",
                    fontFamily: SERIF,
                  }}
                >
                  Required for players under 18
                </p>
              </div>

              {error && (
                <p
                  style={{
                    color: "#C47070",
                    fontSize: 12,
                    fontFamily: SERIF,
                    margin: "0 0 16px",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: `0.5px solid ${GOLD}`,
                  color: GOLD,
                  fontSize: 13,
                  fontFamily: SERIF,
                  letterSpacing: "0.2em",
                  padding: "14px 32px",
                  cursor: submitting ? "wait" : "pointer",
                  textTransform: "uppercase",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Establishing record…" : "Establish the Record"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 16,
                  background: "none",
                  border: "none",
                  color: "#B8972A44",
                  fontSize: 9,
                  fontFamily: SERIF,
                  letterSpacing: "0.14em",
                  cursor: "pointer",
                }}
              >
                ← Return to the Principles
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
