import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ORG_TYPES } from "@/lib/org-registry";
import { generateNextOrgCode } from "@/lib/org-registry-server";
import { hashPassword } from "@/lib/password";

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureOrgAdminAccount(email: string, displayName: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.account.findUnique({
    where: { email: normalized },
    select: { id: true, role: true, display_name: true },
  });

  if (existing) {
    return {
      accountId: existing.id,
      accountCreated: false,
      existingRole: existing.role,
    };
  }

  const tempPassword = randomBytes(32).toString("hex");
  const account = await prisma.account.create({
    data: {
      email: normalized,
      password_hash: hashPassword(tempPassword),
      role: "org_admin",
      display_name: displayName,
      is_verified: false,
    },
    select: { id: true, role: true },
  });

  return {
    accountId: account.id,
    accountCreated: true,
    existingRole: account.role,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const shortName = String(body.short_name ?? body.shortName ?? "").trim() || null;
    const sport = String(body.sport ?? "").trim();
    const orgType = String(body.org_type ?? body.orgType ?? "").trim().toLowerCase();
    const state = String(body.state ?? "").trim();
    const city = String(body.city ?? "").trim() || null;
    const adminEmail = String(body.admin_email ?? body.adminEmail ?? "")
      .trim()
      .toLowerCase();

    if (!name || !sport || !orgType || !state || !adminEmail) {
      return NextResponse.json(
        { error: "Organization name, sport, org type, state, and admin email are required." },
        { status: 400 },
      );
    }

    if (!ORG_TYPES.includes(orgType as (typeof ORG_TYPES)[number])) {
      return NextResponse.json(
        { error: "org_type must be team, club, school, academy, tournament, or association." },
        { status: 400 },
      );
    }

    if (!SPORTS.includes(sport as (typeof SPORTS)[number])) {
      return NextResponse.json({ error: "Please select a valid sport." }, { status: 400 });
    }

    if (!isValidEmail(adminEmail)) {
      return NextResponse.json({ error: "Invalid admin email address." }, { status: 400 });
    }

    const orgCode = await generateNextOrgCode(sport, state);
    const admin = await ensureOrgAdminAccount(adminEmail, name);

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          org_code: orgCode,
          name,
          short_name: shortName,
          sport,
          org_type: orgType,
          state,
          city,
          registration_status: "pending",
          is_verified: false,
          vault_level: "recorded",
          strength_score: 0,
          admin_account_id: admin.accountId,
        },
        select: {
          id: true,
          org_code: true,
        },
      });

      await tx.account.update({
        where: { id: admin.accountId },
        data: {
          linked_org_id: created.id,
          role:
            admin.existingRole === "super_admin" || admin.existingRole === "authority"
              ? admin.existingRole
              : "org_admin",
        },
      });

      return created;
    });

    return NextResponse.json({
      org_id: org.id,
      org_code: org.org_code,
      admin_account_created: admin.accountCreated,
      message: admin.accountCreated
        ? "Organization registered. Admin account creation flow initiated."
        : "Organization registered. Existing admin account linked.",
    });
  } catch (error) {
    console.error("Organization registration error:", error);
    return NextResponse.json(
      { error: "Failed to register organization." },
      { status: 500 },
    );
  }
}
