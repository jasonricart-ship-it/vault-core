import { fetchPlayerWingData } from "@/lib/player-wing";
import { PlayerWing } from "@/components/vault/PlayerWing";

export default async function PlayerWingPage() {
  const { recentPlayers, recentAchievements, recentGumItems } =
    await fetchPlayerWingData();

  return (
    <PlayerWing
      recentPlayers={recentPlayers}
      recentAchievements={recentAchievements}
      recentGumItems={recentGumItems}
    />
  );
}
