"use client";

import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 2.5, 12);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 2, -14);
const ENTRY_START_POS = new THREE.Vector3(0, 2.5, 20);

const GOLD = "#B8972A";
const PARCHMENT = "#F5F2EC";

const C = {
  floor: "#1E1610",
  wall: "#2A1E10",
  wallTrim: "#5A4530",
  ceiling: "#0A0806",
  step: "#8B6840",
  stepEdge: "#A07848",
  arch: "#7A5A3A",
  doorPanel: "#3D2810",
  rope: "#B8972A",
  ropePost: "#8B6914",
  walkway: "#6B5540",
  tunnel: "#2A1E14",
} as const;

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

function CarvedLabel({
  position,
  distanceFactor,
  lines,
  width = 240,
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
    opacity?: number;
    marginTop?: number;
  }>;
}) {
  return (
    <Html position={position} center transform distanceFactor={distanceFactor ?? 10} rotation={rotation}>
      <div className="pointer-events-none select-none text-center" style={{ width }}>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              fontFamily: "Georgia, serif",
              color: line.color ?? GOLD,
              fontSize: line.fontSize ?? "10px",
              letterSpacing: line.letterSpacing ?? "0.22em",
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

function Staircase({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const xDir = side === "left" ? -1 : 1;
  const baseX = side === "left" ? -9 : 9;
  const stepCount = 9;
  const stepWidth = 5.5;

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={[baseX, 0, -6]}>
      {/* Side wall backing the stairs */}
      <mesh position={[xDir * 1.2, 1.5, -4]}>
        <boxGeometry args={[0.6, 8, 10]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>

      {Array.from({ length: stepCount }, (_, i) => {
        const y = -2.6 + i * 0.42;
        const z = -i * 0.85;
        const w = stepWidth - i * 0.15;
        return (
          <group key={i} position={[xDir * 0.3, y, z]}>
            <mesh onClick={handleClick}>
              <boxGeometry args={[w, 0.38, 1.1]} />
              <meshBasicMaterial color={C.step} />
            </mesh>
            <mesh position={[0, 0, 0.56]}>
              <boxGeometry args={[w, 0.4, 0.08]} />
              <meshBasicMaterial color={C.stepEdge} />
            </mesh>
          </group>
        );
      })}

      {/* Landing platform at top of stairs */}
      <mesh position={[xDir * 0.5, 1.2, -7.8]} onClick={handleClick}>
        <boxGeometry args={[stepWidth + 0.5, 0.4, 2.2]} />
        <meshBasicMaterial color={C.step} />
      </mesh>

      {/* Gold uplight at stair base */}
      <pointLight color="#D4A832" intensity={4} distance={12} position={[0, -2.2, 0.5]} />
      <Html position={[0, -1.8, 1.2]} center transform distanceFactor={8}>
        <div
          className="pointer-events-none"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "radial-gradient(circle, #E8C84A 0%, #B8972A 50%, transparent 100%)",
            boxShadow: "0 0 20px rgba(212, 169, 42, 0.85)",
          }}
        />
      </Html>
    </group>
  );
}

function StoneBollard({ position }: { position: [number, number, number] }) {
  const baseHeight = 0.2;
  const postHeight = 1.05;

  return (
    <group position={position}>
      <mesh position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[0.32, 0.36, baseHeight, 20]} />
        <meshStandardMaterial color="#6B5540" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh position={[0, baseHeight + postHeight / 2, 0]}>
        <cylinderGeometry args={[0.13, 0.15, postHeight, 20]} />
        <meshStandardMaterial color="#5A4530" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh position={[0, baseHeight + postHeight + 0.05, 0]}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshStandardMaterial color={GOLD} roughness={0.28} metalness={0.65} />
      </mesh>
    </group>
  );
}

function StaffRopeBarrier() {
  const stairBaseX = 9;
  const stairMouthZ = -5.35;
  const bollardY = -2.88;

  const leftBollard: [number, number, number] = [stairBaseX - 2.55, bollardY, stairMouthZ];
  const rightBollard: [number, number, number] = [stairBaseX + 2.55, bollardY, stairMouthZ];

  const ropeGeometry = useMemo(() => {
    const baseHeight = 0.2;
    const postHeight = 1.05;
    const attachY = bollardY + baseHeight + postHeight + 0.05;

    const start = new THREE.Vector3(leftBollard[0], attachY, leftBollard[2]);
    const end = new THREE.Vector3(rightBollard[0], attachY, rightBollard[2]);
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2,
      attachY - 0.28,
      (start.z + end.z) / 2 + 0.12,
    );

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return new THREE.TubeGeometry(curve, 32, 0.042, 12, false);
  }, [bollardY, leftBollard, rightBollard]);

  return (
    <group>
      <StoneBollard position={leftBollard} />
      <StoneBollard position={rightBollard} />

      <mesh geometry={ropeGeometry}>
        <meshStandardMaterial color={GOLD} roughness={0.32} metalness={0.58} />
      </mesh>

      <CarvedLabel
        position={[stairBaseX, 2.8, -3.5]}
        distanceFactor={9}
        width={200}
        lines={[
          { text: "STAFF ONLY", fontSize: "11px", letterSpacing: "0.28em" },
          { text: "AUTHORIZED PERSONNEL", color: PARCHMENT, fontSize: "8px", opacity: 0.45, marginTop: 8 },
        ]}
      />
    </group>
  );
}

