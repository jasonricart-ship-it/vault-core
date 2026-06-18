"use client";

import "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, PointLight } from "three";
import { useFrame } from "@react-three/fiber";
import {
  GUM_OCTAGON_PANELS,
  isGumOctagonComplete,
} from "@/lib/gum-breakthrough";
import type { CorridorGumItem, CorridorGumResponse, PlayerData } from "./types";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const SERIF = "Georgia, 'Times New Roman', serif";
export const CORRIDOR_GUM_MAX = 12;
const GUM_MAX = CORRIDOR_GUM_MAX;
const OCTAGON_CENTER_Z = -73;
const END_WALL_Z = -76.2;
const PLINTH_Z = -70;

function polygonEdges(sides: number, circumR: number, centerZ: number, y = 0) {
  const apothem = circumR * Math.cos(Math.PI / sides);
  return Array.from({ length: sides }, (_, i) => {
    const angle = ((i + 0.5) / sides) * Math.PI * 2;
    return {
      position: [apothem * Math.sin(angle), y, centerZ + apothem * Math.cos(angle)] as [
        number,
        number,
        number,
      ],
      rotationY: angle + Math.PI,
    };
  });
}

function buildOctagonPanelSlots(
  items: CorridorGumItem[],
  segment: number,
): (CorridorGumItem | null)[] {
  return Array.from({ length: GUM_OCTAGON_PANELS }, (_, index) => {
    const position = index + 1;
    return (
      items.find(
        (item) =>
          item.corridor_segment === segment &&
          item.display_position === position &&
          item.status === "authenticated",
      ) ?? null
    );
  });
}

function OctagonPulsingLight({
  position,
  active,
}: {
  position: [number, number, number];
  active: boolean;
}) {
  const ref = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.intensity = 5 + Math.sin(clock.elapsedTime * 3) * 1.5;
    }
  });
  if (!active) return null;
  return <pointLight ref={ref} position={position} color="#D4A832" intensity={6} distance={10} />;
}

