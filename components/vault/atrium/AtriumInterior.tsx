"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 2, 16);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 1, 0);
const ENTRY_START_POS = new THREE.Vector3(0, 2, 22);

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

function CameraRig({
  lookAtRef,
  onReady,
}: {
  lookAtRef: React.MutableRefObject<THREE.Vector3>;
  onReady: (camera: THREE.PerspectiveCamera) => void;
}) {
  const { camera } = useThree();
  useEffect(() => {
    onReady(camera as THREE.PerspectiveCamera);
  }, [camera, onReady]);
  useFrame(() => {
    camera.lookAt(lookAtRef.current);
  });
  return null;
}

function ClickPlane({
  position,
  size,
  onClick,
}: {
  position: [number, number, number];
  size: [number, number];
  onClick: () => void;
}) {
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <planeGeometry args={size} />
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
  position,
  rotationY = 0,
  width,
  height,
  frameColor,
  panelColor,
  labelLines,
  deniedMessage,
  onClick,
}: {
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  frameColor: string;
  panelColor: string;
  labelLines: Array<{ text: string; color?: string; fontSize?: string; letterSpacing?: string; opacity?: number }>;
  deniedMessage?: string | null;
  onClick: () => void;
}) {
  const labelY = height / 2 + 1.5;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[width + 0.4, height + 0.4, 0.2]} />
        <meshBasicMaterial color={frameColor} />
      </mesh>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[width, height, 0.4]} />
        <meshBasicMaterial color={panelColor} />
      </mesh>
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
  );
}

function PrinciplesVaultDoor({ onClick }: { onClick: () => void }) {
  const width = 3;
  const height = 6;
  const wallRotation = 0.65;
  const doorOpen = Math.PI * 0.08;
  const labelY = height / 2 + 1.5;

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={[-17, 1, -22]} rotation={[0, wallRotation, 0]}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[width + 0.4, height + 0.4, 0.2]} />
        <meshBasicMaterial color={C.doorFrame} />
      </mesh>
      <group position={[-width / 2, 0, 0]}>
        <mesh position={[width / 2, 0, 0]} rotation={[0, doorOpen, 0]} onClick={handleClick}>
          <boxGeometry args={[width, height, 0.4]} />
          <meshBasicMaterial color={C.doorPanel} />
        </mesh>
      </group>
      <DoorSign
        position={[0, labelY, 0.6]}
        lines={[
          { text: "PRINCIPLES VAULT", fontSize: "9px", letterSpacing: "0.28em" },
          { text: "The Laws of the Institution", color: PARCHMENT, fontSize: "8px", opacity: 0.55 },
        ]}
      />
    </group>
  );
}

function MvpRotunda({
  mvp,
  onFocus,
}: {
  mvp: AtriumInteriorMvp | null;
  onFocus: () => void;
}) {
  const name = (mvp?.display_name ?? 'Jason "Beau" Ricart').toUpperCase();
  const ppc = mvp?.ppc_number ?? "PPC-00086";
  const achievement = (mvp?.achievement_notes ?? "Tournament MVP").toUpperCase();
  const eventLine = `${(mvp?.event_name ?? "T1EHL CHAMPIONSHIP").toUpperCase()} · ${mvp?.season_year ?? 2024}`;

  return (
    <group>
      <mesh position={[-3, -2.8, -3]}>
        <cylinderGeometry args={[2.8, 3.2, 0.4, 48]} />
        <meshBasicMaterial color={C.plinth} />
      </mesh>
      <mesh position={[-3, -1.5, -3]}>
        <cylinderGeometry args={[2, 2.3, 2.5, 48]} />
        <meshBasicMaterial color={C.plinth} />
      </mesh>
      <mesh position={[-3, -0.2, -3]}>
        <cylinderGeometry args={[1.8, 1.8, 0.15, 48]} />
        <meshBasicMaterial color={C.bustDisc} />
      </mesh>

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

      <ClickPlane position={[-3, -2.9, -3]} size={[8, 8]} onClick={onFocus} />
    </group>
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

function ChampionsRow({
  champion,
  onFocus,
}: {
  champion: AtriumInteriorChampion | null;
  onFocus: () => void;
}) {
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
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[8, 5, 0.2]} />
          <meshBasicMaterial color={C.plaquePanel} />
        </mesh>
        <mesh position={[0, -1, 0.15]}>
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
      </group>

      <ClickPlane position={[-12, -2.9, -10]} size={[14, 18]} onClick={onFocus} />
    </group>
  );
}

