"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 2, 16);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 1, 0);
const ENTRY_START_POS = new THREE.Vector3(0, 2, 22);
const CAM_Y = 2;
const MAX_WALK_DISTANCE = 12;
const MAX_CAMERA_Z = 14;
const DOOR_FOCUS_RADIUS = 8;
const MAX_DRIFT_H = THREE.MathUtils.degToRad(15);
const MAX_DRIFT_V = THREE.MathUtils.degToRad(5);
const DRIFT_LERP = 0.08;
const GSAP_EASE = "power2.out";

const GOLD = "#B8972A";
const GOLD_DIM = "#8B6914";
const PARCHMENT = "#F5F2EC";

const C = {
  floor: "#6B5540",
  ceiling: "#2A1E14",
  wall: "#5A4530",
  alcove: "#3D2E1E",
  arch: "#7A5A3A",
  doorPanel: "#3D2810",
  doorFrame: "#B8972A",
  step: "#8B6840",
  stepEdge: "#A07848",
  tunnelWall: "#2A1E14",
  plinth: "#7A5A3A",
  bustDisc: "#D4A92A",
  plaque: "#5A4530",
  statuePlinth: "#4D3820",
  bustGold: "#D4A92A",
  bustBronze: "#C8A87A",
  bustSilver: "#B0B8C4",
  plaquePanel: "#2A1E10",
  plaqueBorder: "#8B6914",
} as const;

export type AtriumInteriorMvp = {
  display_name: string;
  preferred_name: string | null;
  ppc_number: string;
  achievement_notes: string;
  event_name: string;
  season_year: number;
};

export type AtriumInteriorChampion = {
  preferred_name: string | null;
  ppc_number: string;
  event_name: string;
  season_year: number;
  location?: string | null;
};

export type AtriumInteriorCaptain = {
  preferred_name: string | null;
  org_name: string;
  season_year: number;
  jersey_number: string | null;
};

export type AtriumInteriorProps = {
  mvp: AtriumInteriorMvp | null;
  champions: AtriumInteriorChampion[];
  captains: AtriumInteriorCaptain[];
  isAuthenticated: boolean;
  hasVrc: boolean;
  isAuthority: boolean;
};

function shortName(preferred: string | null | undefined, fallback = "BEAU") {
  return (preferred ?? fallback).toUpperCase();
}

export type AtriumTargetId =
  | "principles"
  | "institutions"
  | "playerWing"
  | "collector"
  | "authority"
  | "mvp"
  | "champions"
  | "captains";

type AtriumTargetConfig = {
  label: string;
  lookAt: THREE.Vector3;
  doorPos: THREE.Vector3;
  glowPosition: [number, number, number];
  glowSize: [number, number, number];
};

const ATRIUM_TARGETS: Record<AtriumTargetId, AtriumTargetConfig> = {
  principles: {
    label: "Principles Vault",
    lookAt: new THREE.Vector3(-17, 3.5, -22),
    doorPos: new THREE.Vector3(-17, 1, -22),
    glowPosition: [-17, 3.5, -21.4],
    glowSize: [3.6, 6.6, 0.12],
  },
  institutions: {
    label: "Institutions",
    lookAt: new THREE.Vector3(-9, 4, -26),
    doorPos: new THREE.Vector3(-9, 1, -26),
    glowPosition: [-9, 4, -25.6],
    glowSize: [4.6, 7.6, 0.12],
  },
  playerWing: {
    label: "The Player Wing",
    lookAt: new THREE.Vector3(0, 4, -27.5),
    doorPos: new THREE.Vector3(0, 1, -27.5),
    glowPosition: [0, 4, -27],
    glowSize: [10.6, 12.6, 0.12],
  },
  collector: {
    label: "Collector Wing",
    lookAt: new THREE.Vector3(9, 4, -26),
    doorPos: new THREE.Vector3(9, 1, -26),
    glowPosition: [9, 4, -25.6],
    glowSize: [4.6, 7.6, 0.12],
  },
  authority: {
    label: "Authority Chamber",
    lookAt: new THREE.Vector3(17, 3.5, -22),
    doorPos: new THREE.Vector3(17, 1, -22),
    glowPosition: [17, 3.5, -21.4],
    glowSize: [3.6, 6.6, 0.12],
  },
  mvp: {
    label: "MVP Rotunda",
    lookAt: new THREE.Vector3(-3, -0.5, -3),
    doorPos: new THREE.Vector3(-3, -2, -3),
    glowPosition: [-3, 1.5, -2.2],
    glowSize: [6, 6, 0.12],
  },
  champions: {
    label: "Champions",
    lookAt: new THREE.Vector3(-23, 1, -8),
    doorPos: new THREE.Vector3(-12, -2, -10),
    glowPosition: [-23, 2.5, -8],
    glowSize: [14, 18, 0.12],
  },
  captains: {
    label: "Captains",
    lookAt: new THREE.Vector3(23, 1, -8),
    doorPos: new THREE.Vector3(12, -2, -10),
    glowPosition: [23, 2.5, -8],
    glowSize: [14, 18, 0.12],
  },
};

type AtriumInteractionContextValue = {
  selectedId: AtriumTargetId | null;
  selectTarget: (id: AtriumTargetId | null) => void;
  commitTarget: (id: AtriumTargetId) => void;
  walkTo: (point: THREE.Vector3) => void;
  isSelected: (id: AtriumTargetId) => boolean;
};

const AtriumInteractionContext = createContext<AtriumInteractionContextValue | null>(null);

function useAtriumInteraction() {
  const ctx = useContext(AtriumInteractionContext);
  if (!ctx) {
    throw new Error("useAtriumInteraction must be used within AtriumInteractionProvider");
  }
  return ctx;
}

