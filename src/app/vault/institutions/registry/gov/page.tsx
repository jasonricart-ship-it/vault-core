import { GovRegistryFloor } from "@/components/vault/institutions/GovRegistryFloor";
import { getSession } from "@/auth.config";
import type { GovRegistryEntry, GovRegistryOption } from "@/lib/gov-registry";
import { prisma } from "@/lib/db";

async function loadGovRegistryList(): Promise<{
  governingBodies: GovRegistryEntry[];
  govOptions: GovRegistryOption[];
}> {
  const govs = await prisma.governingBody.findMany({
    orderBy: [{ gov_tier: "asc" }, { is_verified: "desc" }, { name: "asc" }],
    select: {
      id: true,
      gov_code: true,
      name: true,
      short_name: true,
      sport: true,
      gov_tier: true,
      jurisdiction: true,
      registration_status: true,
      is_verified: true,
      vault_level: true,
      strength_score: true,
      parent: {
        select: {
          id: true,
          gov_code: true,
          name: true,
          gov_tier: true,
        },
      },
      children: {
        select: {
          id: true,
          gov_code: true,
          name: true,
          gov_tier: true,
        },
        orderBy: { name: "asc" },
      },
      org_affiliations: {
        select: {
          affiliation_type: true,
          verified: true,
          org: {
            select: {
              org_code: true,
              name: true,
              org_type: true,
              sport: true,
            },
          },
        },
        orderBy: { org: { name: "asc" } },
      },
      _count: {
        select: {
          org_affiliations: true,
        },
      },
    },
  });

  const governingBodies = govs.map((gov) => ({
    id: gov.id,
    gov_code: gov.gov_code,
    name: gov.name,
    short_name: gov.short_name,
    sport: gov.sport,
    gov_tier: gov.gov_tier,
    jurisdiction: gov.jurisdiction,
    registration_status: gov.registration_status,
    is_verified: gov.is_verified,
    vault_level: gov.vault_level,
    strength_score: gov.strength_score,
    child_org_count: gov._count.org_affiliations,
    parent: gov.parent,
    children: gov.children,
    org_affiliations: gov.org_affiliations.map((affiliation) => ({
      org_code: affiliation.org.org_code,
      name: affiliation.org.name,
      org_type: affiliation.org.org_type,
      sport: affiliation.org.sport,
      affiliation_type: affiliation.affiliation_type,
      verified: affiliation.verified,
    })),
  }));

  const govOptions = governingBodies.map((gov) => ({
    id: gov.id,
    gov_code: gov.gov_code,
    name: gov.name,
    gov_tier: gov.gov_tier,
  }));

  return { governingBodies, govOptions };
}

export default async function InstitutionsGovRegistryPage() {
  const session = await getSession();
  const canRegister =
    session?.user?.role === "authority" || session?.user?.role === "super_admin";
  const { governingBodies, govOptions } = await loadGovRegistryList();

  return (
    <GovRegistryFloor
      governingBodies={governingBodies}
      govOptions={govOptions}
      canRegister={canRegister}
    />
  );
}
