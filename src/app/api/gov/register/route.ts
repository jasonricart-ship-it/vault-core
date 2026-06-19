import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { generateNextGovCode, isValidGovTier } from "@/lib/gov-registry-server";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set(["authority", "super_admin"]);

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

function parseOptionalString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim() || null;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json(
        { error: "Only Vault authority may register governing bodies." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const shortName = parseOptionalString(body.short_name ?? body.shortName);
    const sport = String(body.sport ?? "").trim();
    const govTier = String(body.gov_tier ?? body.govTier ?? "")
      .trim()
      .toUpperCase();
    const jurisdiction = String(body.jurisdiction ?? "").trim();
    const parentGovId = parseOptionalString(body.parent_gov_id ?? body.parentGovId);

    if (!name || !sport || !govTier || !jurisdiction) {
      return NextResponse.json(
        { error: "Name, sport, gov tier, and jurisdiction are required." },
        { status: 400 },
      );
    }

    if (!isValidGovTier(govTier)) {
      return NextResponse.json(
        { error: "gov_tier must be GOV-N, GOV-R, or GOV-L." },
        { status: 400 },
      );
    }

    if (!SPORTS.includes(sport as (typeof SPORTS)[number])) {
      return NextResponse.json({ error: "Please select a valid sport." }, { status: 400 });
    }

    if (parentGovId) {
      const parent = await prisma.governingBody.findUnique({
        where: { id: parentGovId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent governing body not found." }, { status: 400 });
      }
    }

    const govCode = await generateNextGovCode(sport, govTier);

    const gov = await prisma.governingBody.create({
      data: {
        gov_code: govCode,
        name,
        short_name: shortName,
        sport,
        gov_tier: govTier,
        jurisdiction,
        parent_gov_id: parentGovId,
        registration_status: "pending",
        is_verified: false,
        vault_level: "recorded",
        strength_score: 0,
      },
      select: {
        id: true,
        gov_code: true,
      },
    });

    return NextResponse.json({
      gov_id: gov.id,
      gov_code: gov.gov_code,
    });
  } catch (error) {
    console.error("Governing body registration error:", error);
    return NextResponse.json(
      { error: "Failed to register governing body." },
      { status: 500 },
    );
  }
}
