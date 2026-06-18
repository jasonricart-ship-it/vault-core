"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type {
  PlayerWingAchievement,
  PlayerWingGumItem,
  PlayerWingPlayer,
} from "@/lib/player-wing";

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";
const BG = "#0A0908";

const CAMERA_POS = new THREE.Vector3(0, 2, 14);
const LOOK_AT = new THREE.Vector3(0, 0, 0);

const RICART_PLINTHS: Record<string, [number, number, number]> = {
  brady: [-4, -2.1, 6],
  beau: [5, -2.1, -2],
  ava: [0, -2.1, -8],
};

const REAR_SCATTER_SLOTS: Array<[number, number, number]> = [
  [-8, -2.1, -10],
  [8, -2.1, -10],
];

const STEP_SPECS = [
  { y: -0.4, z: 14 },
  { y: -0.8, z: 13 },
  { y: -1.2, z: 12 },
  { y: -1.6, z: 11 },
  { y: -2.0, z: 10 },
] as const;

const ACHIEVEMENT_WALL = [
  { angle: 2.4, y: 2 },
  { angle: Math.PI, y: 2 },
  { angle: 3.8, y: 2 },
] as const;

const GUM_WALL = [
  { angle: -0.7, y: 0 },
  { angle: -Math.PI / 2, y: 0 },
  { angle: -2.4, y: 0 },
] as const;

const CORRIDOR_ARCHES = [
  { x: -6, z: -32 },
  { x: 0, z: -34 },
  { x: 6, z: -32 },
] as const;

const HTML_LABEL = {
  fontSize: "10px",
  maxWidth: "120px",
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

function formatAchievementType(type: string) {
  return type.replace(/_/g, " ").toUpperCase();
}

function displayName(player: { preferred_name: string | null; first_name: string }) {
  return (player.preferred_name ?? player.first_name).toUpperCase();
}

function plinthKey(player: PlayerWingPlayer): string {
  return (player.preferred_name ?? player.first_name).toLowerCase();
}

function layoutPlinths(
  players: PlayerWingPlayer[],
): Array<{ player: PlayerWingPlayer; position: [number, number, number] }> {
  const placed = new Set<string>();
  const result: Array<{ player: PlayerWingPlayer; position: [number, number, number] }> = [];

  for (const player of players) {
    const slot = RICART_PLINTHS[plinthKey(player)];
    if (slot) {
      result.push({ player, position: slot });
      placed.add(player.ppc_number);
    }
  }

  let scatterIdx = 0;
  for (const player of players) {
    if (placed.has(player.ppc_number)) continue;
    const slot = REAR_SCATTER_SLOTS[scatterIdx];
    if (!slot) break;
    result.push({ player, position: slot });
    placed.add(player.ppc_number);
    scatterIdx += 1;
  }

  return result;
}

function wallPosition(radius: number, angle: number, y: number): [number, number, number] {
  return [radius * Math.sin(angle), y, radius * Math.cos(angle)];
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
    camera.position.copy(CAMERA_POS);
    lookAtRef.current.copy(LOOK_AT);
    camera.lookAt(lookAtRef.current);
  }, [camera, lookAtRef, onReady]);

  useFrame(() => {
    camera.lookAt(lookAtRef.current);
  });

  return null;
}

const DEFAULT_PLINTH = { radiusTop: 0.9, radiusBottom: 1.1, height: 2.5 } as const;
const BRADY_PLINTH = { radiusTop: 0.7, radiusBottom: 0.85, height: 2.0 } as const;

function lightenColor(hex: string, amount = 0.18): string {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r + amount);
  c.g = Math.min(1, c.g + amount);
  c.b = Math.min(1, c.b + amount);
  return `#${c.getHexString()}`;
}

