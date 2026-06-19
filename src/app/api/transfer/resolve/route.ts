import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { resolveRegistryRecipient } from "@/lib/transfer-server";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query = new URL(request.url).searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ error: "Query parameter q is required." }, { status: 400 });
    }

    const recipient = await resolveRegistryRecipient(query);
    if (!recipient) {
      return NextResponse.json({ error: "No account found for that registry number." }, { status: 404 });
    }

    return NextResponse.json({ recipient });
  } catch (error) {
    console.error("Transfer resolve error:", error);
    return NextResponse.json({ error: "Failed to resolve registry number." }, { status: 500 });
  }
}
