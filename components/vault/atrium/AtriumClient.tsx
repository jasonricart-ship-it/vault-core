"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AtriumCaptain,
  AtriumChampion,
  AtriumHallPlayer,
  AtriumMvp,
  AtriumStats,
} from "@/lib/atrium";
import { getBustFilter } from "@/lib/bust";

export type AtriumClientProps = {
  hall: AtriumHallPlayer[];
  champions: AtriumChampion[];
  mvp: AtriumMvp | null;
  captains: AtriumCaptain[];
  stats: AtriumStats;
};

const ZONE_COUNT = 5;
const ZONE_NAMES = ["Entrance", "Champions", "Most Valuable", "Captains", "The Archive"] as const;

const STONE_TEXTURE: React.CSSProperties = {
  backgroundColor: "#0A0908",
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.015) 2px,
      rgba(255,255,255,0.015) 4px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 8px,
      rgba(255,255,255,0.008) 8px,
      rgba(255,255,255,0.008) 10px
    )
  `,
};

const CARVED: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
  color: "#B8972A",
  textShadow: "0 1px 2px rgba(0,0,0,0.8)",
  fontWeight: "normal",
};

const NAMEPLATE: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#F5F2EC",
  fontSize: "0.72rem",
  borderTop: "1px solid rgba(184,151,42,0.27)",
  paddingTop: 8,
  marginTop: 8,
};

function lightPool(intensity = 0.15) {
  return {
    background: `radial-gradient(ellipse 420px 140px at 50% 0%, rgba(184, 151, 42, ${intensity}), transparent)`,
  } as React.CSSProperties;
}

function getInitials(displayName: string) {
  const parts = displayName.replace(/"/g, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function bustCircleColors(bustColor: string) {
  switch (bustColor) {
    case "gold":
      return { bg: "#D4A92A", text: "#6B4A00", ring: "#B8972A" };
    case "silver":
      return { bg: "#C0C0C0", text: "#4A4A4A", ring: "#909090" };
    case "bronze":
      return { bg: "#CD7F32", text: "#4A2800", ring: "#A0622A" };
    default:
      return { bg: "#3A3530", text: "#8A8070", ring: "#5A5040" };
  }
}

export function AtriumClient({ hall, champions, mvp, captains, stats }: AtriumClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeZone, setActiveZone] = useState(0);

  const mvpChampion = mvp?.player
    ? champions.find((c) => c.player?.id === mvp.player?.id)
    : null;

  const mvpBustKey = mvp?.player
    ? hall.find((p) => p.ppc_number === mvp.player?.ppc_number)?.bust_image_key ?? null
    : null;

  const sortedHall = [...hall].sort((a, b) => {
    if (a.vault_level === "archival" && b.vault_level !== "archival") return -1;
    if (b.vault_level === "archival" && a.vault_level !== "archival") return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const syncZone = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveZone(Math.max(0, Math.min(ZONE_COUNT - 1, index)));
  }, []);

  const scrollToZone = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(ZONE_COUNT - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    syncZone();
    el.addEventListener("scroll", syncZone, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const current = Math.round(el.scrollLeft / el.clientWidth);
      scrollToZone(e.key === "ArrowRight" ? current + 1 : current - 1);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", syncZone);

    return () => {
      document.body.style.overflow = prevOverflow;
      el.removeEventListener("scroll", syncZone);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", syncZone);
    };
  }, [syncZone, scrollToZone]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050403]">
      <div
        ref={scrollRef}
        className="atrium-scroll flex h-screen flex-row overflow-x-scroll scroll-smooth"
        style={{
          ...STONE_TEXTURE,
          width: "100vw",
          scrollSnapType: "x mandatory",
        }}
        aria-label="Move through the hall"
      >
        <div className="flex h-full flex-row" style={{ width: `${ZONE_COUNT * 100}vw` }}>
          <EntranceZone stats={stats} />
          <ChampionsZone champions={champions} />
          <MvpZone mvp={mvp} mvpChampion={mvpChampion} bustKey={mvpBustKey} />
          <CaptainsZone captains={captains} />
          <ArchiveZone hall={sortedHall} />
        </div>
      </div>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 pb-8"
        aria-label="Hall navigation"
      >
        <p style={{ ...CARVED, fontSize: "0.65rem" }}>{ZONE_NAMES[activeZone]}</p>
        <div className="pointer-events-auto flex items-center gap-2.5">
          {ZONE_NAMES.map((_, i) => (
            <button
              key={ZONE_NAMES[i]}
              type="button"
              aria-label={`Go to ${ZONE_NAMES[i]}`}
              aria-current={i === activeZone ? "true" : undefined}
              onClick={() => scrollToZone(i)}
              className="rounded-full transition-all"
              style={{
                width: i === activeZone ? 10 : 7,
                height: i === activeZone ? 10 : 7,
                background: i === activeZone ? "#B8972A" : "rgba(184,151,42,0.3)",
                border: "1px solid rgba(184,151,42,0.5)",
              }}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function ZonePanel({ children, align = "center" }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <section
      className="relative flex h-screen shrink-0 flex-col justify-center px-8 sm:px-12"
      style={{
        width: "100vw",
        scrollSnapAlign: "start",
        ...STONE_TEXTURE,
      }}
    >
      <div
        className={[
          "relative z-10 flex h-full w-full max-w-4xl flex-col justify-center",
          align === "start" ? "items-start" : "mx-auto items-center",
        ].join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

function EntranceZone({ stats }: { stats: AtriumStats }) {
  return (
    <ZonePanel>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48" style={lightPool(0.18)} />

      <div className="relative text-center">
        <div
          className="mx-auto mb-4 h-1 w-48 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #B8972A66, transparent)" }}
        />
        <h1 style={{ ...CARVED, fontSize: "2.4rem" }}>The Vault</h1>
        <p
          style={{
            ...CARVED,
            fontSize: "0.55rem",
            color: "#F5F2EC",
            opacity: 0.45,
            marginTop: 12,
            letterSpacing: "0.35em",
          }}
        >
          GUM Authentication Systems · Est. MMXXVI
        </p>
      </div>

      <div className="mt-12 flex flex-wrap justify-center gap-5">
        <StatPlaque value={stats.totalActivePlayers} label="Players" />
        <StatPlaque value={stats.verifiedOrgs} label="Organizations" />
        <StatPlaque value={stats.verifiedGovs} label="Governing Bodies" />
      </div>

      <p
        style={{
          ...CARVED,
          fontSize: "0.55rem",
          opacity: 0.4,
          marginTop: 48,
          letterSpacing: "0.28em",
        }}
      >
        Scroll to enter →
      </p>
    </ZonePanel>
  );
}

function StatPlaque({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-sm px-6 py-4 text-center"
      style={{
        backgroundColor: "#050403",
        border: "1px solid rgba(184,151,42,0.22)",
        boxShadow: "inset 0 2px 12px rgba(0,0,0,0.5)",
        minWidth: 130,
      }}
    >
      <div style={{ ...CARVED, fontSize: "1.6rem", letterSpacing: "0.08em" }}>{value}</div>
      <div style={{ ...NAMEPLATE, borderTop: "none", marginTop: 6, fontSize: "0.55rem", opacity: 0.65 }}>
        {label}
      </div>
    </div>
  );
}

function ChampionsZone({ champions }: { champions: AtriumChampion[] }) {
  return (
    <ZonePanel align="start">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={lightPool(0.12)} />
      <h2 style={{ ...CARVED, fontSize: "0.85rem", marginBottom: 28 }}>Champions</h2>

      <div
        className="w-full max-w-md rounded-sm p-6"
        style={{
          backgroundColor: "#050403",
          border: "1px solid rgba(61,43,10,0.85)",
          boxShadow: "inset 0 0 48px rgba(0,0,0,0.55), 0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        {champions.length === 0 ? (
          <p
            style={{
              ...CARVED,
              fontSize: "0.6rem",
              color: "#F5F2EC",
              opacity: 0.25,
              lineHeight: 1.9,
              letterSpacing: "0.18em",
            }}
          >
            The wall awaits its first champion
          </p>
        ) : (
          <ul className="space-y-5">
            {champions.map((ch) => (
              <li key={ch.id}>
                <ChampionPlaque champion={ch} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ZonePanel>
  );
}

function ChampionPlaque({ champion }: { champion: AtriumChampion }) {
  const player = champion.player;
  const event = champion.event;

  return (
    <div
      className="rounded-sm p-5"
      style={{
        backgroundColor: "#0A0908",
        border: "1px solid rgba(184,151,42,0.28)",
        boxShadow: "inset 0 3px 10px rgba(0,0,0,0.7)",
      }}
    >
      <p style={{ ...CARVED, fontSize: "0.75rem", lineHeight: 1.6 }}>
        {event?.name ?? champion.notes ?? "Championship"}
      </p>
      <p style={{ ...NAMEPLATE, borderTop: "none", fontSize: "0.55rem", opacity: 0.5, marginTop: 6 }}>
        {event?.season_year ?? champion.season_year ?? "—"}
        {event?.location ? ` · ${event.location}` : ""}
      </p>
      {player ? (
        <p style={{ ...NAMEPLATE, fontSize: "0.62rem" }}>
          {player.preferred_name ?? player.display_name} · {player.ppc_number}
        </p>
      ) : null}
    </div>
  );
}

function MvpZone({
  mvp,
  mvpChampion,
  bustKey,
}: {
  mvp: AtriumMvp | null;
  mvpChampion: AtriumChampion | null;
  bustKey: string | null;
}) {
  const player = mvp?.player;

  return (
    <ZonePanel>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56" style={lightPool(0.24)} />
      <h2 style={{ ...CARVED, fontSize: "0.85rem", marginBottom: 32, textAlign: "center" }}>
        Most Valuable
      </h2>

      {player ? (
        <div className="flex flex-col items-center">
          <div
            className="flex h-[240px] w-[240px] items-center justify-center rounded-full"
            style={{
              background: "radial-gradient(circle at 50% 35%, #3D2B0A 0%, #0A0908 72%)",
              border: "3px solid rgba(184,151,42,0.35)",
              boxShadow: "0 0 80px rgba(184,151,42,0.15), inset 0 -16px 32px rgba(0,0,0,0.75)",
            }}
          >
            <BustDisplay
              displayName={player.display_name}
              bustColor={player.bust_color}
              bustImageKey={bustKey}
              size={160}
            />
          </div>

          <div
            className="-mt-5 h-10 w-[280px] rounded-[50%]"
            style={{
              background: "linear-gradient(180deg, #1A1510 0%, #0A0908 100%)",
              boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
            }}
          />

          <div className="mt-8 max-w-sm text-center">
            <p style={{ ...NAMEPLATE, borderTop: "none", fontSize: "0.9rem", marginTop: 0 }}>
              {player.display_name}
            </p>
            <p style={{ ...NAMEPLATE, fontSize: "0.62rem", opacity: 0.55, borderTop: "none", marginTop: 4 }}>
              {player.ppc_number}
            </p>
            <div className="mx-auto my-4 h-px w-20" style={{ background: "rgba(184,151,42,0.4)" }} />
            <p style={{ ...CARVED, fontSize: "0.58rem" }}>Tournament MVP</p>
            <p style={{ ...NAMEPLATE, fontSize: "0.55rem", opacity: 0.55, borderTop: "none" }}>
              {mvpChampion?.event?.name ?? mvp?.notes ?? "—"}
              {mvp?.season_year ? ` · ${mvp.season_year}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p style={{ ...CARVED, fontSize: "0.6rem", opacity: 0.3 }}>The rotunda awaits</p>
      )}
    </ZonePanel>
  );
}

