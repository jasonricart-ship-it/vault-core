import Link from "next/link";
import { fetchActivePublicPlayers } from "@/lib/ppc-corridors";
import {
  CORRIDOR,
  getInitials,
  vaultTierColors,
  vaultTierLabel,
} from "@/components/vault/corridor/utils";
import type { CorridorPlayerSummary } from "@/components/vault/corridor/types";

export const dynamic = "force-dynamic";

function PlayerCard({ player }: { player: CorridorPlayerSummary }) {
  const colors = vaultTierColors(player.vault_level);
  const initials = getInitials({
    ...player,
    jersey_number: null,
    strength_score: 0,
    bust_color: "",
    exhibit_status: "active",
    org_affiliations: [],
    gov_affiliations: [],
    gum_items: [],
    achievements: [],
  });

  return (
    <Link
      href={`/vault/ppc/${player.ppc_number}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        backgroundColor: CORRIDOR.stone,
        border: "0.5px solid #B8972A22",
        borderRadius: 4,
        padding: "14px 16px",
        textDecoration: "none",
        transition: "border-color 0.2s ease",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: colors.fill,
          border: `2px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: CORRIDOR.serif,
          fontSize: 18,
          color: colors.text,
          fontWeight: 500,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: CORRIDOR.gold,
            textTransform: "uppercase",
            margin: 0,
            fontFamily: CORRIDOR.serif,
          }}
        >
          {player.ppc_number}
        </p>
        <p
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: CORRIDOR.parchment,
            margin: "4px 0 0",
            fontFamily: CORRIDOR.serif,
          }}
        >
          {player.display_name}
        </p>
        <p style={{ fontSize: 12, color: "#F5F2EC66", margin: "4px 0 0", fontFamily: CORRIDOR.serif }}>
          {player.primary_sport ?? "—"} · {vaultTierLabel(player.vault_level)}
        </p>
      </div>
    </Link>
  );
}

export default async function PpcCorridorBrowserPage() {
  const players = await fetchActivePublicPlayers();
  const first = players[0]?.ppc_number ?? "PPC-00001";
  const last = players[players.length - 1]?.ppc_number ?? "PPC-00101";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: CORRIDOR.bg,
        color: CORRIDOR.parchment,
        fontFamily: CORRIDOR.serif,
        padding: "32px 24px 48px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link
          href="/vault/player-wing"
          style={{
            fontSize: 12,
            color: "#B8972A66",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 32,
          }}
        >
          ← Return to the Player Wing
        </Link>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: CORRIDOR.gold,
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          PLAYER CORRIDORS
        </h1>
        <p style={{ fontSize: 12, color: "#B8972A66", letterSpacing: "0.1em", margin: "0 0 28px" }}>
          {first} — {last}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {players.map((player) => (
            <PlayerCard key={player.ppc_number} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}
