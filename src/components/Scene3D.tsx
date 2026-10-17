// ============================================================================
// 3D Physical Sensor Integrity & Perception Verification Scene (Three.js / R3F)
// Real-Time Cross-Modal Digital Twin: LiDAR Point Cloud, Radar Arc, EKF & Threat Attribution
// ============================================================================

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { FrameTelemetry, ScenarioId } from '../types';
import {
  Eye,
  Camera,
  Layers,
  ShieldAlert,
  Compass,
  RotateCw,
  Box,
} from 'lucide-react';

// ============================================================================
// Scratch Math Objects (Zero Per-Frame Garbage Collection Allocation)
// ============================================================================
const _scratchVec1 = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchVec3 = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1.234) * 10000;
  return x - Math.floor(x);
}

export interface Scene3DProps {
  telemetry: FrameTelemetry | null;
  historyTrail: { x: number; y: number }[];
  scenarioId?: ScenarioId;
  isPlaying?: boolean;
  onToggleViewMode?: () => void;
  viewMode?: '2d' | '3d';
}

type CameraMode = 'topdown' | 'chase' | 'orbit';

// ============================================================================
// Camera Controller with Smooth Damped Interpolation
// ============================================================================
function CameraController({
  cameraMode,
  setCameraMode,
}: {
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const targetCamPos = useRef(new THREE.Vector3(0, 36, -12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, -14));

  useEffect(() => {
    if (cameraMode === 'topdown') {
      targetCamPos.current.set(0, 38, -12);
      targetLookAt.current.set(0, 0, -14);
    } else if (cameraMode === 'chase') {
      targetCamPos.current.set(0, 3.2, 5.5);
      targetLookAt.current.set(0, 1.2, -18);
    }
  }, [cameraMode]);

  useFrame((_, delta) => {
    if (cameraMode === 'orbit') return;

    const lerpFactor = Math.min(1.0, delta * 5.0);
    camera.position.lerp(targetCamPos.current, lerpFactor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, lerpFactor);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={cameraMode === 'topdown' ? Math.PI / 2.05 : Math.PI / 2.01}
      minDistance={2}
      maxDistance={90}
      onStart={() => {
        if (cameraMode !== 'orbit') {
          setCameraMode('orbit');
        }
      }}
    />
  );
}

// ============================================================================
// Ground Plane, Asphalt Road, Lane Dashes & Range Distance Rings
// ============================================================================
function EnvironmentRoad() {
  const dashes = useMemo(() => {
    const list: number[] = [];
    for (let z = 18; z >= -80; z -= 7) {
      list.push(z);
    }
    return list;
  }, []);

  const rangeRings = [5, 10, 15, 20, 25, 30];

  return (
    <group>
      {/* Expansive Ground Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Main Road Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -30]} receiveShadow>
        <planeGeometry args={[8.4, 110]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Road Shoulder / Curbs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.25, 0.005, -30]}>
        <planeGeometry args={[0.2, 110]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.25, 0.005, -30]}>
        <planeGeometry args={[0.2, 110]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>

      {/* Center Lane Dashes */}
      {dashes.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[0.18, 3.2]} />
          <meshBasicMaterial color="#94a3b8" />
        </mesh>
      ))}

      {/* Concentric Distance Rings (Originating at Ego (0,0,0)) */}
      {rangeRings.map((r) => (
        <group key={r}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
            <ringGeometry args={[r - 0.04, r + 0.04, 64]} />
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.5} />
          </mesh>
          <Html position={[r + 0.3, 0.05, 0]} center distanceFactor={22}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#64748b',
                background: 'rgba(255,255,255,0.7)',
                padding: '1px 3px',
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            >
              {r}m
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// Ego Vehicle (Autonomous Car with Roof LiDAR & Front Radar Module)
// ============================================================================
function EgoCar() {
  return (
    <group position={[0, 0, 0]}>
      {/* Lower Chassis / Body */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.65, 4.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Cabin / Glass Roof */}
      <mesh position={[0, 0.98, 0.2]} castShadow>
        <boxGeometry args={[1.55, 0.52, 2.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} transparent opacity={0.88} />
      </mesh>

      {/* Headlights (Cyan Technical Accents) */}
      <mesh position={[-0.7, 0.48, -2.16]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>
      <mesh position={[0.7, 0.48, -2.16]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshBasicMaterial color="#00f2fe" />
      </mesh>

      {/* Rear Brake Lights */}
      <mesh position={[-0.7, 0.48, 2.16]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshBasicMaterial color="#e11d48" />
      </mesh>
      <mesh position={[0.7, 0.48, 2.16]}>
        <boxGeometry args={[0.3, 0.12, 0.06]} />
        <meshBasicMaterial color="#e11d48" />
      </mesh>

      {/* 4 Wheels */}
      {[-0.98, 0.98].map((x) =>
        [-1.35, 1.35].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.24, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>
        ))
      )}

      {/* Roof LiDAR Puck */}
      <group position={[0, 1.3, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.13, 0.14, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Glowing Optical Aperture Ring */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.135, 0.135, 0.03, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Front Radar Sensor Module on Bumper */}
      <mesh position={[0, 0.45, -2.17]}>
        <boxGeometry args={[0.26, 0.16, 0.05]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Trust Shield Dome (Visualizes Dynamic TrustScore & Alarm Heartbeat Pulse)
// ============================================================================
function TrustShield({
  dataRef,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !matRef.current || !dataRef.current) return;
    const telem = dataRef.current;
    const trust = telem.evaluation.trustScore ?? 1.0;
    const isAlarm = telem.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED';

    // Interpolate Color: Green (1.0) -> Yellow (0.6) -> Red (0.35)
    if (isAlarm) {
      const pulse = (Math.sin(state.clock.elapsedTime * 14) + 1) * 0.5;
      matRef.current.color.setRGB(0.95, 0.1 + pulse * 0.1, 0.2);
      matRef.current.opacity = 0.25 + pulse * 0.35;
      meshRef.current.scale.setScalar(1.0 + pulse * 0.15);
    } else {
      meshRef.current.scale.setScalar(1.0);
      if (trust > 0.65) {
        matRef.current.color.setRGB(0.06, 0.75, 0.45); // Emerald Green
        matRef.current.opacity = 0.12 * trust;
      } else if (trust > 0.35) {
        matRef.current.color.setRGB(0.95, 0.65, 0.08); // Amber Warning
        matRef.current.opacity = 0.18;
      } else {
        matRef.current.color.setRGB(0.92, 0.2, 0.25); // Critical Red
        matRef.current.opacity = 0.28;
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Translucent Trust Dome */}
      <mesh ref={meshRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={matRef}
          color="#10b981"
          transparent
          opacity={0.15}
          roughness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Perimeter Ground Trust Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[3.15, 3.25, 48]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Radar 60° Translucent Detection Cone & Target Pulsing Ring
// ============================================================================
function RadarCone({
  dataRef,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
}) {
  const coneRef = useRef<THREE.Mesh>(null);
  const targetRingRef = useRef<THREE.Group>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);

  // Cone dimensions: 35m forward length, 60° FOV (30° half-angle)
  const coneLength = 35.0;
  const coneRadius = coneLength * Math.tan(THREE.MathUtils.degToRad(30)); // ~20.2m

  useFrame((state) => {
    if (!coneRef.current || !dataRef.current) return;
    const telem = dataRef.current;
    const radar = telem.measurement.radar;
    const evalResult = telem.evaluation;
    const mat = coneRef.current.material as THREE.MeshBasicMaterial;

    // Color by physical attribution state
    if (evalResult.alarmStatus === 'SPOOF_ATTACK_CONFIRMED' || evalResult.attribution === 'UNATTRIBUTED_ANOMALY') {
      mat.color.set('#ef4444'); // Crimson: Spoofed / Anomaly
      mat.opacity = 0.16;
    } else if (evalResult.attribution.startsWith('BENIGN_')) {
      mat.color.set('#f59e0b'); // Amber: Benign physical phenomenon
      mat.opacity = 0.14;
    } else {
      mat.color.set('#10b981'); // Emerald: Consistent verified track
      mat.opacity = 0.10;
    }

    // Target Radar Detection Ring
    if (targetRingRef.current) {
      if (radar.isDetected) {
        targetRingRef.current.visible = true;
        const gtPos = telem.measurement.groundTruth.pos;
        targetRingRef.current.position.set(gtPos.x, 0.05, -gtPos.y);

        if (ringMeshRef.current) {
          const pulse = 1.0 + 0.22 * Math.sin(state.clock.elapsedTime * 8);
          ringMeshRef.current.scale.set(pulse, pulse, pulse);
          (ringMeshRef.current.material as THREE.MeshBasicMaterial).color.copy(mat.color);
        }
      } else {
        // Radar sees empty asphalt! No echo return ring
        targetRingRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* 60° Radar Horizon Wedge / Cone originating from ego front bumper */}
      <mesh
        ref={coneRef}
        position={[0, 0.45, -2.15 - coneLength / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[coneRadius, coneLength, 32, 1, false]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Target Pulsing Echo Ring (Shown ONLY when radar sees target return) */}
      <group ref={targetRingRef} visible={false}>
        <mesh ref={ringMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.25, 32]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// Target Model (Low-Poly Car or Scenario 1 Cyclist) & EKF Ghost Box
// ============================================================================
function TargetActor({
  dataRef,
  scenarioId,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  scenarioId?: ScenarioId;
}) {
  const targetGroupRef = useRef<THREE.Group>(null);
  const ghostMeshRef = useRef<THREE.Mesh>(null);
  const [attributionTitle, setAttributionTitle] = useState<string>('PERCEPTION VERIFIED');
  const [badgeClass, setBadgeClass] = useState<string>('badge-emerald');

  const isCyclist = scenarioId === 'scen_1_cyclist_tangential';

  useFrame(() => {
    if (!dataRef.current) return;
    const telem = dataRef.current;
    const gt = telem.measurement.groundTruth;
    const ekf = telem.ekf;

    // 1. Position true target in 3D: (x, 0, -y)
    if (targetGroupRef.current) {
      targetGroupRef.current.position.set(gt.pos.x, 0, -gt.pos.y);

      // Compute heading angle: face movement vector or gt heading
      if (gt.speed > 0.05) {
        const headingRad = Math.atan2(-gt.vel.x, -gt.vel.y);
        targetGroupRef.current.rotation.y = headingRad;
      }
    }

    // 2. Position EKF Ghost Box: (ekf.x, 0, -ekf.y)
    if (ghostMeshRef.current) {
      ghostMeshRef.current.position.set(ekf.pos.x, isCyclist ? 0.75 : 0.65, -ekf.pos.y);
      if (ekf.speed > 0.05) {
        const ekfHeadingRad = Math.atan2(-ekf.vel.x, -ekf.vel.y);
        ghostMeshRef.current.rotation.y = ekfHeadingRad;
      }
    }

    // Update overlay title
    const title = telem.evaluation.attributionTitle;
    if (title !== attributionTitle) {
      setAttributionTitle(title);
      if (telem.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED') {
        setBadgeClass('badge-rose');
      } else if (telem.evaluation.alarmStatus === 'BENIGN_ATTRIBUTED') {
        setBadgeClass('badge-amber');
      } else {
        setBadgeClass('badge-emerald');
      }
    }
  });

  return (
    <group>
      {/* True Target Mesh */}
      <group ref={targetGroupRef} position={[0, 0, -14]}>
        {isCyclist ? (
          /* Low-Poly Cyclist (Scenario 1) */
          <group position={[0, 0, 0]}>
            {/* Bicycle Wheels */}
            <mesh position={[0, 0.32, -0.6]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.32, 0.04, 8, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.32, 0.6]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.32, 0.04, 8, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Frame Crossbars */}
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.08, 0.35, 1.1]} />
              <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Rider Torso */}
            <mesh position={[0, 0.95, -0.1]}>
              <boxGeometry args={[0.35, 0.65, 0.28]} />
              <meshStandardMaterial color="#f97316" roughness={0.6} />
            </mesh>
            {/* Rider Head with Helmet */}
            <mesh position={[0, 1.42, -0.15]}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.4} />
            </mesh>
          </group>
        ) : (
          /* Low-Poly Obstacle Car */
          <group position={[0, 0, 0]}>
            {/* Chassis */}
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.8, 0.65, 4.0]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.4} />
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 0.9, 0.1]} castShadow>
              <boxGeometry args={[1.5, 0.55, 2.1]} />
              <meshStandardMaterial color="#334155" roughness={0.1} metalness={0.8} transparent opacity={0.85} />
            </mesh>
            {/* Wheels */}
            {[-0.92, 0.92].map((x) =>
              [-1.25, 1.25].map((z) => (
                <mesh key={`${x}-${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.22, 16]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
              ))
            )}
          </group>
        )}

        {/* Floating Attribution Chip Above Target */}
        <Html position={[0, isCyclist ? 1.85 : 1.7, 0]} center distanceFactor={20}>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              transition: 'all 0.2s ease',
            }}
            className={badgeClass}
          >
            {attributionTitle}
          </div>
        </Html>
      </group>

      {/* Faint EKF State Estimation "Ghost" Box */}
      <mesh ref={ghostMeshRef} position={[0, 0.65, -14]}>
        <boxGeometry args={[isCyclist ? 0.6 : 1.9, isCyclist ? 1.4 : 1.3, isCyclist ? 1.4 : 4.1]} />
        <meshBasicMaterial
          color="#06b6d4"
          wireframe
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Pre-Sampled LiDAR Point Cloud (Single THREE.Points with 600 Fixed Buffer)
// ============================================================================
function LidarPointCloud({
  dataRef,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const flashCountdown = useRef(0);

  // Pre-generate 600 unit box surface offsets
  const localOffsets = useMemo(() => {
    const list: THREE.Vector3[] = [];
    const w = 1.8;
    const h = 1.3;
    const l = 4.0;
    for (let i = 0; i < 600; i++) {
      const face = Math.floor(seededRandom(i * 7 + 1) * 5);
      let x = 0, y = 0, z = 0;
      if (face === 0) {
        // Top roof
        x = (seededRandom(i * 7 + 2) - 0.5) * w;
        y = h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 1) {
        // Left flank
        x = -w / 2;
        y = seededRandom(i * 7 + 2) * h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 2) {
        // Right flank
        x = w / 2;
        y = seededRandom(i * 7 + 2) * h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 3) {
        // Front grill
        x = (seededRandom(i * 7 + 2) - 0.5) * w;
        y = seededRandom(i * 7 + 3) * h;
        z = -l / 2;
      } else {
        // Rear
        x = (seededRandom(i * 7 + 2) - 0.5) * w;
        y = seededRandom(i * 7 + 3) * h;
        z = l / 2;
      }
      list.push(new THREE.Vector3(x, y, z));
    }
    return list;
  }, []);

  const [positions, colors] = useMemo(() => {
    return [new Float32Array(600 * 3), new Float32Array(600 * 3)];
  }, []);

  useFrame(() => {
    if (!pointsRef.current || !dataRef.current) return;
    const telem = dataRef.current;
    const lidar = telem.measurement.lidar;
    const gt = telem.measurement.groundTruth;
    const isAttack = telem.measurement.isAttackActive;
    const radar = telem.measurement.radar;

    // Detect spoofing: attack active and radar is missing or contradictory
    const isSpoof = isAttack && (!radar.isDetected || Math.abs(telem.evaluation.residual) > 1.0);

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const targetPos = lidar.isDetected ? lidar.pos : gt.pos;
    const visibleCount = lidar.isDetected ? Math.min(600, Math.max(10, Math.round(lidar.pointDensity * 600))) : 0;

    // Color: Red if spoofed with flash, Blue-Cyan if normal
    let r = 0.02, g = 0.52, b = 0.78; // Blue-gray
    if (isSpoof) {
      flashCountdown.current = Math.max(flashCountdown.current - 1, 0);
      r = 0.95;
      g = 0.15;
      b = 0.22; // High-alert red
    }

    const headingRad = Math.atan2(-gt.vel.x, -gt.vel.y);
    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);

    for (let i = 0; i < 600; i++) {
      if (i < visibleCount) {
        const off = localOffsets[i];
        // Rotate local offset by target heading
        const rx = off.x * cosH - off.z * sinH;
        const rz = off.x * sinH + off.z * cosH;

        const jitter = (Math.random() - 0.5) * 0.07;
        posArr[i * 3 + 0] = targetPos.x + rx + jitter;
        posArr[i * 3 + 1] = off.y + (Math.random() - 0.5) * 0.05;
        posArr[i * 3 + 2] = -targetPos.y + rz + jitter;

        colArr[i * 3 + 0] = r;
        colArr[i * 3 + 1] = g;
        colArr[i * 3 + 2] = b;
      } else {
        // Hide unused points under road
        posArr[i * 3 + 1] = -9999;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.88}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// Kinematic Vector Arrows (Total v, Radial v_rad, Tangential v_tan, LOS)
// ============================================================================
function KinematicVectors({
  dataRef,
  visible,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  visible: boolean;
}) {
  const vTotalRef = useRef<THREE.Group>(null);
  const vRadRef = useRef<THREE.Group>(null);
  const vTanRef = useRef<THREE.Group>(null);

  const losLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.6 });
    return new THREE.Line(geo, mat);
  }, []);

  useFrame(() => {
    if (!visible || !dataRef.current) return;
    const telem = dataRef.current;
    const gt = telem.measurement.groundTruth;
    const evalResult = telem.evaluation;

    const tx = gt.pos.x;
    const tz = -gt.pos.y;
    const ty = 0.5;

    // 1. Line of Sight: Ego (0, 0.45, 0) -> Target (tx, ty, tz)
    const posAttr = losLine.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    arr[0] = 0; arr[1] = 0.45; arr[2] = 0;
    arr[3] = tx; arr[4] = ty; arr[5] = tz;
    posAttr.needsUpdate = true;

    // 2. Total Velocity Vector v
    if (vTotalRef.current) {
      vTotalRef.current.position.set(tx, ty, tz);
      const vx = gt.vel.x;
      const vz = -gt.vel.y;
      const speed = Math.hypot(vx, vz);
      if (speed > 0.05) {
        _scratchVec1.set(vx, 0, vz).normalize();
        _scratchQuat.setFromUnitVectors(_upVec, _scratchVec1);
        vTotalRef.current.quaternion.copy(_scratchQuat);
        vTotalRef.current.scale.set(1, Math.min(6.0, speed * 0.45), 1);
        vTotalRef.current.visible = true;
      } else {
        vTotalRef.current.visible = false;
      }
    }

    // 3. Radial Velocity Vector v_rad along Line of Sight
    if (vRadRef.current) {
      vRadRef.current.position.set(tx, ty, tz);
      const vRadSpeed = evalResult.vExpectedRad;
      // LOS direction from target towards ego (or away)
      _scratchVec2.set(evalResult.rHat.x, 0, -evalResult.rHat.y);
      if (Math.abs(vRadSpeed) > 0.05) {
        if (vRadSpeed < 0) {
          _scratchVec2.negate(); // Closing in
        }
        _scratchQuat.setFromUnitVectors(_upVec, _scratchVec2.normalize());
        vRadRef.current.quaternion.copy(_scratchQuat);
        vRadRef.current.scale.set(1, Math.min(5.0, Math.abs(vRadSpeed) * 0.45), 1);
        vRadRef.current.visible = true;
      } else {
        vRadRef.current.visible = false;
      }
    }

    // 4. Tangential Velocity Vector v_tan
    if (vTanRef.current) {
      vTanRef.current.position.set(tx, ty, tz);
      const vTanSpeed = evalResult.vTanSpeed;
      if (vTanSpeed > 0.05) {
        _scratchVec3.set(evalResult.vTanVec.x, 0, -evalResult.vTanVec.y).normalize();
        _scratchQuat.setFromUnitVectors(_upVec, _scratchVec3);
        vTanRef.current.quaternion.copy(_scratchQuat);
        vTanRef.current.scale.set(1, Math.min(5.0, vTanSpeed * 0.45), 1);
        vTanRef.current.visible = true;
      } else {
        vTanRef.current.visible = false;
      }
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* LOS Line */}
      <primitive object={losLine} />

      {/* Total Velocity Arrow (Blue) */}
      <group ref={vTotalRef}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <coneGeometry args={[0.12, 0.28, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>

      {/* Radial Velocity Arrow v_rad (Purple / Magenta) */}
      <group ref={vRadRef}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <coneGeometry args={[0.12, 0.28, 8]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
      </group>

      {/* Tangential Velocity Arrow v_tan (Orange) */}
      <group ref={vTanRef}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
        <mesh position={[0, 1.05, 0]}>
          <coneGeometry args={[0.12, 0.28, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// Scenario 8: Metal Guardrail Mesh & Multipath Reflection Polyline
// ============================================================================
function GuardrailMultipath({
  dataRef,
  scenarioId,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  scenarioId?: ScenarioId;
}) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [showMultipath, setShowMultipath] = useState(false);

  // Position of metallic guardrail along the right shoulder: x = 4.4m
  const railX = 4.4;

  const multipathLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 });
    return new THREE.Line(geo, mat);
  }, []);

  useFrame(() => {
    if (!dataRef.current || scenarioId !== 'scen_8_guardrail_multipath') {
      if (showMultipath) setShowMultipath(false);
      return;
    }

    const telem = dataRef.current;
    const isGhostActive =
      (telem.measurement.rangeElongation ?? 0) > 0 ||
      telem.measurement.nearReflector ||
      telem.evaluation.attribution === 'BENIGN_MULTIPATH_GHOST';

    if (isGhostActive !== showMultipath) {
      setShowMultipath(isGhostActive);
    }

    if (isGhostActive) {
      const gt = telem.measurement.groundTruth;
      const tx = gt.pos.x;
      const tz = -gt.pos.y;
      const bounceZ = (-2.1 + tz) / 2; // Midpoint bounce along guardrail

      const posAttr = multipathLine.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      // Pt 1: Ego Front Radar (0, 0.45, -2.1)
      arr[0] = 0; arr[1] = 0.45; arr[2] = -2.1;
      // Pt 2: Guardrail Reflection Bounce (railX, 0.6, bounceZ)
      arr[3] = railX; arr[4] = 0.6; arr[5] = bounceZ;
      // Pt 3: Target Obstacle (tx, 0.5, tz)
      arr[6] = tx; arr[7] = 0.5; arr[8] = tz;
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 3D Metal Guardrail (Beam + Vertical Posts) */}
      <group position={[railX, 0, -20]}>
        {/* Horizontal W-Beam */}
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.15, 0.35, 60]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Vertical Support Posts every 3m */}
        {Array.from({ length: 20 }).map((_, i) => (
          <mesh key={i} position={[0, 0.35, -28 + i * 3]}>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Multipath 3-Point Bounced Polyline (Ego -> Guardrail -> Target) */}
      {showMultipath && (
        <group>
          <primitive object={multipathLine} />
          <Html position={[railX + 0.3, 0.9, -12]} center distanceFactor={20}>
            <div
              ref={labelRef}
              style={{
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fcd34d',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              ⚡ Multipath Ghost Bounce (ΔR = +1.4m)
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

// ============================================================================
// Scenario 3: Water Spray Fog Particles near Target Tires (Radar RCS Dropout)
// ============================================================================
function WaterSprayParticles({
  dataRef,
  scenarioId,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  scenarioId?: ScenarioId;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, offsets] = useMemo(() => {
    const pos = new Float32Array(50 * 3);
    const offs: { x: number; y: number; z: number; vy: number; vz: number }[] = [];
    for (let i = 0; i < 50; i++) {
      offs.push({
        x: (seededRandom(i * 11 + 1) - 0.5) * 1.8,
        y: seededRandom(i * 11 + 2) * 0.4,
        z: (seededRandom(i * 11 + 3) - 0.5) * 1.2 + 1.2, // Behind rear tires
        vy: 0.2 + seededRandom(i * 11 + 4) * 0.4,
        vz: 0.5 + seededRandom(i * 11 + 5) * 0.8,
      });
    }
    return [pos, offs];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !dataRef.current || scenarioId !== 'scen_3_rcs_dropout') {
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }

    const telem = dataRef.current;
    const snr = telem.measurement.radar.snrDb;
    const isLowSnr = snr < 10.0;

    pointsRef.current.visible = isLowSnr;
    if (!isLowSnr) return;

    const gt = telem.measurement.groundTruth;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const t = state.clock.elapsedTime * 3.0;

    for (let i = 0; i < 50; i++) {
      const off = offsets[i];
      const cycle = (t + i * 0.1) % 1.0;
      arr[i * 3 + 0] = gt.pos.x + off.x;
      arr[i * 3 + 1] = 0.05 + off.y + cycle * off.vy;
      arr[i * 3 + 2] = -gt.pos.y + off.z + cycle * off.vz;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.22}
        color="#93c5fd"
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// Master 3D Scene Root Component (Mounted inside App.tsx)
// ============================================================================
export const Scene3D: React.FC<Scene3DProps> = ({
  telemetry,
  historyTrail: _historyTrail,
  scenarioId,
  onToggleViewMode,
}) => {
  // Transfer 20 Hz frame telemetry directly to ref without React state re-rendering
  const frameDataRef = useRef<FrameTelemetry | null>(telemetry);
  useEffect(() => {
    frameDataRef.current = telemetry;
  }, [telemetry]);

  // Camera & Vector Toggles
  const [cameraMode, setCameraMode] = useState<CameraMode>('topdown');
  const [showVectors, setShowVectors] = useState<boolean>(true);

  const isAlarm = telemetry?.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED';

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      {/* 3D Viewport Header & Interactive Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Left: View Mode Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.82rem',
              color: '#0f172a',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Box size={14} color="#0284c7" />
            3D SENSOR DIGITAL TWIN
          </span>
        </div>

        {/* Center: Camera Mode Selector Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.92)',
            padding: '3px 4px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => setCameraMode('topdown')}
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              background: cameraMode === 'topdown' ? '#0284c7' : 'transparent',
              color: cameraMode === 'topdown' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Camera size={12} />
            Top-Down (BEV)
          </button>

          <button
            onClick={() => setCameraMode('chase')}
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              background: cameraMode === 'chase' ? '#0284c7' : 'transparent',
              color: cameraMode === 'chase' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={12} />
            Chase Cam
          </button>

          <button
            onClick={() => setCameraMode('orbit')}
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              background: cameraMode === 'orbit' ? '#0284c7' : 'transparent',
              color: cameraMode === 'orbit' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCw size={12} />
            Free Orbit
          </button>
        </div>

        {/* Right: Vector Toggle & 2D/3D Mode Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowVectors(!showVectors)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: showVectors ? '#e0f2fe' : '#ffffff',
              color: showVectors ? '#0369a1' : '#64748b',
              border: '1px solid #cbd5e1',
            }}
            title="Toggle Kinematic Velocity Vectors"
          >
            <Compass size={13} color={showVectors ? '#0284c7' : '#94a3b8'} />
            Vectors
          </button>

          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '4px 10px',
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #0f172a',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 4px rgba(15,23,42,0.15)',
              }}
              title="Switch back to 2D Bird's-Eye-View Canvas"
            >
              <Layers size={13} />
              2D BEV
            </button>
          )}
        </div>
      </div>

      {/* SPOOF ATTACK CONFIRMED Emergency Alert Banner */}
      {isAlarm && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 12,
            background: 'rgba(225, 29, 72, 0.95)',
            color: '#ffffff',
            padding: '6px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(225, 29, 72, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            border: '1px solid #fecdd3',
            animation: 'pulse 1s infinite alternate',
            pointerEvents: 'none',
          }}
        >
          <ShieldAlert size={16} color="#ffffff" />
          <span>SPOOF ATTACK CONFIRMED — AUTOMATIC BRAKE ENGAGED</span>
        </div>
      )}

      {/* R3F High-Performance WebGL Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 38, -12],
          fov: 45,
          near: 0.1,
          far: 250,
        }}
        style={{ width: '100%', height: '100%', background: '#f8fafc' }}
      >
        <fog attach="fog" args={['#f8fafc', 35, 95]} />

        {/* Ambient & Directional Sun Lighting */}
        <ambientLight intensity={0.75} color="#ffffff" />
        <directionalLight
          position={[18, 30, 15]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight args={['#ffffff', '#cbd5e1', 0.4]} />

        {/* Interactive Smooth Damped Camera Controller */}
        <CameraController cameraMode={cameraMode} setCameraMode={setCameraMode} />

        {/* 1. Ground & Road */}
        <EnvironmentRoad />

        {/* 2. Ego Autonomous Car with Sensors */}
        <EgoCar />

        {/* 3. Trust Score Security Shield */}
        <TrustShield dataRef={frameDataRef} />

        {/* 4. Radar 60° Translucent Horizon Beam */}
        <RadarCone dataRef={frameDataRef} />

        {/* 5. Target Obstacle & EKF State Estimation Ghost */}
        <TargetActor dataRef={frameDataRef} scenarioId={scenarioId} />

        {/* 6. Pre-Allocated 600-Point LiDAR Cloud */}
        <LidarPointCloud dataRef={frameDataRef} />

        {/* 7. Kinematic Total, Radial, and Tangential Vector Decomposition */}
        <KinematicVectors dataRef={frameDataRef} visible={showVectors} />

        {/* 8. Scenario 8: Guardrail & Multipath Ghost Polyline */}
        <GuardrailMultipath dataRef={frameDataRef} scenarioId={scenarioId} />

        {/* 9. Scenario 3: Water Spray Particles (Radar RCS Attenuation) */}
        <WaterSprayParticles dataRef={frameDataRef} scenarioId={scenarioId} />
      </Canvas>
    </div>
  );
};
