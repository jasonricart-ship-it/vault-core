import { NextResponse } from "next/server";
import { getSession } from "@/auth.config";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transfer = await prisma.itemAuthorityLog.findUnique({
      where: { id },
      select: {
        id: true,
        to_account_id: true,
        confirmed_by_to: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
    }

    if (transfer.to_account_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the receiving party may accept this transfer." },
        { status: 403 },
      );
    }

    if (transfer.confirmed_by_to) {
      return NextResponse.json({ error: "Transfer already accepted." }, { status: 409 });
    }

    await prisma.itemAuthorityLog.update({
      where: { id },
      data: { confirmed_by_to: true },
    });

    return NextResponse.json({
      transfer_id: id,
      status: "accepted",
      message:
        "Transfer acceptance recorded. Full vault witnessing and authority handoff will be completed in a future release.",
    });
  } catch (error) {
    console.error("Transfer accept error:", error);
    return NextResponse.json({ error: "Failed to accept transfer." }, { status: 500 });
  }
}
