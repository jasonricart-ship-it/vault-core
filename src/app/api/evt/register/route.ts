import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { generateNextEvtCode } from "@/lib/evt";

const ALLOWED_ROLES = new Set(["org_admin", "authority", "super_admin"]);

function parseRequiredDate(value: unknown, field: string): Date | NextResponse {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return NextResponse.json({ error: `${field} is required` }, { status: 400 });
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
  }
  return date;
}

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const orgId = String(body.org_id ?? "").trim();
    const govId = body.gov_id ? String(body.gov_id).trim() : null;
    const name = String(body.name ?? "").trim();
    const seasonYearRaw = body.season_year;
    const location = parseOptionalString(body.location);
    const city = parseOptionalString(body.city);
    const state = parseOptionalString(body.state);

    if (!orgId || !name || seasonYearRaw == null || seasonYearRaw === "") {
      return NextResponse.json(
        { error: "org_id, name, and season_year are required" },
        { status: 400 },
      );
    }

    const seasonYear = Number(seasonYearRaw);
    if (!Number.isInteger(seasonYear) || seasonYear < 1900 || seasonYear > 9999) {
      return NextResponse.json(
        { error: "season_year must be a valid integer year" },
        { status: 400 },
      );
    }

    const startDateResult = parseRequiredDate(body.start_date, "start_date");
    if (startDateResult instanceof NextResponse) return startDateResult;

    const endDateResult = parseRequiredDate(body.end_date, "end_date");
    if (endDateResult instanceof NextResponse) return endDateResult;

    if (startDateResult.getTime() >= endDateResult.getTime()) {
      return NextResponse.json(
        { error: "start_date must be before end_date" },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, org_code: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (govId) {
      const gov = await prisma.governingBody.findUnique({
        where: { id: govId },
        select: { id: true },
      });

      if (!gov) {
        return NextResponse.json(
          { error: "Governing body not found" },
          { status: 404 },
        );
      }
    }

    const evtCode = await generateNextEvtCode(org.id, org.org_code, seasonYear);

    const event = await prisma.event.create({
      data: {
        evt_code: evtCode,
        org_id: org.id,
        gov_id: govId,
        name,
        season_year: seasonYear,
        start_date: startDateResult,
        end_date: endDateResult,
        location,
        city,
        state,
        registration_status: "active",
      },
      select: {
        id: true,
        evt_code: true,
        registration_status: true,
      },
    });

    return NextResponse.json({
      evt_id: event.id,
      evt_code: event.evt_code,
      status: event.registration_status,
    });
  } catch (error) {
    console.error("Event registration error:", error);
    return NextResponse.json(
      { error: "Failed to register event" },
      { status: 500 },
    );
  }
}
