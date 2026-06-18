import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const count = await prisma.player.count({
    where: { exhibit_status: "active" },
  });

  return NextResponse.json({ count });
}
