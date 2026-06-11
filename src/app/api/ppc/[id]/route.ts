import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { ppc_number: id },
    include: {
      org_affiliations: {
        include: {
          org: {
            include: {
              gov_affiliations: {
                include: { gov: true },
              },
            },
          },
        },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const govAffiliationMap = new Map(
    player.org_affiliations.flatMap((affiliation) =>
      affiliation.org.gov_affiliations.map((govAffiliation) => [
        govAffiliation.id,
        govAffiliation,
      ]),
    ),
  );

  return NextResponse.json({
    ...player,
    gov_affiliations: [...govAffiliationMap.values()],
  });
}
