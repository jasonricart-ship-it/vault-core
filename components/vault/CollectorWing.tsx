"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type {
  AuthenticationMark,
  CollectorWingCollector,
  CollectorWingTransitItem,
  CollectorWingUserVrc,
  TransferStatus,
} from "@/lib/collector-wing";
import { vaultTierColors, vaultTierLabel } from "@/components/vault/corridor/utils";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";
const SERIF = "Georgia, 'Times New Roman', serif";

const CAMERA_POS = new THREE.Vector3(0, 2.5, 18);
const CAM_Y = 2.5;
const LOOK_Y = 2;
const LOOK_AHEAD = 28;
const MAX_YAW = Math.PI / 3;
const YAW_KEY_STEP = 0.18;
const YAW_DRAG_SENS = 0.003;

const C = {
  floor: "#1E1610",
  wall: "#2A1E10",
  wallTrim: "#4D3820",
  step: "#6B5030",
  arch: "#7A5A3A",
  platform: "#4D3820",
  railing: "#8B6840",
} as const;

const LEFT_PLINTH_Z = [-2, -6, -10, -14, -18, -22, -26, -30] as const;
const RIGHT_CASE_Z = [-2, -10, -18, -26] as const;

const HTML_LABEL = {
  fontSize: "10px",
  maxWidth: "130px",
  textAlign: "center" as const,
  pointerEvents: "none" as const,
  userSelect: "none" as const,
};

function vaultLevelColor(level: string) {
  switch (level) {
    case "archival":
      return "#D4A92A";
    case "established":
      return "#B0B8C4";
    case "documented":
      return "#C8A87A";
    case "recorded":
    default:
      return "#888780";
  }
}

const FRAME_COLOR = "#6B5C48";
const RECESS_COLOR = "#16120E";
const EMPTY_CASE_COLOR = "#1A1208";

const TRANSFER_COLORS: Record<TransferStatus, string> = {
  submitted: "#8B0000",
  under_review: "#6B21A8",
  chain_confirmed: "#D97706",
  awaiting_possession: "#B8962E",
  transfer_complete: "#16A34A",
};

const TRANSFER_LABELS: Record<TransferStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  chain_confirmed: "Chain Confirmed",
  awaiting_possession: "Awaiting Possession",
  transfer_complete: "Transfer Complete",
};

function checkmarkGlyph(mark: AuthenticationMark) {
  if (mark === "gold") return "✓";
  if (mark === "silver") return "◐";
  return "○";
}

function checkmarkColor(mark: AuthenticationMark) {
  if (mark === "gold") return GOLD;
  if (mark === "silver") return "#C0C8D4";
  return "#6A6258";
}

