import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
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

  await prisma.governingBody.create({
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

  await prisma.organization.create({
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

  await prisma.player.create({
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
