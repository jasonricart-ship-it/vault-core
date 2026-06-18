import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = new Set(["org_admin", "authority", "super_admin"]);

type AchievementFlag = {
  achievement_type: string;
  achievement_scope: string;
  medal_tier: string | null;
  notes: string;
};

const ACHIEVEMENT_FLAGS: Record<
  "is_champion" | "is_mvp" | "is_all_star",
  AchievementFlag
> = {
  is_champion: {
    achievement_type: "champion",
    achievement_scope: "team",
    medal_tier: "gold",
    notes: "Event champion",
  },
  is_mvp: {
    achievement_type: "mvp",
    achievement_scope: "personal",
    medal_tier: "gold",
    notes: "Event MVP",
  },
  is_all_star: {
    achievement_type: "all_star",
    achievement_scope: "personal",
    medal_tier: null,
    notes: "Event all-star",
  },
};

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

function parseOptionalString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim() || null;
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

    const { id: eventId } = await params;
    const body = await request.json();

    const playerId = String(body.player_id ?? "").trim();
    const orgId = parseOptionalString(body.org_id);
    const role = parseOptionalString(body.role);

    if (!playerId) {
      return NextResponse.json({ error: "player_id is required" }, { status: 400 });
    }

    const isChampion = parseBoolean(body.is_champion, "is_champion");
    if (isChampion instanceof NextResponse) return isChampion;

    const isMvp = parseBoolean(body.is_mvp, "is_mvp");
    if (isMvp instanceof NextResponse) return isMvp;

    const isAllStar = parseBoolean(body.is_all_star, "is_all_star");
    if (isAllStar instanceof NextResponse) return isAllStar;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        evt_code: true,
        org_id: true,
        season_year: true,
        registration_status: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.registration_status !== "active") {
      return NextResponse.json(
        { error: "Event is not active" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, ppc_number: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const resolvedOrgId = orgId ?? event.org_id;

    if (orgId) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true },
      });

      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }
    }

    const achievementSpecs: AchievementFlag[] = [];
    if (isChampion) achievementSpecs.push(ACHIEVEMENT_FLAGS.is_champion);
    if (isMvp) achievementSpecs.push(ACHIEVEMENT_FLAGS.is_mvp);
    if (isAllStar) achievementSpecs.push(ACHIEVEMENT_FLAGS.is_all_star);

    const result = await prisma.$transaction(async (tx) => {
      const participation = await tx.playerEventParticipation.create({
        data: {
          player_id: player.id,
          event_id: event.id,
          org_id: resolvedOrgId,
          role,
          is_champion: isChampion,
          is_mvp: isMvp,
          is_all_star: isAllStar,
          verified: true,
        },
        select: { id: true },
      });

      const achievementIds: string[] = [];

      for (const spec of achievementSpecs) {
        const achievement = await tx.achievement.create({
          data: {
            ppc_id: player.id,
            evt_id: event.id,
            org_id: resolvedOrgId,
            achievement_type: spec.achievement_type,
            achievement_scope: spec.achievement_scope,
            medal_tier: spec.medal_tier,
            season_year: event.season_year,
            notes: spec.notes,
            awarded_at: new Date(),
          },
          select: { id: true },
        });
        achievementIds.push(achievement.id);
      }

      return { participation, achievementIds };
    });

    return NextResponse.json({
      participation_id: result.participation.id,
      evt_code: event.evt_code,
      ppc_number: player.ppc_number,
      achievement_ids: result.achievementIds,
    });
  } catch (error) {
    console.error("Event participation error:", error);
    return NextResponse.json(
      { error: "Failed to record event participation" },
      { status: 500 },
    );
  }
}
