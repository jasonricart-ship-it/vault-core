import { CollectorWing } from "@/components/vault/CollectorWing";
import { fetchCollectorWingData } from "@/lib/collector-wing";
import { authOptions } from "@/src/auth";
import { getServerSession } from "next-auth";

export default async function CollectorWingPage() {
  const session = await getServerSession(authOptions);
  const { collectors, transitItems, userVrc } = await fetchCollectorWingData(
    session?.user?.id,
  );

  return (
    <CollectorWing
      collectors={collectors}
      transitItems={transitItems}
      userVrc={userVrc}
    />
  );
}