const SELECTION_FRAME_OPACITY = 0.15;
const SELECTION_FRAME_THICKNESS = 0.1;

function SelectionFrame({
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  depth = 0.06,
}: {
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  depth?: number;
}) {
  const t = SELECTION_FRAME_THICKNESS;
  const hw = width / 2;
  const hh = height / 2;
  const frameMaterial = (
    <meshBasicMaterial
      color={GOLD}
      transparent
      opacity={SELECTION_FRAME_OPACITY}
      depthWrite={false}
    />
  );

  return (
    <group position={position} rotation={rotation} raycast={() => null}>
      <mesh position={[0, hh - t / 2, 0]}>
        <boxGeometry args={[width, t, depth]} />
        {frameMaterial}
      </mesh>
      <mesh position={[0, -hh + t / 2, 0]}>
        <boxGeometry args={[width, t, depth]} />
        {frameMaterial}
      </mesh>
      <mesh position={[-hw + t / 2, 0, 0]}>
        <boxGeometry args={[t, height - t * 2, depth]} />
        {frameMaterial}
      </mesh>
      <mesh position={[hw - t / 2, 0, 0]}>
        <boxGeometry args={[t, height - t * 2, depth]} />
        {frameMaterial}
      </mesh>
    </group>
  );
}

function SelectionLabel({ targetId }: { targetId: AtriumTargetId }) {
  const target = ATRIUM_TARGETS[targetId];
  const isDoor =
    targetId === "principles" ||
    targetId === "institutions" ||
    targetId === "playerWing" ||
    targetId === "collector" ||
    targetId === "authority";

  return (
    <Html
      position={[target.glowPosition[0], target.glowPosition[1] + 2.2, target.glowPosition[2]]}
      center
      transform
      distanceFactor={10}
    >
      <div
        className="pointer-events-none select-none text-center"
        style={{
          padding: "10px 14px",
          background: "rgba(18, 14, 10, 0.94)",
          border: "0.5px solid #B8972A88",
          minWidth: 160,
        }}
      >
        <p
          style={{
            fontFamily: "Georgia, serif",
            color: GOLD,
            fontSize: "11px",
            letterSpacing: "0.2em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {target.label}
        </p>
        <p
          style={{
            fontFamily: "Georgia, serif",
            color: PARCHMENT,
            fontSize: "8px",
            letterSpacing: "0.12em",
            margin: "6px 0 0",
            opacity: 0.65,
            textTransform: "uppercase",
          }}
        >
          {isDoor ? "Double-click to enter" : "Double-click to view"}
        </p>
      </div>
    </Html>
  );
}

function InteractableSurface({
  targetId,
  children,
}: {
  targetId: AtriumTargetId;
  children: ReactNode;
}) {
  const { selectTarget, commitTarget } = useAtriumInteraction();

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        selectTarget(targetId);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        commitTarget(targetId);
      }}
    >
      {children}
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

function AtriumCameraRig({
  lookAtRef,
  baseLookAtRef,
  isMovingRef,
  isAnimatingRef,
  mouseRef,
  cameraResetNonceRef,
  onReady,
}: {
  lookAtRef: React.MutableRefObject<THREE.Vector3>;
  baseLookAtRef: React.MutableRefObject<THREE.Vector3>;
  isMovingRef: React.MutableRefObject<boolean>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  cameraResetNonceRef: React.MutableRefObject<number>;
  onReady: (camera: THREE.PerspectiveCamera) => void;
}) {
  const { camera } = useThree();
  const autoFocusDoorRef = useRef<AtriumTargetId | null>(null);
  const doorFocusTweenRef = useRef<gsap.core.Tween | null>(null);
  const driftLookAt = useRef(new THREE.Vector3());
  const lastResetNonceRef = useRef(0);

  useEffect(() => {
    onReady(camera as THREE.PerspectiveCamera);
  }, [camera, onReady]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      doorFocusTweenRef.current?.kill();
    };
  }, [mouseRef]);

  useFrame(() => {
    if (cameraResetNonceRef.current !== lastResetNonceRef.current) {
      lastResetNonceRef.current = cameraResetNonceRef.current;
      doorFocusTweenRef.current?.kill();
      autoFocusDoorRef.current = null;
    }

    camera.lookAt(lookAtRef.current);

    if (isMovingRef.current || isAnimatingRef.current) {
      return;
    }

    const camPos = camera.position;
    let nearestDoor: AtriumTargetId | null = null;
    let nearestDist = Infinity;

    for (const [id, target] of Object.entries(ATRIUM_TARGETS) as [AtriumTargetId, AtriumTargetConfig][]) {
      if (!["principles", "institutions", "playerWing", "collector", "authority"].includes(id)) {
        continue;
      }
      const dist = camPos.distanceTo(target.doorPos);
      if (dist < DOOR_FOCUS_RADIUS && dist < nearestDist) {
        nearestDist = dist;
        nearestDoor = id;
      }
    }

    if (nearestDoor && nearestDoor !== autoFocusDoorRef.current) {
      autoFocusDoorRef.current = nearestDoor;
      doorFocusTweenRef.current?.kill();
      doorFocusTweenRef.current = gsap.to(baseLookAtRef.current, {
        x: ATRIUM_TARGETS[nearestDoor].lookAt.x,
        y: ATRIUM_TARGETS[nearestDoor].lookAt.y,
        z: ATRIUM_TARGETS[nearestDoor].lookAt.z,
        duration: 0.8,
        ease: GSAP_EASE,
        onUpdate: () => {
          lookAtRef.current.copy(baseLookAtRef.current);
        },
      });
    } else if (!nearestDoor) {
      autoFocusDoorRef.current = null;
    }

    const base = baseLookAtRef.current;
    const toBase = base.clone().sub(camPos);
    const distance = toBase.length();
    if (distance < 0.001) return;

    toBase.normalize();
    const right = new THREE.Vector3().crossVectors(toBase, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 0.0001) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }
    const up = new THREE.Vector3().crossVectors(right, toBase).normalize();

    const hOffset = Math.tan(MAX_DRIFT_H) * distance * mouseRef.current.x;
    const vOffset = Math.tan(MAX_DRIFT_V) * distance * mouseRef.current.y;

    driftLookAt.current
      .copy(base)
      .addScaledVector(right, hOffset)
      .addScaledVector(up, vOffset);

    lookAtRef.current.lerp(driftLookAt.current, DRIFT_LERP);
  });

  return null;
}