function formatItemType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function CaseGlowPlane({ color }: { color: string }) {
  return (
    <mesh position={[0, 0, 0.06]} raycast={() => null}>
      <planeGeometry args={[2.2, 4.1]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

function InspectionPlacard({
  item,
  slotNumber,
}: {
  item: CollectorWingTransitItem | null;
  slotNumber: number;
}) {
  const statusColor = item ? TRANSFER_COLORS[item.transfer_status] : EMPTY_CASE_COLOR;
  const statusLabel = item ? TRANSFER_LABELS[item.transfer_status] : null;

  return (
    <Html position={[0, -2.55, 0.72]} center transform={false} distanceFactor={10}>
      <div
        style={{
          ...HTML_LABEL,
          fontFamily: SERIF,
          width: 148,
          textAlign: "left",
          padding: "6px 8px",
          background: "rgba(18, 14, 10, 0.94)",
          border: "0.5px solid #B8972A66",
          pointerEvents: "none",
        }}
      >
        {item && statusLabel ? (
          <>
            <p style={{ fontSize: 8, color: GOLD, margin: 0, letterSpacing: "0.08em" }}>
              {item.gum_code}
            </p>
            <p
              style={{
                fontSize: 8,
                color: PARCHMENT,
                margin: "3px 0 0",
                letterSpacing: "0.04em",
              }}
            >
              {formatItemType(item.item_type)}
            </p>
            <p
              style={{
                fontSize: 9,
                margin: "6px 0 0",
                color: checkmarkColor(item.authentication_mark),
                letterSpacing: "0.12em",
              }}
            >
              {checkmarkGlyph(item.authentication_mark)}{" "}
              {item.authentication_mark === "gold"
                ? "Gold mark"
                : item.authentication_mark === "silver"
                  ? "Silver mark"
                  : "Unverified"}
            </p>
            <p
              style={{
                fontSize: 8,
                margin: "5px 0 0",
                color: statusColor,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {statusLabel}
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 8, color: "#B8972A88", margin: 0 }}>
              INSPECTION CASE {slotNumber}
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

function TransitInspectionCase({
  position,
  item,
  slotNumber,
}: {
  position: [number, number, number];
  item: CollectorWingTransitItem | null;
  slotNumber: number;
}) {
  const glowColor = item ? TRANSFER_COLORS[item.transfer_status] : EMPTY_CASE_COLOR;

  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* Dark stone recess box */}
      <mesh position={[0, 0, -0.55]} raycast={() => null}>
        <boxGeometry args={[2.5, 4.5, 1.2]} />
        <meshBasicMaterial color={RECESS_COLOR} />
      </mesh>

      {/* Stone frame */}
      <mesh position={[0, 0, 0.04]} raycast={() => null}>
        <boxGeometry args={[2.58, 4.58, 0.1]} />
        <meshBasicMaterial color={FRAME_COLOR} />
      </mesh>

      <CaseGlowPlane color={glowColor} />

      {item && (
        <mesh position={[0, 0.15, 0.12]} raycast={() => null}>
          <boxGeometry args={[1.45, 1.95, 0.05]} />
          <meshBasicMaterial color="#F5F2EC" toneMapped={false} />
        </mesh>
      )}

      <InspectionPlacard item={item} slotNumber={slotNumber} />
    </group>
  );
}

function SceneCleanup() {
  const { scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
    };
  }, [scene]);
  return null;
}

function CameraRig() {
  const { camera, gl } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, LOOK_Y, CAMERA_POS.z - LOOK_AHEAD));
  const yaw = useRef({ value: 0 });
  const draggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const yawTweenRef = useRef<gsap.core.Tween | null>(null);

  const clampYaw = useCallback((value: number) => {
    return Math.max(-MAX_YAW, Math.min(MAX_YAW, value));
  }, []);

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

  useEffect(() => {
    camera.position.copy(CAMERA_POS);
    yaw.current.value = 0;
    lookAt.current.set(0, LOOK_Y, CAMERA_POS.z - LOOK_AHEAD);
    camera.lookAt(lookAt.current);
  }, [camera]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        tweenYaw(yaw.current.value - YAW_KEY_STEP);
      } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        event.preventDefault();
        tweenYaw(yaw.current.value + YAW_KEY_STEP);
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      draggingRef.current = true;
      lastMouseXRef.current = event.clientX;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = event.clientX - lastMouseXRef.current;
      lastMouseXRef.current = event.clientX;
      tweenYaw(yaw.current.value + delta * YAW_DRAG_SENS, 0.15);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      yawTweenRef.current?.kill();
    };
  }, [tweenYaw]);

  useFrame(() => {
    gl.domElement.style.cursor = draggingRef.current ? "grabbing" : "grab";

    const yawVal = clampYaw(yaw.current.value);
    yaw.current.value = yawVal;
    lookAt.current.set(
      Math.sin(yawVal) * LOOK_AHEAD,
      LOOK_Y,
      CAMERA_POS.z - Math.cos(yawVal) * LOOK_AHEAD,
    );
    camera.lookAt(lookAt.current);
  });

  return null;
}

