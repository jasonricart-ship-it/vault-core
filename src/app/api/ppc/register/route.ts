import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDisplayName, generateNextPpcNumber } from "@/lib/ppc";
import { hashPassword } from "@/lib/password";

const SPORTS = [
  "Ice Hockey",
  "Volleyball",
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

function calculateIsMinor(dateOfBirth: Date) {
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

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

async function checkFacialDuplicate(
  imageKey: string,
): Promise<{ isDuplicate: boolean; matchedPpcNumber?: string }> {
  // FACIAL RECOGNITION GATE
  // TODO Phase 5 — wire to AWS Rekognition or Azure Face API
  // When implemented:
  //   1. Take imageKey from S3
  //   2. Compare against all existing player enrollment photos
  //   3. If match above threshold — return isDuplicate: true
  //      with the matched PPC number
  //   4. Block registration and flag for human review

  // Gate is open until facial rec is wired
  void imageKey;
  return { isDuplicate: false };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const preferredName = body.preferredName
      ? String(body.preferredName).trim()
      : null;
    const dateOfBirthRaw = String(body.dateOfBirth ?? "").trim();
    const primarySport = String(body.primarySport ?? "").trim();
    const guardianEmail = String(body.guardianEmail ?? "")
      .trim()
      .toLowerCase();
    const guardianFirstName = String(body.guardianFirstName ?? "").trim();
    const guardianLastName = String(body.guardianLastName ?? "").trim();
    const guardianNameLegacy = String(body.guardianName ?? "").trim();
    const guardianName =
      guardianFirstName || guardianLastName
        ? `${guardianFirstName} ${guardianLastName}`.trim()
        : guardianNameLegacy;
    const acknowledgedAtRaw = body.acknowledgedAt
      ? String(body.acknowledgedAt)
      : null;
    const enrollmentImageKey = body.enrollmentImageKey
      ? String(body.enrollmentImageKey).trim()
      : "";

    if (!firstName || !lastName || !dateOfBirthRaw || !primarySport) {
      return NextResponse.json(
        { error: "Required fields are missing." },
        { status: 400 },
      );
    }

    if (!SPORTS.includes(primarySport as (typeof SPORTS)[number])) {
      return NextResponse.json(
        { error: "Please select a valid primary sport." },
        { status: 400 },
      );
    }

    const dateOfBirth = new Date(dateOfBirthRaw);
    if (Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 },
      );
    }

    const isMinor = calculateIsMinor(dateOfBirth);
    if (isMinor && (!guardianEmail || !guardianFirstName || !guardianLastName)) {
      return NextResponse.json(
        {
          error:
            "Guardian email, first name, and last name are required for players under 18.",
        },
        { status: 400 },
      );
    }

    const acknowledgedAt = acknowledgedAtRaw
      ? new Date(acknowledgedAtRaw)
      : new Date();
    const acknowledgedIp =
      String(body.acknowledgedIp ?? "").trim() || clientIp(request) || null;

    const facialCheck = await checkFacialDuplicate(enrollmentImageKey || "");
    if (facialCheck.isDuplicate) {
      return NextResponse.json(
        {
          error: "A record may already exist for this player.",
          matchedPpcNumber: facialCheck.matchedPpcNumber,
          requiresReview: true,
        },
        { status: 409 },
      );
    }

    const ppcNumber = await generateNextPpcNumber(101);
    const displayName = buildDisplayName(firstName, lastName, preferredName);

    let guardianAccountId: string | null = null;

    if (guardianEmail) {
      const existing = await prisma.account.findUnique({
        where: { email: guardianEmail },
      });

      if (existing) {
        guardianAccountId = existing.id;
        if (guardianName && !existing.display_name) {
          await prisma.account.update({
            where: { id: existing.id },
            data: { display_name: guardianName },
          });
        }
      } else {
        const tempPassword = randomBytes(32).toString("hex");
        const guardian = await prisma.account.create({
          data: {
            email: guardianEmail,
            password_hash: hashPassword(tempPassword),
            role: "guardian",
            display_name: guardianName || null,
          },
        });
        guardianAccountId = guardian.id;
      }
    }

    const player = await prisma.player.create({
      data: {
        ppc_number: ppcNumber,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        preferred_name: preferredName,
        primary_sport: primarySport,
        date_of_birth: dateOfBirth,
        is_minor: isMinor,
        vault_level: "recorded",
        strength_score: 10,
        exhibit_status: "active",
        bust_color: "grayscale",
        visibility: "public",
        guardian_account_id: guardianAccountId,
        principles_acknowledged_at: acknowledgedAt,
        principles_acknowledged_ip: acknowledgedIp,
        // PHASE 5: Accept headshot from native Vault app capture
        // at time of enrollment. Feed to:
        //   1. AI bust generation pipeline
        //   2. Facial recognition duplicate check
        //   3. Annual renewal Year 1 seed
        //   4. E1 authenticated identity photo
        // One capture. Four functions.
        enrollment_photo_key: null, // populated in Phase 5
      },
    });

    if (guardianAccountId) {
      await prisma.playerGuardian.create({
        data: {
          player_id: player.id,
          account_id: guardianAccountId,
          guardian_role: "primary",
          added_by: "principles_registration",
        },
      });
    }

    return NextResponse.json({
      ppc_number: player.ppc_number,
      player_id: player.id,
      first_name: player.first_name,
    });
  } catch (error) {
    console.error("Principles registration error:", error);
    return NextResponse.json(
      { error: "Unable to enter player into the permanent record." },
      { status: 500 },
    );
  }
}
