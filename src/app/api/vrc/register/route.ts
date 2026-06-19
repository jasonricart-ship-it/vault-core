import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import {
  buildCollectorDisplayName,
  generateNextVrcNumber,
} from "@/lib/vrc-registry-server";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        is_verified: true,
        linked_vrc_id: true,
        vault_registry_collector: { select: { id: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!account.is_verified) {
      return NextResponse.json({ error: "Account must be verified" }, { status: 403 });
    }

    if (account.linked_vrc_id || account.vault_registry_collector) {
      return NextResponse.json(
        { error: "This account is already registered as a collector." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const firstName = String(body.first_name ?? body.firstName ?? "").trim();
    const lastName = String(body.last_name ?? body.lastName ?? "").trim();
    const middleName = String(body.middle_name ?? body.middleName ?? "").trim() || null;
    const collectorFocus =
      String(body.collector_focus ?? body.collectorFocus ?? "").trim() || null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 },
      );
    }

    const displayName = buildCollectorDisplayName(firstName, lastName, middleName);
    const vrcNumber = await generateNextVrcNumber(101);

    const collector = await prisma.$transaction(async (tx) => {
      const created = await tx.vaultRegistryCollector.create({
        data: {
          vrc_number: vrcNumber,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          collector_focus: collectorFocus,
          account_id: account.id,
        },
        select: {
          id: true,
          vrc_number: true,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { linked_vrc_id: created.id },
      });

      return created;
    });

    return NextResponse.json({
      vrc_id: collector.id,
      vrc_number: collector.vrc_number,
    });
  } catch (error) {
    console.error("VRC registration error:", error);
    return NextResponse.json(
      { error: "Failed to register collector." },
      { status: 500 },
    );
  }
}
