import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set(["org_admin", "authority", "super_admin"]);

function parseBoolean(value: unknown, field: string): boolean | NextResponse {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0" || value == null) {
    return false;
  }
  return NextResponse.json(
    { error: `${field} must be a boolean` },
    { status: 400 },
  );
}

function parseSeasonYear(value: unknown): number | NextResponse {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
    return NextResponse.json(
      { error: "season_year must be a valid year" },
      { status: 400 },
    );
  }
  return parsed;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: ppcNumber } = await params;
    const body = await request.json();

    const orgId = String(body.org_id ?? "").trim();
    if (!orgId) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    const seasonYear = parseSeasonYear(body.season_year);
    if (seasonYear instanceof NextResponse) return seasonYear;

    const isAlternate = parseBoolean(body.is_alternate, "is_alternate");
    if (isAlternate instanceof NextResponse) return isAlternate;

    const player = await prisma.player.findUnique({
      where: { ppc_number: ppcNumber },
      select: { id: true, ppc_number: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const affiliation = await prisma.playerOrgAffiliation.findFirst({
      where: {
        player_id: player.id,
        org_id: orgId,
        season_year: seasonYear,
        status: "active",
      },
      select: {
        id: true,
        verified_by_org: true,
      },
    });

    if (!affiliation) {
      return NextResponse.json(
        { error: "No active org affiliation found for this player, org, and season" },
        { status: 404 },
      );
    }

    if (!affiliation.verified_by_org) {
      return NextResponse.json(
        { error: "Org affiliation must be verified before Captain C can be assigned." },
        { status: 400 },
      );
    }

    const designation = isAlternate ? "alternate" : "captain";

    const result = await prisma.$transaction(async (tx) => {
      await tx.playerOrgAffiliation.update({
        where: { id: affiliation.id },
        data: isAlternate
          ? { is_alternate: true, is_captain: false }
          : { is_captain: true, is_alternate: false },
      });

      const achievement = await tx.achievement.create({
        data: {
          ppc_id: player.id,
          org_id: orgId,
          achievement_type: "captain",
          achievement_scope: "team",
          season_year: seasonYear,
          notes: isAlternate ? "Alternate captain" : "Team captain",
          awarded_at: new Date(),
        },
        select: { id: true },
      });

      return achievement;
    });

    return NextResponse.json({
      ppc_number: player.ppc_number,
      org_name: org.name,
      season_year: seasonYear,
      designation,
      achievement_id: result.id,
    });
  } catch (error) {
    console.error("Captain assignment error:", error);
    return NextResponse.json(
      { error: "Failed to assign captain" },
      { status: 500 },
    );
  }
}