function PlayerPlinth({
  position,
  color,
  name,
  ppcNumber,
  vaultLevel,
  geometry = DEFAULT_PLINTH,
  onEnter,
}: {
  position: [number, number, number];
  color: string;
  name: string;
  ppcNumber: string;
  vaultLevel: string;
  geometry?: { radiusTop: number; radiusBottom: number; height: number };
  onEnter: () => void;
}) {
  const { gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const bustY = geometry.height / 2 + 0.05;
  const bustRadius = geometry.radiusTop * (0.8 / 0.9);
  const labelY = geometry.height / 2 + 0.95;
  const displayColor = hovered ? lightenColor(color) : color;
  const labelBright = hovered ? 1 : 0.85;
  const tierBright = hovered ? 0.95 : 0.75;

  const handlePointerOver = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    gl.domElement.style.cursor = "pointer";
  };

  const handlePointerOut = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    gl.domElement.style.cursor = "default";
  };

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    onEnter();
  };

  const meshHandlers = {
    onPointerOver: handlePointerOver,
    onPointerOut: handlePointerOut,
    onClick: handleClick,
  };

  return (
    <group position={position}>
      <mesh {...meshHandlers}>
        <cylinderGeometry
          args={[geometry.radiusTop * 1.2, geometry.radiusBottom * 1.2, geometry.height + 0.2, 24]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <cylinderGeometry args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, 24]} />
        <meshBasicMaterial color={displayColor} />
      </mesh>
      <mesh position={[0, bustY, 0]} raycast={() => null}>
        <cylinderGeometry args={[bustRadius, bustRadius, 0.1, 24]} />
        <meshBasicMaterial color={displayColor} />
      </mesh>
      <Html position={[0, labelY, 0]} center transform={false}>
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
          onMouseEnter={() => {
            setHovered(true);
            gl.domElement.style.cursor = "pointer";
          }}
          onMouseLeave={() => {
            setHovered(false);
            gl.domElement.style.cursor = "default";
          }}
          style={{
            ...HTML_LABEL,
            pointerEvents: "auto",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.92,
          }}
        >
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: "1em",
              letterSpacing: "0.15em",
              margin: 0,
              lineHeight: 1.2,
              opacity: labelBright,
            }}
          >
            {name}
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: PARCHMENT,
              fontSize: "0.9em",
              letterSpacing: "0.1em",
              margin: "4px 0 0",
              opacity: labelBright,
              lineHeight: 1.2,
            }}
          >
            {ppcNumber}
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: "0.9em",
              letterSpacing: "0.12em",
              margin: "3px 0 0",
              textTransform: "uppercase",
              opacity: tierBright,
              lineHeight: 1.2,
            }}
          >
            {vaultLevel}
          </p>
          {hovered && (
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: "#B8972A99",
                fontSize: "7px",
                letterSpacing: "0.14em",
                margin: "6px 0 0",
                lineHeight: 1.2,
              }}
            >
              → Enter Corridor
            </p>
          )}
        </div>
      </Html>
    </group>
  );
}

function AchievementPlaque({
  position,
  rotationY,
  achievement,
}: {
  position: [number, number, number];
  rotationY: number;
  achievement: PlayerWingAchievement;
}) {
  const playerLine = `${displayName(achievement)} · ${achievement.ppc_number}`;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[4.2, 3.2, 0.12]} />
        <meshBasicMaterial color={GOLD} />
      </mesh>
      <mesh>
        <boxGeometry args={[4, 3, 0.2]} />
        <meshBasicMaterial color="#2A1E10" />
      </mesh>
      <Html position={[0, 0, 0.25]} center transform={false}>
        <div style={HTML_LABEL}>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: "1em",
              letterSpacing: "0.18em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {formatAchievementType(achievement.achievement_type)}
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: PARCHMENT,
              fontSize: "0.9em",
              letterSpacing: "0.08em",
              margin: "5px 0 0",
              lineHeight: 1.3,
            }}
          >
            {achievement.event_name}
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: "0.9em",
              letterSpacing: "0.12em",
              margin: "4px 0 0",
              opacity: 0.8,
              lineHeight: 1.2,
            }}
          >
            {achievement.season_year ?? "—"}
          </p>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: PARCHMENT,
              fontSize: "0.8em",
              letterSpacing: "0.06em",
              margin: "4px 0 0",
              opacity: 0.65,
              lineHeight: 1.2,
            }}
          >
            {playerLine}
          </p>
        </div>
      </Html>
    </group>
  );
}

