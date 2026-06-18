"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import nextDynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import type { PlayerData } from "./types";
import { CORRIDOR_GUM_MAX } from "./GumGallery";
import {
  achievementTypeLabel,
  buildCorridorEvents,
  buildOrgGovChain,
  buildProvenanceChain,
  CORRIDOR,
  evidenceClassBadge,
  formatCorridorDate,
  vaultTierColors,
  vaultTierLabel,
} from "./utils";

const GumGallery = nextDynamic(
  () => import("./GumGallery").then((m) => ({ default: m.GumGallery })),
  { ssr: false },
);

const GOLD = CORRIDOR.gold;
const PARCHMENT = CORRIDOR.parchment;
const BG = CORRIDOR.bg;
const SERIF = CORRIDOR.serif;

const CAM_START_Z = 15;
const CAM_END_Z = -85;
const CAM_Y = 1.6;
const SCROLL_STEP = 1.5;
const LOOK_AHEAD = 12;
const VIS_RANGE = 12;
const MAX_YAW_CORRIDOR = Math.PI / 3;
const MAX_YAW_OCTAGON = Math.PI / 2;
const YAW_KEY_STEP = 0.18;
const YAW_DRAG_SENS = 0.003;

const HTML = { pointerEvents: "none" as const, userSelect: "none" as const };

const AFF_MAX = 8;
const ACH_MAX = 6;
const GUM_MAX = CORRIDOR_GUM_MAX;

function bustFill(player: PlayerData) {
  const c = vaultTierColors(player.vault_level);
  return player.vault_level === "established" ? "#B0B8C4" : c.fill;
}

function clampZ(z: number) {
  return Math.max(CAM_END_Z, Math.min(CAM_START_Z, z));
}

function nearZ(cameraZ: number, targetZ: number, range = VIS_RANGE) {
  return Math.abs(cameraZ - targetZ) <= range;
}

function getZone(z: number) {
  if (z > 8) return "ENTRANCE";
  if (z > 2) return "DESCENDING";
  if (z > -14) return "AFFILIATIONS";
  if (z > -17) return "↑";
  if (z > -25) return "PROVENANCE";
  if (z > -28) return "↓";
  if (z > -44) return "ACHIEVEMENTS";
  if (z > -53) return "↑";
  if (z > -56) return "↓";
  if (z > -74) return "THE COLLECTION";
  if (z > -82) return "END OF RECORD";
  return "END OF RECORD";
}

function isInOctagonZone(z: number) {
  return (
    (z <= 2 && z >= -14) ||
    (z <= -28 && z >= -44) ||
    (z <= -56 && z >= -74)
  );
}

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

function cardinalEdge(radius: number, centerZ: number, dir: "N" | "E" | "S" | "W", y = 1.5) {
  const angle = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }[dir];
  return {
    position: [radius * Math.sin(angle), y, centerZ + radius * Math.cos(angle)] as [
      number,
      number,
      number,
    ],
    rotationY: angle + Math.PI,
  };
}

type AchSlot = {
  key: string;
  label: string;
  filled: boolean;
  lines: string[];
  bigC?: boolean;
};

function buildAchSlots(player: PlayerData): AchSlot[] {
  const champ = player.achievements.find((a) => a.achievement_type === "champion");
  const mvp = player.achievements.find((a) => a.achievement_type === "mvp");
  const cap = player.org_affiliations.find((a) => a.is_captain);
  const allStar =
    player.achievements.some((a) => a.achievement_type === "all_star") ||
    player.event_participation?.some((e) => e.is_all_star);
  const hall = (player.hall_of_fame_nominations?.length ?? 0) > 0;

  return [
    {
      key: "champion",
      label: "CHAMPION",
      filled: !!champ,
      lines: champ
        ? [
            "CHAMPION",
            champ.event?.name ?? "",
            `${champ.season_year ?? ""} · Columbus OH`,
            champ.org?.name ?? "",
          ]
        : [],
    },
    {
      key: "mvp",
      label: "MVP",
      filled: !!mvp,
      lines: mvp
        ? ["MOST VALUABLE PLAYER", mvp.event?.name ?? "", `${mvp.season_year ?? ""}`]
        : [],
    },
    {
      key: "captain",
      label: "CAPTAIN",
      filled: !!cap,
      bigC: true,
      lines: cap
        ? ["CAPTAIN", `${cap.org.name} · ${cap.season_year} · #${cap.jersey_number ?? "—"}`]
        : [],
    },
    {
      key: "all-star",
      label: "ALL-STAR",
      filled: allStar,
      lines: [],
    },
    {
      key: "hall",
      label: "HALL NOMINEE",
      filled: hall,
      lines: [],
    },
    {
      key: "special",
      label: "SPECIAL",
      filled: false,
      lines: [],
    },
  ];
}

function countAchFilled(slots: AchSlot[]) {
  return slots.filter((s) => s.filled && s.key !== "special").length;
}

function SceneCleanup() {
  const { scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else m.material.dispose();
        }
      });
    };
  }, [scene]);
  return null;
}

