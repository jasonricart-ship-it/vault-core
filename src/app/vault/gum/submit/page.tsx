import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GumSubmitFlow } from "@/components/vault/gum/GumSubmitFlow";
import { loadGumSubmitContext } from "@/lib/gum-submit-context";
import { authOptions } from "@/src/auth";

export const dynamic = "force-dynamic";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

export default async function GumSubmitPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/vault/gum/submit");
  }

  if (!ALLOWED_ROLES.has(session.user.role)) {
    redirect("/dashboard");
  }

  const isSuperAdmin = session.user.role === "super_admin";
  const players = await loadGumSubmitContext(session.user.id, session.user.role);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: PARCHMENT,
        fontFamily: SERIF,
        padding: "48px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 10,
            color: "#B8972A66",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          GUM Authentication · The Vault™
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: "normal",
            color: GOLD,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          Submit GUM Item
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "#F5F2EC66",
            textAlign: "center",
            margin: "0 0 36px",
            lineHeight: 1.6,
          }}
        >
          Establish a new authenticated artifact for admission to the permanent
          corridor record.
        </p>

        {!isSuperAdmin && players.length === 0 ? (
          <div
            style={{
              background: "#1A1208",
              border: "0.5px solid #B8972A22",
              borderRadius: 2,
              padding: 24,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
              No player records are linked to your account. Link a player before
              submitting a GUM item.
            </p>
            <Link
              href="/dashboard"
              style={{
                color: GOLD,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Return to dashboard
            </Link>
          </div>
        ) : players.length === 0 ? (
          <div
            style={{
              background: "#1A1208",
              border: "0.5px solid #B8972A22",
              borderRadius: 2,
              padding: 24,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              No players exist in the database yet.
            </p>
          </div>
        ) : (
          <GumSubmitFlow players={players} showPlayerSelector={isSuperAdmin} />
        )}
      </div>
    </div>
  );
}
