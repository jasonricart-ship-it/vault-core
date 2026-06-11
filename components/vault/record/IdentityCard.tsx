import { SubjectMarker } from "./SubjectMarker";
import { VaultGlassCard } from "./VaultGlassCard";
import type { PlayerProfile } from "./types";
import { formatLevel } from "./utils";

export function IdentityCard({ player }: { player: PlayerProfile }) {
  return (
    <VaultGlassCard kicker="Record" title="Identity">
      <div className="space-y-6">
        <div>
          <p className="font-mono text-sm tracking-[0.18em] text-[#B8972A] uppercase">
            {player.ppc_number}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {player.display_name}
          </h1>
          {player.preferred_name ? (
            <p className="mt-3 text-lg text-white/60">
              Preferred:{" "}
              <span className="text-[#B8972A]">{player.preferred_name}</span>
            </p>
          ) : null}
        </div>

        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-[#0D1B2E]/50 p-4">
            <dt className="text-[11px] tracking-[0.24em] text-[#B8972A] uppercase">
              Primary Sport
            </dt>
            <dd className="mt-2 text-lg capitalize text-white/90">
              {player.primary_sport ?? "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0D1B2E]/50 p-4">
            <dt className="text-[11px] tracking-[0.24em] text-[#B8972A] uppercase">
              Jersey Number
            </dt>
            <dd className="mt-2 font-mono text-lg text-[#B8972A]">
              {player.jersey_number ? `#${player.jersey_number}` : "—"}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0D1B2E]/50 p-4">
            <dt className="text-[11px] tracking-[0.24em] text-[#B8972A] uppercase">
              Exhibit Status
            </dt>
            <dd className="mt-2 text-lg capitalize text-white/90">
              {formatLevel(player.exhibit_status)}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0D1B2E]/50 p-4">
            <dt className="text-[11px] tracking-[0.24em] text-[#B8972A] uppercase">
              Viewer Mode
            </dt>
            <dd className="mt-2 text-lg text-white/90">public</dd>
          </div>
        </dl>
      </div>
    </VaultGlassCard>
  );
}

export function SubjectMarkerCard({
  player,
  isGrayscale,
}: {
  player: PlayerProfile;
  isGrayscale: boolean;
}) {
  return (
    <VaultGlassCard kicker="Subject Marker" title="Archival Bust">
      <SubjectMarker
        ppcNumber={player.ppc_number}
        displayName={player.display_name}
        isGrayscale={isGrayscale}
      />
    </VaultGlassCard>
  );
}