function WalkFloor() {
  const { selectTarget, walkTo } = useAtriumInteraction();

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2.99, 0]}
      onClick={(event) => {
        event.stopPropagation();
        selectTarget(null);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        walkTo(event.point);
      }}
    >
      <planeGeometry args={[56, 56]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function CarvedLabel({
  position,
  distanceFactor,
  lines,
  width = 220,
  rotation,
}: {
  position: [number, number, number];
  distanceFactor?: number;
  width?: number;
  rotation?: [number, number, number];
  lines: Array<{
    text: string;
    color?: string;
    fontSize?: string;
    letterSpacing?: string;
    fontWeight?: string;
    opacity?: number;
    marginTop?: number;
  }>;
}) {
  return (
    <Html position={position} center transform distanceFactor={distanceFactor ?? 10} rotation={rotation}>
      <div
        className="pointer-events-none select-none text-center"
        style={{ width }}
      >
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontFamily: "Georgia, serif",
              color: line.color ?? GOLD,
              fontSize: line.fontSize ?? "10px",
              letterSpacing: line.letterSpacing ?? "0.2em",
              fontWeight: line.fontWeight ?? "normal",
              opacity: line.opacity ?? 1,
              margin: 0,
              marginTop: line.marginTop ?? (i === 0 ? 0 : 6),
              textTransform: "uppercase",
            }}
          >
            {line.text}
          </p>
        ))}
      </div>
    </Html>
  );
}

function DoorSign({
  position,
  deniedMessage,
  lines,
}: {
  position: [number, number, number];
  deniedMessage?: string | null;
  lines: Array<{
    text: string;
    color?: string;
    fontSize?: string;
    letterSpacing?: string;
    opacity?: number;
  }>;
}) {
  return (
    <>
      <CarvedLabel position={position} distanceFactor={11} width={180} lines={lines} />
      {deniedMessage && (
        <Html position={[position[0], position[1] - 2.5, position[2] + 0.3]} center transform distanceFactor={9}>
          <div
            className="pointer-events-none select-none text-center"
            style={{
              padding: "10px 12px",
              background: "rgba(10, 9, 8, 0.88)",
              border: "1px solid rgba(184, 151, 42, 0.35)",
              width: 150,
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: GOLD,
                fontSize: "10px",
                letterSpacing: "0.28em",
                margin: 0,
              }}
            >
              {deniedMessage}
            </p>
          </div>
        </Html>
      )}
    </>
  );
}

function StandardDoor({
  targetId,
  position,
  rotationY = 0,
  width,
  height,
  frameColor,
  panelColor,
  labelLines,
  deniedMessage,
}: {
  targetId: AtriumTargetId;
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  frameColor: string;
  panelColor: string;
  labelLines: Array<{ text: string; color?: string; fontSize?: string; letterSpacing?: string; opacity?: number }>;
  deniedMessage?: string | null;
}) {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected(targetId);
  const labelY = height / 2 + 1.5;

  return (
    <InteractableSurface targetId={targetId}>
      <group position={position} rotation={[0, rotationY, 0]}>
        <mesh position={[0, 0, -0.08]} raycast={() => null}>
          <boxGeometry args={[width + 0.4, height + 0.4, 0.2]} />
          <meshBasicMaterial color={frameColor} />
        </mesh>
        <mesh>
          <boxGeometry args={[width, height, 0.4]} />
          <meshBasicMaterial color={panelColor} />
        </mesh>
        {selected && <SelectionFrame width={width} height={height} position={[0, 0, 0.22]} />}
        <DoorSign position={[0, labelY, 0.6]} lines={labelLines} />
        {deniedMessage && (
          <Html position={[0, -1.5, 0.6]} center transform distanceFactor={8}>
            <div
              className="pointer-events-none select-none text-center"
              style={{
                width: 160,
                padding: "12px 10px",
                background: "rgba(10, 9, 8, 0.88)",
                border: "1px solid rgba(184, 151, 42, 0.35)",
              }}
            >
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: GOLD,
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  margin: 0,
                }}
              >
                {deniedMessage}
              </p>
            </div>
          </Html>
        )}
      </group>
    </InteractableSurface>
  );
}

function PrinciplesVaultDoor() {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected("principles");
  const width = 3;
  const height = 6;
  const wallRotation = 0.65;
  const doorOpen = Math.PI * 0.08;
  const labelY = height / 2 + 1.5;

  return (
    <InteractableSurface targetId="principles">
      <group position={[-17, 1, -22]} rotation={[0, wallRotation, 0]}>
        <mesh position={[0, 0, -0.08]} raycast={() => null}>
          <boxGeometry args={[width + 0.4, height + 0.4, 0.2]} />
          <meshBasicMaterial color={C.doorFrame} />
        </mesh>
        <group position={[-width / 2, 0, 0]}>
          <mesh position={[width / 2, 0, 0]} rotation={[0, doorOpen, 0]}>
            <boxGeometry args={[width, height, 0.4]} />
            <meshBasicMaterial color={C.doorPanel} />
          </mesh>
        </group>
        {selected && <SelectionFrame width={width} height={height} position={[0, 0, 0.22]} />}
        <DoorSign
          position={[0, labelY, 0.6]}
          lines={[
            { text: "PRINCIPLES VAULT", fontSize: "9px", letterSpacing: "0.28em" },
            { text: "The Laws of the Institution", color: PARCHMENT, fontSize: "8px", opacity: 0.55 },
          ]}
        />
      </group>
    </InteractableSurface>
  );
}

