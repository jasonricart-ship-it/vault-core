import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.playerOrgAffiliation.deleteMany();
  await prisma.orgGovAffiliation.deleteMany();
  await prisma.playerEventParticipation.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.gumItem.deleteMany();
  await prisma.evidenceFile.deleteMany();
  await prisma.player.deleteMany();
  await prisma.event.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.governingBody.deleteMany({ where: { parent_gov_id: { not: null } } });
  await prisma.governingBody.deleteMany();

  const usah = await prisma.governingBody.create({
    data: {
      gov_code: "USAH",
      name: "USA Hockey",
      gov_tier: "GOV-N",
      sport: "hockey",
      registration_status: "active",
      is_verified: true,
    },
  });

  const tiehl = await prisma.governingBody.create({
    data: {
      gov_code: "TIEHL",
      name: "Tiehl League",
      gov_tier: "GOV-R",
      sport: "hockey",
      parent_gov_id: usah.id,
      registration_status: "active",
      is_verified: true,
    },
  });

  const ohaaa = await prisma.organization.create({
    data: {
      org_code: "OHAAA",
      name: "Ohio AAA Blue Jackets",
      sport: "hockey",
      org_type: "team",
      state: "Ohio",
      registration_status: "active",
      is_verified: true,
    },
  });

  const beau = await prisma.player.create({
    data: {
      ppc_number: "PPC-0247",
      display_name: 'Jason "Beau" Ricart',
      first_name: "Jason",
      last_name: "Ricart",
      preferred_name: "Beau",
      primary_sport: "hockey",
      jersey_number: "86",
      vault_level: "recorded",
      bust_color: "grayscale",
      exhibit_status: "active",
    },
  });

  await prisma.playerOrgAffiliation.create({
    data: {
      player_id: beau.id,
      org_id: ohaaa.id,
      season_year: 2024,
      jersey_number: "86",
      role: "player",
      status: "active",
      verified_by_org: true,
    },
  });

  await prisma.orgGovAffiliation.create({
    data: {
      org_id: ohaaa.id,
      gov_id: tiehl.id,
      affiliation_type: "member",
      status: "active",
      verified: true,
    },
  });

  await prisma.orgGovAffiliation.create({
    data: {
      org_id: ohaaa.id,
      gov_id: usah.id,
      affiliation_type: "sanctioned",
      status: "active",
      verified: true,
    },
  });

  const tiehlChampionship = await prisma.event.create({
    data: {
      evt_code: "EVT-2024-0001",
      org_id: ohaaa.id,
      name: "Tiehl League Championship 2024",
      season_year: 2024,
      location: "Columbus, OH",
      registration_status: "active",
    },
  });

  await prisma.achievement.create({
    data: {
      ppc_id: beau.id,
      evt_id: tiehlChampionship.id,
      org_id: ohaaa.id,
      achievement_type: "champion",
      achievement_scope: "team",
      medal_tier: "gold",
      season_year: 2024,
      notes: "Tiehl League Championship — Team Champion",
    },
  });

  await prisma.achievement.create({
    data: {
      ppc_id: beau.id,
      evt_id: tiehlChampionship.id,
      org_id: ohaaa.id,
      achievement_type: "mvp",
      achievement_scope: "personal",
      medal_tier: "gold",
      season_year: 2024,
      notes: "Tournament MVP",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
