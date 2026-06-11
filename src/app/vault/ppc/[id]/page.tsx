import { headers } from "next/headers";
import { EvidencePanel } from "@/components/vault/record/EvidencePanel";
import { GumArtifactsPanel } from "@/components/vault/record/GumArtifactsPanel";
import {
  IdentityCard,
  SubjectMarkerCard,
} from "@/components/vault/record/IdentityCard";
import { ProvenanceNetwork } from "@/components/vault/record/ProvenanceNetwork";
import { RecordMetaPills } from "@/components/vault/record/RecordMetaPills";
import type { PlayerProfile } from "@/components/vault/record/types";
import { VaultGlassCard } from "@/components/vault/record/VaultGlassCard";
import { VaultLockSection } from "@/components/vault/record/VaultLockSection";
import {
  buildProvenanceRows,
  recordedGlowOpacity,
} from "@/components/vault/record/utils";

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

export default async function PpcProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(id);

  if (!player) {
    return (
      <div className="space-y-8">
        <VaultGlassCard
          kicker="The Vault • Personal Player Collection"
          title="Record State"
        >
          <p className="max-w-3xl text-sm leading-7 text-white/55">
            This is an archival record — not a profile. Public view is presented
            behind glass: immutable identifiers and safe metadata only.
          </p>
          <div className="mt-8 rounded-xl border border-white/10 bg-[#0D1B2E]/70 px-6 py-10 text-center">
            <h1 className="text-3xl font-semibold text-white">PPC Not Found</h1>
            <p className="mt-4 text-white/50">
              No player record exists for{" "}
              <span className="font-mono text-[#B8972A]">{id}</span>.
            </p>
          </div>
        </VaultGlassCard>
      </div>
    );
  }

  const isGrayscale = player.bust_color === "grayscale";
  const glowOpacity = recordedGlowOpacity(player.vault_level);
  const provenanceRows = buildProvenanceRows(player);

  return (
    <div className="space-y-8">
      <VaultGlassCard kicker="The Vault • Personal Player Collection">
        <p className="max-w-4xl text-sm leading-7 text-white/55">
          This is an archival record — not a profile. Public view is presented
          behind glass: immutable identifiers and safe metadata only. Evidence
          remains retained on file and is shown publicly as counts unless
          authority permits more.
        </p>
        <div className="mt-6">
          <RecordMetaPills
            ppcNumber={player.ppc_number}
            vaultLevel={player.vault_level}
          />
        </div>
      </VaultGlassCard>

      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <IdentityCard player={player} />
        <SubjectMarkerCard player={player} isGrayscale={isGrayscale} />
      </section>

      <VaultGlassCard kicker="Vault Lock" title="Authentication">
        <VaultLockSection vaultLevel={player.vault_level} />
      </VaultGlassCard>

      <ProvenanceNetwork
        rows={provenanceRows}
        glowOpacity={glowOpacity}
        vaultLevel={player.vault_level}
      />

      <section className="grid gap-8 lg:grid-cols-2">
        <EvidencePanel />
        <GumArtifactsPanel />
      </section>
    </div>
  );
}