function CollectorPlinth({
  position,
  collector,
}: {
  position: [number, number, number];
  collector: CollectorWingCollector;
}) {
  const color = vaultLevelColor(collector.vault_level);

  return (
    <group position={position}>
      <mesh raycast={() => null}>
        <cylinderGeometry args={[0.85, 1.05, 2.2, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.25, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 2.15, 0]} center transform={false}>
        <div
          style={{
            ...HTML_LABEL,
            maxWidth: "200px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <p
            style={{
              fontFamily: SERIF,
              fontSize: "0.85em",
              letterSpacing: "0.06em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: GOLD }}>{collector.vrc_number}</span>
            <span style={{ color: PARCHMENT }}> · {collector.display_name}</span>
          </p>
        </div>
      </Html>
    </group>
  );
}

function RegistryArch({ onEnter }: { onEnter: () => void }) {
  const { gl } = useThree();
  const [hovered, setHovered] = useState(false);

  return (
    <group position={[0, 1, -28]}>
      <mesh raycast={() => null}>
        <boxGeometry args={[10, 9, 1.2]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>
      <mesh position={[0, 0, 0.65]} raycast={() => null}>
        <boxGeometry args={[6.5, 7, 0.8]} />
        <meshBasicMaterial color="#0A0806" />
      </mesh>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          gl.domElement.style.cursor = "default";
        }}
      >
        <boxGeometry args={[6.8, 7.2, 0.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Arch surround */}
      <mesh position={[0, 3.2, 0.72]}>
        <torusGeometry args={[3.2, 0.35, 12, 48, Math.PI]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      {/* Gold uplighting */}
      <pointLight position={[-2.5, -2, 1.2]} color={GOLD} intensity={10} distance={12} />
      <pointLight position={[2.5, -2, 1.2]} color={GOLD} intensity={10} distance={12} />
      <pointLight position={[0, 4.5, 1]} color="#FFE8A0" intensity={6} distance={10} />
      <Html position={[0, 1.5, 1.1]} center transform={false}>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEnter();
            }
          }}
          style={{
            ...HTML_LABEL,
            pointerEvents: "auto",
            cursor: "pointer",
            maxWidth: "220px",
            opacity: hovered ? 1 : 0.92,
          }}
        >
          <p
            style={{
              fontFamily: SERIF,
              color: GOLD,
              fontSize: "1.4em",
              letterSpacing: "0.22em",
              margin: 0,
              lineHeight: 1.2,
              textShadow: "0 0 18px rgba(184,151,42,0.45)",
            }}
          >
            VRC
          </p>
          <p
            style={{
              fontFamily: SERIF,
              color: PARCHMENT,
              fontSize: "0.75em",
              letterSpacing: "0.14em",
              margin: "8px 0 0",
              lineHeight: 1.3,
            }}
          >
            VAULT REGISTRY COLLECTOR
          </p>
          {hovered && (
            <p
              style={{
                fontFamily: SERIF,
                color: "#B8972A99",
                fontSize: "0.65em",
                letterSpacing: "0.14em",
                margin: "8px 0 0",
              }}
            >
              → Enter the Registry
            </p>
          )}
        </div>
      </Html>
    </group>
  );
}

function ElevatedPlatform() {
  return (
    <group position={[0, -1.8, 14]}>
      {/* Raised dais */}
      <mesh raycast={() => null}>
        <boxGeometry args={[14, 0.6, 5]} />
        <meshBasicMaterial color={C.platform} />
      </mesh>
      <mesh position={[0, 0.32, 0]} raycast={() => null}>
        <boxGeometry args={[14.2, 0.08, 5.2]} />
        <meshBasicMaterial color={C.railing} />
      </mesh>
      {/* Stone railing posts */}
      {[-6.5, -3.2, 0, 3.2, 6.5].map((x) => (
        <group key={x} position={[x, 0.9, 2.4]}>
          <mesh raycast={() => null}>
            <cylinderGeometry args={[0.12, 0.14, 1.2, 10]} />
            <meshBasicMaterial color={C.railing} />
          </mesh>
        </group>
      ))}
      {/* Top rail */}
      <mesh position={[0, 1.45, 2.4]} raycast={() => null}>
        <boxGeometry args={[13.4, 0.1, 0.12]} />
        <meshBasicMaterial color={C.railing} />
      </mesh>
      <mesh position={[0, 1.45, -2.4]} raycast={() => null}>
        <boxGeometry args={[13.4, 0.1, 0.12]} />
        <meshBasicMaterial color={C.railing} />
      </mesh>
      {[-6.5, 6.5].map((x) => (
        <mesh key={`side-${x}`} position={[x, 1.45, 0]} raycast={() => null}>
          <boxGeometry args={[0.12, 0.1, 4.8]} />
          <meshBasicMaterial color={C.railing} />
        </mesh>
      ))}
    </group>
  );
}

function CollectorWingScene({
  collectors,
  transitItems,
  onRegistryEnter,
}: {
  collectors: CollectorWingCollector[];
  transitItems: CollectorWingTransitItem[];
  onRegistryEnter: () => void;
}) {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, -4]} raycast={() => null}>
        <planeGeometry args={[36, 52]} />
        <meshBasicMaterial color={C.floor} />
      </mesh>

      {/* Side walls */}
      <mesh position={[-18, 4, -4]} raycast={() => null}>
        <boxGeometry args={[0.8, 14, 52]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>
      <mesh position={[18, 4, -4]} raycast={() => null}>
        <boxGeometry args={[0.8, 14, 52]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 4, -30]} raycast={() => null}>
        <boxGeometry args={[36, 14, 0.8]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 11, -4]} raycast={() => null}>
        <planeGeometry args={[36, 52]} />
        <meshBasicMaterial color="#0A0806" />
      </mesh>

      {/* Wall trim bands */}
      <mesh position={[0, 0.5, -29.5]} raycast={() => null}>
        <boxGeometry args={[34, 0.3, 0.2]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>

      <ElevatedPlatform />

      {/* Left wall — VRC collector plinths receding north */}
      {LEFT_PLINTH_Z.map((z, i) => {
        const collector = collectors[i];
        if (!collector) return null;
        return (
          <CollectorPlinth key={collector.vrc_number} position={[-14, -1.4, z]} collector={collector} />
        );
      })}

      {/* Right wall — items in transit under vault inspection */}
      {RIGHT_CASE_Z.map((z, i) => (
        <TransitInspectionCase
          key={z}
          position={[14, 0.2, z]}
          item={transitItems[i] ?? null}
          slotNumber={i + 1}
        />
      ))}

      <RegistryArch onEnter={onRegistryEnter} />

      {/* Ceiling track lights over Vault Inspection cases */}
      {RIGHT_CASE_Z.map((z) => (
        <pointLight
          key={`track-${z}`}
          position={[12, 10.5, z]}
          color="#FFF8F0"
          intensity={8}
          distance={14}
          decay={1.5}
        />
      ))}

      {/* Ambient hall light */}
      <ambientLight intensity={0.6} color="#F5F2EC" />
      <hemisphereLight args={["#F5F0E6", "#1A1208", 0.42]} />
      <pointLight position={[0, 8, 0]} color="#F5F2EC" intensity={4} distance={40} />
    </group>
  );
}