function BreakthroughFloorSeal({
  show,
  centerZ,
  sealedAt,
}: {
  show: boolean;
  centerZ: number;
  sealedAt: string | null;
}) {
  if (!show || !sealedAt) return null;
  const date = new Date(sealedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Html position={[0, -3.7, centerZ + 1.5]} center transform={false} distanceFactor={11}>
      <div style={{ ...HTML, fontFamily: SERIF, textAlign: "center" }}>
        <p
          style={{
            fontSize: 10,
            color: GOLD,
            letterSpacing: "0.2em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          BREAKTHROUGH
        </p>
        <p style={{ fontSize: 9, color: "#B8972A99", margin: "4px 0 0", letterSpacing: "0.12em" }}>
          {date}
        </p>
      </div>
    </Html>
  );
}

function GumOctagonBreakthrough({
  show,
  player,
  items,
  segment,
  breakthroughAt,
  onBreakthroughComplete,
}: {
  show: boolean;
  player: PlayerData;
  items: CorridorGumItem[];
  segment: number;
  breakthroughAt: string | null;
  onBreakthroughComplete?: (result?: {
    breakthrough_at?: string;
    strength_score?: number;
    vault_level?: string;
    bust_color?: string;
    ranking_position?: number;
  }) => void;
}) {
  const panels = useMemo(() => polygonEdges(GUM_OCTAGON_PANELS, 7.2, OCTAGON_CENTER_Z, 0), []);
  const octagonSlots = useMemo(
    () => buildOctagonPanelSlots(items, segment),
    [items, segment],
  );
  const octagonFilled = octagonSlots.filter(Boolean).length;
  const octagonFull = useMemo(
    () => isGumOctagonComplete(items, segment),
    [items, segment],
  );

  const hammerRef = useRef<Group>(null);
  const chiselRef = useRef<Group>(null);
  const wallRef = useRef<Group>(null);
  const fragmentRefs = useRef<Group[]>([]);

  const [wallOpen, setWallOpen] = useState(Boolean(breakthroughAt));
  const [cracking, setCracking] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [sealedAt, setSealedAt] = useState<string | null>(breakthroughAt);

  useEffect(() => {
    setWallOpen(Boolean(breakthroughAt));
    setSealedAt(breakthroughAt);
  }, [breakthroughAt]);

  useFrame(({ clock }) => {
    if (!octagonFull || wallOpen || animating) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.1;
    if (hammerRef.current) hammerRef.current.scale.setScalar(pulse);
    if (chiselRef.current) chiselRef.current.scale.setScalar(pulse);
  });

  const runBreakthrough = async () => {
    if (animating || !octagonFull || wallOpen) return;
    setAnimating(true);
    setCracking(true);

    const hammer = hammerRef.current;
    const chisel = chiselRef.current;
    const wall = wallRef.current;

    if (hammer) {
      await gsap.to(hammer.rotation, {
        z: -1.4,
        duration: 0.35,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
      });
    }
    if (chisel) {
      await gsap.to(chisel.position, {
        y: chisel.position.y - 0.25,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: "power1.in",
      });
    }

    if (wall) {
      await gsap.to(wall.scale, {
        x: 0.05,
        duration: 0.9,
        ease: "power3.in",
      });
      await gsap.to(wall.position, {
        y: -2,
        duration: 0.6,
        ease: "power2.in",
      });
    }

    for (const [index, fragment] of fragmentRefs.current.entries()) {
      if (!fragment) continue;
      gsap.to(fragment.position, {
        y: -5 - index * 0.2,
        x: fragment.position.x + (index % 2 === 0 ? -0.6 : 0.6),
        z: fragment.position.z + 0.4,
        duration: 1.2 + index * 0.08,
        ease: "power2.in",
      });
      gsap.to(fragment.rotation, {
        x: Math.PI * (index + 1),
        z: Math.PI * 0.5,
        duration: 1.2,
      });
    }

    setWallOpen(true);

    let breakthroughResult:
      | {
          breakthrough_at?: string;
          strength_score?: number;
          vault_level?: string;
          bust_color?: string;
          ranking_position?: number;
        }
      | undefined;

    try {
      const response = await fetch(
        `/api/ppc/${encodeURIComponent(player.ppc_number)}/strength`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ breakthrough: "gum_octagon" }),
        },
      );
      if (response.ok) {
        breakthroughResult = (await response.json()) as typeof breakthroughResult;
        if (breakthroughResult?.breakthrough_at) {
          setSealedAt(breakthroughResult.breakthrough_at);
        }
      }
    } catch {
      // Visual breakthrough still plays; strength sync can retry later.
    }

    setAnimating(false);
    onBreakthroughComplete?.(breakthroughResult);
  };

  if (!show) return null;

  const showOctagon = segment === 1;

  return (
    <group>
      {showOctagon && (
        <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.8, OCTAGON_CENTER_Z]}>
        <circleGeometry args={[8.5, GUM_OCTAGON_PANELS]} />
        <meshBasicMaterial color="#1A1008" />
      </mesh>

      {panels.map((panel, index) => {
        const item = octagonSlots[index];
        const filled = Boolean(item);
        return (
          <group key={index} position={panel.position} rotation={[0, panel.rotationY, 0]}>
            <mesh>
              <boxGeometry args={[3.8, 5.5, 0.12]} />
              <meshBasicMaterial color={filled ? "#3D2810" : "#1E1208"} />
            </mesh>
            {filled && (
              <>
                <mesh position={[-1.75, 0, 0.07]}>
                  <boxGeometry args={[0.12, 5.5, 0.02]} />
                  <meshBasicMaterial color={GOLD} />
                </mesh>
                <pointLight position={[0, 2.5, 0.4]} color="#D4A832" intensity={2.5} distance={6} />
              </>
            )}
            {show && (
              <Html position={[0, 0, 0.12]} center transform={false} distanceFactor={9}>
                <div style={{ ...HTML, fontFamily: SERIF, width: 110, textAlign: "center", color: PARCHMENT }}>
                  {filled && item ? (
                    <>
                      <p style={{ fontSize: 8, color: GOLD, margin: 0 }}>{item.gum_code}</p>
                      <p style={{ fontSize: 8, margin: "4px 0 0", textTransform: "capitalize" }}>
                        {item.item_type}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 8, color: "#B8972A55", margin: 0 }}>
                      PANEL {index + 1}
                    </p>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {!wallOpen && (
        <group ref={wallRef} position={[0, 0, END_WALL_Z]}>
          <mesh>
            <boxGeometry args={[11, 7.5, 0.45]} />
            <meshBasicMaterial color={cracking ? "#4A3828" : CORRIDOR_STONE} />
          </mesh>
          {cracking &&
            [-2, 0, 2].map((x, i) => (
              <mesh key={i} position={[x, 0.5 - i * 0.3, 0.24]}>
                <boxGeometry args={[0.08, 5 - i, 0.05]} />
                <meshBasicMaterial color="#B8972A66" />
              </mesh>
            ))}
          {cracking &&
            Array.from({ length: 6 }, (_, i) => (
              <group
                key={i}
                ref={(node) => {
                  if (node) fragmentRefs.current[i] = node;
                }}
                position={[(i - 2.5) * 1.4, 1.5 - (i % 3), 0.3]}
              >
                <mesh>
                  <boxGeometry args={[0.5, 0.35, 0.25]} />
                  <meshBasicMaterial color="#3A2E20" />
                </mesh>
              </group>
            ))}
        </group>
      )}

      <mesh
        position={[0, -3.5, PLINTH_Z]}
        onClick={(event) => {
          if (octagonFull && !wallOpen && !animating) {
            event.stopPropagation();
            void runBreakthrough();
          }
        }}
      >
        <cylinderGeometry args={[1.4, 1.7, 0.3, 24]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[0, -3.2, PLINTH_Z]}>
        <cylinderGeometry args={[1.0, 1.2, 1.4, 24]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>

      <group ref={hammerRef} position={[-0.35, -2.2, PLINTH_Z]} rotation={[0, 0, 0.3]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshBasicMaterial color={octagonFull ? GOLD : "#3D2810"} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[0.4, 0.25, 0.25]} />
          <meshBasicMaterial color={octagonFull ? "#D4A92A" : "#888780"} />
        </mesh>
      </group>

      <group ref={chiselRef} position={[0.35, -2.35, PLINTH_Z]} rotation={[0, 0, -0.2]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.12, 1.0, 0.12]} />
          <meshBasicMaterial color={octagonFull ? GOLD : "#3D2810"} />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.3]} />
          <meshBasicMaterial color={octagonFull ? "#D4A92A" : "#888780"} />
        </mesh>
      </group>

      {octagonFull && !wallOpen && (
        <>
          <OctagonPulsingLight position={[-0.35, -1.0, PLINTH_Z]} active />
          <OctagonPulsingLight position={[0.35, -1.1, PLINTH_Z]} active />
          <Html position={[0, -2.4, PLINTH_Z + 1.6]} center transform={false} distanceFactor={10}>
            <p style={{ ...HTML, fontSize: 10, color: GOLD, letterSpacing: "0.12em", fontFamily: SERIF, margin: 0 }}>
              CLAIM YOUR BREAKTHROUGH
            </p>
          </Html>
        </>
      )}

      <Html position={[0, -3.15, PLINTH_Z + 1.2]} center transform={false} distanceFactor={12}>
        <p style={{ ...HTML, fontSize: 9, color: "#B8972A88", letterSpacing: "0.14em", fontFamily: SERIF, margin: 0 }}>
          OCTAGON {octagonFilled}/{GUM_OCTAGON_PANELS}
        </p>
      </Html>
        </>
      )}

      {(wallOpen || breakthroughAt) && (
        <group position={[0, 0, END_WALL_Z - 2]}>
          <mesh>
            <boxGeometry args={[9, 7, 0.2]} />
            <meshBasicMaterial color="#2A2418" />
          </mesh>
          <pointLight position={[0, 2, 1]} color="#FFF0D0" intensity={6} distance={14} />
          {showOctagon && (
            <Html position={[0, 1.2, 0.6]} center transform={false} distanceFactor={12}>
              <p style={{ ...HTML, fontFamily: SERIF, fontSize: 9, color: GOLD, letterSpacing: "0.18em", margin: 0 }}>
                SEGMENT II REVEALED
              </p>
            </Html>
          )}
        </group>
      )}

      <BreakthroughFloorSeal
        show={show}
        centerZ={PLINTH_Z}
        sealedAt={sealedAt ?? breakthroughAt}
      />
    </group>
  );
}

const CORRIDOR_STONE = "#1A1208";
const GALLERY_CENTER_Z = -65;
const PLINTH_FLOOR_Y = -3.15;

const HTML = { pointerEvents: "none" as const, userSelect: "none" as const };

const CASE_Z = [-58, -61, -64, -67, -70, -73] as const;
const SLAB_Z = [
  -57, -58.5, -60, -61.5, -63, -64.5, -66, -67.5, -69, -70.5, -72, -73, -74.5,
] as const;

type CaseVisual = "empty" | "pending" | "authenticated-e1" | "authenticated-standard";

function itemsForSegment(items: CorridorGumItem[], segment: number) {
  return items.filter((item) => item.corridor_segment === segment);
}

function buildGumSlots(items: CorridorGumItem[]): (CorridorGumItem | null)[] {
  const slots: (CorridorGumItem | null)[] = Array.from(
    { length: GUM_MAX },
    () => null,
  );
  const unassigned: CorridorGumItem[] = [];

  for (const item of items) {
    const position = item.display_position;
    if (position != null && position >= 1 && position <= GUM_MAX) {
      if (!slots[position - 1]) {
        slots[position - 1] = item;
      } else {
        unassigned.push(item);
      }
    } else {
      unassigned.push(item);
    }
  }

  let cursor = 0;
  for (const item of unassigned) {
    while (cursor < GUM_MAX && slots[cursor]) cursor += 1;
    if (cursor < GUM_MAX) {
      slots[cursor] = item;
      cursor += 1;
    }
  }

  return slots;
}

function countAuthenticatedAtPositions(
  items: CorridorGumItem[],
  segment: number,
): number {
  let count = 0;
  for (let position = 1; position <= GUM_MAX; position += 1) {
    const item = items.find(
      (entry) =>
        entry.corridor_segment === segment && entry.display_position === position,
    );
    if (item?.status === "authenticated") count += 1;
  }
  return count;
}

function isSegmentKeyReady(items: CorridorGumItem[], segment: number): boolean {
  for (let position = 1; position <= GUM_MAX; position += 1) {
    const item = items.find(
      (entry) =>
        entry.corridor_segment === segment && entry.display_position === position,
    );
    if (!item || item.status !== "authenticated") return false;
  }
  return true;
}

function caseVisualForItem(item: CorridorGumItem | null): CaseVisual {
  if (!item) return "empty";

  if (item.status === "pending" || item.status === "under_review") {
    return "pending";
  }

  if (item.status === "authenticated") {
    if (item.authentication_checkmark_type === "gold") {
      return "authenticated-e1";
    }
    return "authenticated-standard";
  }

  return "empty";
}

function checkmarkGlyph(type: CorridorGumItem["authentication_checkmark_type"]) {
  if (type === "gold") return "✓";
  if (type === "silver") return "◐";
  return "○";
}

function checkmarkColor(type: CorridorGumItem["authentication_checkmark_type"]) {
  if (type === "gold") return GOLD;
  if (type === "silver") return "#C0C8D4";
  return "#6A6258";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function GumDisplayCase({
  visual,
  wall,
  z,
}: {
  visual: CaseVisual;
  wall: "left" | "right";
  z: number;
}) {
  const caseX = wall === "left" ? -6.5 : 6.5;
  const glassX = wall === "left" ? -5.2 : 5.2;
  const sign = wall === "left" ? 1 : -1;

  const recessColor =
    visual === "empty"
      ? "#16120E"
      : visual === "pending"
        ? "#1C160C"
        : "#141210";

  const frameColor = "#6B5C48";
  const frameOpacity = visual === "empty" ? 0.95 : 0.65;

  const glassColor =
    visual === "pending"
      ? "#F5D080"
      : visual === "authenticated-e1"
        ? "#FFF0C8"
        : visual === "authenticated-standard"
          ? "#FFF8F0"
          : "#D8E8F0";

  const glassOpacity =
    visual === "pending"
      ? 0.52
      : visual === "authenticated-e1"
        ? 0.38
        : visual === "authenticated-standard"
          ? 0.42
          : 0;

  const innerGlowColor =
    visual === "pending"
      ? "#FFB84A"
      : visual === "authenticated-e1"
        ? GOLD
        : "#FFF5E6";

  const innerGlowOpacity =
    visual === "pending"
      ? 0.48
      : visual === "authenticated-e1"
        ? 0.55
        : visual === "authenticated-standard"
          ? 0.42
          : 0;

  const haloOpacity = visual === "authenticated-e1" ? 0.22 : 0;

  const lights: { color: string; intensity: number; y: number; zOffset: number }[] =
    visual === "pending"
      ? [
          { color: "#FFB84A", intensity: 8, y: 1.8, zOffset: 0.15 },
          { color: "#FFD090", intensity: 4, y: -0.8, zOffset: 0.2 },
        ]
      : visual === "authenticated-e1"
        ? [
            { color: GOLD, intensity: 12, y: 1.6, zOffset: 0.15 },
            { color: "#FFE8A0", intensity: 6, y: 0, zOffset: 0.25 },
            { color: GOLD, intensity: 4, y: -1.2, zOffset: 0.15 },
          ]
        : visual === "authenticated-standard"
          ? [
              { color: "#FFF8F0", intensity: 7, y: 1.5, zOffset: 0.15 },
              { color: "#FFE8D0", intensity: 3.5, y: -0.6, zOffset: 0.2 },
            ]
          : [];

  return (
    <group>
      <mesh position={[caseX, 0, z]}>
        <boxGeometry args={[2.5, 4.5, 1.2]} />
        <meshBasicMaterial color={recessColor} />
      </mesh>

      {/* Stone frame — always visible; strongest on empty cases */}
      <mesh position={[glassX, 0, z + sign * 0.04]}>
        <boxGeometry args={[2.58, 4.58, 0.1]} />
        <meshBasicMaterial
          color={frameColor}
          transparent
          opacity={frameOpacity}
          depthWrite={false}
        />
      </mesh>

      {visual === "empty" && (
        <mesh position={[glassX, 0, z + sign * 0.06]}>
          <boxGeometry args={[2.42, 4.42, 0.06]} />
          <meshBasicMaterial color="#0E0C0A" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}

      {visual !== "empty" && (
        <>
          {innerGlowOpacity > 0 && (
            <mesh position={[caseX, 0, z + sign * 0.08]}>
              <boxGeometry args={[2.05, 3.85, 0.12]} />
              <meshBasicMaterial
                color={innerGlowColor}
                transparent
                opacity={innerGlowOpacity}
                depthWrite={false}
              />
            </mesh>
          )}

          {haloOpacity > 0 && (
            <mesh position={[caseX, 0, z + sign * 0.05]}>
              <boxGeometry args={[2.35, 4.2, 0.85]} />
              <meshBasicMaterial
                color={GOLD}
                transparent
                opacity={haloOpacity}
                depthWrite={false}
              />
            </mesh>
          )}

          <mesh position={[glassX, 0, z + sign * 0.1]}>
            <boxGeometry args={[2.48, 4.48, 0.06]} />
            <meshBasicMaterial
              color={glassColor}
              transparent
              opacity={glassOpacity}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {lights.map((light, index) => (
        <pointLight
          key={index}
          position={[caseX, light.y, z + sign * light.zOffset]}
          color={light.color}
          intensity={light.intensity}
          distance={6}
          decay={1.5}
        />
      ))}
    </group>
  );
}

function GumPlacard({
  item,
  slotNumber,
  show,
  wall,
  z,
}: {
  item: CorridorGumItem | null;
  slotNumber: number;
  show: boolean;
  wall: "left" | "right";
  z: number;
}) {
  const placardX = wall === "left" ? -3.6 : 3.6;

  if (!show) return null;

  return (
    <Html position={[placardX, 0.2, z]} center transform={false} distanceFactor={9}>
      <div
        style={{
          ...HTML,
          fontFamily: SERIF,
          width: 148,
          textAlign: "left",
          padding: "6px 8px",
          background: "rgba(18, 14, 10, 0.92)",
          border: "0.5px solid #B8972A66",
        }}
      >
        {item ? (
          <>
            <p style={{ fontSize: 8, color: GOLD, margin: 0, letterSpacing: "0.08em" }}>
              {item.gum_code}
            </p>
            <p
              style={{
                fontSize: 8,
                color: PARCHMENT,
                margin: "3px 0 0",
                textTransform: "capitalize",
              }}
            >
              {capitalize(item.item_type)}
            </p>
            <p style={{ fontSize: 7, color: "#F5F2EC99", margin: "4px 0 0" }}>
              {item.athlete_name ?? "—"} · {item.ppc_number}
            </p>
            {item.org_name && (
              <p style={{ fontSize: 7, color: "#F5F2EC77", margin: "3px 0 0" }}>
                {item.org_name}
              </p>
            )}
            {item.event_name && (
              <p style={{ fontSize: 7, color: "#F5F2EC77", margin: "2px 0 0" }}>
                {item.event_name}
              </p>
            )}
            {item.owner_statement && (
              <p
                style={{
                  fontSize: 7,
                  color: "#F5F2EC88",
                  margin: "5px 0 0",
                  lineHeight: 1.45,
                  fontStyle: "italic",
                }}
              >
                {item.owner_statement}
              </p>
            )}
            {item.capturer_credit && (
              <p style={{ fontSize: 7, color: "#B8972A99", margin: "4px 0 0" }}>
                Credit: {item.capturer_credit}
              </p>
            )}
            {item.status === "authenticated" ? (
              <p
                style={{
                  fontSize: 9,
                  margin: "6px 0 0",
                  color: checkmarkColor(item.authentication_checkmark_type),
                  letterSpacing: "0.12em",
                }}
              >
                {checkmarkGlyph(item.authentication_checkmark_type)} AUTHENTICATED
              </p>
            ) : (
              <p
                style={{
                  fontSize: 8,
                  margin: "6px 0 0",
                  color: "#FFB84A",
                  letterSpacing: "0.12em",
                }}
              >
                PENDING ADMISSION
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 8, color: "#B8972A88", margin: 0 }}>
              DISPLAY CASE {slotNumber}
            </p>
            <p style={{ fontSize: 7, color: "#B8972A99", margin: "3px 0 0" }}>
              Awaiting item
            </p>
          </>
        )}
      </div>
    </Html>
  );
}

function FloorSlotCounter({
  show,
  filled,
  centerZ,
}: {
  show: boolean;
  filled: number;
  centerZ: number;
}) {
  if (!show) return null;

  return (
    <Html position={[0, -3.72, centerZ + 2.2]} center transform={false} distanceFactor={12}>
      <p
        style={{
          ...HTML,
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: "0.2em",
          margin: 0,
          textShadow: "0 2px 4px rgba(0,0,0,0.9)",
          opacity: 0.9,
        }}
      >
        {filled} / {GUM_MAX}
      </p>
    </Html>
  );
}

function GumKeyDrop({
  show,
  centerZ,
  onClick,
}: {
  show: boolean;
  centerZ: number;
  onClick: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const [landed, setLanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!show) {
      setLanded(false);
      return;
    }

    const group = groupRef.current;
    if (!group) return;

    group.position.set(0, 4.4, centerZ);
    group.rotation.set(0, 0, 0);
    setLanded(false);

    const fall = gsap.to(group.position, {
      y: PLINTH_FLOOR_Y + 0.35,
      duration: 2.4,
      ease: "bounce.out",
      onComplete: () => setLanded(true),
    });
    const spin = gsap.to(group.rotation, {
      y: Math.PI * 3,
      duration: 2.4,
      ease: "power2.inOut",
    });

    return () => {
      fall.kill();
      spin.kill();
    };
  }, [show, centerZ]);

  if (!show) return null;

  return (
    <group ref={groupRef} position={[0, 4.4, centerZ]}>
      <group
        onClick={(event) => {
          event.stopPropagation();
          if (landed) onClick();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (landed) setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <mesh position={[0, 0.18, 0]}>
          <torusGeometry args={[0.14, 0.035, 10, 24]} />
          <meshBasicMaterial color={hovered ? "#FFE8A0" : GOLD} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.06, 0.34, 0.04]} />
          <meshBasicMaterial color={hovered ? "#FFE8A0" : GOLD} />
        </mesh>
        <mesh position={[0.1, -0.22, 0]}>
          <boxGeometry args={[0.16, 0.08, 0.04]} />
          <meshBasicMaterial color={hovered ? "#FFE8A0" : GOLD} />
        </mesh>
      </group>

      {landed && (
        <>
          <pointLight position={[0, 0.1, 0]} color={GOLD} intensity={8} distance={5} decay={1.5} />
          <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 24]} />
            <meshBasicMaterial color={GOLD} transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <Html position={[0, 0.9, 0]} center transform={false} distanceFactor={11}>
            <p
              style={{
                fontFamily: SERIF,
                fontSize: 11,
                color: GOLD,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                margin: 0,
                textAlign: "center",
                pointerEvents: "none",
                userSelect: "none",
                textShadow: "0 0 12px rgba(184,151,42,0.6)",
              }}
            >
              A NEW ROOM AWAITS
            </p>
          </Html>
        </>
      )}
    </group>
  );
}

export function GumGallery({
  player,
  cameraZ,
  segment = 1,
  onFilledChange,
  onSegmentAdvance,
  onBreakthroughComplete,
  breakthroughAt = null,
}: {
  player: PlayerData;
  cameraZ: number;
  segment?: number;
  onFilledChange?: (filled: number) => void;
  onSegmentAdvance?: () => void;
  onBreakthroughComplete?: (result?: {
    breakthrough_at?: string;
    strength_score?: number;
    vault_level?: string;
    bust_color?: string;
    ranking_position?: number;
  }) => void;
  breakthroughAt?: string | null;
}) {
  const show = cameraZ <= -56 && cameraZ >= -74;
  const [gumItems, setGumItems] = useState<CorridorGumItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadGumItems() {
      try {
        const response = await fetch(
          `/api/ppc/${encodeURIComponent(player.ppc_number)}/gum`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as CorridorGumResponse;
        if (!cancelled) {
          setGumItems(data.gum_items ?? []);
        }
      } catch {
        if (!cancelled) setGumItems([]);
      }
    }

    void loadGumItems();
    return () => {
      cancelled = true;
    };
  }, [player.ppc_number, breakthroughAt]);

  const segmentItems = useMemo(
    () => itemsForSegment(gumItems, segment),
    [gumItems, segment],
  );
  const slots = useMemo(() => buildGumSlots(segmentItems), [segmentItems]);
  const authenticatedFilled = useMemo(
    () => countAuthenticatedAtPositions(gumItems, segment),
    [gumItems, segment],
  );
  const keyReady = useMemo(
    () => isSegmentKeyReady(gumItems, segment),
    [gumItems, segment],
  );
  const [keyDropActive, setKeyDropActive] = useState(false);

  useEffect(() => {
    onFilledChange?.(authenticatedFilled);
  }, [authenticatedFilled, onFilledChange]);

  useEffect(() => {
    setKeyDropActive(false);
  }, [segment]);

  useEffect(() => {
    if (keyReady) {
      setKeyDropActive(true);
    }
  }, [keyReady]);

  const handleKeyClick = () => {
    setKeyDropActive(false);
    onSegmentAdvance?.();
  };

  return (
    <group>
      {/* Gallery ceiling wash — museum track lighting */}
      <pointLight position={[0, 4.5, -65]} color="#FFF5E8" intensity={5} distance={24} decay={1.2} />
      <pointLight position={[-5, 4, -62]} color="#FFF0DC" intensity={3.5} distance={16} decay={1.2} />
      <pointLight position={[5, 4, -62]} color="#FFF0DC" intensity={3.5} distance={16} decay={1.2} />
      <pointLight position={[-5, 4, -68]} color="#FFF0DC" intensity={3.5} distance={16} decay={1.2} />
      <pointLight position={[5, 4, -68]} color="#FFF0DC" intensity={3.5} distance={16} decay={1.2} />

      <mesh position={[-7, 0, -65]}>
        <boxGeometry args={[0.4, 8, 20]} />
        <meshBasicMaterial color="#3A2E20" />
      </mesh>
      <mesh position={[7, 0, -65]}>
        <boxGeometry args={[0.4, 8, 20]} />
        <meshBasicMaterial color="#3A2E20" />
      </mesh>
      <mesh position={[0, 4.15, -65]}>
        <boxGeometry args={[14, 0.3, 20]} />
        <meshBasicMaterial color="#1E1810" />
      </mesh>
      <mesh position={[0, -3.8, -65]}>
        <boxGeometry args={[14, 0.3, 20]} />
        <meshBasicMaterial color="#2A2218" />
      </mesh>

      {SLAB_Z.map((z, i) => (
        <mesh key={z} position={[0, -3.78, z]}>
          <boxGeometry args={[12, 0.05, 1.8]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#2A2218" : "#241C14"} />
        </mesh>
      ))}

      <mesh position={[0, -3.78, -56]}>
        <boxGeometry args={[4, 0.05, 0.8]} />
        <meshBasicMaterial color="#3A2E20" />
      </mesh>

      {CASE_Z.map((z, rowIndex) => {
        const leftSlot = slots[rowIndex] ?? null;
        const rightSlot = slots[rowIndex + 6] ?? null;

        return (
          <group key={z}>
            <GumDisplayCase
              visual={caseVisualForItem(leftSlot)}
              wall="left"
              z={z}
            />
            <GumPlacard
              item={leftSlot}
              slotNumber={rowIndex + 1}
              show={show}
              wall="left"
              z={z}
            />

            <GumDisplayCase
              visual={caseVisualForItem(rightSlot)}
              wall="right"
              z={z}
            />
            <GumPlacard
              item={rightSlot}
              slotNumber={rowIndex + 7}
              show={show}
              wall="right"
              z={z}
            />
          </group>
        );
      })}

      <FloorSlotCounter
        show={show}
        filled={authenticatedFilled}
        centerZ={GALLERY_CENTER_Z}
      />

      <GumKeyDrop
        show={show && keyDropActive}
        centerZ={GALLERY_CENTER_Z}
        onClick={handleKeyClick}
      />

      <GumOctagonBreakthrough
        show={show}
        player={player}
        items={gumItems}
        segment={segment}
        breakthroughAt={breakthroughAt}
        onBreakthroughComplete={onBreakthroughComplete}
      />
    </group>
  );
}