function MvpRotunda({ mvp }: { mvp: AtriumInteriorMvp | null }) {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected("mvp");
  const name = (mvp?.display_name ?? 'Jason "Beau" Ricart').toUpperCase();
  const ppc = mvp?.ppc_number ?? "PPC-00086";
  const achievement = (mvp?.achievement_notes ?? "Tournament MVP").toUpperCase();
  const eventLine = `${(mvp?.event_name ?? "T1EHL CHAMPIONSHIP").toUpperCase()} · ${mvp?.season_year ?? 2024}`;

  return (
    <InteractableSurface targetId="mvp">
      <group>
        <mesh position={[-3, -1.2, -2.4]}>
          <boxGeometry args={[6.5, 5, 3.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh position={[-3, -2.8, -3]} raycast={() => null}>
          <cylinderGeometry args={[2.8, 3.2, 0.4, 48]} />
          <meshBasicMaterial color={C.plinth} />
        </mesh>
        <mesh position={[-3, -1.5, -3]} raycast={() => null}>
          <cylinderGeometry args={[2, 2.3, 2.5, 48]} />
          <meshBasicMaterial color={C.plinth} />
        </mesh>
        <mesh position={[-3, -0.2, -3]} raycast={() => null}>
          <cylinderGeometry args={[1.8, 1.8, 0.15, 48]} />
          <meshBasicMaterial color={C.bustDisc} />
        </mesh>
        {selected && (
          <SelectionFrame width={5} height={4} position={[-3, -0.8, -2.05]} />
        )}

        <CarvedLabel
          position={[-3, -1, -1.5]}
          distanceFactor={9}
          width={260}
          lines={[
            { text: name, fontSize: "14px", letterSpacing: "0.2em" },
            { text: ppc, color: PARCHMENT, fontSize: "11px", letterSpacing: "0.15em", marginTop: 8 },
            { text: achievement, fontSize: "11px", letterSpacing: "0.15em", marginTop: 8 },
            { text: eventLine, color: PARCHMENT, fontSize: "10px", opacity: 0.65, marginTop: 8 },
          ]}
        />
      </group>
    </InteractableSurface>
  );
}

function StatuePlinth({
  position,
  scale,
  bustColor,
  captainLabel,
  rotateY = 0,
}: {
  position: [number, number, number];
  scale: number;
  bustColor: string;
  captainLabel?: { fontSize: number };
  rotateY?: number;
}) {
  const height = 1.5 * scale;
  const discHeight = 0.08 * scale;
  const bustY = height / 2 + discHeight / 2;

  return (
    <group position={position} rotation={[0, rotateY, 0]}>
      <mesh scale={[scale, scale, scale]}>
        <cylinderGeometry args={[0.5, 0.6, 1.5, 24]} />
        <meshBasicMaterial color={C.statuePlinth} />
      </mesh>
      <mesh position={[0, bustY, 0]} scale={[scale, scale, scale]}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 24]} />
        <meshBasicMaterial color={bustColor} />
      </mesh>
      {captainLabel && (
        <Html position={[0, 1 * scale, 1]} center transform distanceFactor={10}>
          <p
            className="pointer-events-none select-none"
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: `${captainLabel.fontSize}px`,
              margin: 0,
              lineHeight: 1,
            }}
          >
            C
          </p>
        </Html>
      )}
    </group>
  );
}

