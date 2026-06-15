import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import type { BustColor } from "@/lib/types";
import type { Achievement, PlayerProfile } from "@/components/vault/record/types";

export const dynamic = "force-dynamic";

async function getPlayer(id: string): Promise<PlayerProfile | null> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  const response = await fetch(
    `${protocol}://${host}/api/ppc/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch player: ${response.status}`);
  }

  return response.json();
}

function formatLevel(value: string) {
  return value.replace(/_/g, " ");
}

function getBustFilter(bustColor: string): string | undefined {
  switch (bustColor as BustColor) {
    case "grayscale":
      return "grayscale(100%)";
    case "bronze":
      return "sepia(60%) saturate(150%) hue-rotate(5deg)";
    case "silver":
      return "grayscale(30%) brightness(110%)";
    case "gold":
      return undefined;
    default:
      return "grayscale(100%)";
  }
}

function getBustCaption(bustColor: string) {
  switch (bustColor as BustColor) {
    case "grayscale":
      return "Bust locked — grayscale";
    case "bronze":
      return "Bust — bronze";
    case "silver":
      return "Bust — silver";
    case "gold":
      return "Bust — gold (full color)";
    default:
      return "Bust locked — grayscale";
  }
}

function getMedalEmoji(medalTier: string | null) {
  switch (medalTier) {
    case "gold":
      return "🥇";
    case "silver":
      return "🥈";
    case "bronze":
      return "🥉";
    default:
      return "🏅";
  }
}

function formatAchievementType(type: string) {
  return type.replace(/_/g, " ").toUpperCase();
}

function formatAchievementScope(achievement: Achievement) {
  const scope =
    achievement.achievement_scope.charAt(0).toUpperCase() +
    achievement.achievement_scope.slice(1);

  if (achievement.achievement_scope === "team" && achievement.event?.evt_code) {
    return `${scope} achievement · ${achievement.event.evt_code}`;
  }

  return `${scope} achievement`;
}

type SeasonGroup = {
  seasonYear: number;
  orgName: string;
  orgCode: string;
  achievements: Achievement[];
};

function groupAchievementsBySeason(achievements: Achievement[]): SeasonGroup[] {
  const bySeason = new Map<number, Achievement[]>();

  for (const achievement of achievements) {
    const seasonYear = achievement.season_year ?? 0;
    const existing = bySeason.get(seasonYear) ?? [];
    existing.push(achievement);
    bySeason.set(seasonYear, existing);
  }

  return [...bySeason.entries()]
    .sort(([a], [b]) => b - a)
    .map(([seasonYear, seasonAchievements]) => {
      const org = seasonAchievements[0]?.org;
      return {
        seasonYear,
        orgName: org?.name ?? "Unknown Organization",
        orgCode: org?.org_code ?? "",
        achievements: seasonAchievements,
      };
    });
}

function LightCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_28px_rgba(12,35,64,0.06)]">
      {children}
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PlayerSculptureCard({ player }: { player: PlayerProfile }) {
  const bustFilter = getBustFilter(player.bust_color);

  return (
    <LightCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
            Player Sculpture
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Primary provenance artifact
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Behind glass
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4">
        <div className="relative mx-auto max-w-[320px]">
          <Image
            src="/images/PPC-BeauRicart-SculptureBust-GreyScale.png"
            alt={`Archival bust of ${player.display_name}`}
            width={900}
            height={900}
            className="h-auto w-full object-contain"
            style={bustFilter ? { filter: bustFilter } : undefined}
            priority
          />
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-[320px] rounded-xl border border-stone-300/70 bg-stone-100 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        <p
          className="text-sm font-semibold tracking-[0.04em] text-stone-900 uppercase"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {player.display_name}
        </p>
        <p className="mt-1 text-xs tracking-[0.28em] text-stone-600 uppercase">
          {player.ppc_number}
        </p>
      </div>

      <p className="mt-4 text-center text-xs tracking-[0.12em] text-slate-500 uppercase">
        {getBustCaption(player.bust_color)}
      </p>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        Displayed as a fixed artifact once approved.
      </p>
    </LightCard>
  );
}

