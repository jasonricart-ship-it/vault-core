import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const player = await prisma.player.findUnique({
    where: { ppc_number: "PPC-00086" },
    select: { id: true, ppc_number: true, display_name: true },
  });

  if (!player) {
    throw new Error("Player PPC-00086 not found");
  }

  const account = await prisma.account.update({
    where: { email: "jason1ricart@gmail.com" },
    data: { linked_player_id: player.id },
    select: {
      email: true,
      role: true,
      linked_player_id: true,
    },
  });

  console.log(
    `Linked ${account.email} → ${player.display_name} (${player.ppc_number})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