function ChampionsRow({ champion }: { champion: AtriumInteriorChampion | null }) {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected("champions");
  const player = shortName(champion?.preferred_name);
  const eventName = (champion?.event_name ?? "T1EHL CHAMPIONSHIP 2024").toUpperCase();
  const meta = `${champion?.season_year ?? 2024} · ${(champion?.location ?? "COLUMBUS, OH").toUpperCase()}`;
  const playerLine = `${player} · ${champion?.ppc_number ?? "PPC-00086"}`;

  const statues: Array<{
    pos: [number, number, number];
    scale: number;
    bust: string;
    rotateY: number;
  }> = [
    { pos: [-8, -2.5, -6], scale: 1, bust: C.bustGold, rotateY: 0.3 },
    { pos: [-11, -2.5, -10], scale: 0.85, bust: C.bustGold, rotateY: 0.5 },
    { pos: [-13, -2.5, -14], scale: 0.7, bust: C.bustBronze, rotateY: 0.7 },
    { pos: [-12, -2.5, -18], scale: 0.55, bust: C.bustBronze, rotateY: 0.9 },
  ];

  return (
    <InteractableSurface targetId="champions">
      <group>
        {statues.map((s, i) => (
          <StatuePlinth
            key={i}
            position={s.pos}
            scale={s.scale}
            bustColor={s.bust}
            rotateY={s.rotateY}
          />
        ))}

        <group position={[-24, 2, -8]} rotation={[0, 0.6, 0]}>
          <mesh position={[0, -1, 0]} raycast={() => null}>
            <boxGeometry args={[8, 5, 0.2]} />
            <meshBasicMaterial color={C.plaquePanel} />
          </mesh>
          <mesh position={[0, -1, 0.15]} raycast={() => null}>
            <boxGeometry args={[8.4, 5.4, 0.12]} />
            <meshBasicMaterial color={C.plaqueBorder} />
          </mesh>

          <CarvedLabel
            position={[0, 0, 0.35]}
            distanceFactor={9}
            width={200}
            lines={[
              { text: "CHAMPIONS", fontSize: "11px", letterSpacing: "0.25em" },
              { text: eventName, fontSize: "13px", fontWeight: "bold", marginTop: 10 },
              { text: meta, color: PARCHMENT, fontSize: "10px", opacity: 0.75, marginTop: 8 },
              { text: playerLine, fontSize: "10px", marginTop: 8 },
            ]}
          />
          {selected && (
            <SelectionFrame width={8.4} height={5.4} position={[0, -1, 0.22]} />
          )}
        </group>

        <mesh position={[-12, -2.5, -10]}>
          <boxGeometry args={[14, 3, 18]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </InteractableSurface>
  );
}

function CaptainsRow({ captain }: { captain: AtriumInteriorCaptain | null }) {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected("captains");
  const name = shortName(captain?.preferred_name);
  const org = (captain?.org_name ?? "OHIO AAA").toUpperCase();
  const year = captain?.season_year ?? 2024;
  const jersey = captain?.jersey_number ? ` · #${captain.jersey_number}` : " · #14";

  const statues: Array<{
    pos: [number, number, number];
    scale: number;
    cSize: number;
    rotateY: number;
  }> = [
    { pos: [8, -2.5, -6], scale: 1, cSize: 28, rotateY: -0.3 },
    { pos: [11, -2.5, -10], scale: 0.85, cSize: 24, rotateY: -0.5 },
    { pos: [13, -2.5, -14], scale: 0.7, cSize: 20, rotateY: -0.7 },
  ];

  return (
    <InteractableSurface targetId="captains">
      <group>
        {statues.map((s, i) => (
          <StatuePlinth
            key={i}
            position={s.pos}
            scale={s.scale}
            bustColor={C.bustSilver}
            captainLabel={{ fontSize: s.cSize }}
            rotateY={s.rotateY}
          />
        ))}

        <group position={[24, 2, -8]} rotation={[0, -0.6, 0]}>
          <mesh position={[0, -1, 0]} raycast={() => null}>
            <boxGeometry args={[8, 5, 0.2]} />
            <meshBasicMaterial color={C.plaquePanel} />
          </mesh>
          <mesh position={[0, -1, 0.15]} raycast={() => null}>
            <boxGeometry args={[8.4, 5.4, 0.12]} />
            <meshBasicMaterial color={C.plaqueBorder} />
          </mesh>

          <Html position={[0, 0, 0.35]} center transform distanceFactor={9}>
            <div className="pointer-events-none select-none text-center" style={{ width: 200 }}>
              <p style={{ fontFamily: "Georgia, serif", color: GOLD, fontSize: "11px", letterSpacing: "0.25em", margin: 0 }}>
                CAPTAINS
              </p>
              <p style={{ fontFamily: "Georgia, serif", color: GOLD, fontSize: "36px", margin: "8px 0 0", lineHeight: 1 }}>
                C
              </p>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: PARCHMENT,
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  marginTop: 10,
                  opacity: 0.8,
                }}
              >
                {name} · {org} · {year}
                {jersey}
              </p>
            </div>
          </Html>
          {selected && (
            <SelectionFrame width={8.4} height={5.4} position={[0, -1, 0.22]} />
          )}
        </group>

        <mesh position={[12, -2.5, -10]}>
          <boxGeometry args={[14, 3, 18]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </InteractableSurface>
  );
}

const STEP_SPECS = [
  { y: -3.8, z: 5.5, w: 12 },
  { y: -4.2, z: 4.5, w: 11 },
  { y: -4.6, z: 3.5, w: 10 },
  { y: -5.0, z: 2.5, w: 9 },
  { y: -5.4, z: 1.5, w: 8 },
] as const;

