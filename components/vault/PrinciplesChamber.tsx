"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VAULT_PRINCIPLES } from "@/lib/vault-principles";
import { PrinciplesRegistrationModal } from "./PrinciplesRegistrationModal";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const STONE = "#1A1208";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

function GoldRule() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${GOLD}`,
        opacity: 0.45,
        margin: "48px auto",
        maxWidth: 720,
        width: "100%",
      }}
    />
  );
}

function PrincipleCard({
  numeral,
  title,
  text,
}: {
  numeral: string;
  title: string;
  text: string;
}) {
  return (
    <article
      style={{
        backgroundColor: STONE,
        borderLeft: `4px solid ${GOLD}`,
        padding: "28px 32px",
      }}
    >
      <p
        style={{
          color: GOLD,
          fontSize: 11,
          letterSpacing: "0.28em",
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        Principle {numeral}
      </p>
      <h2
        style={{
          color: GOLD,
          fontSize: 15,
          letterSpacing: "0.22em",
          fontWeight: "normal",
          margin: "12px 0 0",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: PARCHMENT,
          fontSize: 16,
          lineHeight: 1.8,
          margin: "16px 0 0",
          letterSpacing: "0.02em",
        }}
      >
        {text}
      </p>
    </article>
  );
}

export function PrinciplesChamber() {
  const [allWallsViewed, setAllWallsViewed] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState("");

  const principleWalls = useMemo(() => {
    const walls: (typeof VAULT_PRINCIPLES)[] = [];
    for (let i = 0; i < VAULT_PRINCIPLES.length; i += 3) {
      walls.push(VAULT_PRINCIPLES.slice(i, i + 3));
    }
    return walls;
  }, []);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/ppc/count");
      if (res.ok) {
        const data = await res.json();
        setRecordCount(data.count);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled >= total * 0.9) {
        setAllWallsViewed(true);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleRegisterClick = () => {
    const ts = new Date().toISOString();
    setAcknowledgedAt(ts);
    console.info("[Principles Vault] Acknowledgment logged", {
      principles_acknowledged: true,
      acknowledged_at: ts,
    });
    setModalOpen(true);
  };

  const handleRegistrationSuccess = () => {
    fetchCount();
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: BG,
          color: PARCHMENT,
          fontFamily: SERIF,
          padding: "64px 24px 80px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <header style={{ textAlign: "center", marginBottom: 0 }}>
            <p
              style={{
                color: GOLD,
                fontSize: 28,
                letterSpacing: "0.2em",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Come in. See for yourself.
            </p>
            <p
              style={{
                color: GOLD,
                fontSize: 28,
                letterSpacing: "0.2em",
                lineHeight: 1.6,
                margin: "12px 0 0",
              }}
            >
              Our laws don&apos;t change.
            </p>
          </header>

          <GoldRule />

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {principleWalls.map((wall, wallIndex) => (
              <div
                key={wallIndex}
                data-wall={wallIndex}
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
              >
                {wall.map((principle) => (
                  <PrincipleCard
                    key={principle.numeral}
                    numeral={principle.numeral}
                    title={principle.title}
                    text={principle.text}
                  />
                ))}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 56 }}>
            <p
              style={{
                color: GOLD,
                fontStyle: "italic",
                fontSize: 18,
                letterSpacing: "0.08em",
                lineHeight: 1.9,
                margin: 0,
              }}
            >
              These laws are permanent.
            </p>
            <p
              style={{
                color: GOLD,
                fontStyle: "italic",
                fontSize: 18,
                letterSpacing: "0.08em",
                lineHeight: 1.9,
                margin: "8px 0 0",
              }}
            >
              What is entered here is immutable.
            </p>
            <p
              style={{
                color: GOLD,
                fontStyle: "italic",
                fontSize: 18,
                letterSpacing: "0.08em",
                lineHeight: 1.9,
                margin: "8px 0 0",
              }}
            >
              The institution does not negotiate.
            </p>
          </div>

          <GoldRule />

          <div
            style={{
              background: STONE,
              border: "0.5px solid #B8972A33",
              borderRadius: 4,
              padding: "40px 32px",
              maxWidth: 600,
              margin: "60px auto",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: GOLD,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                margin: "0 0 24px",
                fontFamily: SERIF,
              }}
            >
              Enter the Permanent Record
            </p>

            <p
              style={{
                fontSize: 13,
                color: PARCHMENT,
                fontStyle: "italic",
                lineHeight: 1.8,
                margin: "0 0 32px",
                fontFamily: SERIF,
              }}
            >
              I have read and understood the principles of this institution as written on these
              walls. I acknowledge that what is entered here is permanent and immutable. I agree to
              be bound by the Vault Code.
            </p>

            <button
              type="button"
              onClick={handleRegisterClick}
              style={{
                background: "transparent",
                border: `0.5px solid ${GOLD}`,
                color: GOLD,
                fontSize: 13,
                fontFamily: SERIF,
                letterSpacing: "0.2em",
                padding: "14px 32px",
                cursor: allWallsViewed ? "pointer" : "default",
                textTransform: "uppercase",
                opacity: allWallsViewed ? 1 : 0,
                pointerEvents: allWallsViewed ? "auto" : "none",
                transition: "opacity 1.5s ease",
              }}
            >
              I Understand. Register a Player.
            </button>

            <p
              style={{
                fontSize: 10,
                color: "#B8972A44",
                letterSpacing: "0.14em",
                marginTop: 24,
                fontFamily: SERIF,
              }}
            >
              {recordCount !== null
                ? `${recordCount} records entered into the permanent archive.`
                : "— records entered into the permanent archive."}
            </p>
          </div>

          <footer style={{ textAlign: "center" }}>
            <p
              style={{
                color: PARCHMENT,
                fontSize: 11,
                letterSpacing: "0.18em",
                opacity: 0.55,
                margin: 0,
                lineHeight: 1.8,
              }}
            >
              THE VAULT™ · GUM Authentication Systems
            </p>
            <p
              style={{
                color: PARCHMENT,
                fontSize: 11,
                letterSpacing: "0.18em",
                opacity: 0.45,
                margin: "8px 0 0",
                lineHeight: 1.8,
              }}
            >
              Language and Principles · Version 2.3 · June 2026
            </p>
            <Link
              href="/vault/atrium"
              style={{
                display: "inline-block",
                marginTop: 40,
                color: GOLD,
                fontSize: 12,
                letterSpacing: "0.18em",
                textDecoration: "none",
                opacity: 0.85,
              }}
            >
              ← Return to the Atrium
            </Link>
          </footer>
        </div>
      </div>

      <PrinciplesRegistrationModal
        open={modalOpen}
        acknowledgedAt={acknowledgedAt}
        onClose={() => setModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
}