function GumDisplayCase({
  position,
  rotationY,
  item,
}: {
  position: [number, number, number];
  rotationY: number;
  item: PlayerWingGumItem | null;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 1, 24]} />
        <meshBasicMaterial color="#3D2810" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 3, 24, 1, true]} />
        <meshBasicMaterial
          color="#8BA8C4"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.8, 2, 0.1]} />
        <meshBasicMaterial color="#D4A92A" />
      </mesh>
      <Html position={[0, 3.2, 0.5]} center transform={false}>
        <div style={HTML_LABEL}>
          <p
            style={{
              fontFamily: "Georgia, serif",
              color: GOLD,
              fontSize: "0.9em",
              letterSpacing: "0.18em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            GUM ITEM
          </p>
          {item ? (
            <>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: PARCHMENT,
                  fontSize: "0.9em",
                  letterSpacing: "0.08em",
                  margin: "4px 0 0",
                  lineHeight: 1.2,
                }}
              >
                {item.is_authenticated ? "Authenticated" : "Pending"}
              </p>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: PARCHMENT,
                  fontSize: "0.9em",
                  letterSpacing: "0.05em",
                  margin: "3px 0 0",
                  opacity: 0.6,
                  lineHeight: 1.2,
                }}
              >
                {item.item_description}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: PARCHMENT,
                  fontSize: "0.9em",
                  letterSpacing: "0.08em",
                  margin: "4px 0 0",
                  lineHeight: 1.2,
                }}
              >
                Authenticated
              </p>
              <p
                style={{
                  fontFamily: "Georgia, serif",
                  color: PARCHMENT,
                  fontSize: "0.9em",
                  letterSpacing: "0.05em",
                  margin: "3px 0 0",
                  opacity: 0.45,
                  lineHeight: 1.2,
                }}
              >
                Submit your first item
              </p>
            </>
          )}
        </div>
      </Html>
    </group>
  );
}

function GatePlaque({
  position,
  lines,
}: {
  position: [number, number, number];
  lines: Array<{ text: string; color?: string; opacity?: number; size?: string }>;
}) {
  return (
    <Html position={position} center transform={false}>
      <div style={HTML_LABEL}>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontFamily: "Georgia, serif",
              color: line.color ?? PARCHMENT,
              fontSize: line.size ?? "0.9em",
              letterSpacing: "0.12em",
              margin: i === 0 ? 0 : "4px 0 0",
              opacity: line.opacity ?? 1,
              lineHeight: 1.2,
            }}
          >
            {line.text}
          </p>
        ))}
      </div>
    </Html>
  );
}

function MannequinEnclosure({
  position,
  jerseyColor,
}: {
  position: [number, number, number];
  jerseyColor: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, -3.5, 0]}>
        <cylinderGeometry args={[1.8, 2.2, 0.8, 24]} />
        <meshBasicMaterial color="#3D2810" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[1.4, 1.4, 6, 32, 1, true]} />
        <meshBasicMaterial
          color="#8BC4D8"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.0, 3.5, 0.08]} />
        <meshBasicMaterial color={jerseyColor} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <torusGeometry args={[1.4, 0.12, 16, 48]} />
        <meshBasicMaterial color="#B8972A" />
      </mesh>
    </group>
  );
}