function OverheadWalkway() {
  return (
    <group position={[0, 5.5, -19]}>
      <mesh>
        <boxGeometry args={[28, 0.45, 3.2]} />
        <meshBasicMaterial color={C.walkway} />
      </mesh>
      {/* Underside trim — visible from lobby floor */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[28, 0.15, 3.4]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>
      {/* Left and right railings */}
      <mesh position={[-13.5, 0.6, 0]}>
        <boxGeometry args={[0.35, 1.1, 3.2]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[13.5, 0.6, 0]}>
        <boxGeometry args={[0.35, 1.1, 3.2]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      {/* Connector ramps to each stair landing */}
      <mesh position={[-10, 5.2, -2]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[4, 0.35, 4]} />
        <meshBasicMaterial color={C.walkway} />
      </mesh>
      <mesh position={[10, 5.2, -2]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[4, 0.35, 4]} />
        <meshBasicMaterial color={C.walkway} />
      </mesh>
    </group>
  );
}

function PlayerWingEntranceBelow() {
  return (
    <group position={[0, -1.5, -24]}>
      <mesh>
        <boxGeometry args={[8, 10, 0.5]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[0, 5.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.55, 12, 40, Math.PI]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[-4.5, 0, 0.2]}>
        <boxGeometry args={[1, 11, 0.8]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[4.5, 0, 0.2]}>
        <boxGeometry args={[1, 11, 0.8]} />
        <meshBasicMaterial color={C.arch} />
      </mesh>
      <mesh position={[-1.5, -1, 0.3]}>
        <boxGeometry args={[2.5, 7, 0.4]} />
        <meshBasicMaterial color={C.doorPanel} />
      </mesh>
      <mesh position={[1.5, -1, 0.3]}>
        <boxGeometry args={[2.5, 7, 0.4]} />
        <meshBasicMaterial color={C.doorPanel} />
      </mesh>
      <mesh position={[0, -1, 0.45]}>
        <boxGeometry args={[0.15, 7, 0.1]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      <CarvedLabel
        position={[0, 6.5, 0.5]}
        distanceFactor={11}
        width={220}
        lines={[
          { text: "THE PLAYER WING", fontSize: "11px", letterSpacing: "0.24em", opacity: 0.7 },
          { text: "Entrance below", color: PARCHMENT, fontSize: "8px", opacity: 0.4, marginTop: 6 },
        ]}
      />
    </group>
  );
}

function LobbyGeometry({ onResetCamera }: { onResetCamera: () => void }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -4]} onClick={onResetCamera}>
        <planeGeometry args={[44, 52]} />
        <meshBasicMaterial color={C.floor} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 9, -4]}>
        <planeGeometry args={[44, 52]} />
        <meshBasicMaterial color={C.ceiling} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 3, -28]}>
        <boxGeometry args={[44, 18, 1]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-22, 3, -4]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[52, 18, 1]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>

      {/* Right wall */}
      <mesh position={[22, 3, -4]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[52, 18, 1]} />
        <meshBasicMaterial color={C.wall} />
      </mesh>

      {/* Entry pilasters — south opening frames camera approach */}
      <mesh position={[-8, 2.5, 14]}>
        <boxGeometry args={[1.2, 12, 1.2]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>
      <mesh position={[8, 2.5, 14]}>
        <boxGeometry args={[1.2, 12, 1.2]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>

      {/* Central coffered band above walkway */}
      <mesh position={[0, 7.5, -19]}>
        <boxGeometry args={[30, 0.8, 4]} />
        <meshBasicMaterial color={C.wallTrim} />
      </mesh>

      <ambientLight intensity={0.35} color="#3D2E1E" />
      <pointLight color="#D4A832" intensity={2} position={[0, 6, -8]} distance={30} />
    </group>
  );
}

