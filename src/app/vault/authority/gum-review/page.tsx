import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GumReviewPanel } from "@/components/vault/authority/GumReviewPanel";
import { authOptions } from "@/src/auth";

export const dynamic = "force-dynamic";

const REVIEW_ROLES = new Set(["evaluator", "authority", "super_admin"]);

const LOGIN_CALLBACK = "/login?callbackUrl=/vault/authority/gum-review";

export default async function GumReviewPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(LOGIN_CALLBACK);
  }

  if (!REVIEW_ROLES.has(session.user.role)) {
    redirect(LOGIN_CALLBACK);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0908",
        color: "#F5F2EC",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "48px 24px 64px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
          Authority Chamber · GUM Review
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: "normal",
            color: "#B8972A",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: "0 0 32px",
          }}
        >
          Admission Review
        </h1>
        <GumReviewPanel />
      </div>
    </div>
  );
}
