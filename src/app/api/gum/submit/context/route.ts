import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { loadGumSubmitContext } from "@/lib/gum-submit-context";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const players = await loadGumSubmitContext(
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({ players });
  } catch (error) {
    console.error("GUM submit context error:", error);
    return NextResponse.json(
      { error: "Failed to load submission context" },
      { status: 500 },
    );
  }
}
