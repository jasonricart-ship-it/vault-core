import Link from "next/link";

type VaultSectionStubProps = {
  title: string;
  subtitle?: string;
  lines: string[];
  backHref?: string;
  backLabel?: string;
};

export function VaultSectionStub({
  title,
  subtitle,
  lines,
  backHref = "/vault/atrium",
  backLabel = "← Return to the Atrium",
}: VaultSectionStubProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0A0908" }}
    >
      <div className="max-w-lg">
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#B8972A",
            letterSpacing: "0.3em",
            fontSize: "1.25rem",
            fontWeight: "normal",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: "#F5F2EC",
              letterSpacing: "0.22em",
              fontSize: "0.75rem",
              opacity: 0.65,
              marginTop: 12,
            }}
          >
            {subtitle}
          </p>
        )}
        {lines.map((line) => (
          <p
            key={line}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: "#F5F2EC",
              letterSpacing: "0.12em",
              fontSize: "0.85rem",
              opacity: 0.55,
              marginTop: 16,
              lineHeight: 1.6,
            }}
          >
            {line}
          </p>
        ))}
        <Link
          href={backHref}
          style={{
            display: "inline-block",
            marginTop: 40,
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#B8972A",
            letterSpacing: "0.18em",
            fontSize: "0.75rem",
            textDecoration: "none",
            opacity: 0.85,
          }}
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
