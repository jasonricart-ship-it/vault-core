import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";
import { resolveRegistryRecipient } from "@/lib/transfer-server";
import { TRANSFER_TYPES, type TransferType } from "@/lib/transfer";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

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
    const itemId = String(body.item_id ?? "").trim();
    const transferType = String(body.transfer_type ?? body.transferType ?? "")
      .trim()
      .toLowerCase() as TransferType;
    let toAccountId = String(body.to_account_id ?? body.toAccountId ?? "").trim();

    if (!itemId || !transferType) {
      return NextResponse.json(
        { error: "item_id and transfer_type are required." },
        { status: 400 },
      );
    }

    if (!TRANSFER_TYPES.includes(transferType)) {
      return NextResponse.json(
        { error: "transfer_type must be sale, gift, consignment, or estate." },
        { status: 400 },
      );
    }

    if (!toAccountId) {
      const registryNumber = String(
        body.registry_number ?? body.registryNumber ?? body.transfer_to ?? "",
      ).trim();
      if (!registryNumber) {
        return NextResponse.json(
          { error: "to_account_id or registry_number is required." },
          { status: 400 },
        );
      }

      const recipient = await resolveRegistryRecipient(registryNumber);
      if (!recipient) {
        return NextResponse.json(
          { error: "No account found for that registry number." },
          { status: 404 },
        );
      }
      toAccountId = recipient.account_id;
    }

    if (toAccountId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot transfer authority to your own account." },
        { status: 400 },
      );
    }

    const gumItem = await prisma.gumItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        gum_code: true,
        item_description: true,
        authority_account_id: true,
        authority_type: true,
        is_frozen: true,
        status: true,
      },
    });

    if (!gumItem) {
      return NextResponse.json({ error: "GUM item not found." }, { status: 404 });
    }

    if (gumItem.authority_account_id !== session.user.id) {
      return NextResponse.json(
        { error: "You do not hold authority over this item." },
        { status: 403 },
      );
    }

    if (gumItem.is_frozen) {
      return NextResponse.json({ error: "This item is frozen and cannot be transferred." }, { status: 409 });
    }

    const openTransfer = await prisma.itemAuthorityLog.findFirst({
      where: {
        item_id: gumItem.id,
        confirmed_by_to: false,
      },
      select: { id: true },
    });

    if (openTransfer) {
      return NextResponse.json(
        { error: "A transfer is already pending for this item." },
        { status: 409 },
      );
    }

    const toAccount = await prisma.account.findUnique({
      where: { id: toAccountId },
      select: { id: true },
    });

    if (!toAccount) {
      return NextResponse.json({ error: "Receiving account not found." }, { status: 404 });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const log = await tx.itemAuthorityLog.create({
        data: {
          item_id: gumItem.id,
          from_account_id: session.user.id,
          to_account_id: toAccountId,
          authority_type: gumItem.authority_type,
          transfer_type: transferType,
          confirmed_by_from: true,
          confirmed_by_to: false,
          vault_witnessed: false,
          effective_date: new Date(),
        },
        select: { id: true },
      });

      await tx.gumItem.update({
        where: { id: gumItem.id },
        data: { status: "under_review" },
      });

      await tx.guardianNotification.create({
        data: {
          account_id: toAccountId,
          notification_type: "transfer_pending",
          reference_id: log.id,
          message: `Chain of custody transfer pending for ${gumItem.gum_code} — ${gumItem.item_description}. Confirm receipt to accept authority.`,
        },
      });

      return log;
    });

    return NextResponse.json({ transfer_id: transfer.id });
  } catch (error) {
    console.error("Transfer initiate error:", error);
    return NextResponse.json({ error: "Failed to initiate transfer." }, { status: 500 });
  }
}
