import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── CLEAN SLATE ──────────────────────────────────────────────────────────
  await prisma.vaultRegistryCollector.deleteMany();
  await prisma.itemAuthorityLog.deleteMany();
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

  // ── GOV-N ────────────────────────────────────────────────────────────────
  const usah = await prisma.governingBody.create({
    data: {
      gov_code: "USAH",
      name: "USA Hockey",
      short_name: "USA Hockey",
      gov_tier: "GOV-N",
      sport: "Ice Hockey",
      jurisdiction: "United States",
      is_verified: true,
      registration_status: "active",
      vault_level: "archival",
      strength_score: 100,
    },
  });

  const aau = await prisma.governingBody.create({
    data: {
      gov_code: "AAU",
      name: "Amateur Athletic Union",
      short_name: "AAU",
      gov_tier: "GOV-N",
      sport: null,
      jurisdiction: "United States",
      is_verified: true,
      registration_status: "active",
      vault_level: "archival",
      strength_score: 100,
    },
  });

  const nfhs = await prisma.governingBody.create({
    data: {
      gov_code: "NFHS",
      name: "National Federation of State High School Associations",
      short_name: "NFHS",
      gov_tier: "GOV-N",
      sport: null,
      jurisdiction: "United States",
      is_verified: true,
      registration_status: "active",
      vault_level: "archival",
      strength_score: 100,
    },
  });

  // ── GOV-R ────────────────────────────────────────────────────────────────
  const t1ehl = await prisma.governingBody.create({
    data: {
      gov_code: "T1EHL",
      name: "Tier 1 Elite Hockey League",
      short_name: "T1EHL",
      gov_tier: "GOV-R",
      sport: "Ice Hockey",
      jurisdiction: "Midwest",
      parent_gov_id: usah.id,
      is_verified: true,
      registration_status: "active",
      vault_level: "established",
      strength_score: 80,
    },
  });

  const ohsaa = await prisma.governingBody.create({
    data: {
      gov_code: "OHSAA",
      name: "Ohio High School Athletic Association",
      short_name: "OHSAA",
      gov_tier: "GOV-R",
      sport: null,
      jurisdiction: "Ohio",
      parent_gov_id: nfhs.id,
      is_verified: true,
      registration_status: "active",
      vault_level: "established",
      strength_score: 80,
    },
  });

  // ── ORGS ─────────────────────────────────────────────────────────────────
  const ohaaa = await prisma.organization.create({
    data: {
      org_code: "OHAAA",
      name: "Ohio AAA Blue Jackets",
      short_name: "Ohio AAA",
      sport: "Ice Hockey",
      org_type: "team",
      state: "Ohio",
      city: "Columbus",
      is_verified: true,
      registration_status: "active",
      vault_level: "established",
      strength_score: 75,
    },
  });

  const apxvb = await prisma.organization.create({
    data: {
      org_code: "APXVB",
      name: "Apex Club Volleyball",
      short_name: "Apex VB",
      sport: "Volleyball",
      org_type: "club",
      state: "Ohio",
      is_verified: true,
      registration_status: "active",
      vault_level: "documented",
      strength_score: 50,
    },
  });

  const bexvb = await prisma.organization.create({
    data: {
      org_code: "BEXVB",
      name: "Bexley High School",
      short_name: "Bexley",
      sport: "Volleyball",
      org_type: "school",
      state: "Ohio",
      city: "Bexley",
      is_verified: true,
      registration_status: "active",
      vault_level: "documented",
      strength_score: 50,
    },
  });

  // ── ORG → GOV AFFILIATIONS ───────────────────────────────────────────────
  // OHAAA → T1EHL → USAH
  await prisma.orgGovAffiliation.create({
    data: {
      org_id: ohaaa.id,
      gov_id: t1ehl.id,
      affiliation_type: "member",
      status: "active",
      verified: true,
    },
  });

  // Apex → AAU
  await prisma.orgGovAffiliation.create({
    data: {
      org_id: apxvb.id,
      gov_id: aau.id,
      affiliation_type: "member",
      status: "active",
      verified: true,
    },
  });

  // Bexley → OHSAA → NFHS
  await prisma.orgGovAffiliation.create({
    data: {
      org_id: bexvb.id,
      gov_id: ohsaa.id,
      affiliation_type: "member",
      status: "active",
      verified: true,
    },
  });

  // ── VRC — Vault Registry Collectors ──────────────────────────────────────
  const reservedVrc = Array.from({ length: 100 }, (_, i) => i + 1)
    .filter((n) => n !== 1)
    .map((n) => ({
      vrc_number: `VRC-${String(n).padStart(5, "0")}`,
      display_name: "Reserved",
      first_name: "Reserved",
      last_name: "Reserved",
      vault_level: "recorded",
      strength_score: 0,
      exhibit_status: "pending",
      visibility: "authority",
    }));

  await prisma.vaultRegistryCollector.createMany({
    data: reservedVrc,
  });

  const jasonBlaine = await prisma.vaultRegistryCollector.create({
    data: {
      vrc_number: "VRC-00001",
      display_name: "Jason Blaine Ricart",
      first_name: "Jason",
      middle_name: "Blaine",
      last_name: "Ricart",
      collector_focus: "Sports memorabilia · Athletic provenance",
      vault_level: "established",
      strength_score: 65,
      bust_color: "silver",
      visibility: "public",
      exhibit_status: "active",
      is_guardian: true,
    },
  });

  // ── RESERVED BLOCK PPC-00001 through PPC-00100 ───────────────────────────
  const reservedNumbers = Array.from({ length: 100 }, (_, i) => i + 1)
    .filter((n) => ![6, 9, 86].includes(n))
    .map((n) => ({
      ppc_number: `PPC-${String(n).padStart(5, "0")}`,
      display_name: "Reserved",
      first_name: "Reserved",
      last_name: "Reserved",
      vault_level: "recorded",
      strength_score: 0,
      exhibit_status: "pending",
      visibility: "authority",
      is_minor: false,
    }));

  await prisma.player.createMany({ data: reservedNumbers });

  // ── PPC-00006 — Ava Lillian Ricart ───────────────────────────────────────
  const ava = await prisma.player.create({
    data: {
      ppc_number: "PPC-00006",
      display_name: "Ava Lillian Ricart",
      first_name: "Ava",
      last_name: "Ricart",
      preferred_name: "Ava",
      primary_sport: "Volleyball",
      vault_level: "archival",
      strength_score: 75,
      exhibit_status: "active",
      bust_color: "gold",
      visibility: "public",
      is_minor: true,
    },
  });

  // ── PPC-00009 — Brady Ricart ──────────────────────────────────────────────
  const brady = await prisma.player.create({
    data: {
      ppc_number: "PPC-00009",
      display_name: "Brady Ricart",
      first_name: "Brady",
      last_name: "Ricart",
      preferred_name: "Brady",
      primary_sport: "Ice Hockey",
      vault_level: "established",
      strength_score: 65,
      exhibit_status: "active",
      bust_color: "silver",
      visibility: "public",
      is_minor: true,
    },
  });

  // ── PPC-00086 — Jason "Beau" Ricart ──────────────────────────────────────
  const beau = await prisma.player.create({
    data: {
      ppc_number: "PPC-00086",
      display_name: 'Jason "Beau" Ricart',
      first_name: "Jason",
      last_name: "Ricart",
      preferred_name: "Beau",
      primary_sport: "Ice Hockey",
      jersey_number: "14",
      vault_level: "established",
      strength_score: 65,
      exhibit_status: "active",
      bust_color: "silver",
      visibility: "public",
      is_minor: true,
    },
  });

  // ── PLAYER → ORG AFFILIATIONS ─────────────────────────────────────────────
  // Beau → OHAAA
  await prisma.playerOrgAffiliation.create({
    data: {
      player_id: beau.id,
      org_id: ohaaa.id,
      season_year: 2024,
      jersey_number: "14",
      role: "player",
      is_captain: true,
      status: "active",
      verified_by_org: true,
      start_date: new Date("2024-09-01"),
    },
  });

  // Brady → OHAAA
  await prisma.playerOrgAffiliation.create({
    data: {
      player_id: brady.id,
      org_id: ohaaa.id,
      season_year: 2024,
      role: "player",
      status: "active",
      verified_by_org: true,
      start_date: new Date("2024-09-01"),
    },
  });

  // Ava → Apex (current — club season active)
  await prisma.playerOrgAffiliation.create({
    data: {
      player_id: ava.id,
      org_id: apxvb.id,
      season_year: 2025,
      role: "player",
      status: "active",
      verified_by_org: true,
      start_date: new Date("2024-12-01"),
    },
  });

  // Ava → Bexley (historical — school season complete)
  await prisma.playerOrgAffiliation.create({
    data: {
      player_id: ava.id,
      org_id: bexvb.id,
      season_year: 2024,
      role: "player",
      status: "inactive",
      verified_by_org: true,
      start_date: new Date("2024-08-01"),
      end_date: new Date("2024-11-30"),
    },
  });

  // ── BEAU'S CHAMPIONSHIP & MVP (carried over from old seed) ───────────────
  const tiehlChampionship = await prisma.event.create({
    data: {
      evt_code: "EVT-2024-T1EHL-CHAMP",
      org_id: ohaaa.id,
      name: "T1EHL Championship 2024",
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
      notes: "T1EHL Championship — Team Champion",
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

  console.log("─────────────────────────────────────────────");
  console.log("The Vault — seed complete");
  console.log("─────────────────────────────────────────────");
  console.log("GOV-N:    USAH · AAU · NFHS");
  console.log("GOV-R:    T1EHL · OHSAA");
  console.log("ORGs:     OHAAA · APXVB · BEXVB");
  console.log("─────────────────────────────────────────────");
  console.log("VRC-00001 Jason Blaine Ricart");
  console.log("Reserved: VRC-00002 through VRC-00100");
  console.log("─────────────────────────────────────────────");
  console.log("PPC-00006 Ava Lillian Ricart");
  console.log("PPC-00009 Brady Ricart");
  console.log("PPC-00086 Jason 'Beau' Ricart");
  console.log("Reserved: PPC-00001 through PPC-00100");
  console.log("─────────────────────────────────────────────");
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
