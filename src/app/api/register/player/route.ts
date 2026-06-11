import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDisplayName, generateNextPpcNumber } from "@/lib/ppc";

const SPORTS = [
  "hockey",
  "soccer",
  "baseball",
  "basketball",
  "football",
  "lacrosse",
  "other",
] as const;

function calculateIsMinor(dateOfBirth: Date, registrationType: string) {
  if (registrationType === "guardian") return true;

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }
  return age < 18;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = String(body.accountId ?? "").trim();
    const registrationType = body.registrationType;
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const preferredName = body.preferredName
      ? String(body.preferredName).trim()
      : null;
    const dateOfBirthRaw = String(body.dateOfBirth ?? "").trim();
    const primarySport = String(body.primarySport ?? "")
      .trim()
      .toLowerCase();
    const jerseyNumber = body.jerseyNumber
      ? String(body.jerseyNumber).trim()
      : null;

    if (!accountId || !firstName || !lastName || !dateOfBirthRaw) {
      return NextResponse.json(
        { error: "Required player fields are missing." },
        { status: 400 },
      );
    }

    if (!SPORTS.includes(primarySport as (typeof SPORTS)[number])) {
      return NextResponse.json(
        { error: "Please select a valid primary sport." },
        { status: 400 },
      );
    }

    if (registrationType !== "self" && registrationType !== "guardian") {
      return NextResponse.json(
        { error: "Invalid registration type." },
        { status: 400 },
      );
    }

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const dateOfBirth = new Date(dateOfBirthRaw);
    if (Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 },
      );
    }

    const isMinor = calculateIsMinor(dateOfBirth, registrationType);

    if (registrationType === "self" && isMinor) {
      return NextResponse.json(
        { error: "Self-registration requires the registrant to be 18 or older." },
        { status: 400 },
      );
    }

    const ppcNumber = await generateNextPpcNumber();
    const displayName = buildDisplayName(firstName, lastName, preferredName);

    const player = await prisma.player.create({
      data: {
        ppc_number: ppcNumber,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        preferred_name: preferredName,
        primary_sport: primarySport,
        jersey_number: jerseyNumber,
        date_of_birth: dateOfBirth,
        is_minor: isMinor,
        guardian_account_id: registrationType === "guardian" ? accountId : null,
        created_by: accountId,
        vault_level: "recorded",
        bust_color: "grayscale",
        exhibit_status: "pending",
      },
    });

    await prisma.account.update({
      where: { id: accountId },
      data: { linked_player_id: player.id },
    });

    return NextResponse.json({
      playerId: player.id,
      ppcNumber: player.ppc_number,
      displayName: player.display_name,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create player record." },
      { status: 500 },
    );
  }
}
