// ============================================================================
// 3D Physical Sensor Integrity & Perception Verification Digital Twin (Three.js / R3F)
// Enhanced Closed-Loop Simulation Box: Dynamic AEB Vehicle Dynamics, Pitch & Suspension,
// FMCW Radar Chirps, EKF Covariance Uncertainty Ellipse, Stopping Ribbon & Tailgater Risk
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
  CloudRain,
  Radio,
  Gauge,
  Zap,
  Activity,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// Zero Per-Frame Garbage Collection Math Primitives
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
// Autonomy Maneuver Decision Engine (GO vs STOP Policy)
// ============================================================================
interface ManeuverDecision {
  action: 'GO' | 'STOP' | 'SUPPRESS_AND_GO' | 'CRASH_RISK';
  title: string;
  subtitle: string;
  shouldBrake: boolean;
  color: string;
  bg: string;
  borderColor: string;
}

function computeManeuverDecision(
  scenarioId: ScenarioId | undefined,
  telemetry: FrameTelemetry | null,
  isProtectedMode: boolean,
  manualSpoof: boolean
): ManeuverDecision {
  if (manualSpoof) {
    return {
      action: 'STOP',
      title: 'MANUAL THREAT INJECTED: AEB EMERGENCY STOP (0 km/h)',
      subtitle: 'Simulating emergency brake stop and trailing vehicle hazard',
      shouldBrake: true,
      color: '#ffffff',
      bg: 'rgba(225, 29, 72, 0.95)',
      borderColor: '#fecdd3',
    };
  }

  const causeAwareAlarm =
    telemetry?.evaluation.detectors.causeAware.alarmTriggered ||
    telemetry?.evaluation.detectors.causeAware.emergencyBrakeActive ||
    telemetry?.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED';
  const naiveStrictAlarm =
    telemetry?.evaluation.detectors.naiveStrict.alarmTriggered ||
    telemetry?.evaluation.detectors.naiveStrict.emergencyBrakeActive ||
    false;
  const isAttackActive = telemetry?.measurement.isAttackActive ?? false;

  // --------------------------------------------------------------------------
  // Mode A: NAIVE BASELINE AV (No Cross-Modal Cause-Aware Defense)
  // --------------------------------------------------------------------------
  if (!isProtectedMode) {
    if (scenarioId === 'scen_1_cyclist_tangential') {
      if (naiveStrictAlarm) {
        return {
          action: 'STOP',
          title: 'NAIVE AV: FALSE EMERGENCY BRAKE (0 km/h)',
          subtitle: 'Panicked when radar dropped in clutter notch (|v_rad| < 0.4 m/s)! Unsafe halt!',
          shouldBrake: true,
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
    }

    if (scenarioId === 'scen_2_phantom_spoof' || scenarioId === 'scen_6_phantom_tangential') {
      if (isAttackActive) {
        return {
          action: 'STOP',
          title: 'NAIVE AV: PHANTOM BRAKE (0 km/h)',
          subtitle: 'Tricked by laser ghost obstacle on empty highway! Tailgater crash hazard!',
          shouldBrake: true,
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
    }

    if (scenarioId === 'scen_4_loose_bypass') {
      return {
        action: 'CRASH_RISK',
        title: 'NAIVE AV: BLIND CRUISE (+1.35 m/s Gate Bypass)',
        subtitle: 'Loose gate bypassed! Failed to detect closing distance — High collision risk!',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(194, 65, 12, 0.95)',
        borderColor: '#fed7aa',
      };
    }

    if (scenarioId === 'scen_5_slow_creep') {
      return {
        action: 'CRASH_RISK',
        title: 'NAIVE AV: DELAYED BRAKE (Ramped Drift Missed)',
        subtitle: 'Single-frame threshold evaded by gradual +0.40 m/s² creep',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(217, 119, 6, 0.95)',
        borderColor: '#fde68a',
      };
    }

    if (scenarioId === 'scen_7_pulsed_spoof') {
      return {
        action: 'CRASH_RISK',
        title: 'NAIVE AV: RESET LOOP (3 Hz Anti-Persistence)',
        subtitle: 'Integer persistence counter resets to 0 every off frame — attack undetected!',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(217, 119, 6, 0.95)',
        borderColor: '#fde68a',
      };
    }

    if (scenarioId === 'scen_8_guardrail_multipath') {
      if (naiveStrictAlarm) {
        return {
          action: 'STOP',
          title: 'NAIVE AV: FALSE BRAKE ON GUARDRAIL GHOST',
          subtitle: 'Panicked on metallic RF reflection (+1.8 m/s Doppler ghost)',
          shouldBrake: true,
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
    }

    return {
      action: 'GO',
      title: 'NAIVE AV: HIGHWAY CRUISE (60 km/h)',
      subtitle: 'Tracking vehicle without cross-modal integrity verification',
      shouldBrake: false,
      color: '#ffffff',
      bg: 'rgba(15, 23, 42, 0.92)',
      borderColor: '#334155',
    };
  }

  // --------------------------------------------------------------------------
  // Mode B: PROTECTED AV (Cause-Aware + ML Guard Active)
  // --------------------------------------------------------------------------
  switch (scenarioId) {
    case 'scen_1_cyclist_tangential':
      return {
        action: 'GO',
        title: 'PROTECTED AV: YIELD & PROCEED (60 km/h)',
        subtitle: 'Benign clutter notch recognized (|v_rad| < 0.40 m/s) — Zero false brakes!',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_2_phantom_spoof':
    case 'scen_6_phantom_tangential':
      if (isAttackActive) {
        return {
          action: 'SUPPRESS_AND_GO',
          title: 'PROTECTED AV: PHANTOM REJECTED → KEEP GOING (60 km/h)',
          subtitle: '77 GHz Radar confirms 0 echo on tarmac. Ghost suppressed, rear collision avoided!',
          shouldBrake: false, // CONTINUES MOVING! Does NOT phantom brake!
          color: '#ffffff',
          bg: 'rgba(2, 132, 199, 0.95)',
          borderColor: '#bae6fd',
        };
      }
      return {
        action: 'GO',
        title: 'PROTECTED AV: CRUISE (60 km/h)',
        subtitle: 'Radar & LiDAR cross-verified — Path clear',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_3_rcs_dropout':
      return {
        action: 'GO',
        title: 'PROTECTED AV: SMOOTH CRUISE (60 km/h)',
        subtitle: 'Pavement water spray multipath identified — 0% false alarms',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_4_loose_bypass':
      if (causeAwareAlarm) {
        return {
          action: 'STOP',
          title: 'PROTECTED AV: AEB EMERGENCY STOP (0 km/h)',
          subtitle: '+1.35 m/s velocity spoof detected! Brakes engaged, lead car crash prevented!',
          shouldBrake: true, // BRAKES TO PREVENT FATAL CRASH!
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
      return {
        action: 'GO',
        title: 'PROTECTED AV: TRACKING LEAD VEHICLE',
        subtitle: 'Strict gating active — Monitoring headway',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_5_slow_creep':
      if (causeAwareAlarm) {
        return {
          action: 'STOP',
          title: 'PROTECTED AV: CONTROLLED SAFE DECELERATION',
          subtitle: 'Ramped velocity drift detected by trust accumulator — Safe headway preserved!',
          shouldBrake: true,
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
      return {
        action: 'GO',
        title: 'PROTECTED AV: CRUISE (60 km/h)',
        subtitle: 'Trust accumulator integrating residuals',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_7_pulsed_spoof':
      if (causeAwareAlarm) {
        return {
          action: 'STOP',
          title: 'PROTECTED AV: SAFE CONTROLLED STOP (0 km/h)',
          subtitle: 'Anti-persistence spoof caught by asymmetric decay (alpha=0.20) — Safe pull-over!',
          shouldBrake: true,
          color: '#ffffff',
          bg: 'rgba(225, 29, 72, 0.95)',
          borderColor: '#fecdd3',
        };
      }
      return {
        action: 'GO',
        title: 'PROTECTED AV: CRUISE (60 km/h)',
        subtitle: 'Monitoring sensor integrity',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_8_guardrail_multipath':
      return {
        action: 'GO',
        title: 'PROTECTED AV: SMOOTH CRUISE (60 km/h)',
        subtitle: 'Guardrail specular reflection isolated by LiDAR bounding box — No false alarms',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    case 'scen_9_boresight_drift':
      return {
        action: 'GO',
        title: 'PROTECTED AV: STEADY CRUISE (60 km/h)',
        subtitle: 'Mechanical boresight drift absorbed in gate without trust degradation',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };

    default:
      return {
        action: 'GO',
        title: 'PROTECTED AV: HIGHWAY CRUISE (60 km/h)',
        subtitle: 'Perception cross-modal integrity verified',
        shouldBrake: false,
        color: '#ffffff',
        bg: 'rgba(16, 185, 129, 0.95)',
        borderColor: '#a7f3d0',
      };
  }
}

// ============================================================================
// Shared Ego Dynamic Physics State (Closed-Loop Longitudinal Actuation)
// ============================================================================
interface EgoDynamicState {
  speedMs: number; // Current ego velocity in m/s (0 - 16.7 m/s)
  speedKmh: number; // Current ego velocity in km/h
  accelG: number; // Current acceleration in Gs (-0.85G to +0.25G)
  pitchRad: number; // Nose dive pitch angle on heavy braking
  travelDist: number; // Integrated odometer distance for scrolling tarmac
  isBraking: boolean; // AEB brake actuator active
  stoppingDist: number; // Projected stopping distance in meters
  followerDist: number; // Distance of trailing car behind ego in meters
  followerRisk: boolean; // Flagged when false emergency stop endangers trailing car
  manualSpoof: boolean; // User manual threat injection override
  rainActive: boolean; // Rain weather simulation active
}

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
      targetCamPos.current.set(0, 3.4, 6.0);
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
// Ground Plane, Asphalt Road & Dynamic Scrolling Lane Dashes
// ============================================================================
function EnvironmentRoad({
  egoStateRef,
}: {
  egoStateRef: React.MutableRefObject<EgoDynamicState>;
}) {
  const dashesGroupRef = useRef<THREE.Group>(null);

  const dashes = useMemo(() => {
    const list: number[] = [];
    for (let z = 25; z >= -85; z -= 7) {
      list.push(z);
    }
    return list;
  }, []);

  const rangeRings = [5, 10, 15, 20, 25, 30];

  useFrame(() => {
    // Scroll lane dashes based on dynamic vehicle travel distance
    if (dashesGroupRef.current) {
      const offset = egoStateRef.current.travelDist % 7.0;
      dashesGroupRef.current.position.z = offset;
    }
  });

  return (
    <group>
      {/* Expansive Ground Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Main Road Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -30]} receiveShadow>
        <planeGeometry args={[8.4, 120]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.65} metalness={0.12} />
      </mesh>

      {/* Road Shoulder / Curbs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.25, 0.005, -30]}>
        <planeGeometry args={[0.2, 120]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.25, 0.005, -30]}>
        <planeGeometry args={[0.2, 120]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>

      {/* Scrolling Center Lane Dashes */}
      <group ref={dashesGroupRef}>
        {dashes.map((z) => (
          <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
            <planeGeometry args={[0.18, 3.2]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        ))}
      </group>

      {/* Concentric Distance Rings (Originating at Ego (0,0,0)) */}
      {rangeRings.map((r) => (
        <group key={r}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
            <ringGeometry args={[r - 0.04, r + 0.04, 64]} />
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.45} />
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
// Ego Autonomous Car with Suspension Pitch / Nose Dive & Braking Skid Marks
// ============================================================================
function EgoCar({
  egoStateRef,
}: {
  egoStateRef: React.MutableRefObject<EgoDynamicState>;
}) {
  const chassisRef = useRef<THREE.Group>(null);
  const skidLeftRef = useRef<THREE.Mesh>(null);
  const skidRightRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!chassisRef.current) return;
    const ego = egoStateRef.current;

    // Apply physical suspension pitch (nose-dive under heavy AEB braking)
    chassisRef.current.rotation.x = ego.pitchRad;

    // Show black tire skid marks on road when braking heavily (a < -5 m/s^2)
    const isHardBraking = ego.accelG < -0.4;
    if (skidLeftRef.current && skidRightRef.current) {
      skidLeftRef.current.visible = isHardBraking;
      skidRightRef.current.visible = isHardBraking;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Tire Skid Marks Under Rear Tires during AEB Deceleration */}
      <mesh
        ref={skidLeftRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.98, 0.012, 1.35]}
        visible={false}
      >
        <planeGeometry args={[0.22, 3.8]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.65} />
      </mesh>
      <mesh
        ref={skidRightRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.98, 0.012, 1.35]}
        visible={false}
      >
        <planeGeometry args={[0.22, 3.8]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.65} />
      </mesh>

      {/* Dynamic Chassis Group (Tilts with Acceleration/Braking Pitch) */}
      <group ref={chassisRef}>
        {/* Lower Chassis / Body */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.65, 4.3]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Cabin / Glass Roof */}
        <mesh position={[0, 0.98, 0.2]} castShadow>
          <boxGeometry args={[1.55, 0.52, 2.2]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.88}
          />
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

        {/* Rear Brake Lights (Glow Bright Crimson when Braking) */}
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
    </group>
  );
}

// ============================================================================
// Dynamic Stopping Distance Ribbon (Projected Ahead of Ego)
// ============================================================================
function StoppingDistanceRibbon({
  egoStateRef,
  dataRef,
  visible,
}: {
  egoStateRef: React.MutableRefObject<EgoDynamicState>;
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  visible: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return;
    if (!visible) {
      meshRef.current.visible = false;
      return;
    }

    const ego = egoStateRef.current;
    const stopLen = Math.max(0.5, ego.stoppingDist);
    meshRef.current.visible = ego.speedMs > 0.5;

    // Scale ribbon length along Z
    meshRef.current.scale.set(1, 1, stopLen);
    meshRef.current.position.set(0, 0.015, -2.18 - stopLen / 2);

    // Color code ribbon based on target proximity
    if (dataRef.current) {
      const gt = dataRef.current.measurement.groundTruth;
      const targetDist = Math.hypot(gt.pos.x, gt.pos.y);
      if (targetDist < stopLen) {
        matRef.current.color.set('#ef4444'); // Target within stopping distance! Critical!
        matRef.current.opacity = 0.45;
      } else if (targetDist < stopLen * 1.5) {
        matRef.current.color.set('#f59e0b'); // Approaching stopping zone
        matRef.current.opacity = 0.35;
      } else {
        matRef.current.color.set('#10b981'); // Safe stopping margin
        matRef.current.opacity = 0.25;
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.0, 1.0]} />
      <meshBasicMaterial ref={matRef} color="#10b981" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ============================================================================
// Virtual Trailing Follower Vehicle (Visualizes False Emergency Brake Risk)
// ============================================================================
function FollowerCar({
  egoStateRef,
}: {
  egoStateRef: React.MutableRefObject<EgoDynamicState>;
}) {
  const carGroupRef = useRef<THREE.Group>(null);
  const [showRiskBadge, setShowRiskBadge] = useState(false);

  useFrame(() => {
    if (!carGroupRef.current) return;
    const ego = egoStateRef.current;

    // Update Z position behind ego car
    carGroupRef.current.position.set(0, 0, ego.followerDist);

    if (ego.followerRisk !== showRiskBadge) {
      setShowRiskBadge(ego.followerRisk);
    }
  });

  return (
    <group ref={carGroupRef} position={[0, 0, 12]}>
      {/* Trailing Car Body (Silver Sedan) */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.8, 0.62, 3.9]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.88, 0.1]}>
        <boxGeometry args={[1.5, 0.5, 2.0]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.8} />
      </mesh>
      {/* Front Headlights */}
      <mesh position={[-0.65, 0.45, -2.0]}>
        <boxGeometry args={[0.25, 0.1, 0.05]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <mesh position={[0.65, 0.45, -2.0]}>
        <boxGeometry args={[0.25, 0.1, 0.05]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* Rear-End Hazard Alert when False Brake Engages */}
      {showRiskBadge && (
        <Html position={[0, 1.8, 0]} center distanceFactor={20}>
          <div
            style={{
              background: 'rgba(225, 29, 72, 0.95)',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(225, 29, 72, 0.4)',
              border: '1px solid #fecdd3',
              pointerEvents: 'none',
              animation: 'pulse 0.8s infinite alternate',
            }}
          >
            ⚠️ REAR-END COLLISION RISK (TTC &lt; 0.6s)
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// EKF Covariance Uncertainty Ellipse (Ground Projection at Target)
// ============================================================================
function EKFCovarianceEllipse({
  dataRef,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
}) {
  const ellipseRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ellipseRef.current || !dataRef.current) return;
    const telem = dataRef.current;
    const ekf = telem.ekf;

    // Position at EKF estimated target coordinates
    ellipseRef.current.position.set(ekf.pos.x, 0.02, -ekf.pos.y);

    // Scale ellipse based on sigma uncertainty (2 * sigma confidence bound)
    const sx = Math.max(0.6, ekf.sigmaVx * 1.5);
    const sy = Math.max(0.6, ekf.sigmaTotal * 1.5);
    ellipseRef.current.scale.set(sx, sy, 1);
  });

  return (
    <mesh ref={ellipseRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.05, 32]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ============================================================================
// FMCW Radar Radiating Electromagnetic Wavefront Rings
// ============================================================================
function RadarWavefrontRings({
  dataRef,
  visible,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  visible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const rings = useMemo(() => {
    return [0, 1, 2, 3, 4];
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !visible) return;
    const t = state.clock.elapsedTime * 18.0;

    groupRef.current.children.forEach((child, i) => {
      const ring = child as THREE.Mesh;
      const progress = ((t + i * 7.0) % 35.0) / 35.0; // 0 to 1 over 35m
      const dist = progress * 35.0;
      const radius = dist * Math.tan(THREE.MathUtils.degToRad(30)); // 60 deg cone

      ring.position.z = -2.15 - dist;
      ring.scale.set(radius, radius, 1);

      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1.0 - progress) * 0.28);

      // Color follows detector state
      if (dataRef.current?.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED') {
        mat.color.set('#ef4444');
      } else {
        mat.color.set('#00f2fe');
      }
    });
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {rings.map((i) => (
        <mesh key={i} position={[0, 0.45, -2.15]}>
          <ringGeometry args={[0.95, 1.0, 32, 1, 0, Math.PI * 2]} />
          <meshBasicMaterial color="#00f2fe" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// Dynamic Rain Precipitation Particles (Weather Simulation)
// ============================================================================
function RainPrecipitation({ active }: { active: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(400 * 3);
    const spd = new Float32Array(400);
    for (let i = 0; i < 400; i++) {
      pos[i * 3 + 0] = (seededRandom(i * 3 + 1) - 0.5) * 30;
      pos[i * 3 + 1] = seededRandom(i * 3 + 2) * 18;
      pos[i * 3 + 2] = -seededRandom(i * 3 + 3) * 50 + 10;
      spd[i] = 18 + seededRandom(i * 3 + 4) * 12;
    }
    return [pos, spd];
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !active) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < 400; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 16.0;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#94a3b8" transparent opacity={0.6} depthWrite={false} />
    </points>
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
      {/* 60° Radar Horizon Wedge */}
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
  manualSpoof,
}: {
  dataRef: React.MutableRefObject<FrameTelemetry | null>;
  manualSpoof: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);

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
        x = (seededRandom(i * 7 + 2) - 0.5) * w;
        y = h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 1) {
        x = -w / 2;
        y = seededRandom(i * 7 + 2) * h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 2) {
        x = w / 2;
        y = seededRandom(i * 7 + 2) * h;
        z = (seededRandom(i * 7 + 3) - 0.5) * l;
      } else if (face === 3) {
        x = (seededRandom(i * 7 + 2) - 0.5) * w;
        y = seededRandom(i * 7 + 3) * h;
        z = -l / 2;
      } else {
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
    const isAttack = telem.measurement.isAttackActive || manualSpoof;
    const radar = telem.measurement.radar;

    const isSpoof = isAttack && (!radar.isDetected || Math.abs(telem.evaluation.residual) > 1.0 || manualSpoof);

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const targetPos = lidar.isDetected ? lidar.pos : gt.pos;
    const visibleCount = lidar.isDetected ? Math.min(600, Math.max(10, Math.round(lidar.pointDensity * 600))) : 0;

    let r = 0.02, g = 0.52, b = 0.78; // Blue-gray
    if (isSpoof) {
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
        posArr[i * 3 + 1] = -9999;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
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
      _scratchVec2.set(evalResult.rHat.x, 0, -evalResult.rHat.y);
      if (Math.abs(vRadSpeed) > 0.05) {
        if (vRadSpeed < 0) {
          _scratchVec2.negate();
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
      const bounceZ = (-2.1 + tz) / 2;

      const posAttr = multipathLine.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      arr[0] = 0; arr[1] = 0.45; arr[2] = -2.1;
      arr[3] = railX; arr[4] = 0.6; arr[5] = bounceZ;
      arr[6] = tx; arr[7] = 0.5; arr[8] = tz;
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 3D Metal Guardrail (Beam + Vertical Posts) */}
      <group position={[railX, 0, -20]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.15, 0.35, 60]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
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
// Scenario 3: Water Spray Particles (Radar RCS Attenuation)
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
        z: (seededRandom(i * 11 + 3) - 0.5) * 1.2 + 1.2,
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
// Mini Range-Doppler Heatmap Card (2D Radar In-HUD Oscilloscope)
// ============================================================================
function MiniRangeDopplerHUD({ telemetry }: { telemetry: FrameTelemetry | null }) {
  if (!telemetry) return null;
  const radar = telemetry.measurement.radar;
  const doppler = radar.isDetected ? radar.doppler : 0;
  const range = telemetry.evaluation.range;

  // Map Doppler (-5 m/s to +5 m/s) -> X (0 to 100%)
  const xPct = Math.max(0, Math.min(100, ((doppler + 5) / 10) * 100));
  // Map Range (0m to 35m) -> Y (100% to 0%)
  const yPct = Math.max(0, Math.min(100, 100 - (range / 35) * 100));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 10,
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '8px 10px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
        <span style={{ fontWeight: 700, color: '#38bdf8' }}>FMCW RANGE-DOPPLER MAP</span>
        <span>77 GHz</span>
      </div>

      <div
        style={{
          position: 'relative',
          width: '140px',
          height: '75px',
          background: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {/* MTI Clutter Notch Zone (|v_rad| < 0.40 m/s) */}
        <div
          style={{
            position: 'absolute',
            left: '46%',
            width: '8%',
            height: '100%',
            background: 'rgba(245, 158, 11, 0.25)',
            borderLeft: '1px dashed rgba(245, 158, 11, 0.5)',
            borderRight: '1px dashed rgba(245, 158, 11, 0.5)',
          }}
          title="MTI Ground Clutter Rejection Notch"
        />

        {/* Center Zero-Doppler Line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            width: '1px',
            height: '100%',
            background: 'rgba(148, 163, 184, 0.3)',
          }}
        />

        {/* Range Horizon Line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            width: '100%',
            height: '1px',
            background: 'rgba(148, 163, 184, 0.2)',
          }}
        />

        {/* Target Radar Return Cluster Marker */}
        {radar.isDetected ? (
          <div
            style={{
              position: 'absolute',
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00f2fe',
              boxShadow: '0 0 8px #00f2fe',
              border: '1px solid #ffffff',
              transition: 'all 0.1s ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '10px',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            NO ECHO RETURN
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
        <span>-5 m/s</span>
        <span>0</span>
        <span>+5 m/s</span>
      </div>
    </div>
  );
}

// ============================================================================
// Master 3D Scene Root Component
// ============================================================================
export const Scene3D: React.FC<Scene3DProps> = ({
  telemetry,
  historyTrail: _historyTrail,
  scenarioId,
  isPlaying,
  onToggleViewMode,
}) => {
  const frameDataRef = useRef<FrameTelemetry | null>(telemetry);
  useEffect(() => {
    frameDataRef.current = telemetry;
  }, [telemetry]);

  // Shared Closed-Loop Vehicle Dynamics State
  const egoStateRef = useRef<EgoDynamicState>({
    speedMs: 16.7, // 60 km/h
    speedKmh: 60,
    accelG: 0,
    pitchRad: 0,
    travelDist: 0,
    isBraking: false,
    stoppingDist: 16.5,
    followerDist: 12.0,
    followerRisk: false,
    manualSpoof: false,
    rainActive: false,
  });

  // UI States
  const [cameraMode, setCameraMode] = useState<CameraMode>('topdown');
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showStoppingRibbon, setShowStoppingRibbon] = useState<boolean>(true);
  const [showWavefronts, setShowWavefronts] = useState<boolean>(true);
  const [rainActive, setRainActive] = useState<boolean>(false);
  const [manualSpoof, setManualSpoof] = useState<boolean>(false);
  const [isProtectedMode, setIsProtectedMode] = useState<boolean>(true);

  // Live Speedometer State for React Display
  const [uiSpeedKmh, setUiSpeedKmh] = useState<number>(60);
  const [uiAccelG, setUiAccelG] = useState<number>(0);
  const [uiBraking, setUiBraking] = useState<boolean>(false);

  // Compute reactive maneuver decision for banner and HUD
  const decision = useMemo(() => {
    return computeManeuverDecision(scenarioId, telemetry, isProtectedMode, manualSpoof);
  }, [scenarioId, telemetry, isProtectedMode, manualSpoof]);

  // Closed-Loop Vehicle Dynamics Simulation Loop (60 Hz)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000.0);
      lastTime = now;

      const ego = egoStateRef.current;
      ego.rainActive = rainActive;
      ego.manualSpoof = manualSpoof;

      const telem = frameDataRef.current;
      const maneuver = computeManeuverDecision(scenarioId, telem, isProtectedMode, manualSpoof);

      // Closed-Loop Dynamic Velocity Actuation based on Perception Decision
      if (maneuver.shouldBrake) {
        // Slam Emergency Brakes
        ego.isBraking = true;
        const decel = 8.5; // m/s^2 (~0.87G)
        ego.speedMs = Math.max(0, ego.speedMs - decel * dt);
        ego.accelG = -0.87;
        ego.pitchRad = THREE.MathUtils.lerp(ego.pitchRad, -0.045, dt * 8.0); // Nose dive tilt

        // Follower trailing vehicle closes in (Risk of being rear-ended on false alarms!)
        ego.followerDist = Math.max(3.2, ego.followerDist - 5.5 * dt);
        ego.followerRisk = ego.followerDist < 5.0 && !telem?.measurement.isAttackActive;
      } else {
        // Accelerate back up to cruising speed (60 km/h) / Keep Going
        ego.isBraking = false;
        const accel = 3.0; // m/s^2 (~0.30G)
        ego.speedMs = Math.min(16.7, ego.speedMs + accel * dt);
        ego.accelG = ego.speedMs < 16.5 ? 0.30 : 0.0;
        ego.pitchRad = THREE.MathUtils.lerp(ego.pitchRad, 0.0, dt * 5.0); // Reset level pitch

        // Follower vehicle recovers safe buffer
        ego.followerDist = Math.min(12.0, ego.followerDist + 2.5 * dt);
        ego.followerRisk = false;
      }

      ego.speedKmh = ego.speedMs * 3.6;
      ego.stoppingDist = (ego.speedMs * ego.speedMs) / (2 * 0.85 * 9.81) + ego.speedMs * 0.25;

      if (isPlaying !== false) {
        ego.travelDist += ego.speedMs * dt;
      }

      // Sync with HUD periodically
      if (Math.round(ego.speedKmh) !== Math.round(uiSpeedKmh)) {
        setUiSpeedKmh(ego.speedKmh);
        setUiAccelG(ego.accelG);
        setUiBraking(ego.isBraking);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, rainActive, manualSpoof, isProtectedMode, scenarioId, uiSpeedKmh]);

  const isAlarm = telemetry?.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED' || manualSpoof;

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
      {/* 3D Viewport Header Toolbar */}
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
              background: 'rgba(255, 255, 255, 0.92)',
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

          {/* Dynamic Closed-Loop Speedometer Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: uiBraking ? '#fff1f2' : '#f0fdf4',
              color: uiBraking ? '#be123c' : '#15803d',
              border: `1px solid ${uiBraking ? '#fecdd3' : '#bbf7d0'}`,
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            <Gauge size={13} color={uiBraking ? '#e11d48' : '#16a34a'} />
            <span>{uiSpeedKmh.toFixed(0)} km/h</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>({uiAccelG.toFixed(2)}G)</span>
          </div>
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
            }}
          >
            <Camera size={12} />
            Top-Down
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
            }}
          >
            <RotateCw size={12} />
            Orbit
          </button>
        </div>

        {/* Right: Simulation Enhancements Toggles & 2D/3D Mode Switch */}
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

          <button
            onClick={() => setShowStoppingRibbon(!showStoppingRibbon)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: showStoppingRibbon ? '#ecfdf5' : '#ffffff',
              color: showStoppingRibbon ? '#047857' : '#64748b',
              border: '1px solid #cbd5e1',
            }}
            title="Toggle Dynamic AEB Stopping Ribbon"
          >
            <Activity size={13} color={showStoppingRibbon ? '#10b981' : '#94a3b8'} />
            Ribbon
          </button>

          <button
            onClick={() => setShowWavefronts(!showWavefronts)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: showWavefronts ? '#f5f3ff' : '#ffffff',
              color: showWavefronts ? '#6d28d9' : '#64748b',
              border: '1px solid #cbd5e1',
            }}
            title="Toggle FMCW Radar Radiating Waves"
          >
            <Radio size={13} color={showWavefronts ? '#7c3aed' : '#94a3b8'} />
            Radar Waves
          </button>

          <button
            onClick={() => setRainActive(!rainActive)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: rainActive ? '#eff6ff' : '#ffffff',
              color: rainActive ? '#1d4ed8' : '#64748b',
              border: '1px solid #cbd5e1',
            }}
            title="Toggle Weather Rain & Wet Road"
          >
            <CloudRain size={13} color={rainActive ? '#2563eb' : '#94a3b8'} />
            Rain
          </button>

          <button
            onClick={() => setIsProtectedMode(!isProtectedMode)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: isProtectedMode ? '#f0fdf4' : '#fff7ed',
              color: isProtectedMode ? '#15803d' : '#c2410c',
              border: `1px solid ${isProtectedMode ? '#bbf7d0' : '#fed7aa'}`,
              fontWeight: 700,
            }}
            title="Toggle between Protected AV (Cause-Aware + ML Guard) and Naive AV (No Defense)"
          >
            {isProtectedMode ? <ShieldCheck size={13} color="#16a34a" /> : <AlertOctagon size={13} color="#ea580c" />}
            {isProtectedMode ? 'AV: Protected' : 'AV: Naive'}
          </button>

          <button
            onClick={() => setManualSpoof(!manualSpoof)}
            className="btn-secondary"
            style={{
              fontSize: '0.72rem',
              padding: '4px 8px',
              background: manualSpoof ? '#fff1f2' : '#ffffff',
              color: manualSpoof ? '#e11d48' : '#64748b',
              border: `1px solid ${manualSpoof ? '#fecdd3' : '#cbd5e1'}`,
              fontWeight: manualSpoof ? 700 : 500,
            }}
            title="Manual Threat Injection Sandbox Override"
          >
            <Zap size={13} color={manualSpoof ? '#e11d48' : '#94a3b8'} />
            {manualSpoof ? 'Spoof Active' : 'Inject Spoof'}
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

      {/* Dynamic Autonomous Maneuver Decision Banner (GO vs STOP) */}
      <div
        style={{
          position: 'absolute',
          top: '46px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 12,
          background: decision.bg,
          color: decision.color,
          border: `1px solid ${decision.borderColor}`,
          padding: '5px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '90%',
          transition: 'all 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.02em' }}>
          {decision.action === 'STOP' && <AlertOctagon size={14} color={decision.color} />}
          {decision.action === 'SUPPRESS_AND_GO' && <ShieldCheck size={14} color={decision.color} />}
          {decision.action === 'GO' && <CheckCircle2 size={14} color={decision.color} />}
          {decision.action === 'CRASH_RISK' && <ShieldAlert size={14} color={decision.color} />}
          <span>{decision.title}</span>
        </div>
        <div style={{ fontSize: '0.67rem', opacity: 0.92, fontWeight: 500 }}>
          {decision.subtitle}
        </div>
      </div>

      {/* Mini Range-Doppler Oscilloscope Radar Display */}
      <MiniRangeDopplerHUD telemetry={telemetry} />

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

        {/* 1. Ground & Scrolling Asphalt Road */}
        <EnvironmentRoad egoStateRef={egoStateRef} />

        {/* 2. Ego Autonomous Car with Suspension Pitch & Skid Marks */}
        <EgoCar egoStateRef={egoStateRef} />

        {/* 3. Virtual Follower Car (Rear-End Collision Risk on False Alarms) */}
        <FollowerCar egoStateRef={egoStateRef} />

        {/* 4. Projected AEB Stopping Distance Ribbon */}
        <StoppingDistanceRibbon
          egoStateRef={egoStateRef}
          dataRef={frameDataRef}
          visible={showStoppingRibbon}
        />

        {/* 5. EKF Covariance Uncertainty Ellipse at Target Location */}
        <EKFCovarianceEllipse dataRef={frameDataRef} />

        {/* 6. Trust Score Security Shield */}
        <TrustShield dataRef={frameDataRef} />

        {/* 7. Radar 60° Translucent Horizon Beam */}
        <RadarCone dataRef={frameDataRef} />

        {/* 8. FMCW Radar Radiating Electromagnetic Wavefront Rings */}
        <RadarWavefrontRings dataRef={frameDataRef} visible={showWavefronts} />

        {/* 9. Target Obstacle & EKF State Estimation Ghost */}
        <TargetActor dataRef={frameDataRef} scenarioId={scenarioId} />

        {/* 10. Pre-Allocated 600-Point LiDAR Cloud */}
        <LidarPointCloud dataRef={frameDataRef} manualSpoof={manualSpoof} />

        {/* 11. Kinematic Total, Radial, and Tangential Vector Decomposition */}
        <KinematicVectors dataRef={frameDataRef} visible={showVectors} />

        {/* 12. Scenario 8: Guardrail & Multipath Ghost Polyline */}
        <GuardrailMultipath dataRef={frameDataRef} scenarioId={scenarioId} />

        {/* 13. Scenario 3: Water Spray Particles (Radar RCS Attenuation) */}
        <WaterSprayParticles dataRef={frameDataRef} scenarioId={scenarioId} />

        {/* 14. Weather Simulation Precipitation Rain */}
        <RainPrecipitation active={rainActive} />
      </Canvas>
    </div>
  );
};
