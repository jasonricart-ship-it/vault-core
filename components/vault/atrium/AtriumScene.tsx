"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LOOK_AT = new THREE.Vector3(0, 4, 0);

const FACADE_WALL = {
  color: "#3D2E1A",
  roughness: 0.88,
  metalness: 0,
  emissive: "#2A1E10",
  emissiveIntensity: 0.8,
} as const;

const FACADE = {
  color: "#E8DFC8",
  roughness: 0.88,
  metalness: 0,
} as const;

const COLUMN = {
  color: "#EDE4D0",
  roughness: 0.85,
  metalness: 0,
  emissive: "#3D2E18",
  emissiveIntensity: 0.3,
} as const;

const STEPS = {
  color: "#D4C9B0",
  roughness: 0.9,
  metalness: 0,
} as const;

const COLUMN_X = [-9, -5.4, -1.8, 1.8, 5.4, 9] as const;
const WINDOW_X = [-7, -4, 4, 7] as const;

const STEP_SPECS = [
  { width: 14, z: 2.75, y: -3.75 },
  { width: 18, z: 4.25, y: -4.25 },
  { width: 22, z: 5.75, y: -4.75 },
  { width: 26, z: 7.25, y: -5.25 },
  { width: 30, z: 8.75, y: -5.75 },
] as const;

function CameraLookAt() {
  const { camera } = useThree();
  useFrame(() => {
    camera.lookAt(LOOK_AT);
  });
  return null;
}

function SceneCleanup() {
  const { scene } = useThree();

  useEffect(() => {
    return () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    };
  }, [scene]);

  return null;
}

function Pediment() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-14, 0);
    shape.lineTo(14, 0);
    shape.lineTo(0, 4);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  }, []);

  return (
    <group position={[0, 11, 1]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial {...FACADE} />
      </mesh>
      <mesh position={[0, 0.5, 0.6]}>
        <torusGeometry args={[1.2, 0.15, 16, 48]} />
        <meshStandardMaterial color="#D4A832" roughness={0.45} metalness={0.35} />
      </mesh>
    </group>
  );
}

function FacadeText() {
  return (
    <Html position={[0, 14, 2]} center>
      <div
        className="pointer-events-none select-none"
        style={{
          width: "max-content",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "Georgia, serif",
            color: "#B8972A",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontSize: "48px",
            textShadow: "0 2px 16px rgba(0,0,0,0.95), 0 0 32px rgba(184,151,42,0.35)",
            margin: 0,
            textAlign: "center",
          }}
        >
          The Vault
        </p>
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#F5F2EC",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: "0.55rem",
            opacity: 0.55,
            marginTop: 10,
          }}
        >
          GUM Authentication Systems · Est. MMXXVI
        </p>
      </div>
    </Html>
  );
}

function EnterPrompt({ onEnter, disabled }: { onEnter: () => void; disabled: boolean }) {
  return (
    <Html position={[0, -6, 2]} center>
      <button
        type="button"
        onClick={onEnter}
        disabled={disabled}
        className="vault-atrium-enter-prompt cursor-pointer border-0 bg-transparent p-0 uppercase"
        style={{
          fontFamily: "Georgia, serif",
          color: "#B8972A",
          fontSize: "13px",
          letterSpacing: "0.4em",
        }}
      >
        Enter
      </button>
    </Html>
  );
}

