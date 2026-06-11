import type { ReactNode } from "react";
import { VaultHeader } from "@/components/vault/VaultHeader";

export default function VaultLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <VaultHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