function CorridorArch({
  position,
  isCenter,
  onCorridorEnter,
}: {
  position: [number, number, number];
  isCenter: boolean;
  onCorridorEnter: () => void;
}) {
  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    if (!isCenter) return;
    e.stopPropagation();
    onCorridorEnter();
  };

  return (
    <group position={position}>
      <mesh onClick={handleClick}>
        <boxGeometry args={[4, 8, 0.5]} />
        <meshBasicMaterial color="#3D2810" />
      </mesh>
      <mesh position={[0, 0, -2.2]} onClick={handleClick}>
        <boxGeometry args={[2.5, 7, 4]} />
        <meshBasicMaterial color="#0A0806" />
      </mesh>
      {isCenter && (
        <Html position={[0, 5.5, 0.4]} center transform={false}>
          <div style={HTML_LABEL}>
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: GOLD,
                fontSize: "1em",
                letterSpacing: "0.22em",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              PLAYER CORRIDORS
            </p>
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: PARCHMENT,
                fontSize: "0.9em",
                letterSpacing: "0.12em",
                margin: "5px 0 0",
                opacity: 0.65,
                lineHeight: 1.2,
              }}
            >
              PPC-00001 — PPC-00101
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

function PlayerWingScene({
  recentPlayers,
  recentAchievements,
  recentGumItems,
  onCorridorEnter,
  onPlinthEnter,
}: {
  recentPlayers: PlayerWingPlayer[];
  recentAchievements: PlayerWingAchievement[];
  recentGumItems: PlayerWingGumItem[];
  onCorridorEnter: () => void;
  onPlinthEnter: (ppcNumber: string) => void;
}) {
  const wallRadius = 28;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} raycast={() => null}>
        <circleGeometry args={[35, 64]} />
        <meshBasicMaterial color="#3D2E1A" />
      </mesh>

      {/* Curved walls */}
      <mesh position={[0, 7, 0]} raycast={() => null}>
        <cylinderGeometry args={[35, 35, 20, 64, 1, true]} />
        <meshBasicMaterial color="#2A1E10" side={THREE.BackSide} />
      </mesh>

      {/* Domed ceiling */}
      <mesh position={[0, 17, 0]}>
        <sphereGeometry args={[35, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#1A1208" side={THREE.BackSide} />
      </mesh>

      {/* Ceiling ring — opening to atrium above */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 17, 0]}>
        <ringGeometry args={[4, 35, 64]} />
        <meshBasicMaterial color="#1A1208" side={THREE.DoubleSide} />
      </mesh>

      {/* Stone arch surround at opening */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 16.5, 0]}>
        <torusGeometry args={[4.5, 0.8, 16, 48]} />
        <meshBasicMaterial color="#4D3820" />
      </mesh>

      {/* Entry steps from above (north) */}
      {STEP_SPECS.map((step, i) => (
        <group key={i} position={[0, step.y, step.z]}>
          <mesh raycast={() => null}>
            <boxGeometry args={[8, 0.4, 1.5]} />
            <meshBasicMaterial color="#4D3820" />
          </mesh>
          <mesh position={[0, 0, 0.76]} raycast={() => null}>
            <boxGeometry args={[8, 0.42, 0.08]} />
            <meshBasicMaterial color="#6B5030" />
          </mesh>
        </group>
      ))}

      {/* Recently minted PPC plinths — staggered Ricart arrangement */}
      {layoutPlinths(recentPlayers).map(({ player, position }) => (
        <PlayerPlinth
          key={player.ppc_number}
          position={position}
          color={vaultLevelColor(player.vault_level)}
          name={displayName(player)}
          ppcNumber={player.ppc_number}
          vaultLevel={player.vault_level}
          geometry={plinthKey(player) === "brady" ? BRADY_PLINTH : DEFAULT_PLINTH}
          onEnter={() => onPlinthEnter(player.ppc_number)}
        />
      ))}

      {/* Left wall — achievement plaques */}
      {ACHIEVEMENT_WALL.map((slot, i) => {
        const achievement = recentAchievements[i];
        if (!achievement) return null;
        const pos = wallPosition(wallRadius, slot.angle, slot.y);
        const rotationY = Math.atan2(pos[0], pos[2]) + Math.PI;
        return (
          <AchievementPlaque
            key={`${achievement.ppc_number}-${achievement.achievement_type}-${i}`}
            position={pos}
            rotationY={rotationY}
            achievement={achievement}
          />
        );
      })}

      {/* Right wall — GUM display cases */}
      {GUM_WALL.map((slot, i) => {
        const pos = wallPosition(wallRadius, slot.angle, slot.y);
        const rotationY = Math.atan2(pos[0], pos[2]) + Math.PI;
        return (
          <GumDisplayCase
            key={i}
            position={pos}
            rotationY={rotationY}
            item={recentGumItems[i] ?? null}
          />
        );
      })}

      {/* Mannequin-scale gate enclosures — beside side room doors */}
      <MannequinEnclosure position={[-20, -0.5, -8]} jerseyColor="#D4A92A" />
      <MannequinEnclosure position={[20, -0.5, -8]} jerseyColor="#B0B8C4" />

      <GatePlaque
        position={[-17, 0, -8]}
        lines={[
          { text: "GUM ITEMS", color: GOLD, size: "1em" },
          { text: "Recently authenticated", color: PARCHMENT, size: "0.9em" },
          { text: "Submit your first item", color: PARCHMENT, size: "0.8em", opacity: 0.45 },
        ]}
      />
      <GatePlaque
        position={[17, 0, -8]}
        lines={[
          { text: "FEATURED", color: GOLD, size: "1em" },
          { text: "Most recent addition", color: PARCHMENT, size: "0.9em" },
          { text: "Authentication pending", color: PARCHMENT, size: "0.8em", opacity: 0.45 },
        ]}
      />

      {/* Rear — corridor hall entrance */}
      {CORRIDOR_ARCHES.map((arch, i) => (
        <CorridorArch
          key={i}
          position={[arch.x, 1, arch.z]}
          isCenter={i === 1}
          onCorridorEnter={onCorridorEnter}
        />
      ))}
    </group>
  );
}

