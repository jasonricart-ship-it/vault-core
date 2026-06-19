import { redirect } from "next/navigation";
import { ChainOfCustodyTransfer } from "@/components/vault/ChainOfCustodyTransfer";
import {
  loadTransferAuthorityItems,
  loadTransferCurrentUser,
} from "@/lib/transfer-server";
import { authOptions } from "@/src/auth";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["guardian", "authority", "super_admin"]);

export default async function VrcTransferPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/vault/vrc/transfer");
  }

  if (!ALLOWED_ROLES.has(session.user.role)) {
    redirect("/dashboard");
  }

  const [items, currentUser] = await Promise.all([
    loadTransferAuthorityItems(session.user.id),
    loadTransferCurrentUser(session.user.id),
  ]);

  if (!currentUser) {
    redirect("/login?callbackUrl=/vault/vrc/transfer");
  }

  return <ChainOfCustodyTransfer items={items} currentUser={currentUser} />;
}
