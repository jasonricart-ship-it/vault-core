import type { ReactNode } from "react";

export default function PpcVaultLayout({ children }: { children: ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-[#0A0908]">{children}</div>;
}