export type PlayerWingProps = {
  recentPlayers: PlayerWingPlayer[];
  recentAchievements: PlayerWingAchievement[];
  recentGumItems: PlayerWingGumItem[];
};

export function PlayerWing({
  recentPlayers,
  recentAchievements,
  recentGumItems,
}: PlayerWingProps) {
  const router = useRouter();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lookAtRef = useRef(LOOK_AT.clone());

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera;
  }, []);

  const handleCorridorEnter = useCallback(() => {
    router.push("/vault/ppc");
  }, [router]);

  const handlePlinthEnter = useCallback(
    (ppcNumber: string) => {
      router.push(`/vault/ppc/${ppcNumber}`);
    },
    [router],
  );

  const returnToAtrium = useCallback(() => {
    router.push("/vault/atrium");
  }, [router]);

  return (
    <div className="relative h-screen w-screen" style={{ backgroundColor: BG }}>
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, 2, 14], fov: 60, near: 0.1, far: 200 }}
        onCreated={({ gl }) => () => gl.dispose()}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[BG]} />
        <CameraRig lookAtRef={lookAtRef} onReady={handleCameraReady} />
        <SceneCleanup />
        <PlayerWingScene
          recentPlayers={recentPlayers}
          recentAchievements={recentAchievements}
          recentGumItems={recentGumItems}
          onCorridorEnter={handleCorridorEnter}
          onPlinthEnter={handlePlinthEnter}
        />
      </Canvas>

      <button
        type="button"
        onClick={returnToAtrium}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 cursor-pointer border-none bg-transparent"
        style={{
          fontFamily: "Georgia, serif",
          color: GOLD,
          fontSize: 12,
          letterSpacing: "0.18em",
          opacity: 0.85,
        }}
      >
        ↑ Return to the Atrium
      </button>
    </div>
  );
}
