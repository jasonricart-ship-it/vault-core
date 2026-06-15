import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/auth";
import { prisma } from "@/lib/db";
import { RegisterShell } from "@/components/register/RegisterShell";

export const dynamic = "force-dynamic";

async function getLinkedPlayer(accountId: string) {
  return prisma.player.findFirst({
    where: {
      OR: [{ guardian_account_id: accountId }, { created_by: accountId }],
    },
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const player = await getLinkedPlayer(session.user.id);
  const welcomeName =
    player?.preferred_name ?? player?.display_name ?? session.user.email;

  return (
    <RegisterShell
      step="Member Dashboard"
      title="The Vault"
      subtitle="Your archival member portal."
    >
      {player ? (
        <div className="space-y-6 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Welcome back, {welcomeName}
          </p>
          <p className="text-sm leading-7 text-slate-600">
            Your Personal Player Collection record is on file. View your public
            archival record behind glass.
          </p>
          <Link
            href={`/vault/ppc/${player.ppc_number}`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#B8972A]/30 bg-[#0D1B2E] px-4 py-3.5 text-sm font-semibold tracking-[0.12em] text-[#B8972A] uppercase transition hover:bg-[#152238]"
          >
            View Your PPC Record
          </Link>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Welcome, {session.user.email}
          </p>
          <p className="text-sm leading-7 text-slate-600">
            Your account is active, but no player record is linked yet. Complete
            registration to establish your PPC.
          </p>
          <Link
            href="/register/player"
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#B8972A]/30 bg-[#0D1B2E] px-4 py-3.5 text-sm font-semibold tracking-[0.12em] text-[#B8972A] uppercase transition hover:bg-[#152238]"
          >
            Complete Your Registration
          </Link>
        </div>
      )}
    </RegisterShell>
  );
}