function LobbyScene({
  onRegistryStair,
  onAuthorityStair,
  staffDeniedMessage,
  onResetCamera,
}: {
  onRegistryStair: () => void;
  onAuthorityStair: () => void;
  staffDeniedMessage: string | null;
  onResetCamera: () => void;
}) {
  return (
    <group>
      <LobbyGeometry onResetCamera={onResetCamera} />

      <Staircase side="left" onClick={onRegistryStair} />
      <Staircase side="right" onClick={onAuthorityStair} />
      <StaffRopeBarrier />

      <CarvedLabel
        position={[-9, 3.6, -4]}
        distanceFactor={9}
        width={240}
        lines={[
          { text: "INSTITUTIONAL REGISTRY", fontSize: "12px", letterSpacing: "0.26em" },
          { text: "ORG · GOV-R · GOV-N", color: PARCHMENT, fontSize: "8px", opacity: 0.55, marginTop: 8 },
        ]}
      />

      <CarvedLabel
        position={[9, 3.6, -4]}
        distanceFactor={9}
        width={180}
        lines={[
          { text: "AUTHORITY", fontSize: "12px", letterSpacing: "0.28em" },
          { text: "Staff access only", color: PARCHMENT, fontSize: "8px", opacity: 0.45, marginTop: 8 },
        ]}
      />

      {staffDeniedMessage && (
        <Html position={[9, 1.5, -2]} center transform distanceFactor={9}>
          <div
            className="pointer-events-none select-none text-center"
            style={{
              padding: "12px 14px",
              background: "rgba(10, 9, 8, 0.92)",
              border: "1px solid rgba(184, 151, 42, 0.45)",
              width: 200,
            }}
          >
            <p
              style={{
                fontFamily: "Georgia, serif",
                color: GOLD,
                fontSize: "10px",
                letterSpacing: "0.24em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {staffDeniedMessage}
            </p>
          </div>
        </Html>
      )}

      <OverheadWalkway />
      <PlayerWingEntranceBelow />
    </group>
  );
}

export function InstitutionsLobby() {
  const router = useRouter();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lookAtRef = useRef(DEFAULT_LOOK_AT.clone());
  const hasEnteredRef = useRef(false);
  const [staffDeniedMessage, setStaffDeniedMessage] = useState<string | null>(null);

  const flashStaffDenied = useCallback(() => {
    setStaffDeniedMessage("AUTHORIZED PERSONNEL ONLY");
    window.setTimeout(() => setStaffDeniedMessage(null), 2800);
  }, []);

  const handleCameraReady = useCallback((camera: THREE.PerspectiveCamera) => {
    cameraRef.current = camera;
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;

    camera.position.copy(ENTRY_START_POS);
    lookAtRef.current.copy(DEFAULT_LOOK_AT);
    camera.lookAt(lookAtRef.current);

    gsap.to(camera.position, {
      z: DEFAULT_CAMERA_POS.z,
      duration: 2.2,
      ease: "power2.out",
    });
  }, []);

  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    gsap.to(camera.position, {
      x: DEFAULT_CAMERA_POS.x,
      y: DEFAULT_CAMERA_POS.y,
      z: DEFAULT_CAMERA_POS.z,
      duration: 1.2,
      ease: "power2.inOut",
    });
    gsap.to(lookAtRef.current, {
      x: DEFAULT_LOOK_AT.x,
      y: DEFAULT_LOOK_AT.y,
      z: DEFAULT_LOOK_AT.z,
      duration: 1.2,
      ease: "power2.inOut",
    });
  }, []);

  const handleRegistryStair = useCallback(() => {
    router.push("/vault/institutions/registry");
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetCamera();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetCamera]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="relative h-screen w-screen bg-black">
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, 2.5, 20], fov: 58, near: 0.1, far: 120 }}
        onCreated={({ gl }) => () => gl.dispose()}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#1A1208"]} />
        <fog attach="fog" args={["#1A1208", 35, 75]} />

        <CameraRig lookAtRef={lookAtRef} onReady={handleCameraReady} />
        <SceneCleanup />

        <LobbyScene
          onRegistryStair={handleRegistryStair}
          onAuthorityStair={flashStaffDenied}
          staffDeniedMessage={staffDeniedMessage}
          onResetCamera={resetCamera}
        />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center"
        style={{
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(to top, rgba(10,9,8,0.92) 0%, transparent 100%)",
        }}
      >
        <Link
          href="/vault/atrium"
          className="pointer-events-auto"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: GOLD,
            letterSpacing: "0.22em",
            fontSize: "11px",
            textTransform: "uppercase",
            textDecoration: "none",
            opacity: 0.9,
            padding: "10px 16px",
          }}
        >
          ← Back to Atrium
        </Link>
      </div>
    </div>
  );
}
