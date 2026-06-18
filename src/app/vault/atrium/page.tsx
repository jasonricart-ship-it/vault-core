import { AtriumInterior } from "@/components/vault/atrium/AtriumInterior";
import { fetchAtriumData } from "@/lib/atrium";
import { prisma } from "@/lib/db";
import { authOptions } from "@/src/auth";
import { getServerSession } from "next-auth";

export default async function VaultAtriumInteriorPage() {
  const session = await getServerSession(authOptions);
  const { champions, mvps, captains } = await fetchAtriumData();

  const mvpRecord = mvps[0] ?? null;
  const mvpPlayer = mvpRecord?.player;
  const mvpChampion = mvpPlayer
    ? champions.find((c) => c.player?.id === mvpPlayer.id)
    : null;

  let hasVrc = false;
  if (session?.user?.id) {
    const account = await prisma.account.findUnique({
      where: { id: session.user.id },
      select: { linked_vrc_id: true },
    });
    hasVrc = Boolean(account?.linked_vrc_id);
  }

  const role = session?.user?.role ?? "";
  const isAuthority = role === "authority" || role === "super_admin";

  return (
    <AtriumInterior
      isAuthenticated={Boolean(session)}
      hasVrc={hasVrc}
      isAuthority={isAuthority}
      mvp={
        mvpPlayer
          ? {
              display_name: mvpPlayer.display_name,
              preferred_name: mvpPlayer.preferred_name,
              ppc_number: mvpPlayer.ppc_number,
              achievement_notes: mvpRecord.notes ?? "Tournament MVP",
              event_name: mvpChampion?.event?.name ?? "T1EHL Championship",
              season_year: mvpRecord.season_year ?? mvpChampion?.event?.season_year ?? 2024,
            }
          : null
      }
      champions={champions
        .filter((c) => c.player && c.event)
        .map((c) => ({
          preferred_name: c.player!.preferred_name,
          ppc_number: c.player!.ppc_number,
          event_name: c.event!.name,
          season_year: c.season_year ?? c.event!.season_year,
          location: c.event!.location,
        }))}
      captains={captains.map((c) => ({
        preferred_name: c.player.preferred_name,
        org_name: c.org.short_name ?? c.org.name,
        season_year: c.season_year,
        jersey_number: c.jersey_number,
      }))}
    />
  );
}