function PlayerWingGrandArch({ deniedMessage }: { deniedMessage?: string | null }) {
  const { isSelected } = useAtriumInteraction();
  const selected = isSelected("playerWing");

  return (
    <InteractableSurface targetId="playerWing">
      <group>
        {/* Arch surround */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[10, 12, 0.6]} />
          <meshBasicMaterial color={C.arch} />
        </mesh>

        {/* Arch top */}
        <mesh position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4, 0.8, 16, 48, Math.PI]} />
          <meshBasicMaterial color={C.arch} />
        </mesh>

        {/* Pilasters */}
        <mesh position={[-6, 1, 0.3]}>
          <boxGeometry args={[1.2, 13, 1]} />
          <meshBasicMaterial color={C.arch} />
        </mesh>
        <mesh position={[6, 1, 0.3]}>
          <boxGeometry args={[1.2, 13, 1]} />
          <meshBasicMaterial color={C.arch} />
        </mesh>

        {/* Door panels */}
        <mesh position={[-2, -1, 0.3]}>
          <boxGeometry args={[3.5, 9, 0.5]} />
          <meshBasicMaterial color={C.doorPanel} />
        </mesh>
        <mesh position={[2, -1, 0.3]}>
          <boxGeometry args={[3.5, 9, 0.5]} />
          <meshBasicMaterial color={C.doorPanel} />
        </mesh>

        {/* Light crack */}
        <mesh position={[0, -1, 0.5]}>
          <boxGeometry args={[0.2, 9, 0.1]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>

        {/* Handles */}
        <mesh position={[-0.8, -1, 0.6]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 1.5, 12]} />
          <meshBasicMaterial color={C.bustDisc} />
        </mesh>
        <mesh position={[0.8, -1, 0.6]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 1.5, 12]} />
          <meshBasicMaterial color={C.bustDisc} />
        </mesh>

        {selected && (
          <SelectionFrame width={10} height={12} position={[0, 1, 0.35]} />
        )}

        {/* Descending steps toward camera */}
        {STEP_SPECS.map((step, i) => (
          <group key={i} position={[0, step.y, step.z]}>
            <mesh>
              <boxGeometry args={[step.w, 0.4, 1.5]} />
              <meshBasicMaterial color={C.step} />
            </mesh>
            <mesh position={[0, 0, 0.76]} raycast={() => null}>
              <boxGeometry args={[step.w, 0.42, 0.08]} />
              <meshBasicMaterial color={C.stepEdge} />
            </mesh>
          </group>
        ))}

        {/* Tunnel behind doors */}
        <mesh position={[-3.5, 0, -4]} raycast={() => null}>
          <boxGeometry args={[0.3, 10, 8]} />
          <meshBasicMaterial color={C.tunnelWall} />
        </mesh>
        <mesh position={[3.5, 0, -4]} raycast={() => null}>
          <boxGeometry args={[0.3, 10, 8]} />
          <meshBasicMaterial color={C.tunnelWall} />
        </mesh>
        <mesh position={[0, 5, -4]} raycast={() => null}>
          <boxGeometry args={[7, 0.3, 8]} />
          <meshBasicMaterial color={C.ceiling} />
        </mesh>
        <mesh position={[0, -4, -4]} raycast={() => null}>
          <boxGeometry args={[7, 0.3, 8]} />
          <meshBasicMaterial color="#1E1610" />
        </mesh>

        {/* Sconces */}
        <Html position={[-3, 1, -2]} center transform distanceFactor={8}>
          <div
            className="pointer-events-none"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "radial-gradient(circle, #E8C84A 0%, #B8972A 55%, transparent 100%)",
              boxShadow: "0 0 16px rgba(212, 169, 42, 0.8)",
            }}
          />
        </Html>
        <Html position={[3, 1, -2]} center transform distanceFactor={8}>
          <div
            className="pointer-events-none"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "radial-gradient(circle, #E8C84A 0%, #B8972A 55%, transparent 100%)",
              boxShadow: "0 0 16px rgba(212, 169, 42, 0.8)",
            }}
          />
        </Html>

        <CarvedLabel
          position={[0, 8, 0.6]}
          distanceFactor={10}
          width={320}
          lines={[
            { text: "THE PLAYER WING", fontSize: "18px", letterSpacing: "0.3em" },
            { text: "PERSONAL PLAYER COLLECTION", color: PARCHMENT, fontSize: "10px", letterSpacing: "0.2em", opacity: 0.75, marginTop: 10 },
          ]}
        />

        {deniedMessage && (
          <Html position={[0, 2, 0.6]} center transform distanceFactor={9}>
            <div
              className="pointer-events-none select-none text-center"
              style={{
                padding: "10px 14px",
                background: "rgba(10, 9, 8, 0.9)",
                border: "1px solid rgba(184, 151, 42, 0.4)",
              }}
            >
              <p style={{ fontFamily: "Georgia, serif", color: GOLD, fontSize: "10px", letterSpacing: "0.28em", margin: 0 }}>
                {deniedMessage}
              </p>
            </div>
          </Html>
        )}
      </group>
    </InteractableSurface>
  );
}

function InteriorScene({
  mvp,
  champions,
  captains,
  doorMessages,
  selectedId,
}: {
  mvp: AtriumInteriorMvp | null;
  champions: AtriumInteriorChampion[];
  captains: AtriumInteriorCaptain[];
  doorMessages: {
    institutions: string | null;
    collector: string | null;
    authority: string | null;
    playerWing: string | null;
  };
  selectedId: AtriumTargetId | null;
}) {
  return (
    <group>
      <WalkFloor />

      {/* Circular floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} raycast={() => null}>
        <circleGeometry args={[28, 64]} />
        <meshBasicMaterial color="#1E1610" />
      </mesh>

      {/* Curved wall — open cylinder, inside visible via BackSide */}
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[28, 28, 18, 64, 1, true]} />
        <meshBasicMaterial color="#2A1E10" side={THREE.BackSide} />
      </mesh>

      {/* Ceiling disc */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 14, 0]}>
        <circleGeometry args={[28, 64]} />
        <meshBasicMaterial color="#0A0806" />
      </mesh>

      {/* Ceiling oculus */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 13.9, 0]}>
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial color="#050403" />
      </mesh>

      {/* Entry corridor — frames camera approach */}
      <mesh position={[-4, 2, 18]}>
        <boxGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <mesh position={[4, 2, 18]}>
        <boxGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>

      <MvpRotunda mvp={mvp} />
      <ChampionsRow champion={champions[0] ?? null} />
      <CaptainsRow captain={captains[0] ?? null} />

      {selectedId && <SelectionLabel targetId={selectedId} />}

      {/* Principles Vault — cracked open with warm light behind */}
      <pointLight color="#D4A832" intensity={6} position={[-17, 2, -21.5]} />
      <mesh position={[-17, 2, -21.2]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#D4A832" transparent opacity={0.35} />
      </mesh>

      {/* Door 1 — Principles Vault (far left rear) */}
      <PrinciplesVaultDoor />

      {/* Door 2 — Institutions (left of center rear) */}
      <StandardDoor
        targetId="institutions"
        position={[-9, 1, -26]}
        rotationY={0.35}
        width={4}
        height={7}
        frameColor={C.doorFrame}
        panelColor={C.doorPanel}
        labelLines={[
          { text: "INSTITUTIONS", fontSize: "10px", letterSpacing: "0.28em" },
          { text: "GOV · ORG · EVT", color: PARCHMENT, fontSize: "8px", opacity: 0.55 },
        ]}
        deniedMessage={doorMessages.institutions}
      />

      {/* Door 3 — Player Wing grand arch (dead center rear) */}
      <group position={[0, 1, -27.5]}>
        <PlayerWingGrandArch deniedMessage={doorMessages.playerWing} />
      </group>

      {/* Door 4 — Collector Wing (right of center rear) */}
      <StandardDoor
        targetId="collector"
        position={[9, 1, -26]}
        rotationY={-0.35}
        width={4}
        height={7}
        frameColor={C.doorFrame}
        panelColor={C.doorPanel}
        labelLines={[
          { text: "COLLECTOR WING", fontSize: "10px", letterSpacing: "0.28em" },
          { text: "VAULT REGISTRY COLLECTION", color: PARCHMENT, fontSize: "8px", opacity: 0.55 },
        ]}
        deniedMessage={doorMessages.collector}
      />

      {/* Door 5 — Authority Chamber (far right rear) */}
      <StandardDoor
        targetId="authority"
        position={[17, 1, -22]}
        rotationY={-0.65}
        width={3}
        height={6}
        frameColor={C.doorFrame}
        panelColor={C.doorPanel}
        labelLines={[
          { text: "AUTHORITY CHAMBER", color: GOLD_DIM, fontSize: "9px", letterSpacing: "0.28em", opacity: 0.85 },
          { text: "Authorized Personnel Only", color: PARCHMENT, fontSize: "8px", opacity: 0.35 },
        ]}
        deniedMessage={doorMessages.authority}
      />
    </group>
  );
}