function CaptainsRow({
  captain,
  onFocus,
}: {
  captain: AtriumInteriorCaptain | null;
  onFocus: () => void;
}) {
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
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[8, 5, 0.2]} />
          <meshBasicMaterial color={C.plaquePanel} />
        </mesh>
        <mesh position={[0, -1, 0.15]}>
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
      </group>

      <ClickPlane position={[12, -2.9, -10]} size={[14, 18]} onClick={onFocus} />
    </group>
  );
}

const STEP_SPECS = [
  { y: -3.8, z: 5.5, w: 12 },
  { y: -4.2, z: 4.5, w: 11 },
  { y: -4.6, z: 3.5, w: 10 },
  { y: -5.0, z: 2.5, w: 9 },
  { y: -5.4, z: 1.5, w: 8 },
] as const;

function PlayerWingGrandArch({
  onEnter,
  deniedMessage,
}: {
  onEnter: () => void;
  deniedMessage?: string | null;
}) {
  const handleEnter = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    onEnter();
  };

  return (
    <group>
      {/* Arch surround */}
      <mesh position={[0, 1, 0]} onClick={handleEnter}>
        <boxGeometry args={[10, 12, 0.6]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>

      {/* Arch top */}
      <mesh position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={handleEnter}>
        <torusGeometry args={[4, 0.8, 16, 48, Math.PI]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>

      {/* Pilasters */}
      <mesh position={[-6, 1, 0.3]} onClick={handleEnter}>
        <boxGeometry args={[1.2, 13, 1]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[6, 1, 0.3]} onClick={handleEnter}>
        <boxGeometry args={[1.2, 13, 1]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>

      {/* Door panels */}
      <mesh position={[-2, -1, 0.3]} onClick={handleEnter}>
        <boxGeometry args={[3.5, 9, 0.5]} />
        <meshBasicMaterial color={C.doorPanel} />
      </mesh>
      <mesh position={[2, -1, 0.3]} onClick={handleEnter}>
        <boxGeometry args={[3.5, 9, 0.5]} />
        <meshBasicMaterial color={C.doorPanel} />
      </mesh>

      {/* Light crack */}
      <mesh position={[0, -1, 0.5]} onClick={handleEnter}>
        <boxGeometry args={[0.2, 9, 0.1]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>

      {/* Handles */}
      <mesh position={[-0.8, -1, 0.6]} rotation={[0, 0, Math.PI / 2]} onClick={handleEnter}>
        <cylinderGeometry args={[0.15, 0.15, 1.5, 12]} />
        <meshBasicMaterial color={C.bustDisc} />
      </mesh>
      <mesh position={[0.8, -1, 0.6]} rotation={[0, 0, Math.PI / 2]} onClick={handleEnter}>
        <cylinderGeometry args={[0.15, 0.15, 1.5, 12]} />
        <meshBasicMaterial color={C.bustDisc} />
      </mesh>

      {/* Descending steps toward camera */}
      {STEP_SPECS.map((step, i) => (
        <group key={i} position={[0, step.y, step.z]}>
          <mesh onClick={handleEnter}>
            <boxGeometry args={[step.w, 0.4, 1.5]} />
            <meshBasicMaterial color={C.step} />
          </mesh>
          <mesh position={[0, 0, 0.76]}>
            <boxGeometry args={[step.w, 0.42, 0.08]} />
            <meshBasicMaterial color={C.stepEdge} />
          </mesh>
        </group>
      ))}

      {/* Tunnel behind doors */}
      <mesh position={[-3.5, 0, -4]}>
        <boxGeometry args={[0.3, 10, 8]} />
        <meshBasicMaterial color={C.tunnelWall} />
      </mesh>
      <mesh position={[3.5, 0, -4]}>
        <boxGeometry args={[0.3, 10, 8]} />
        <meshBasicMaterial color={C.tunnelWall} />
      </mesh>
      <mesh position={[0, 5, -4]}>
        <boxGeometry args={[7, 0.3, 8]} />
        <meshBasicMaterial color={C.ceiling} />
      </mesh>
      <mesh position={[0, -4, -4]}>
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
  );
}

function InteriorScene({
  mvp,
  champions,
  captains,
  doorMessages,
  onFocusChampions,
  onFocusMvp,
  onFocusCaptains,
  onResetCamera,
  onPlayerWingEnter,
  onPrinciplesDoor,
  onInstitutionsDoor,
  onCollectorDoor,
  onAuthorityDoor,
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
  onFocusChampions: () => void;
  onFocusMvp: () => void;
  onFocusCaptains: () => void;
  onResetCamera: () => void;
  onPlayerWingEnter: () => void;
  onPrinciplesDoor: () => void;
  onInstitutionsDoor: () => void;
  onCollectorDoor: () => void;
  onAuthorityDoor: () => void;
}) {
  return (
    <group>
      {/* Circular floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} onClick={onResetCamera}>
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

      <MvpRotunda mvp={mvp} onFocus={onFocusMvp} />
      <ChampionsRow champion={champions[0] ?? null} onFocus={onFocusChampions} />
      <CaptainsRow captain={captains[0] ?? null} onFocus={onFocusCaptains} />

      {/* Principles Vault — cracked open with warm light behind */}
      <pointLight color="#D4A832" intensity={6} position={[-17, 2, -21.5]} />
      <mesh position={[-17, 2, -21.2]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#D4A832" transparent opacity={0.35} />
      </mesh>

      {/* Door 1 — Principles Vault (far left rear) */}
      <PrinciplesVaultDoor onClick={onPrinciplesDoor} />

      {/* Door 2 — Institutions (left of center rear) */}
      <StandardDoor
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
        onClick={onInstitutionsDoor}
      />

      {/* Door 3 — Player Wing grand arch (dead center rear) */}
      <group position={[0, 1, -27.5]}>
        <PlayerWingGrandArch onEnter={onPlayerWingEnter} deniedMessage={doorMessages.playerWing} />
      </group>

      {/* Door 4 — Collector Wing (right of center rear) */}
      <StandardDoor
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
        onClick={onCollectorDoor}
      />

      {/* Door 5 — Authority Chamber (far right rear) */}
      <StandardDoor
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
        onClick={onAuthorityDoor}
      />
    </group>
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
  const isAnimatingRef = useRef(false);
  const hasEnteredRef = useRef(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
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
      gsap.to(camera.position, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration,
        ease: "power2.inOut",
        onComplete: () => {
          isAnimatingRef.current = false;
          onComplete?.();
        },
      });
      gsap.to(lookAtRef.current, {
        x: look.x,
        y: look.y,
        z: look.z,
        duration,
        ease: "power2.inOut",
      });
    },
    [],
  );

  const resetCamera = useCallback(() => {
    if (isAnimatingRef.current) return;
    animateCamera(DEFAULT_CAMERA_POS.clone(), DEFAULT_LOOK_AT.clone());
  }, [animateCamera]);

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera;
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;

    camera.position.copy(ENTRY_START_POS);
    lookAtRef.current.copy(DEFAULT_LOOK_AT);
    camera.lookAt(lookAtRef.current);

    gsap.to(camera.position, {
      z: DEFAULT_CAMERA_POS.z,
      duration: 2.5,
      ease: "power2.out",
    });
  }, []);

  const focusChampions = useCallback(() => {
    animateCamera(new THREE.Vector3(-12, 2, -6), new THREE.Vector3(-16, 1, -8));
  }, [animateCamera]);

  const focusMvp = useCallback(() => {
    animateCamera(new THREE.Vector3(-3, 3, 0), new THREE.Vector3(-3, 0, -3));
  }, [animateCamera]);

  const focusCaptains = useCallback(() => {
    animateCamera(new THREE.Vector3(12, 2, -6), new THREE.Vector3(16, 1, -8));
  }, [animateCamera]);

  const enterPlayerWing = useCallback(() => {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    const overlay = { opacity: 0 };

    gsap.to(cameraRef.current!.position, {
      x: 0,
      y: 0,
      z: -18,
      duration: 2,
      ease: "power2.inOut",
    });
    gsap.to(lookAtRef.current, {
      x: 0,
      y: 1,
      z: -22,
      duration: 2,
      ease: "power2.inOut",
    });
    gsap.to(overlay, {
      opacity: 1,
      duration: 2,
      ease: "power2.inOut",
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetCamera();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetCamera]);

  return (
    <div className="relative h-screen w-screen bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, 1, 20], fov: 60, near: 0.1, far: 200 }}
        onCreated={({ gl }) => () => gl.dispose()}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#1A1208"]} />
        <fog attach="fog" args={["#1A1208", 55, 100]} />

        <CameraRig lookAtRef={lookAtRef} onReady={handleCameraReady} />
        <SceneCleanup />

        <InteriorScene
          mvp={mvp}
          champions={champions}
          captains={captains}
          doorMessages={doorMessages}
          onFocusChampions={focusChampions}
          onFocusMvp={focusMvp}
          onFocusCaptains={focusCaptains}
          onResetCamera={resetCamera}
          onPlayerWingEnter={enterPlayerWing}
          onPrinciplesDoor={handlePrinciplesDoor}
          onInstitutionsDoor={handleInstitutionsDoor}
          onCollectorDoor={handleCollectorDoor}
          onAuthorityDoor={handleAuthorityDoor}
        />
      </Canvas>
    </div>
  );
}