function TopHud({ userVrc }: { userVrc: CollectorWingUserVrc }) {
  const colors = vaultTierColors(userVrc.vault_level);
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
      <span
        style={{ fontSize: 10, letterSpacing: "0.14em", color: GOLD, textTransform: "uppercase" }}
      >
        {userVrc.vrc_number}
      </span>
      <span style={{ fontSize: 13, color: PARCHMENT }}>{userVrc.display_name}</span>
      <span style={{ fontSize: 10, color: GOLD, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: colors.fill }} />
        {vaultTierLabel(userVrc.vault_level)}
      </span>
    </div>
  );
}

export type CollectorWingProps = {
  collectors: CollectorWingCollector[];
  transitItems: CollectorWingTransitItem[];
  userVrc: CollectorWingUserVrc | null;
};

export function CollectorWing({ collectors, transitItems, userVrc }: CollectorWingProps) {
  const router = useRouter();

  const handleRegistryEnter = useCallback(() => {
    router.push("/vault/vrc/registry");
  }, [router]);

  const returnToAtrium = useCallback(() => {
    router.push("/vault/atrium");
  }, [router]);

  return (
    <div className="relative h-screen w-screen" style={{ backgroundColor: BG }}>
      {userVrc && <TopHud userVrc={userVrc} />}
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, 2.5, 18], fov: 58, near: 0.1, far: 200 }}
        onCreated={({ gl }) => () => gl.dispose()}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={["#1A1208", 28, 75]} />
        <CameraRig />
        <SceneCleanup />
        <CollectorWingScene
          collectors={collectors}
          transitItems={transitItems}
          onRegistryEnter={handleRegistryEnter}
        />
      </Canvas>

      <button
        type="button"
        onClick={handleRegistryEnter}
        className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 cursor-pointer border-none bg-transparent"
        style={{
          fontFamily: SERIF,
          color: GOLD,
          fontSize: 12,
          letterSpacing: "0.18em",
          opacity: 0.95,
        }}
      >
        Enter the Registry
      </button>

      <button
        type="button"
        onClick={returnToAtrium}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 cursor-pointer border-none bg-transparent"
        style={{
          fontFamily: SERIF,
          color: GOLD,
          fontSize: 12,
          letterSpacing: "0.18em",
          opacity: 0.85,
        }}
      >
        ← Back to Atrium
      </button>
    </div>
  );
}
