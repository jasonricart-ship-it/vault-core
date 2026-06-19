import { EvtRegistryFloor } from "@/components/vault/institutions/EvtRegistryFloor";
import { getSession } from "@/auth.config";
import type {
  EvtRegistryEntry,
  EvtRegistryGovOption,
  EvtRegistryOrgOption,
} from "@/lib/evt-registry";
import { prisma } from "@/lib/db";

async function loadEvtRegistryList(): Promise<{
  events: EvtRegistryEntry[];
  orgOptions: EvtRegistryOrgOption[];
  govOptions: EvtRegistryGovOption[];
}> {
  const [events, orgOptions, govOptions] = await Promise.all([
    prisma.event.findMany({
      orderBy: [{ org: { name: "asc" } }, { season_year: "desc" }, { name: "asc" }],
      select: {
        id: true,
        evt_code: true,
        name: true,
        season_year: true,
        start_date: true,
        end_date: true,
        location: true,
        city: true,
        state: true,
        registration_status: true,
        gov_id: true,
        org: {
          select: {
            id: true,
            org_code: true,
            name: true,
          },
        },
        _count: {
          select: {
            player_participation: true,
            achievements: true,
          },
        },
      },
    }),
    prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        org_code: true,
        name: true,
      },
    }),
    prisma.governingBody.findMany({
      orderBy: [{ gov_tier: "asc" }, { name: "asc" }],
      select: {
        id: true,
        gov_code: true,
        name: true,
        gov_tier: true,
      },
    }),
  ]);

  const govById = new Map(govOptions.map((gov) => [gov.id, gov]));

  const mappedEvents: EvtRegistryEntry[] = events.map((event) => {
    const linkedGov = event.gov_id ? govById.get(event.gov_id) : null;

    return {
      id: event.id,
      evt_code: event.evt_code,
      name: event.name,
      season_year: event.season_year,
      start_date: event.start_date?.toISOString() ?? null,
      end_date: event.end_date?.toISOString() ?? null,
      location: event.location,
      city: event.city,
      state: event.state,
      registration_status: event.registration_status,
      org_id: event.org.id,
      org_code: event.org.org_code,
      org_name: event.org.name,
      gov_affiliation: linkedGov
        ? {
            gov_code: linkedGov.gov_code,
            name: linkedGov.name,
            gov_tier: linkedGov.gov_tier,
          }
        : null,
      player_participation_count: event._count.player_participation,
      achievements_count: event._count.achievements,
    };
  });

  return {
    events: mappedEvents,
    orgOptions,
    govOptions,
  };
}

export default async function InstitutionsEvtRegistryPage() {
  const session = await getSession();
  const role = session?.user?.role;
  const canRegister =
    role === "org_admin" || role === "authority" || role === "super_admin";
  const { events, orgOptions, govOptions } = await loadEvtRegistryList();

  return (
    <EvtRegistryFloor
      events={events}
      orgOptions={orgOptions}
      govOptions={govOptions}
      canRegister={canRegister}
    />
  );
}
