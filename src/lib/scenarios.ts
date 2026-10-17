// ============================================================================
// Scenario Catalog & Synthetic Measurement Generator
// Comprehensive Real-World AV Sensor Integrity Benchmarks
// ============================================================================

import {
  ScenarioId,
  ScenarioDefinition,
  SimulationParams,
  SensorMeasurement,
  Vector2D,
} from '../types';
import { randomGaussian } from './kinematics-engine';

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  sigmaRadar: 0.35, // 77 GHz FMCW radar Doppler measurement standard deviation (m/s)
  sigmaLidar: 0.12, // 3D LiDAR position measurement standard deviation (m)
  chiGate: 2.50, // Chi-square Mahalanobis gating limit (~99% confidence)
  tangentialEpsilon: 0.25, // Cutoff aspect fraction |cos phi| for tangential motion
  clutterNotchSpeed: 0.40, // Radar MTI hardware filter zero-Doppler clutter cutoff (m/s)
  alphaDecay: 0.20, // Rapid trust penalty per unverified frame (5 frames to 0)
  betaRecovery: 0.05, // Conservative trust restoration per consistent frame (20 frames to 1)
  trustThreshold: 0.35, // Trust alarm trip threshold
  streakThreshold: 3, // Consecutive frames required to confirm attack
};

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  scen_1_cyclist_tangential: {
    id: 'scen_1_cyclist_tangential',
    category: 'Core Scenarios',
    title: '1. Benign Tangential Crossing (Clutter Notch)',
    subtitle: 'Cyclist traverses perpendicular to ego vehicle; radial speed drops into MTI clutter filter',
    targetType: 'Cyclist',
    durationSec: 5.0,
    initialPos: { x: -8.0, y: 13.0 },
    initialVel: { x: 4.5, y: 0.0 },
    headingDeg: 0,
    threatDescription: 'BENIGN PHYSICAL PHENOMENON (Zero Adversarial Attack)',
    physicalPhenomenon:
      'As the cyclist crosses the road perpendicularly, line-of-sight geometry causes expected radial speed |v_rad| to drop below 0.40 m/s. The radar MTI filter discards the return to prevent stationary ground tarmac clutter. Naive detectors trigger catastrophic false emergency braking.',
    detectorExpectedBehavior: {
      naiveStrict: 'FAILS (Trips false emergency brake when radar drops)',
      naiveLoose: 'Passes (Wide threshold ignores missing return briefly)',
      strictPersist: 'FAILS (Sustained missing return trips false brake at frame 3)',
      causeAware: 'OPTIMAL (Detects |v_rad| < 0.40 m/s, flags BENIGN_CLUTTER_NOTCH_DROP, zero false alarms)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_2_phantom_spoof: {
    id: 'scen_2_phantom_spoof',
    category: 'Core Scenarios',
    title: '2. Injected Phantom Obstacle (Optical Spoofing)',
    subtitle: 'Adversary injects high-density synthetic point clouds on empty highway',
    targetType: 'Synthetic Phantom Vehicle',
    durationSec: 6.0,
    initialPos: { x: 0.2, y: 14.5 },
    initialVel: { x: 0.0, y: 2.8 },
    headingDeg: 90,
    threatDescription: 'ACTIVE OPTICAL INJECTION ATTACK (Laser pulse synthesis)',
    physicalPhenomenon:
      'Adversary projects precisely timed laser pulses synthesizing a realistic vehicle 14m ahead. Radar FMCW physical channel confirms clear, empty asphalt with zero reflection. Causes naive systems to slam on brakes.',
    detectorExpectedBehavior: {
      naiveStrict: 'Alarms immediately on discrepancy',
      naiveLoose: 'Alarms (Discrepancy exceeds 4.5 sigma)',
      strictPersist: 'Alarms after 3 frames latency (0.15s)',
      causeAware: 'OPTIMAL (Verifies zero prior radar track history, triggers SPOOF_ATTACK_CONFIRMED within 3 frames)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_3_rcs_dropout: {
    id: 'scen_3_rcs_dropout',
    category: 'Core Scenarios',
    title: '3. Momentary Radar RCS Multipath Dropout',
    subtitle: 'Preceding car experiences road spray / destructive ground bounce for 2 frames',
    targetType: 'Passenger Sedan Ahead',
    durationSec: 5.5,
    initialPos: { x: 0.3, y: 16.0 },
    initialVel: { x: 0.0, y: 3.5 },
    headingDeg: 90,
    threatDescription: 'BENIGN RF MULTIPATH PHENOMENON (Pavement water interference)',
    physicalPhenomenon:
      'Between t=2.0s and t=2.3s, wet asphalt destructive multipath phase cancellation causes radar SNR to briefly drop to 4 dB (< 10 dB threshold). LiDAR point cloud remains 100% dense.',
    detectorExpectedBehavior: {
      naiveStrict: 'FAILS (Trips false emergency alarm during the 2 drop frames)',
      naiveLoose: 'Passes (Ignores transient gap)',
      strictPersist: 'Passes (Counter does not reach 3)',
      causeAware: 'OPTIMAL (Validates track age > 5 and dense LiDAR, flags BENIGN_RCS_DROPOUT, 0% false alarms)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_4_loose_bypass: {
    id: 'scen_4_loose_bypass',
    category: 'Core Scenarios',
    title: '4. Calibrated Gate Bypass Attack (+1.35 m/s)',
    subtitle: 'Adversary calculates naive loose threshold (+4.50σ) and injects calibrated offset',
    targetType: 'Preceding Vehicle',
    durationSec: 5.0,
    initialPos: { x: 0.1, y: 15.0 },
    initialVel: { x: 0.0, y: 3.2 },
    headingDeg: 90,
    threatDescription: 'STEALTH ADVERSARIAL ATTACK (Targeted threshold exploitation)',
    physicalPhenomenon:
      'Adversary injects a +1.35 m/s velocity offset (~3.8 sigma). Naive loose detectors (tuned to +/- 4.5 sigma to stop false alarms) are completely blinded. Ego vehicle fails to brake before impact.',
    detectorExpectedBehavior: {
      naiveStrict: 'Alarms (Exceeds 2.5 sigma)',
      naiveLoose: 'FAILS CATASTROPHICALLY (Blind: 3.8σ < 4.5σ, 0% detection)',
      strictPersist: 'Alarms after 3 frames',
      causeAware: 'OPTIMAL (Longitudinal motion |cos phi| ≈ 1.0 maintains strict 2.50σ gate, reliably catches attack)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_5_slow_creep: {
    id: 'scen_5_slow_creep',
    category: 'Smarter Adversarial Attacks',
    title: '5. Slow Velocity Creep (Ramped Drift Attack)',
    subtitle: 'Injected velocity ramps gradually at +0.40 m/s² to evade single-frame triggers',
    targetType: 'Lead Vehicle',
    durationSec: 6.0,
    initialPos: { x: 0.2, y: 16.5 },
    initialVel: { x: 0.0, y: 3.0 },
    headingDeg: 90,
    threatDescription: 'ACTIVE ADVERSARIAL ATTACK (Ramped velocity drift evading per-frame threshold)',
    physicalPhenomenon:
      'Attacker slowly increases injected LiDAR velocity (+0.02 m/s per frame). Single-frame gates are evaded initially, but continuous unverified innovation erodes the asymmetric trust accumulator.',
    detectorExpectedBehavior: {
      naiveStrict: 'Delays alarm until frame 12',
      naiveLoose: 'Delays alarm until frame 28 or misses entirely',
      strictPersist: 'Delays until drift breaches gate continuously',
      causeAware: 'OPTIMAL (Trust accumulator integrates subtle persistent drift, alarms by frame 5)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_6_phantom_tangential: {
    id: 'scen_6_phantom_tangential',
    category: 'Smarter Adversarial Attacks',
    title: '6. Phantom in Tangential Blind Zone (Exploit Attempt)',
    subtitle: 'Attacker projects a lateral phantom to trick benign tangential attribution rules',
    targetType: 'Lateral Synthetic Phantom',
    durationSec: 5.0,
    initialPos: { x: -6.0, y: 12.0 },
    initialVel: { x: 4.8, y: 0.0 },
    headingDeg: 0,
    threatDescription: 'INTELLIGENT ADVERSARIAL ATTACK (Rule evasion attempt)',
    physicalPhenomenon:
      'Attacker knows the AV has a tangential Doppler exemption rule, so they project a phantom crossing laterally. Cause-aware engine defeats this by checking for prior radar track existence and environmental entry consistency.',
    detectorExpectedBehavior: {
      naiveStrict: 'Alarms on missing radar return',
      naiveLoose: 'Passes (Wide gate)',
      strictPersist: 'Alarms after 3 frames',
      causeAware: 'OPTIMAL (Detects synthetic obstacle with 0 radar track history, overrides tangential rule, confirms attack)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_7_pulsed_spoof: {
    id: 'scen_7_pulsed_spoof',
    category: 'Smarter Adversarial Attacks',
    title: '7. Pulsed Fake Dropouts (Anti-Persistence Spoof)',
    subtitle: 'Adversary toggles optical pulses at 3 Hz (1 frame on, 1 frame off) to reset N=3 counters',
    targetType: 'Preceding Vehicle',
    durationSec: 5.5,
    initialPos: { x: 0.1, y: 15.0 },
    initialVel: { x: 0.0, y: 3.0 },
    headingDeg: 90,
    threatDescription: 'ANTI-PERSISTENCE PULSED ATTACK (Square-wave injection)',
    physicalPhenomenon:
      'Adversary pulses spoofing on for 1 frame and off for 1 frame. Integer persistence counters reset to zero on every off frame and NEVER fire. Asymmetric leaky trust accumulator (alpha=0.20 >> beta=0.05) preserves memory and exhausts trust.',
    detectorExpectedBehavior: {
      naiveStrict: 'Oscillates alarm on and off erratically',
      naiveLoose: 'Oscillates or stays silent',
      strictPersist: 'FAILS COMPLETELY (Counter resets every frame, 0% detection)',
      causeAware: 'OPTIMAL (Asymmetric decay -0.20 vs recovery +0.05 drains trust to 0, locks confirmed alarm)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_8_guardrail_multipath: {
    id: 'scen_8_guardrail_multipath',
    category: 'Rich Benign Physical Artifacts',
    title: '8. Guardrail Multipath Ghost Reflection',
    subtitle: 'Radio chirp bounces off metallic highway guardrail, creating Doppler-shifted ghost return',
    targetType: 'Vehicle near Guardrail',
    durationSec: 5.0,
    initialPos: { x: 1.8, y: 16.0 },
    initialVel: { x: 0.0, y: 3.5 },
    headingDeg: 90,
    threatDescription: 'BENIGN RF ARTIFACT (Metallic specular reflection)',
    physicalPhenomenon:
      'Radar pulse reflects from car side panel to guardrail and back, creating an elongated ghost Doppler return (+1.8 m/s). 3D LiDAR spatial bounding box confirms true vehicle location.',
    detectorExpectedBehavior: {
      naiveStrict: 'Trips false alarm on Doppler offset',
      naiveLoose: 'Passes',
      strictPersist: 'Trips false alarm after 3 frames',
      causeAware: 'OPTIMAL (Correlates with guardrail boundary geometry, isolates primary reflection, suppresses false alarm)',
    },
    recommendedPlaybackSpeed: 1.0,
  },

  scen_9_boresight_drift: {
    id: 'scen_9_boresight_drift',
    category: 'Rich Benign Physical Artifacts',
    title: '9. Sensor Boresight Alignment Drift (1.5°)',
    subtitle: 'Chassis road vibration causes mechanical sensor angle drift, inducing persistent 0.8σ bias',
    targetType: 'Target Car Ahead',
    durationSec: 5.0,
    initialPos: { x: 0.4, y: 18.0 },
    initialVel: { x: 0.0, y: 3.2 },
    headingDeg: 90,
    threatDescription: 'BENIGN MECHANICAL WEAR (Mounting bracket vibration)',
    physicalPhenomenon:
      'Long-term road rumble misaligns radar boresight by 1.5 degrees, inducing a persistent +0.8 sigma Doppler bias. The bounded innovation is absorbed cleanly within the 2.50 sigma gate without trust degradation.',
    detectorExpectedBehavior: {
      naiveStrict: 'Normal (Stays below 2.5 sigma)',
      naiveLoose: 'Normal',
      strictPersist: 'Normal',
      causeAware: 'OPTIMAL (Maintains steady 1.0 trust score with zero false alarms)',
    },
    recommendedPlaybackSpeed: 1.0,
  },
};

/**
 * Generates synthetic sensor measurements for a given scenario at time t (seconds)
 */
export function generateScenarioMeasurement(
  scenarioId: ScenarioId,
  timeSec: number,
  frameIndex: number,
  params: SimulationParams
): SensorMeasurement {
  const scen = SCENARIOS[scenarioId];

  // Ground truth kinematics integration
  let truePosX = scen.initialPos.x + scen.initialVel.x * timeSec;
  let truePosY = scen.initialPos.y + scen.initialVel.y * timeSec;
  let trueVx = scen.initialVel.x;
  let trueVy = scen.initialVel.y;
  let headingDeg = scen.headingDeg;

  let isAttackActive = false;
  let attackType: string | undefined = undefined;
  let explanation = scen.subtitle;

  // Sensor state defaults
  let lidarDetected = true;
  let lidarPointDensity = 0.95;
  let lidarNoiseX = randomGaussian(0, params.sigmaLidar);
  let lidarNoiseY = randomGaussian(0, params.sigmaLidar);

  let radarDetected = true;
  let radarDopplerNoise = randomGaussian(0, params.sigmaRadar);
  let radarSnrDb = 18.0 + randomGaussian(0, 1.2);
  let radarTrackAge = frameIndex + 1;
  let rangeElongation = 0.0;
  let nearReflector = false;

  // Target range and LOS for ground truth
  const trueRange = Math.max(0.1, Math.sqrt(truePosX * truePosX + truePosY * truePosY));
  const rHatX = truePosX / trueRange;
  const rHatY = truePosY / trueRange;
  const trueRadSpeed = trueVx * rHatX + trueVy * rHatY;

  // Scenario-specific kinematics & perturbations
  switch (scenarioId) {
    case 'scen_1_cyclist_tangential': {
      // Cyclist crossing laterally from x=-8.0 to x=+8.0 at 4.5 m/s
      // Radial speed drops to near zero around center x in [-1.5, +1.5]
      const currentRadSpeed = trueVx * rHatX + trueVy * rHatY;
      if (Math.abs(currentRadSpeed) < params.clutterNotchSpeed) {
        // Radar MTI notch drops return
        radarDetected = false;
        radarSnrDb = 2.0;
        explanation = `Cyclist |v_rad| = ${Math.abs(currentRadSpeed).toFixed(2)} m/s < ${params.clutterNotchSpeed} m/s notch. Radar hardware discarded return.`;
      } else {
        radarDetected = true;
        explanation = `Cyclist in motion. Radial aspect |cos phi| is low (${(Math.abs(currentRadSpeed) / 4.5).toFixed(2)}).`;
      }
      break;
    }

    case 'scen_2_phantom_spoof': {
      // Attack active from t = 1.0s to 5.5s
      if (timeSec >= 1.0 && timeSec <= 5.5) {
        isAttackActive = true;
        attackType = 'OPTICAL_PHANTOM_INJECTION';
        // Attacker synthesizes dense LiDAR points ahead
        lidarDetected = true;
        lidarPointDensity = 0.96;
        // Radar physical channel has NO return on empty roadway
        radarDetected = false;
        radarSnrDb = 1.5;
        radarTrackAge = 0;
        explanation = 'ATTACK ACTIVE: Synthetic laser pulses injected into LiDAR; Radar confirms empty roadway.';
      } else {
        // Outside attack window: clear roadway, no target
        lidarDetected = false;
        radarDetected = false;
        lidarPointDensity = 0.0;
      }
      break;
    }

    case 'scen_3_rcs_dropout': {
      // Vehicle ahead. Momentary 2-frame radar RCS multipath dropout (~0.10s)
      radarTrackAge = Math.max(6, frameIndex);
      if (timeSec >= 2.0 && timeSec < 2.10) {
        radarDetected = false;
        radarSnrDb = 4.2; // below 10 dB threshold
        explanation = 'Pavement water bounce caused destructive phase interference; radar SNR dropped to 4.2 dB.';
      } else {
        radarDetected = true;
        explanation = 'Normal tracking of preceding vehicle ahead.';
      }
      break;
    }

    case 'scen_4_loose_bypass': {
      // Attacker injects calibrated +1.35 m/s velocity offset (+3.8σ) into LiDAR tracking
      if (timeSec >= 1.0) {
        isAttackActive = true;
        attackType = 'CALIBRATED_VELOCITY_OFFSET';
        const attackDt = timeSec - 1.0;
        truePosY += 1.35 * attackDt;
        trueVy += 1.35;
        explanation = 'ATTACK ACTIVE: LiDAR velocity biased by +1.35 m/s (+3.8σ) to evade naive loose ±4.5σ threshold.';
      }
      break;
    }

    case 'scen_5_slow_creep': {
      // Ramped attack starting at t=1.0s: velocity ramps +0.40 m/s^2
      if (timeSec >= 1.0) {
        isAttackActive = true;
        attackType = 'RAMPED_VELOCITY_CREEP';
        const creepDt = timeSec - 1.0;
        const deltaV = 0.40 * creepDt;
        truePosY += 0.5 * 0.40 * creepDt * creepDt;
        trueVy += deltaV;
        explanation = `ATTACK ACTIVE: Velocity creeping at +0.40 m/s² (Current offset: +${deltaV.toFixed(2)} m/s).`;
      }
      break;
    }

    case 'scen_6_phantom_tangential': {
      // Attacker injects a synthetic phantom moving sideways to fool tangential rule
      isAttackActive = true;
      attackType = 'TANGENTIAL_PHANTOM_EXPLOIT';
      lidarDetected = true;
      lidarPointDensity = 0.94;
      radarDetected = false;
      radarTrackAge = 0; // No prior track history!
      radarSnrDb = 2.0;
      explanation = 'ATTACK ACTIVE: Sideways phantom injected to trick tangential rule; Cause-aware catches 0 radar history.';
      break;
    }

    case 'scen_7_pulsed_spoof': {
      // 5 Hz square wave pulse (1 frame on, 1 frame off at 20 Hz)
      if (timeSec >= 0.8) {
        isAttackActive = true;
        attackType = 'PULSED_SQUARE_WAVE';
        const frameOffset = Math.round((timeSec - 0.8) / 0.05);
        const isPulseOn = frameOffset % 2 === 0;
        const activePulseCount = Math.floor(frameOffset / 2) + 1;
        truePosY += activePulseCount * (2.2 * 0.05);
        if (isPulseOn) {
          trueVy += 2.2;
          explanation = 'PULSE ON: Optical spoofing pulse active (+2.2 m/s offset).';
        } else {
          explanation = 'PULSE OFF: Pulse paused to trick integer N=3 persistence counters.';
        }
      }
      break;
    }

    case 'scen_8_guardrail_multipath': {
      // Specular bounce off highway guardrail elevates radar Doppler by +1.8 m/s
      if (timeSec >= 1.2 && timeSec <= 3.8) {
        radarDopplerNoise += 1.8; // Multipath Doppler shift
        rangeElongation = 1.4; // 1.4m path elongation
        nearReflector = true; // Near guardrail
        explanation = 'Specular bounce from car side panel to guardrail elevated Doppler by +1.8 m/s.';
      }
      break;
    }

    case 'scen_9_boresight_drift': {
      // 1.5 degree mechanical boresight shift adds steady +0.28 m/s (~0.8 sigma) Doppler bias
      radarDopplerNoise += 0.28;
      explanation = 'Mechanical chassis vibration induced 1.5° boresight drift (+0.8σ bounded bias).';
      break;
    }
  }

  // Synthesize LiDAR measured position
  const lidarPos: Vector2D = {
    x: truePosX + lidarNoiseX,
    y: truePosY + lidarNoiseY,
  };

  // Synthesize Radar Doppler measurement
  const measuredDoppler = trueRadSpeed + radarDopplerNoise;

  return {
    time: timeSec,
    frameIndex,
    groundTruth: {
      pos: { x: truePosX, y: truePosY },
      vel: { x: trueVx, y: trueVy },
      speed: Math.sqrt(trueVx * trueVx + trueVy * trueVy),
      headingDeg,
    },
    lidar: {
      pos: lidarPos,
      isDetected: lidarDetected,
      pointDensity: lidarPointDensity,
    },
    radar: {
      doppler: measuredDoppler,
      isDetected: radarDetected,
      snrDb: Math.max(1.0, radarSnrDb),
      trackAge: radarTrackAge,
      rangeElongation,
      nearReflector,
    },
    rangeElongation,
    nearReflector,
    isAttackActive,
    attackType,
    scenarioExplanation: explanation,
  };
}
