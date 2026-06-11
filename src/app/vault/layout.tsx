import type { ReactNode } from "react";
import { VaultHeader } from "@/components/vault/VaultHeader";

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D1B2E] text-white">
      <VaultHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