function CameraRig({
  targetZRef,
  onZoneChange,
  onCameraZ,
}: {
  targetZRef: React.MutableRefObject<number>;
  onZoneChange: (z: string) => void;
  onCameraZ: (z: number) => void;
}) {
  const { camera, gl } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, CAM_Y, 0));
  const yaw = useRef({ value: 0 });
  const draggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const yawTweenRef = useRef<gsap.core.Tween | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const camZ = () => cameraRef.current.position.z;
  const inOctNow = () => isInOctagonZone(camZ());

  const maxYaw = useCallback(() => (inOctNow() ? MAX_YAW_OCTAGON : MAX_YAW_CORRIDOR), []);

  const clampYaw = useCallback(
    (v: number) => {
      const limit = maxYaw();
      return Math.max(-limit, Math.min(limit, v));
    },
    [maxYaw],
  );

  const tweenYaw = useCallback(
    (target: number, duration = 0.3) => {
      yawTweenRef.current?.kill();
      yawTweenRef.current = gsap.to(yaw.current, {
        value: clampYaw(target),
        duration,
        ease: "power2.out",
      });
    },
    [clampYaw],
  );

  const resetYaw = useCallback(() => {
    yawTweenRef.current?.kill();
    yawTweenRef.current = gsap.to(yaw.current, {
      value: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    camera.position.set(0, CAM_Y, CAM_START_Z);
    targetZRef.current = CAM_START_Z;
    yaw.current.value = 0;
    lookAt.current.set(0, CAM_Y, CAM_START_Z - LOOK_AHEAD);
    camera.lookAt(lookAt.current);
  }, [camera, targetZRef]);

  const move = useCallback(
    (delta: number) => {
      targetZRef.current = clampZ(targetZRef.current + delta);
      gsap.to(camera.position, { z: targetZRef.current, duration: 0.4, ease: "power2.out" });
      resetYaw();
    },
    [camera, targetZRef, resetYaw],
  );

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      move(e.deltaY > 0 ? -SCROLL_STEP : SCROLL_STEP);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(-SCROLL_STEP);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(SCROLL_STEP);
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        tweenYaw(yaw.current.value - YAW_KEY_STEP);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        tweenYaw(yaw.current.value + YAW_KEY_STEP);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      draggingRef.current = true;
      lastMouseXRef.current = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      tweenYaw(yaw.current.value + delta * YAW_DRAG_SENS, 0.15);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      yawTweenRef.current?.kill();
    };
  }, [move, tweenYaw]);

  useFrame(() => {
    const z = camera.position.z;

    gl.domElement.style.cursor = draggingRef.current ? "grabbing" : "grab";

    const yawVal = clampYaw(yaw.current.value);
    yaw.current.value = yawVal;
    lookAt.current.set(
      Math.sin(yawVal) * LOOK_AHEAD,
      CAM_Y,
      z - Math.cos(yawVal) * LOOK_AHEAD,
    );
    camera.lookAt(lookAt.current);
    onZoneChange(getZone(z));
    onCameraZ(Math.round(z));
  });

  return null;
}

function PulsingLight({ position, active }: { position: [number, number, number]; active: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.intensity = 5 + Math.sin(clock.elapsedTime * 3) * 1.5;
    }
  });
  if (!active) return null;
  return <pointLight ref={ref} position={position} color="#D4A832" intensity={6} distance={12} />;
}

function HammerChisel({
  centerZ,
  plinthY = -3.5,
  scale,
  filled,
  max,
  halfThreshold,
  showBreakthrough,
  fixedTools = false,
  onClaim,
}: {
  centerZ: number;
  plinthY?: number;
  scale: number;
  filled: number;
  max: number;
  halfThreshold: number;
  showBreakthrough: boolean;
  fixedTools?: boolean;
  onClaim?: () => void;
}) {
  const full = filled >= max;
  const half = filled >= halfThreshold;
  const toolColor = full ? "#D4A92A" : half ? "#D4A92A" : "#888780";
  const handleColor = full ? "#D4A92A" : "#3D2810";

  const baseY = plinthY;
  const baseH = 0.3;
  const columnH = scale >= 1.15 ? 2 : 1.5;
  const columnY = baseY + baseH / 2 + columnH / 2;
  const plinthTopY = baseY + baseH / 2 + columnH;

  const hammerHandleY = fixedTools ? -1.5 : plinthTopY + 0.65;
  const hammerHeadY = fixedTools ? -0.85 : plinthTopY + 1.3;
  const chiselHandleY = fixedTools ? -1.6 : plinthTopY + 0.55;
  const chiselBladeY = fixedTools ? -1.05 : plinthTopY + 1.1;

  return (
    <group>
      <mesh
        position={[0, baseY, centerZ]}
        onClick={(e) => {
          if (full && onClaim) {
            e.stopPropagation();
            onClaim();
          }
        }}
      >
        <cylinderGeometry args={[1.5 * scale, 1.8 * scale, baseH, 24]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[0, columnY, centerZ]}>
        <cylinderGeometry args={[1.0 * scale, 1.2 * scale, columnH, 24]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>

      <mesh position={[-0.3 * scale, hammerHandleY, centerZ]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15 * scale, 1.2 * scale, 0.15 * scale]} />
        <meshBasicMaterial color={handleColor} />
      </mesh>
      <mesh position={[-0.3 * scale, hammerHeadY, centerZ]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.4 * scale, 0.25 * scale, 0.25 * scale]} />
        <meshBasicMaterial color={toolColor} />
      </mesh>

      <mesh position={[0.3 * scale, chiselHandleY, centerZ]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.12 * scale, 1.0 * scale, 0.12 * scale]} />
        <meshBasicMaterial color={handleColor} />
      </mesh>
      <mesh position={[0.3 * scale, chiselBladeY, centerZ]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.2 * scale, 0.15 * scale, 0.3 * scale]} />
        <meshBasicMaterial color={full ? "#D4A92A" : "#888780"} />
      </mesh>

      {half && !full && (
        <pointLight position={[-0.3 * scale, hammerHeadY + 0.2, centerZ]} color="#D4A832" intensity={3.5} distance={8} />
      )}
      <PulsingLight position={[-0.3 * scale, hammerHeadY + 0.2, centerZ]} active={full} />
      <PulsingLight position={[0.3 * scale, chiselBladeY + 0.2, centerZ]} active={full} />

      {showBreakthrough && full && (
        <Html position={[0, plinthTopY + 0.3, centerZ + 1.3 * scale]} center transform={false} distanceFactor={10}>
          <p style={{ ...HTML, fontSize: 10, color: GOLD, letterSpacing: "0.12em", fontFamily: SERIF, margin: 0 }}>
            CLAIM YOUR BREAKTHROUGH
          </p>
        </Html>
      )}
    </group>
  );
}

