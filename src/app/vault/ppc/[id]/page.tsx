import { headers } from "next/headers";
import { CorridorScene } from "@/components/vault/corridor/CorridorScene";
import type { PlayerData } from "@/components/vault/corridor/types";
import { CORRIDOR } from "@/components/vault/corridor/utils";

export const dynamic = "force-dynamic";

async function getPlayer(id: string): Promise<PlayerData | null> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  const response = await fetch(
    `${protocol}://${host}/api/ppc/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch player: ${response.status}`);
  }

  return response.json();
}

export default async function PpcProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: CORRIDOR.bg,
          color: CORRIDOR.parchment,
          fontFamily: CORRIDOR.serif,
          padding: 48,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: "0.14em", color: CORRIDOR.gold, textTransform: "uppercase" }}>
          The Vault · Personal Player Collection
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 16 }}>PPC Not Found</h1>
        <p style={{ fontSize: 13, color: "#F5F2EC66", marginTop: 12 }}>
          No player record exists for {id}.
        </p>
      </div>
    );
  }

  return <CorridorScene player={player} />;
}