function CaptainsZone({ captains }: { captains: AtriumCaptain[] }) {
  return (
    <ZonePanel align="start">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={lightPool(0.1)} />
      <h2 style={{ ...CARVED, fontSize: "0.85rem", marginBottom: 28 }}>Captains</h2>

      {captains.length === 0 ? (
        <p style={{ ...CARVED, fontSize: "0.6rem", opacity: 0.25 }}>No captains on record</p>
      ) : (
        <ul className="w-full max-w-lg space-y-5">
          {captains.map((entry) => (
            <li key={entry.id}>
              <CaptainPlinth entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </ZonePanel>
  );
}

function CaptainPlinth({ entry }: { entry: AtriumCaptain }) {
  return (
    <div
      className="flex items-center gap-5 rounded-sm p-5"
      style={{
        backgroundColor: "#050403",
        border: "1px solid rgba(61,43,10,0.75)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm"
        style={{
          ...CARVED,
          fontSize: "1rem",
          background: "#3D2B0A",
          border: "1px solid rgba(184,151,42,0.35)",
        }}
      >
        C
      </div>
      <BustDisplay displayName={entry.player.display_name} bustColor={entry.player.bust_color} size={56} />
      <div>
        <p style={{ ...NAMEPLATE, borderTop: "none", marginTop: 0, fontSize: "0.75rem" }}>
          {entry.player.preferred_name ?? entry.player.display_name}
        </p>
        <p style={{ ...NAMEPLATE, borderTop: "none", fontSize: "0.55rem", opacity: 0.5, marginTop: 4 }}>
          {entry.org.short_name ?? entry.org.name} · {entry.season_year}
        </p>
        {entry.jersey_number ? (
          <p style={{ ...NAMEPLATE, borderTop: "none", fontSize: "0.5rem", opacity: 0.35, marginTop: 2 }}>
            #{entry.jersey_number}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ArchiveZone({ hall }: { hall: AtriumHallPlayer[] }) {
  return (
    <ZonePanel>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44" style={lightPool(0.14)} />
      <h2 style={{ ...CARVED, fontSize: "0.85rem", marginBottom: 28, textAlign: "center" }}>
        The Archive
      </h2>

      <div
        className="w-full max-w-3xl rounded-sm p-6 sm:p-8"
        style={{
          backgroundColor: "#050403",
          border: "1px solid rgba(61,43,10,0.65)",
          boxShadow: "inset 0 0 56px rgba(0,0,0,0.55)",
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {hall.map((player) => (
            <ArchiveNiche key={player.id} player={player} />
          ))}
        </div>
      </div>
    </ZonePanel>
  );
}

function ArchiveNiche({ player }: { player: AtriumHallPlayer }) {
  const isArchival = player.vault_level === "archival";
  const glow = isArchival ? "rgba(184,151,42,0.2)" : "rgba(192,192,192,0.1)";

  return (
    <Link
      href={`/vault/ppc/${player.ppc_number}`}
      className="block rounded-sm p-5 transition-transform hover:scale-[1.03]"
      style={{
        backgroundColor: "#0A0908",
        border: `1px solid ${isArchival ? "rgba(184,151,42,0.35)" : "rgba(255,255,255,0.1)"}`,
        boxShadow: `inset 0 -24px 36px ${glow}`,
      }}
    >
      <div className="flex flex-col items-center text-center">
        <BustDisplay
          displayName={player.display_name}
          bustColor={player.bust_color}
          bustImageKey={player.bust_image_key}
          size={72}
        />
        <p style={{ ...NAMEPLATE, fontSize: "0.52rem", opacity: 0.45, borderTop: "none", marginTop: 10 }}>
          {player.ppc_number}
        </p>
        <p style={{ ...NAMEPLATE, fontSize: "0.62rem", borderTop: "none", marginTop: 2 }}>
          {player.display_name}
        </p>
        <p style={{ ...CARVED, fontSize: "0.48rem", opacity: 0.55, marginTop: 8 }}>
          {player.vault_level}
        </p>
      </div>
    </Link>
  );
}

function BustDisplay({
  displayName,
  bustColor,
  bustImageKey,
  size = 80,
}: {
  displayName: string;
  bustColor: string;
  bustImageKey?: string | null;
  size?: number;
}) {
  const colors = bustCircleColors(bustColor);
  const filter = bustImageKey
    ? [getBustFilter(bustColor), "sepia(0.3)", "contrast(1.1)"].filter(Boolean).join(" ")
    : undefined;

  if (bustImageKey) {
    return (
      <div
        className="overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          border: `2px solid ${colors.ring}`,
          boxShadow: "inset 0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <Image
          src={bustImageKey}
          alt={displayName}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          style={{ filter }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: colors.bg,
        color: colors.text,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: size * 0.32,
        fontWeight: 600,
        letterSpacing: "0.05em",
        border: `2px solid ${colors.ring}`,
        boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {getInitials(displayName)}
    </div>
  );
}