function ZoneFloorLabel({
  show,
  centerZ,
  label,
  filled,
  max,
}: {
  show: boolean;
  centerZ: number;
  label: string;
  filled: number;
  max: number;
}) {
  if (!show) return null;
  return (
    <Html position={[0, -3.2, centerZ]} center transform={false} distanceFactor={14}>
      <p
        style={{
          ...HTML,
          fontSize: 24,
          color: GOLD,
          fontWeight: 700,
          fontFamily: SERIF,
          textAlign: "center",
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label} — {filled}/{max}
      </p>
    </Html>
  );
}

function StoneSteps({
  specs,
  showTrim = true,
}: {
  specs: { z: number; y: number }[];
  showTrim?: boolean;
}) {
  return (
    <>
      {specs.map((s, i) => (
        <group key={i} position={[0, s.y, s.z]}>
          <mesh>
            <boxGeometry args={[10, 0.4, 1.2]} />
            <meshBasicMaterial color="#3D2810" />
          </mesh>
          {showTrim && (
            <mesh position={[0, 0, 0.61]}>
              <boxGeometry args={[10, 0.42, 0.08]} />
              <meshBasicMaterial color="#5A3E1E" />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

function GoldFrameStrips({
  position,
  width,
  height,
}: {
  position: [number, number, number];
  width: number;
  height: number;
}) {
  const t = 0.04;
  const d = 0.02;
  const strips: Array<[number, number, number, number, number, number]> = [
    [0, height / 2, 0, width, t, d],
    [0, -height / 2, 0, width, t, d],
    [-width / 2, 0, 0, t, height, d],
    [width / 2, 0, 0, t, height, d],
  ];
  return (
    <group position={position}>
      {strips.map((s, i) => (
        <mesh key={i} position={[s[0], s[1], s[2]]}>
          <boxGeometry args={[s[3], s[4], s[5]]} />
          <meshBasicMaterial color="#B8972A44" transparent opacity={0.27} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function EntryArch() {
  const doorOpen = Math.PI * 0.85;
  return (
    <group position={[0, 0, 14]}>
      <mesh position={[-3.2, 1.5, 0]}>
        <boxGeometry args={[0.5, 5, 0.6]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[3.2, 1.5, 0]}>
        <boxGeometry args={[0.5, 5, 0.6]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[7, 0.5, 0.5]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <group position={[-2.7, 0.5, 0]}>
        <mesh rotation={[0, doorOpen, 0]}>
          <boxGeometry args={[1.2, 3.5, 0.08]} />
          <meshBasicMaterial color="#1A1208" />
        </mesh>
      </group>
      <group position={[2.7, 0.5, 0]}>
        <mesh rotation={[0, -doorOpen, 0]}>
          <boxGeometry args={[1.2, 3.5, 0.08]} />
          <meshBasicMaterial color="#1A1208" />
        </mesh>
      </group>
    </group>
  );
}

function EntryPlaza({ player, cameraZ }: { player: PlayerData; cameraZ: number }) {
  const show = cameraZ >= 4 && nearZ(cameraZ, 10);
  const fill = bustFill(player);
  const evidence = player.latest_evidence;
  const achievement = player.latest_achievement;
  const season = player.latest_season;

  const p = (size: number, extra?: CSSProperties): CSSProperties => ({
    fontSize: size,
    fontFamily: SERIF,
    margin: 0,
    lineHeight: 1.45,
    ...extra,
  });

  return (
    <group>
      <EntryArch />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, 10]}>
        <circleGeometry args={[7, 8]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>
      <mesh position={[0, -1.925, 10]}>
        <boxGeometry args={[3, 0.05, 0.8]} />
        <meshBasicMaterial color="#B8972A22" />
      </mesh>
      {show && (
        <Html position={[0, -1.7, 10.5]} center transform={false} distanceFactor={12}>
          <p style={{ ...HTML, ...p(11), color: GOLD, letterSpacing: "0.3em" }}>{player.ppc_number}</p>
        </Html>
      )}

      {/* North wall — permanent identity */}
      <mesh position={[0, -0.8, 7]}>
        <cylinderGeometry args={[0.7, 0.9, 1.8, 24]} />
        <meshBasicMaterial color={fill} />
      </mesh>
      <mesh position={[0, 0.12, 7]}>
        <cylinderGeometry args={[0.65, 0.65, 0.08, 24]} />
        <meshBasicMaterial color={fill} />
      </mesh>

      {/* East wall — latest authenticated moment niche */}
      <mesh position={[4.5, 0.5, 10]}>
        <boxGeometry args={[2.5, 3.5, 0.8]} />
        <meshBasicMaterial color="#1A1208" />
      </mesh>
      <mesh position={[3.8, 0.5, 10]}>
        <boxGeometry args={[2.5, 3.5, 0.06]} />
        <meshBasicMaterial color="#8BC4D8" transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <GoldFrameStrips position={[3.8, 0.5, 10.04]} width={2.5} height={3.5} />

      {/* West wall — latest achievement plaque */}
      <mesh position={[-4.5, 0.5, 10]}>
        <boxGeometry args={[2.5, 3.5, 0.2]} />
        <meshBasicMaterial color={achievement ? "#2A1E10" : "#0A0806"} />
      </mesh>
      {achievement?.verified && (
        <mesh position={[-5.55, 0.5, 10.12]}>
          <boxGeometry args={[0.15, 3.5, 0.02]} />
          <meshBasicMaterial color={GOLD} />
        </mesh>
      )}

      {show && (
        <>
          <Html position={[0, -0.3, 8.5]} center transform={false} distanceFactor={10}>
            <div style={{ ...HTML, textAlign: "center", fontFamily: SERIF, width: 200 }}>
              <p style={{ ...p(11), color: GOLD, letterSpacing: "0.12em" }}>{player.display_name}</p>
              <p style={{ ...p(11), color: "#F5F2EC66", marginTop: 4 }}>{player.ppc_number}</p>
              <p style={{ ...p(11), color: GOLD, marginTop: 2 }}>{vaultTierLabel(player.vault_level)}</p>
            </div>
          </Html>

          {/* East placard */}
          <Html position={[2.5, 0.5, 10]} center transform={false} distanceFactor={10}>
            <div style={{ ...HTML, fontFamily: SERIF, width: 140, textAlign: "left" }}>
              {evidence ? (
                <>
                  <p style={{ ...p(7), color: GOLD, letterSpacing: "0.14em" }}>LATEST MOMENT</p>
                  <p style={{ ...p(8), color: PARCHMENT, marginTop: 4 }}>{evidence.evidence_class}</p>
                  <p style={{ ...p(7), color: "#B8972A99", marginTop: 2 }}>
                    {formatCorridorDate(evidence.admitted_at)}
                  </p>
                  {evidence.shared_capture?.capture_credit && (
                    <p style={{ ...p(7), color: GOLD, fontStyle: "italic", marginTop: 4 }}>
                      Captured by {evidence.shared_capture.capture_credit} · Vault verified
                    </p>
                  )}
                  {evidence.evt_name && (
                    <p style={{ ...p(7), color: "#F5F2EC66", marginTop: 2 }}>{evidence.evt_name}</p>
                  )}
                  {evidenceClassBadge(evidence.evidence_class) && (
                    <p style={{ ...p(7), color: GOLD, marginTop: 4 }}>
                      {evidenceClassBadge(evidence.evidence_class)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ ...p(8), color: GOLD, letterSpacing: "0.14em" }}>AWAITING FIRST MOMENT</p>
                  <p style={{ ...p(8), color: "#F5F2EC66", marginTop: 4 }}>
                    No authenticated captures on record.
                  </p>
                  <p style={{ ...p(7), color: "#F5F2EC44", marginTop: 4 }}>
                    Capture a moment through the Vault app
                  </p>
                </>
              )}
            </div>
          </Html>

          {/* West plaque */}
          <Html position={[-4.5, 0.5, 10.15]} center transform={false} distanceFactor={10}>
            <div style={{ ...HTML, fontFamily: SERIF, width: 150, textAlign: "left" }}>
              {achievement ? (
                <>
                  <p style={{ ...p(7), color: GOLD, letterSpacing: "0.14em" }}>LATEST ACHIEVEMENT</p>
                  <p style={{ ...p(12), color: GOLD, fontWeight: 700, marginTop: 4 }}>
                    {achievementTypeLabel(achievement.achievement_type)}
                  </p>
                  {achievement.event_name && (
                    <p style={{ ...p(9), color: PARCHMENT, marginTop: 4 }}>{achievement.event_name}</p>
                  )}
                  {achievement.season_year != null && (
                    <p style={{ ...p(8), color: "#B8972A99", marginTop: 2 }}>{achievement.season_year}</p>
                  )}
                  {achievement.org_name && (
                    <p style={{ ...p(8), color: "#F5F2EC66", marginTop: 2 }}>{achievement.org_name}</p>
                  )}
                  {achievement.verified && (
                    <p style={{ ...p(7), color: GOLD, marginTop: 4 }}>✓ Verified</p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ ...p(8), color: "#B8972A99", letterSpacing: "0.14em" }}>NO ACHIEVEMENTS</p>
                  <p style={{ ...p(7), color: "#F5F2EC44", marginTop: 4 }}>
                    Achievements appear here when verified
                  </p>
                </>
              )}
            </div>
          </Html>

          {/* South wall — current season */}
          <Html position={[0, 1, 13.5]} center transform={false} distanceFactor={10}>
            <div style={{ ...HTML, fontFamily: SERIF, width: 180, textAlign: "center" }}>
              {season ? (
                <>
                  <p style={{ ...p(7), color: GOLD, letterSpacing: "0.14em" }}>CURRENT SEASON</p>
                  {season.org_name && (
                    <p style={{ ...p(11), color: GOLD, fontWeight: 400, marginTop: 4 }}>{season.org_name}</p>
                  )}
                  <p style={{ ...p(9), color: PARCHMENT, marginTop: 2 }}>{season.season_year}</p>
                  <p style={{ ...p(9), color: "#F5F2EC66", marginTop: 2 }}>{season.event_name}</p>
                  {season.outcome && (
                    <p style={{ ...p(9), color: GOLD, marginTop: 2 }}>{season.outcome}</p>
                  )}
                  <p style={{ ...p(8), color: GOLD, letterSpacing: "0.12em", marginTop: 4 }}>
                    {season.status}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ ...p(8), color: "#B8972A99", letterSpacing: "0.14em" }}>NO ACTIVE SEASON</p>
                  {(player.event_participation?.[0]?.event.season_year ??
                    player.org_affiliations[0]?.season_year) != null && (
                    <p style={{ ...p(7), color: "#F5F2EC44", marginTop: 4 }}>
                      Last:{" "}
                      {player.event_participation?.[0]?.event.season_year ??
                        player.org_affiliations[0]?.season_year}
                    </p>
                  )}
                </>
              )}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function AffiliationsOctagon({
  player,
  cameraZ,
  onBreakthrough,
}: {
  player: PlayerData;
  cameraZ: number;
  onBreakthrough: () => void;
}) {
  const show = cameraZ <= 2 && cameraZ >= -14;
  const centerZ = -6;
  const filled = Math.min(player.org_affiliations.length, AFF_MAX);
  const panels = useMemo(() => polygonEdges(8, 9.5, centerZ, -0.5), []);

  const PANEL_FILLED = "#3D2810";
  const PANEL_EMPTY = "#1E1208";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.8, centerZ]}>
        <circleGeometry args={[10, 8]} />
        <meshBasicMaterial color="#1A1008" />
      </mesh>

      {cameraZ <= 2 &&
        panels.map((p, i) => {
          const aff = player.org_affiliations[i] ?? null;
          const isFilled = !!aff;
          const chain = aff ? buildOrgGovChain(aff).map((s) => s.code).join(" → ") : "";
          return (
            <group key={i} position={p.position} rotation={[0, p.rotationY, 0]}>
              <mesh>
                <boxGeometry args={[5, 7, 0.12]} />
                <meshBasicMaterial color={isFilled ? PANEL_FILLED : PANEL_EMPTY} />
              </mesh>
              {isFilled && (
                <>
                  <mesh position={[-2.35, 0, 0.07]}>
                    <boxGeometry args={[0.15, 7, 0.02]} />
                    <meshBasicMaterial color={GOLD} />
                  </mesh>
                  <pointLight position={[0, 4, 0.5]} color="#D4A832" intensity={3} distance={10} />
                </>
              )}
              {show && (
                <Html position={[0, 0, 0.12]} center transform={false} distanceFactor={9}>
                  <div style={{ ...HTML, fontFamily: SERIF, width: 130, textAlign: "center", color: PARCHMENT }}>
                    {isFilled && aff ? (
                      <>
                        <p style={{ fontSize: 12, color: GOLD, margin: 0 }}>{aff.org.name}</p>
                        <p style={{ fontSize: 10, margin: "4px 0 0" }}>
                          {aff.season_year} · {aff.status}
                        </p>
                        {aff.jersey_number && (
                          <p style={{ fontSize: 10, color: GOLD, margin: "2px 0 0" }}>#{aff.jersey_number}</p>
                        )}
                        <p style={{ fontSize: 9, color: "#B8972A66", marginTop: 6 }}>{chain}</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 14, color: "#B8972A22", margin: 0 }}>—</p>
                    )}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

      <HammerChisel
        centerZ={centerZ}
        plinthY={-3.5}
        scale={1}
        filled={filled}
        max={AFF_MAX}
        halfThreshold={4}
        fixedTools
        showBreakthrough={show && filled >= AFF_MAX}
        onClaim={onBreakthrough}
      />

      <ZoneFloorLabel show={show} centerZ={centerZ} label="AFFILIATIONS" filled={filled} max={AFF_MAX} />
    </group>
  );
}

function ProvenanceCorridor({ player, cameraZ }: { player: PlayerData; cameraZ: number }) {
  const show = cameraZ <= -17 && cameraZ > -25;
  const chain = buildProvenanceChain(player);
  const govN = chain.find((l) => l.tag === "GOV-N");
  const govR = chain.find((l) => l.tag === "GOV-R");
  const events = buildCorridorEvents(player);
  const evt = events[0];

  return (
    <group>
      <mesh position={[-5, 0, -21]}>
        <boxGeometry args={[0.5, 8, 12]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[5, 0, -21]}>
        <boxGeometry args={[0.5, 8, 12]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[0, -3.8, -21]}>
        <boxGeometry args={[10, 0.3, 12]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>

      {[-19, -23].map((z) => (
        <pointLight key={z} position={[0, 4, z]} color="#D4A832" intensity={3} distance={12} />
      ))}

      {govN && (
        <group position={[-4.6, 1, -19]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[3, 4, 0.2]} />
            <meshBasicMaterial color="#2A1E10" />
          </mesh>
          {govN.verified && (
            <mesh position={[0, 0, 0.11]}>
              <boxGeometry args={[3.06, 4.06, 0.02]} />
              <meshBasicMaterial color={GOLD} />
            </mesh>
          )}
          {show && (
            <Html position={[0, 0, 0.15]} center transform={false} distanceFactor={8}>
              <div style={{ ...HTML, fontFamily: SERIF, width: 120, textAlign: "center", color: PARCHMENT }}>
                <p style={{ fontSize: 10, margin: 0 }}>{govN.name.toUpperCase()}</p>
                <p style={{ fontSize: 9, color: GOLD, margin: "4px 0 0" }}>{govN.tag} · {govN.points}</p>
              </div>
            </Html>
          )}
        </group>
      )}

      {govR && (
        <group position={[-4.6, 1, -22]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[3, 4, 0.2]} />
            <meshBasicMaterial color="#2A1E10" />
          </mesh>
          {govR.verified && (
            <mesh position={[0, 0, 0.11]}>
              <boxGeometry args={[3.06, 4.06, 0.02]} />
              <meshBasicMaterial color={GOLD} />
            </mesh>
          )}
          {show && (
            <Html position={[0, 0, 0.15]} center transform={false} distanceFactor={8}>
              <div style={{ ...HTML, fontFamily: SERIF, width: 140, textAlign: "center", color: PARCHMENT }}>
                <p style={{ fontSize: 9, margin: 0, lineHeight: 1.3 }}>{govR.name.toUpperCase()}</p>
                <p style={{ fontSize: 9, color: GOLD, margin: "4px 0 0" }}>{govR.tag} · {govR.points}</p>
              </div>
            </Html>
          )}
        </group>
      )}

      {evt && (
        <group position={[4.6, 1, -20]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[3, 4, 0.2]} />
            <meshBasicMaterial color="#2A1E10" />
          </mesh>
          <mesh position={[0, 0, 0.11]}>
            <boxGeometry args={[3.06, 4.06, 0.02]} />
            <meshBasicMaterial color={GOLD} />
          </mesh>
          {show && (
            <Html position={[0, 0, 0.15]} center transform={false} distanceFactor={8}>
              <div style={{ ...HTML, fontFamily: SERIF, width: 130, textAlign: "center", color: PARCHMENT }}>
                <p style={{ fontSize: 10, margin: 0 }}>{evt.name}</p>
                <p style={{ fontSize: 9, color: GOLD, margin: "4px 0 0" }}>{evt.season_year}</p>
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}

function AchievementsHexagon({ player, cameraZ }: { player: PlayerData; cameraZ: number }) {
  const show = cameraZ <= -28 && cameraZ >= -44;
  const centerZ = -36;
  const slots = useMemo(() => buildAchSlots(player), [player]);
  const filled = countAchFilled(slots);
  const panels = useMemo(() => polygonEdges(6, 22 / Math.sqrt(3), centerZ, -0.5), []);

  const PANEL_FILLED = "#5A3E20";
  const PANEL_EMPTY = "#2A1A0A";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.8, centerZ]}>
        <circleGeometry args={[12, 6]} />
        <meshBasicMaterial color="#1A1008" />
      </mesh>

      {panels.map((p, i) => {
        const slot = slots[i]!;
        return (
          <group key={slot.key} position={p.position} rotation={[0, p.rotationY, 0]}>
            <mesh>
              <boxGeometry args={[6, 8, 0.12]} />
              <meshBasicMaterial color={slot.filled ? PANEL_FILLED : PANEL_EMPTY} />
            </mesh>
            {slot.filled && (
              <mesh position={[-2.85, 0, 0.07]}>
                <boxGeometry args={[0.08, 8, 0.02]} />
                <meshBasicMaterial color={GOLD} />
              </mesh>
            )}
            {show && (
              <Html position={[0, 0, 0.12]} center transform={false} distanceFactor={9}>
                <div style={{ ...HTML, fontFamily: SERIF, width: 150, textAlign: "center", color: PARCHMENT }}>
                  {slot.filled ? (
                    slot.bigC ? (
                      <>
                        <p style={{ fontSize: 9, color: GOLD, letterSpacing: "0.1em", margin: 0 }}>CAPTAIN</p>
                        <p style={{ fontSize: 52, color: GOLD, margin: "4px 0", lineHeight: 1 }}>C</p>
                        <p style={{ fontSize: 9, margin: 0 }}>{slot.lines[1]}</p>
                      </>
                    ) : (
                      slot.lines.map((line, li) => (
                        <p
                          key={li}
                          style={{
                            fontSize: li === 0 ? 11 : li === 1 ? 12 : 10,
                            color: li === 0 ? GOLD : li === 1 ? PARCHMENT : "#B8972A66",
                            letterSpacing: li === 0 ? "0.1em" : undefined,
                            margin: li === 0 ? 0 : "4px 0 0",
                          }}
                        >
                          {line}
                        </p>
                      ))
                    )
                  ) : (
                    <p style={{ fontSize: 9, color: "#B8972A22", letterSpacing: "0.08em", margin: 0 }}>
                      {slot.key === "special" ? "—" : slot.label}
                    </p>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {slots[0]?.filled && (
        <pointLight position={[-4, 3, -32]} color="#D4A832" intensity={5} distance={10} />
      )}
      {slots[1]?.filled && (
        <pointLight position={[4, 3, -36]} color="#D4A832" intensity={5} distance={10} />
      )}
      {slots[2]?.filled && (
        <pointLight position={[-4, 3, -40]} color="#D4A832" intensity={5} distance={10} />
      )}

      <HammerChisel
        centerZ={centerZ}
        scale={1.2}
        filled={filled}
        max={ACH_MAX}
        halfThreshold={3}
        showBreakthrough={show && filled >= ACH_MAX}
      />

      <ZoneFloorLabel show={show} centerZ={centerZ} label="ACHIEVEMENTS" filled={filled} max={ACH_MAX} />
    </group>
  );
}

function TransitionCorridor({ cameraZ }: { player: PlayerData; cameraZ: number }) {
  const show = cameraZ <= -47 && cameraZ > -53;

  return (
    <group>
      <mesh position={[-5, 0, -50]}>
        <boxGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[5, 0, -50]}>
        <boxGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>

      {[-49, -51].map((z, i) => (
        <group key={z} position={[i === 0 ? -4.6 : 4.6, 0.5, z]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 2.5, 0.8]} />
            <meshBasicMaterial color="#0A0806" />
          </mesh>
          {show && (
            <Html position={[0, 0, 0.5]} center transform={false} distanceFactor={8}>
              <p style={{ ...HTML, fontSize: 8, color: "#B8972A66", fontFamily: SERIF, margin: 0 }}>
                GUM items ahead
              </p>
            </Html>
          )}
        </group>
      ))}

      <group position={[4.5, 1, -50]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.3, 0.8, 0.1]} />
          <meshBasicMaterial color="#888780" />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.2]} />
          <meshBasicMaterial color="#888780" />
        </mesh>
      </group>
    </group>
  );
}

function GumGalleryZone({
  player,
  cameraZ,
  segment,
  onAdvanceSegment,
}: {
  player: PlayerData;
  cameraZ: number;
  segment: number;
  onAdvanceSegment: () => void;
}) {
  const show = cameraZ <= -56 && cameraZ >= -74;
  const centerZ = -65;
  const [gumFilled, setGumFilled] = useState(0);

  return (
    <group>
      <GumGallery
        player={player}
        cameraZ={cameraZ}
        segment={segment}
        onFilledChange={setGumFilled}
        onSegmentAdvance={onAdvanceSegment}
      />
      <HammerChisel
        centerZ={centerZ}
        plinthY={-3.0}
        scale={1}
        filled={gumFilled}
        max={GUM_MAX}
        halfThreshold={6}
        showBreakthrough={show && gumFilled >= GUM_MAX}
      />
      <ZoneFloorLabel
        show={show}
        centerZ={centerZ}
        label="THE COLLECTION"
        filled={gumFilled}
        max={GUM_MAX}
      />
    </group>
  );
}

function FinalCorridor({ cameraZ }: { cameraZ: number }) {
  if (cameraZ > -77) return null;
  return (
    <group>
      <mesh position={[-4, 0, -79]}>
        <boxGeometry args={[0.5, 5, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[4, 0, -79]}>
        <boxGeometry args={[0.5, 5, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[0, 3.5, -79]}>
        <boxGeometry args={[8, 0.3, 8]} />
        <meshBasicMaterial color="#0F0C08" />
      </mesh>
      <mesh position={[0, -3.8, -79]}>
        <boxGeometry args={[8, 0.3, 8]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>
    </group>
  );
}

function EndWall({ cameraZ, onReturn }: { cameraZ: number; onReturn: () => void }) {
  const show = cameraZ <= -77;
  return (
    <group>
      <mesh position={[0, 0, -82]}>
        <boxGeometry args={[10, 8, 0.5]} />
        <meshBasicMaterial color={CORRIDOR.stone} />
      </mesh>
      {show && (
        <Html position={[0, 1, -81.5]} center transform={false} distanceFactor={10}>
          <div style={{ ...HTML, fontFamily: SERIF, textAlign: "center", width: 280 }}>
            <p style={{ fontSize: 16, color: GOLD, letterSpacing: "0.2em", margin: "0 0 20px", textTransform: "uppercase" }}>
              This record is permanent.
            </p>
            <p style={{ fontSize: 11, color: GOLD, letterSpacing: "0.3em", margin: "0 0 28px" }}>THE VAULT™</p>
            <button
              type="button"
              onClick={onReturn}
              style={{
                fontSize: 9,
                color: "#B8972A66",
                background: "none",
                border: "none",
                fontFamily: SERIF,
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              ↑ Return to the Player Wing
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

function CorridorWorld({
  player,
  cameraZ,
  gumSegment,
  onBreakthrough,
  onGumSegmentAdvance,
  onReturn,
}: {
  player: PlayerData;
  cameraZ: number;
  gumSegment: number;
  onBreakthrough: () => void;
  onGumSegmentAdvance: () => void;
  onReturn: () => void;
}) {
  const stepsDown1 = [
    { z: 4.5, y: -2.2 },
    { z: 3.5, y: -2.6 },
    { z: 2.5, y: -3.0 },
    { z: 1.5, y: -3.4 },
  ];
  const stepsUp1 = [
    { z: -14.5, y: -3.4 },
    { z: -15.5, y: -3.0 },
    { z: -16.5, y: -2.6 },
    { z: -17.5, y: -2.2 },
  ];
  const stepsDown2 = [
    { z: -25.5, y: -3.4 },
    { z: -26.5, y: -3.0 },
    { z: -27.5, y: -2.6 },
    { z: -28.5, y: -2.2 },
  ];
  const stepsUp2 = [
    { z: -44.5, y: -3.4 },
    { z: -45.5, y: -3.0 },
    { z: -46.5, y: -2.6 },
    { z: -47.5, y: -2.2 },
  ];
  const stepsDown3 = [
    { z: -53.5, y: -3.4 },
    { z: -54.5, y: -3.0 },
    { z: -55.5, y: -2.6 },
    { z: -56.5, y: -2.2 },
  ];
  const stepsUp3 = [
    { z: -74.5, y: -3.4 },
    { z: -75.5, y: -3.0 },
    { z: -76.5, y: -2.6 },
    { z: -77.5, y: -2.2 },
  ];

  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.58} />
      <hemisphereLight args={["#F5F0E6", "#1A1208", 0.42]} />

      <EntryPlaza player={player} cameraZ={cameraZ} />
      <StoneSteps specs={stepsDown1} showTrim={false} />
      <AffiliationsOctagon player={player} cameraZ={cameraZ} onBreakthrough={onBreakthrough} />
      <StoneSteps specs={stepsUp1} />
      <ProvenanceCorridor player={player} cameraZ={cameraZ} />
      <StoneSteps specs={stepsDown2} />
      <AchievementsHexagon player={player} cameraZ={cameraZ} />
      <StoneSteps specs={stepsUp2} />
      <TransitionCorridor cameraZ={cameraZ} player={player} />
      <StoneSteps specs={stepsDown3} />
      <GumGalleryZone
        player={player}
        cameraZ={cameraZ}
        segment={gumSegment}
        onAdvanceSegment={onGumSegmentAdvance}
      />
      <StoneSteps specs={stepsUp3} />
      <FinalCorridor cameraZ={cameraZ} />
      <EndWall cameraZ={cameraZ} onReturn={onReturn} />
    </>
  );
}

function CorridorExperience({
  player,
  onZoneChange,
}: {
  player: PlayerData;
  onZoneChange: (zone: string) => void;
}) {
  const router = useRouter();
  const { camera } = useThree();
  const [cameraZ, setCameraZ] = useState(CAM_START_Z);
  const targetZRef = useRef(CAM_START_Z);

  const [gumSegment, setGumSegment] = useState(1);

  const onBreakthrough = useCallback(() => {
    gsap.to(camera.position, { z: camera.position.z - 8, duration: 1.2, ease: "power2.inOut" });
    targetZRef.current = clampZ(camera.position.z - 8);
  }, [camera]);

  const onGumSegmentAdvance = useCallback(() => {
    setGumSegment((current) => current + 1);
    const nextZ = clampZ(camera.position.z - 10);
    gsap.to(camera.position, {
      z: nextZ,
      duration: 1.4,
      ease: "power2.inOut",
    });
    targetZRef.current = nextZ;
  }, [camera]);

  const onReturn = useCallback(() => {
    router.push("/vault/player-wing");
  }, [router]);

  return (
    <>
      <SceneCleanup />
      <CameraRig targetZRef={targetZRef} onZoneChange={onZoneChange} onCameraZ={setCameraZ} />
      <CorridorWorld
        player={player}
        cameraZ={cameraZ}
        gumSegment={gumSegment}
        onBreakthrough={onBreakthrough}
        onGumSegmentAdvance={onGumSegmentAdvance}
        onReturn={onReturn}
      />
    </>
  );
}

function TopHud({ player }: { player: PlayerData }) {
  const colors = vaultTierColors(player.vault_level);
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "linear-gradient(to bottom, #0A0908 60%, transparent)",
        pointerEvents: "none",
        fontFamily: SERIF,
      }}
    >
      <span style={{ fontSize: 10, letterSpacing: "0.14em", color: GOLD, textTransform: "uppercase" }}>
        {player.ppc_number}
      </span>
      <span style={{ fontSize: 13, color: PARCHMENT }}>{player.display_name}</span>
      <span style={{ fontSize: 10, color: GOLD, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: colors.fill }} />
        {vaultTierLabel(player.vault_level)}
      </span>
    </div>
  );
}

function BottomHud({ zone }: { zone: string }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 0,
        right: 0,
        zIndex: 20,
        textAlign: "center",
        pointerEvents: "none",
        fontFamily: SERIF,
      }}
    >
      <p style={{ fontSize: 10, letterSpacing: "0.16em", color: GOLD, textTransform: "uppercase", margin: 0 }}>
        {zone}
      </p>
      <p style={{ fontSize: 9, color: "#B8972A66", margin: "6px 0 0" }}>↑ scroll up · ↓ scroll down</p>
    </div>
  );
}

export function CorridorScene({ player }: { player: PlayerData }) {
  const [zone, setZone] = useState("ENTRANCE");
  const onZoneChange = useCallback((z: string) => setZone(z), []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: BG, overflow: "hidden" }}>
      <TopHud player={player} />
      <BottomHud zone={zone} />
      <Canvas
        camera={{ fov: 65, near: 0.1, far: 250, position: [0, CAM_Y, CAM_START_Z] }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.55;
        }}
      >
        <CorridorExperience player={player} onZoneChange={onZoneChange} />
      </Canvas>
    </div>
  );
}