function EnterClickPlane({ onEnter, disabled }: { onEnter: () => void; disabled: boolean }) {
  return (
    <mesh
      position={[0, 0, 1.5]}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onEnter();
      }}
    >
      <planeGeometry args={[12, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function BuildingExterior({ onEnter, isEntering }: { onEnter: () => void; isEntering: boolean }) {
  return (
    <group>
      {/* Main building body */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[32, 14, 3]} />
        <meshStandardMaterial {...FACADE_WALL} />
      </mesh>

      {/* Cornice */}
      <mesh position={[0, 7, 2]}>
        <boxGeometry args={[30, 0.5, 0.5]} />
        <meshStandardMaterial color="#EDE4D0" roughness={0.85} metalness={0} />
      </mesh>

      {/* Columns */}
      {COLUMN_X.map((x) => (
        <mesh key={x} position={[x, 0, 2]}>
          <cylinderGeometry args={[0.35, 0.5, 12, 24]} />
          <meshStandardMaterial {...COLUMN} />
        </mesh>
      ))}

      {/* Column uplights — warm gold from below */}
      {([-6, -2, 2, 6] as const).map((x) => (
        <pointLight
          key={`uplight-${x}`}
          color="#D4A832"
          intensity={8}
          distance={20}
          decay={2}
          position={[x, -4, 2.5]}
        />
      ))}

      <Pediment />

      {/* Arched windows (dark void with warm interior glow) */}
      {WINDOW_X.map((x) => (
        <mesh key={x} position={[x, 1, 1.2]}>
          <boxGeometry args={[2.5, 4, 0.25]} />
          <meshStandardMaterial
            color="#0A0808"
            roughness={0.2}
            metalness={0.1}
            emissive="#1A1008"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Entrance doors */}
      <mesh position={[-1.5, 0.5, 2.1]}>
        <boxGeometry args={[2.5, 6, 0.35]} />
        <meshStandardMaterial color="#1A1208" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[1.5, 0.5, 2.1]}>
        <boxGeometry args={[2.5, 6, 0.35]} />
        <meshStandardMaterial color="#1A1208" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Entrance light — warm gold spilling from inside */}
      <pointLight color="#D4A832" intensity={15} position={[0, 0, 2]} distance={6} decay={2} />

      {/* Stone steps — 5 tiers from building toward viewer */}
      {STEP_SPECS.map((step, i) => (
        <mesh key={i} position={[0, step.y, step.z]}>
          <boxGeometry args={[step.width, 0.5, 1.5]} />
          <meshStandardMaterial {...STEPS} />
        </mesh>
      ))}

      <EnterClickPlane onEnter={onEnter} disabled={isEntering} />
      <EnterPrompt onEnter={onEnter} disabled={isEntering} />
      <FacadeText />
    </group>
  );
}

function FacadeFillLight() {
  const light = useRef<THREE.SpotLight>(null);

  useLayoutEffect(() => {
    if (!light.current) return;
    light.current.target.position.set(0, 2, 0);
    light.current.target.updateMatrixWorld();
  }, []);

  return (
    <spotLight
      ref={light}
      color="#D4A832"
      intensity={1.5}
      position={[0, 8, 25]}
      angle={0.6}
      penumbra={0.8}
      decay={2}
      distance={60}
    />
  );
}

function SceneContents({
  onEnter,
  isEntering,
}: {
  onEnter: () => void;
  isEntering: boolean;
}) {
  return (
    <>
      <color attach="background" args={["#0A0C12"]} />
      <fog attach="fog" args={["#141820", 35, 110]} />

      <CameraLookAt />
      <SceneCleanup />

      {/* Evening sky ambient */}
      <ambientLight color="#1A2030" intensity={0.4} />

      {/* Cool moonlight from above-behind */}
      <directionalLight color="#B0C4D8" intensity={0.6} position={[0, 20, -10]} />

      {/* Subtle rim light from left */}
      <directionalLight color="#8090A8" intensity={0.4} position={[-15, 5, 5]} />

      <FacadeFillLight />

      <BuildingExterior onEnter={onEnter} isEntering={isEntering} />

      {/* Ground plane — evening shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2A2218" roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

export function AtriumScene() {
  const router = useRouter();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isEnteringRef = useRef(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0);
  const [isEntering, setIsEntering] = useState(false);

  const handleEnter = useCallback(() => {
    if (isEnteringRef.current) return;

    const camera = cameraRef.current;
    if (!camera) return;

    isEnteringRef.current = true;
    setIsEntering(true);

    const overlay = { opacity: 0 };

    gsap.to(camera.position, {
      z: 2,
      duration: 2.5,
      ease: "power2.inOut",
    });

    gsap.to(overlay, {
      opacity: 1,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => setOverlayOpacity(overlay.opacity),
      onComplete: () => {
        router.push("/vault/atrium");
      },
    });
  }, [router]);

  return (
    <div className="relative h-screen w-screen bg-black">
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden="true"
      />
      <Canvas
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [0, -1, 24], fov: 50, near: 0.1, far: 200 }}
        onCreated={({ camera, gl }) => {
          cameraRef.current = camera as THREE.PerspectiveCamera;
          camera.lookAt(LOOK_AT);
          gl.toneMappingExposure = 1.05;
          return () => gl.dispose();
        }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <SceneContents onEnter={handleEnter} isEntering={isEntering} />
      </Canvas>
    </div>
  );
}
