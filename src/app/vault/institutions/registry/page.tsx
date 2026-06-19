import { OrgRegistryFloor } from "@/components/vault/institutions/OrgRegistryFloor";
import type { OrgRegistryEntry } from "@/lib/org-registry";
import { prisma } from "@/lib/db";

async function loadOrgRegistryList(): Promise<OrgRegistryEntry[]> {
  const orgs = await prisma.organization.findMany({
    orderBy: [{ is_verified: "desc" }, { name: "asc" }],
    select: {
      id: true,
      org_code: true,
      name: true,
      short_name: true,
      sport: true,
      org_type: true,
      state: true,
      city: true,
      registration_status: true,
      is_verified: true,
      vault_level: true,
      strength_score: true,
      gov_affiliations: {
        select: {
          affiliation_type: true,
          verified: true,
          gov: {
            select: {
              gov_code: true,
              name: true,
              gov_tier: true,
            },
          },
        },
      },
      _count: {
        select: {
          player_affiliations: true,
        },
      },
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    org_code: org.org_code,
    name: org.name,
    short_name: org.short_name,
    sport: org.sport,
    org_type: org.org_type,
    state: org.state,
    city: org.city,
    registration_status: org.registration_status,
    is_verified: org.is_verified,
    vault_level: org.vault_level,
    strength_score: org.strength_score,
    player_count: org._count.player_affiliations,
    gov_affiliations: org.gov_affiliations.map((affiliation) => ({
      gov_code: affiliation.gov.gov_code,
      name: affiliation.gov.name,
      gov_tier: affiliation.gov.gov_tier,
      affiliation_type: affiliation.affiliation_type,
      verified: affiliation.verified,
    })),
  }));
}

export default async function InstitutionsRegistryPage() {
  const organizations = await loadOrgRegistryList();

  return <OrgRegistryFloor organizations={organizations} />;
}
