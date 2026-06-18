import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const account = await prisma.account.update({
    where: { email: "jason1ricart@gmail.com" },
    data: { role: "super_admin" },
    select: { email: true, role: true, display_name: true },
  });

  console.log(JSON.stringify(account, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
