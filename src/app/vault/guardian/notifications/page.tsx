import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GuardianNotificationsPanel } from "@/components/vault/guardian/GuardianNotificationsPanel";
import { authOptions } from "@/src/auth";

export const dynamic = "force-dynamic";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const ALLOWED_ROLES = new Set(["guardian", "super_admin"]);

export default async function GuardianNotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/vault/guardian/notifications");
  }

  if (!ALLOWED_ROLES.has(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: BG,
        color: PARCHMENT,
        fontFamily: SERIF,
        padding: "20px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 10,
            color: "#B8972A66",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          Guardian Review · The Vault™
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: GOLD,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          Capture Shares
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#F5F2EC77",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          Review live captures shared to your player&apos;s record. Admit to add them to the
          permanent archive, or decline to dismiss.
        </p>

        <GuardianNotificationsPanel />
      </div>
    </div>
  );
}