function AtriumExperience({
  mvp,
  champions,
  captains,
  doorMessages,
  lookAtRef,
  baseLookAtRef,
  isMovingRef,
  isAnimatingRef,
  mouseRef,
  cameraResetNonceRef,
  selectedId,
  setSelectedId,
  onCameraReady,
  onWalkTo,
  onCommitTarget,
}: {
  mvp: AtriumInteriorMvp | null;
  champions: AtriumInteriorChampion[];
  captains: AtriumInteriorCaptain[];
  doorMessages: {
    institutions: string | null;
    collector: string | null;
    authority: string | null;
    playerWing: string | null;
  };
  lookAtRef: React.MutableRefObject<THREE.Vector3>;
  baseLookAtRef: React.MutableRefObject<THREE.Vector3>;
  isMovingRef: React.MutableRefObject<boolean>;
  isAnimatingRef: React.MutableRefObject<boolean>;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  cameraResetNonceRef: React.MutableRefObject<number>;
  selectedId: AtriumTargetId | null;
  setSelectedId: (id: AtriumTargetId | null) => void;
  onCameraReady: (camera: THREE.PerspectiveCamera) => void;
  onWalkTo: (point: THREE.Vector3) => void;
  onCommitTarget: (id: AtriumTargetId) => void;
}) {
  const interactionValue = useMemo<AtriumInteractionContextValue>(
    () => ({
      selectedId,
      selectTarget: setSelectedId,
      commitTarget: onCommitTarget,
      walkTo: onWalkTo,
      isSelected: (id) => selectedId === id,
    }),
    [selectedId, setSelectedId, onCommitTarget, onWalkTo],
  );

  return (
    <AtriumInteractionContext.Provider value={interactionValue}>
      <AtriumCameraRig
        lookAtRef={lookAtRef}
        baseLookAtRef={baseLookAtRef}
        isMovingRef={isMovingRef}
        isAnimatingRef={isAnimatingRef}
        mouseRef={mouseRef}
        cameraResetNonceRef={cameraResetNonceRef}
        onReady={onCameraReady}
      />
      <SceneCleanup />
      <InteriorScene
        mvp={mvp}
        champions={champions}
        captains={captains}
        doorMessages={doorMessages}
        selectedId={selectedId}
      />
    </AtriumInteractionContext.Provider>
  );
}

