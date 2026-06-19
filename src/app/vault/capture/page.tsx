import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LiveCaptureScreen } from "@/components/vault/capture/LiveCaptureScreen";
import { loadGumSubmitContext } from "@/lib/gum-submit-context";
import { prisma } from "@/lib/db";
import { authOptions } from "@/src/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["guardian", "authority", "evaluator", "super_admin"]);

async function loadCapturePlayers(accountId: string, role: string) {
  if (role === "guardian") {
    const players = await loadGumSubmitContext(accountId, role);
    return players.map((player) => ({
      id: player.id,
      display_name: player.display_name,
      ppc_number: player.ppc_number,
      primary_sport: null as string | null,
    }));
  }

  return prisma.player.findMany({
    where: {
      exhibit_status: "active",
      display_name: { not: "Reserved" },
    },
    orderBy: { ppc_number: "asc" },
    select: {
      id: true,
      display_name: true,
      ppc_number: true,
      primary_sport: true,
    },
  });
}

export default async function LiveCapturePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/vault/capture");
  }

  if (!ALLOWED_ROLES.has(session.user.role)) {
    redirect("/dashboard");
  }

  const players = await loadCapturePlayers(session.user.id, session.user.role);

  return <LiveCaptureScreen players={players} />;
}