function PlayerRecordCard({ player }: { player: PlayerProfile }) {
  return (
    <LightCard>
      <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
        The Vault • Personal Player Collection
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-[2.65rem] sm:leading-tight">
        {player.display_name}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Record: <span className="ml-1 text-slate-900">PPC</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          View: <span className="ml-1 text-slate-900">public</span>
        </span>
        <span className="inline-flex items-center rounded-full border border-[#B8972A]/25 bg-[#B8972A]/8 px-3 py-1.5 text-xs font-semibold text-slate-700">
          Vault Level:{" "}
          <span className="ml-1 capitalize text-[#B8972A]">
            {formatLevel(player.vault_level)}
          </span>
        </span>
      </div>

      <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
        This is an archival record — not a profile. Public view is presented
        behind glass: immutable identifiers and safe metadata only. Evidence
        remains retained on file and is shown publicly as counts unless
        authority permits more.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="PPC ID" value={player.ppc_number} />
        <MetricTile
          label="Strength Score"
          value={`${player.strength_score} / 100`}
        />
        <MetricTile label="Issued Artifacts" value="0" />
        <MetricTile label="Evidence On File" value="0 photos • 0 docs" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="#"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          GUM/PPC
        </Link>
        <Link
          href={`/vault/ppc/${player.ppc_number}`}
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Vault Entrance
        </Link>
      </div>
    </LightCard>
  );
}

function ArchiveAuthoritySection({
  orgName,
  orgCode,
}: {
  orgName: string;
  orgCode: string;
}) {
  return (
    <LightCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
            Archive Authority
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Issuance under institutional authority (behind glass)
          </h2>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold tracking-[0.12em] text-slate-500">
          {orgCode}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#e2e8f0)] p-3 shadow-inner">
          <Image
            src="/images/OHAAAStoneReliefLogo.png"
            alt="Ohio AAA Blue Jackets Archive Crest"
            width={120}
            height={120}
            className="h-auto w-full object-contain"
          />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Issuing Authority
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{orgName}</p>
          <p className="mt-2 text-sm text-slate-600">
            Organization affiliation recorded within the archive at public view
            maturity.
          </p>
        </div>
      </div>
    </LightCard>
  );
}

function PlayerHistorySection({ achievements }: { achievements: Achievement[] }) {
  const seasons = groupAchievementsBySeason(achievements);

  return (
    <LightCard>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
          Career Record
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          Player History
        </h2>
      </div>

      {seasons.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No recorded achievements on file.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {seasons.map((season) => (
            <div key={season.seasonYear}>
              <h3 className="border-b border-[#B8972A]/20 pb-3 text-base font-semibold text-[#B8972A]">
                {season.seasonYear} — {season.orgName}
                {season.orgCode ? ` (${season.orgCode})` : ""}
              </h3>

              <ul className="mt-4 space-y-4">
                {season.achievements.map((achievement, index) => (
                  <li
                    key={`${season.seasonYear}-${achievement.achievement_type}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4"
                  >
                    <p className="text-sm font-semibold tracking-wide text-slate-900">
                      <span className="mr-2" aria-hidden="true">
                        {getMedalEmoji(achievement.medal_tier)}
                      </span>
                      {formatAchievementType(achievement.achievement_type)}
                      {achievement.event?.name
                        ? ` — ${achievement.event.name}`
                        : ""}
                    </p>
                    <p className="mt-1 pl-7 text-sm text-slate-600">
                      {formatAchievementScope(achievement)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </LightCard>
  );
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
      <LightCard>
        <p className="text-[11px] font-semibold tracking-[0.24em] text-slate-500 uppercase">
          The Vault • Personal Player Collection
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          PPC Not Found
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          No player record exists for{" "}
          <span className="font-mono font-semibold text-slate-900">{id}</span>.
        </p>
      </LightCard>
    );
  }

  const primaryOrg = player.org_affiliations[0]?.org;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-2">
        <PlayerSculptureCard player={player} />
        <PlayerRecordCard player={player} />
      </section>

      {primaryOrg ? (
        <ArchiveAuthoritySection
          orgName={primaryOrg.name}
          orgCode={primaryOrg.org_code}
        />
      ) : null}

      {player.achievements?.length ? (
        <PlayerHistorySection achievements={player.achievements} />
      ) : null}
    </div>
  );
}