export function AtriumInterior({
  mvp,
  champions,
  captains,
}: AtriumInteriorProps) {
  const router = useRouter();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lookAtRef = useRef(DEFAULT_LOOK_AT.clone());
  const baseLookAtRef = useRef(DEFAULT_LOOK_AT.clone());
  const isMovingRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraResetNonceRef = useRef(0);
  const moveTweenRef = useRef<gsap.core.Tween | null>(null);
  const lookTweenRef = useRef<gsap.core.Tween | null>(null);
  const hasEnteredRef = useRef(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [selectedId, setSelectedId] = useState<AtriumTargetId | null>(null);
  const [doorMessages, setDoorMessages] = useState({
    institutions: null as string | null,
    collector: null as string | null,
    authority: null as string | null,
    playerWing: null as string | null,
  });

  const flashDoorMessage = useCallback(
    (key: keyof typeof doorMessages, message: string, ms = 2500) => {
      setDoorMessages((prev) => ({ ...prev, [key]: message }));
      window.setTimeout(() => {
        setDoorMessages((prev) => ({ ...prev, [key]: null }));
      }, ms);
    },
    [],
  );

  const animateCamera = useCallback(
    (
      pos: THREE.Vector3,
      look: THREE.Vector3,
      duration = 1.5,
      onComplete?: () => void,
    ) => {
      const camera = cameraRef.current;
      if (!camera) return;

      isAnimatingRef.current = true;
      moveTweenRef.current?.kill();
      lookTweenRef.current?.kill();

      moveTweenRef.current = gsap.to(camera.position, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration,
        ease: GSAP_EASE,
        onComplete: () => {
          isAnimatingRef.current = false;
          onComplete?.();
        },
      });
      lookTweenRef.current = gsap.to(baseLookAtRef.current, {
        x: look.x,
        y: look.y,
        z: look.z,
        duration,
        ease: GSAP_EASE,
        onUpdate: () => {
          lookAtRef.current.copy(baseLookAtRef.current);
        },
      });
    },
    [],
  );

  const resetCamera = useCallback(() => {
    setSelectedId(null);
    setOverlayOpacity(0);

    moveTweenRef.current?.kill();
    lookTweenRef.current?.kill();

    const camera = cameraRef.current;
    if (camera) {
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(baseLookAtRef.current);

      camera.position.copy(DEFAULT_CAMERA_POS);
      lookAtRef.current.copy(DEFAULT_LOOK_AT);
      baseLookAtRef.current.copy(DEFAULT_LOOK_AT);
      camera.lookAt(lookAtRef.current);
    }

    isMovingRef.current = false;
    isAnimatingRef.current = false;
    cameraResetNonceRef.current += 1;
  }, []);

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera;
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;

    camera.position.copy(ENTRY_START_POS);
    lookAtRef.current.copy(DEFAULT_LOOK_AT);
    baseLookAtRef.current.copy(DEFAULT_LOOK_AT);
    camera.lookAt(lookAtRef.current);

    gsap.to(camera.position, {
      z: DEFAULT_CAMERA_POS.z,
      duration: 2.5,
      ease: GSAP_EASE,
    });
  }, []);

  const walkTo = useCallback((point: THREE.Vector3) => {
    const camera = cameraRef.current;
    if (!camera || isMovingRef.current || isAnimatingRef.current) return;

    setSelectedId(null);
    const dx = point.x - camera.position.x;
    const dz = point.z - camera.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.05) return;

    const scale = Math.min(1, MAX_WALK_DISTANCE / dist);
    const targetX = camera.position.x + dx * scale;
    const targetZ = Math.max(camera.position.z + dz * scale, MAX_CAMERA_Z);

    isMovingRef.current = true;
    moveTweenRef.current?.kill();

    moveTweenRef.current = gsap.to(camera.position, {
      x: targetX,
      y: CAM_Y,
      z: targetZ,
      duration: 0.9,
      ease: GSAP_EASE,
      onUpdate: () => {
        if (camera.position.z < MAX_CAMERA_Z) {
          camera.position.z = MAX_CAMERA_Z;
        }
      },
      onComplete: () => {
        if (camera.position.z < MAX_CAMERA_Z) {
          camera.position.z = MAX_CAMERA_Z;
        }
        isMovingRef.current = false;
      },
    });
  }, []);

  const focusChampions = useCallback(() => {
    animateCamera(new THREE.Vector3(-12, CAM_Y, -6), new THREE.Vector3(-16, 1, -8));
  }, [animateCamera]);

  const focusMvp = useCallback(() => {
    animateCamera(new THREE.Vector3(-4.5, 2.5, 11), new THREE.Vector3(-3, -0.5, -3));
  }, [animateCamera]);

  const focusCaptains = useCallback(() => {
    animateCamera(new THREE.Vector3(12, CAM_Y, -6), new THREE.Vector3(16, 1, -8));
  }, [animateCamera]);

  const enterPlayerWing = useCallback(() => {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    const overlay = { opacity: 0 };
    moveTweenRef.current?.kill();
    lookTweenRef.current?.kill();

    gsap.to(cameraRef.current!.position, {
      x: 0,
      y: 0,
      z: -18,
      duration: 2,
      ease: GSAP_EASE,
    });
    gsap.to(baseLookAtRef.current, {
      x: 0,
      y: 1,
      z: -22,
      duration: 2,
      ease: GSAP_EASE,
      onUpdate: () => {
        lookAtRef.current.copy(baseLookAtRef.current);
      },
    });
    gsap.to(overlay, {
      opacity: 1,
      duration: 2,
      ease: GSAP_EASE,
      onUpdate: () => setOverlayOpacity(overlay.opacity),
      onComplete: () => {
        isAnimatingRef.current = false;
        router.push("/vault/player-wing");
      },
    });
  }, [router]);

  const handlePrinciplesDoor = useCallback(() => {
    router.push("/vault/principles");
  }, [router]);

  const handleInstitutionsDoor = useCallback(() => {
    router.push("/vault/institutions");
  }, [router]);

  const handleCollectorDoor = useCallback(() => {
    router.push("/vault/vrc");
  }, [router]);

  const handleAuthorityDoor = useCallback(() => {
    router.push("/vault/authority");
  }, [router]);

  const commitTarget = useCallback(
    (id: AtriumTargetId) => {
      setSelectedId(id);
      switch (id) {
        case "principles":
          handlePrinciplesDoor();
          break;
        case "institutions":
          handleInstitutionsDoor();
          break;
        case "playerWing":
          enterPlayerWing();
          break;
        case "collector":
          handleCollectorDoor();
          break;
        case "authority":
          handleAuthorityDoor();
          break;
        case "mvp":
          focusMvp();
          break;
        case "champions":
          focusChampions();
          break;
        case "captains":
          focusCaptains();
          break;
      }
    },
    [
      enterPlayerWing,
      focusCaptains,
      focusChampions,
      focusMvp,
      handleAuthorityDoor,
      handleCollectorDoor,
      handleInstitutionsDoor,
      handlePrinciplesDoor,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      resetCamera();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [resetCamera]);

  return (
    <div className="relative h-screen w-screen bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />
      <Canvas
        style={{ width: "100vw", height: "100vh", cursor: "grab" }}
        camera={{ position: [0, 1, 20], fov: 60, near: 0.1, far: 200 }}
        onCreated={({ gl }) => () => gl.dispose()}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#1A1208"]} />
        <fog attach="fog" args={["#1A1208", 55, 100]} />

        <AtriumExperience
          mvp={mvp}
          champions={champions}
          captains={captains}
          doorMessages={doorMessages}
          lookAtRef={lookAtRef}
          baseLookAtRef={baseLookAtRef}
          isMovingRef={isMovingRef}
          isAnimatingRef={isAnimatingRef}
          mouseRef={mouseRef}
          cameraResetNonceRef={cameraResetNonceRef}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onCameraReady={handleCameraReady}
          onWalkTo={walkTo}
          onCommitTarget={commitTarget}
        />
      </Canvas>
    </div>
  );
}
