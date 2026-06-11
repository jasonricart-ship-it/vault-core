import { formatLevel } from "./utils";

export function RecordMetaPills({
  ppcNumber,
  vaultLevel,
}: {
  ppcNumber: string;
  vaultLevel: string;
}) {
  const pills = [
    { label: "Record", value: "PPC" },
    { label: "ID", value: ppcNumber },
    { label: "View", value: "public" },
    { label: "Standing", value: formatLevel(vaultLevel) },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex items-center gap-2 rounded-full border border-[#B8972A]/20 bg-[#0D1B2E]/60 px-3 py-1.5 text-[11px]"
        >
          <span className="tracking-[0.18em] text-[#B8972A]/70 uppercase">
            {pill.label}:
          </span>
          <span className="font-mono text-[#B8972A]">{pill.value}</span>
        </span>
      ))}
    </div>
  );
}
