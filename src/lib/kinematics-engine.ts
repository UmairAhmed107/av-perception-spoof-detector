// ============================================================================
// Kinematics, Velocity Decomposition & Attribution Engine
// Core Mathematical & Algorithmic Framework
// ============================================================================

import {
  Vector2D,
  AttributionCategory,
  AlarmStatus,
  DetectorVerdict,
  PipelineEvaluation,
  SensorMeasurement,
  EKFState,
  SimulationParams,
} from '../types';

/**
 * High-speed Gaussian noise generator using Box-Muller transform
 */
let hasSpareGaussian = false;
let spareGaussian = 0;

export function randomGaussian(mean: number = 0, stdDev: number = 1): number {
  if (hasSpareGaussian) {
    hasSpareGaussian = false;
    return spareGaussian * stdDev + mean;
  }

  let u = 0;
  let v = 0;
  let s = 0;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);

  const mul = Math.sqrt((-2 * Math.log(s)) / s);
  spareGaussian = v * mul;
  hasSpareGaussian = true;
  return u * mul * stdDev + mean;
}

/**
 * Computes Target Range, Azimuth, and LOS Unit Vector r_hat
 */
export function computeLOS(pos: Vector2D): {
  range: number;
  azimuthDeg: number;
  rHat: Vector2D;
} {
  const range = Math.max(0.1, Math.sqrt(pos.x * pos.x + pos.y * pos.y));
  const azimuthRad = Math.atan2(pos.y, pos.x);
  const azimuthDeg = (azimuthRad * 180.0) / Math.PI;

  return {
    range,
    azimuthDeg,
    rHat: {
      x: pos.x / range,
      y: pos.y / range,
    },
  };
}

/**
 * Kinematic Decomposition of 2D Velocity:
 * - Scalar radial expected Doppler: v_rad = v . r_hat
 * - Radial vector: v_rad_vec = (v . r_hat) * r_hat
 * - Tangential vector: v_tan_vec = v - v_rad_vec
 * - Aspect fraction: |cos phi|
 */
export function decomposeVelocity(
  vel: Vector2D,
  rHat: Vector2D
): {
  vExpectedRad: number;
  vRadVec: Vector2D;
  vTanVec: Vector2D;
  vTanSpeed: number;
  cosPhi: number;
  aspectAngleDeg: number;
} {
  const vExpectedRad = vel.x * rHat.x + vel.y * rHat.y;
  const vRadVec: Vector2D = {
    x: vExpectedRad * rHat.x,
    y: vExpectedRad * rHat.y,
  };
  const vTanVec: Vector2D = {
    x: vel.x - vRadVec.x,
    y: vel.y - vRadVec.y,
  };
  const vTanSpeed = Math.sqrt(vTanVec.x * vTanVec.x + vTanVec.y * vTanVec.y);

  const totalSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  let cosPhi = 1.0;
  if (totalSpeed > 0.05) {
    cosPhi = Math.abs(vExpectedRad) / totalSpeed;
    cosPhi = Math.min(1.0, Math.max(0.0, cosPhi));
  }

  const aspectAngleDeg = (Math.acos(cosPhi) * 180.0) / Math.PI;

  return {
    vExpectedRad,
    vRadVec,
    vTanVec,
    vTanSpeed,
    cosPhi,
    aspectAngleDeg,
  };
}

/**
 * State container for tracker persistence and temporal trust across frames
 */
export interface EvaluationHistory {
  trustScore: number;
  consecutiveUnattributed: number;
  strictConsecutiveCount: number;
  currentBenignCause?: AttributionCategory;
  consecutiveBenignCount: number;
  lastResidualSign: number;
  sameSignResidualStreak: number;
  alarmLatchCountdown: number;
  cumulativeStats: {
    naiveStrict: { falseAlarms: number; trueDetections: number };
    naiveLoose: { falseAlarms: number; trueDetections: number };
    strictPersist: { falseAlarms: number; trueDetections: number };
    causeAware: { falseAlarms: number; trueDetections: number };
  };
}

export function createInitialHistory(): EvaluationHistory {
  return {
    trustScore: 1.0,
    consecutiveUnattributed: 0,
    strictConsecutiveCount: 0,
    currentBenignCause: undefined,
    consecutiveBenignCount: 0,
    lastResidualSign: 0,
    sameSignResidualStreak: 0,
    alarmLatchCountdown: 0,
    cumulativeStats: {
      naiveStrict: { falseAlarms: 0, trueDetections: 0 },
      naiveLoose: { falseAlarms: 0, trueDetections: 0 },
      strictPersist: { falseAlarms: 0, trueDetections: 0 },
      causeAware: { falseAlarms: 0, trueDetections: 0 },
    },
  };
}

/**
 * Evaluates a single frame through the full physics attribution pipeline
 * and concurrent 4-detector benchmark.
 */
export function evaluateFrame(
  measurement: SensorMeasurement,
  ekf: EKFState,
  params: SimulationParams,
  history: EvaluationHistory
): PipelineEvaluation {
  const { rHat, range, azimuthDeg } = computeLOS(ekf.pos);

  const {
    vExpectedRad,
    vRadVec,
    vTanVec,
    vTanSpeed,
    cosPhi,
    aspectAngleDeg,
  } = decomposeVelocity(ekf.vel, rHat);

  // Directional uncertainty budget
  const sigmaTotal = ekf.sigmaTotal;

  // Residual & Mahalanobis Distance
  let residual = 0;
  let mahalanobisDist = 0;
  let isAnomaly = false;

  if (measurement.radar.isDetected) {
    residual = measurement.radar.doppler - vExpectedRad;
    mahalanobisDist = Math.abs(residual) / Math.max(0.01, sigmaTotal);
    isAnomaly = mahalanobisDist > params.chiGate;
  } else {
    // Missing radar return is treated as severe sensor inconsistency
    residual = -vExpectedRad;
    mahalanobisDist = Math.abs(vExpectedRad) / Math.max(0.01, sigmaTotal);
    isAnomaly = true;
  }

  const chiSquare = mahalanobisDist * mahalanobisDist;

  // ==========================================================================
  // Physics-Informed Cause-Aware Attribution Engine (5 Benign Rules + Anomaly)
  // ==========================================================================
  let attribution: AttributionCategory = 'CONSISTENT';
  let attributionTitle = 'Sensors Geometrically Consistent';
  let attributionReason =
    'Radar Doppler agrees with projected LiDAR kinematic velocity within chi-square gating.';

  const ruleTrace: PipelineEvaluation['ruleTrace'] = [];

  const absVExpected = Math.abs(vExpectedRad);
  const totalSpeed = ekf.speed;

  // Rule 1: Radar MTI Clutter Notch Drop (Requires established track history)
  const r1_condition =
    absVExpected < params.clutterNotchSpeed &&
    totalSpeed > 0.9 &&
    measurement.radar.trackAge > 4;
  ruleTrace.push({
    id: 1,
    name: 'Radar Clutter Notch Check',
    condition: `|v_exp| (${absVExpected.toFixed(2)} m/s) < v_notch (${params.clutterNotchSpeed.toFixed(2)} m/s) & speed (${totalSpeed.toFixed(2)}) > 0.9 m/s & TrackAge (${measurement.radar.trackAge}) > 4`,
    triggered: isAnomaly && r1_condition,
    verdict: r1_condition ? 'BENIGN_CLUTTER_NOTCH_DROP' : 'PASSED',
  });

  // Rule 2: Tangential Doppler Blindness (Requires established track history)
  const r2_condition =
    cosPhi < params.tangentialEpsilon &&
    totalSpeed > 0.75 &&
    measurement.radar.trackAge > 4;
  ruleTrace.push({
    id: 2,
    name: 'Tangential Blindness Check',
    condition: `|cos phi| (${cosPhi.toFixed(2)}) < eps (${params.tangentialEpsilon.toFixed(2)}) & speed (${totalSpeed.toFixed(2)}) > 0.75 m/s & TrackAge (${measurement.radar.trackAge}) > 4`,
    triggered: isAnomaly && r2_condition,
    verdict: r2_condition ? 'BENIGN_TANGENTIAL_BLINDNESS' : 'PASSED',
  });

  // Rule 3: Transient RCS Multipath / Ground Interference
  const r3_condition =
    measurement.radar.snrDb < 10.0 &&
    measurement.lidar.pointDensity >= 0.85 &&
    measurement.radar.trackAge > 4;
  ruleTrace.push({
    id: 3,
    name: 'RCS Multipath Dropout Check',
    condition: `SNR (${measurement.radar.snrDb.toFixed(1)} dB) < 10 dB & LiDAR (${(measurement.lidar.pointDensity * 100).toFixed(0)}%) >= 85% & TrackAge (${measurement.radar.trackAge}) > 4`,
    triggered: isAnomaly && r3_condition,
    verdict: r3_condition ? 'BENIGN_RCS_DROPOUT' : 'PASSED',
  });

  // Rule 4: Synthetic Phantom Optical Injection Check (Empty Road Anomaly - non-tangential motion NOT required)
  const r4_condition =
    measurement.radar.trackAge <= 2 &&
    measurement.lidar.pointDensity >= 0.88 &&
    !measurement.radar.isDetected;
  ruleTrace.push({
    id: 4,
    name: 'Synthetic Phantom Verification',
    condition: `TrackAge (${measurement.radar.trackAge}) <= 2 & LiDAR (${(measurement.lidar.pointDensity * 100).toFixed(0)}%) >= 88% & No Radar Return`,
    triggered: isAnomaly && r4_condition,
    verdict: r4_condition ? 'UNATTRIBUTED_ANOMALY (Synthetic Phantom)' : 'PASSED',
  });

  // Rule 5: Inter-Sensor Synchronization & Timing Skew
  const r5_condition =
    mahalanobisDist <= 3.6 &&
    Math.abs(residual) < 1.3 &&
    cosPhi > 0.45;
  ruleTrace.push({
    id: 5,
    name: 'Sensor Timing Skew Check',
    condition: `d_M (${mahalanobisDist.toFixed(2)}) <= 3.6 & |residual| (${Math.abs(residual).toFixed(2)}) < 1.3 m/s & |cos phi| > 0.45`,
    triggered: isAnomaly && r5_condition,
    verdict: r5_condition ? 'BENIGN_TIMING_SKEW' : 'PASSED',
  });

  // Rule 6: Guardrail / Wall Multipath Ghost Reflection
  const rangeElong = measurement.radar.rangeElongation ?? measurement.rangeElongation ?? 0;
  const isNearReflector = measurement.radar.nearReflector ?? measurement.nearReflector ?? false;
  const r6_condition =
    (isNearReflector || rangeElong > 0.5) &&
    measurement.lidar.isDetected &&
    measurement.lidar.pointDensity >= 0.85 &&
    measurement.radar.trackAge > 4;
  ruleTrace.push({
    id: 6,
    name: 'Guardrail Multipath Ghost Check',
    condition: `NearReflector (${isNearReflector}) & RangeElong (${rangeElong.toFixed(1)}m) > 0.5m & LiDAR (${(measurement.lidar.pointDensity * 100).toFixed(0)}%) >= 85% & TrackAge (${measurement.radar.trackAge}) > 4`,
    triggered: isAnomaly && r6_condition,
    verdict: r6_condition ? 'BENIGN_MULTIPATH_GHOST' : 'PASSED',
  });

  // Attribution Decision Tree & Persistence Capping
  if (isAnomaly) {
    let candidateAttribution: AttributionCategory = 'UNATTRIBUTED_ANOMALY';
    let candidateTitle = 'Unattributed Kinematic Discrepancy';
    let candidateReason = `Residual (${residual.toFixed(2)} m/s, d_M = ${mahalanobisDist.toFixed(2)}σ) cannot be justified by geometry, notch filter, or multipath. Strong indicator of optical velocity injection.`;

    if (r1_condition) {
      candidateAttribution = 'BENIGN_CLUTTER_NOTCH_DROP';
      candidateTitle = 'Benign MTI Clutter Notch Dropout';
      candidateReason = `Target expected radial speed is near-zero (${absVExpected.toFixed(2)} m/s < ${params.clutterNotchSpeed} m/s) with established track age (${measurement.radar.trackAge}). Hardware MTI notch discarded reflection to reject stationary ground tarmac.`;
    } else if (r2_condition) {
      candidateAttribution = 'BENIGN_TANGENTIAL_BLINDNESS';
      candidateTitle = 'Benign Tangential Doppler Blindness';
      candidateReason = `Obstacle motion is orthogonal to sensor line of sight (|cos phi| = ${cosPhi.toFixed(2)}) with established track history. Doppler physics is geometrically blind to cross-traffic lateral speed.`;
    } else if (r3_condition) {
      candidateAttribution = 'BENIGN_RCS_DROPOUT';
      candidateTitle = 'Benign RCS Multipath Dropout';
      candidateReason = `Radar SNR dropped to ${measurement.radar.snrDb.toFixed(1)} dB while established track history (${measurement.radar.trackAge} frames) and LiDAR point density remain high.`;
    } else if (r4_condition) {
      candidateAttribution = 'UNATTRIBUTED_ANOMALY';
      candidateTitle = 'Unattributed Phantom Obstacle (Spoofing)';
      candidateReason = `LiDAR registered dense obstacle (${(measurement.lidar.pointDensity * 100).toFixed(0)}%), but 77 GHz radar confirms empty roadway ahead with zero prior track history.`;
    } else if (r6_condition) {
      candidateAttribution = 'BENIGN_MULTIPATH_GHOST';
      candidateTitle = 'Benign Guardrail Multipath Ghost Reflection';
      candidateReason = `Target is adjacent to metallic reflector (range elongation = ${rangeElong.toFixed(1)}m). Radar return experienced specular multi-bounce, while LiDAR point cloud confirms true obstacle position.`;
    } else if (r5_condition) {
      candidateAttribution = 'BENIGN_TIMING_SKEW';
      candidateTitle = 'Benign Timestamp Synchronization Jitter';
      candidateReason = `Residual (${residual.toFixed(2)} m/s) is bounded within inter-frame latency jitter tolerance between LiDAR pulse sweep and radar chirp.`;
    }

    // Cap persistence of benign causes:
    // If the same benign cause fires for >3 consecutive frames (Rule 5) or beyond its expected duration,
    // treat as UNATTRIBUTED_ANOMALY.
    if (candidateAttribution.startsWith('BENIGN_')) {
      if (history.currentBenignCause === candidateAttribution) {
        history.consecutiveBenignCount += 1;
      } else {
        history.currentBenignCause = candidateAttribution;
        history.consecutiveBenignCount = 1;
      }

      let capLimit = Infinity;
      if (candidateAttribution === 'BENIGN_TIMING_SKEW') capLimit = 3;
      else if (candidateAttribution === 'BENIGN_RCS_DROPOUT') capLimit = 4;
      else if (candidateAttribution === 'BENIGN_CLUTTER_NOTCH_DROP') capLimit = 25;
      else if (candidateAttribution === 'BENIGN_TANGENTIAL_BLINDNESS') capLimit = 30;
      else if (candidateAttribution === 'BENIGN_MULTIPATH_GHOST') capLimit = 60;

      if (history.consecutiveBenignCount > capLimit) {
        attribution = 'UNATTRIBUTED_ANOMALY';
        attributionTitle = `Unattributed Anomaly (${candidateAttribution} Persistence Capped)`;
        attributionReason = `${candidateAttribution} persisted for ${history.consecutiveBenignCount} frames (exceeding ${capLimit}-frame physical tolerance). Persistent discrepancy treated as UNATTRIBUTED_ANOMALY.`;
      } else {
        attribution = candidateAttribution;
        attributionTitle = candidateTitle;
        attributionReason = candidateReason;
      }
    } else {
      history.currentBenignCause = undefined;
      history.consecutiveBenignCount = 0;
      attribution = candidateAttribution;
      attributionTitle = candidateTitle;
      attributionReason = candidateReason;
    }
  } else {
    history.currentBenignCause = undefined;
    history.consecutiveBenignCount = 0;
  }

  // Track same-signed residual streak for sub-threshold evidence accumulation
  // Bounded boresight drift (< 0.5 m/s) and known multipath environments are excluded.
  const isExcludedEnvironment =
    isNearReflector ||
    rangeElong > 0.5 ||
    attribution === 'BENIGN_CLUTTER_NOTCH_DROP' ||
    attribution === 'BENIGN_TANGENTIAL_BLINDNESS' ||
    attribution === 'BENIGN_RCS_DROPOUT' ||
    attribution === 'BENIGN_MULTIPATH_GHOST';

  if (isExcludedEnvironment) {
    history.lastResidualSign = 0;
    history.sameSignResidualStreak = 0;
  } else {
    const currentSign = Math.sign(residual);
    // Bounded boresight drift is ~0.28 m/s (+0.8 sigma). Drift must exceed 0.44 m/s (~1.15 sigma) to count as anomalous creep
    if (Math.abs(residual) > 0.44 && currentSign !== 0) {
      if (currentSign === history.lastResidualSign) {
        history.sameSignResidualStreak += 1;
      } else {
        history.sameSignResidualStreak = Math.max(0, history.sameSignResidualStreak - 3);
        if (history.sameSignResidualStreak === 0) {
          history.lastResidualSign = currentSign;
          history.sameSignResidualStreak = 1;
        }
      }
    } else {
      history.sameSignResidualStreak = Math.max(0, history.sameSignResidualStreak - 2);
    }
  }

  // ==========================================================================
  // Asymmetric Leaky Temporal Trust Accumulator
  // ==========================================================================
  let trustDelta = 0;
  if (attribution === 'UNATTRIBUTED_ANOMALY') {
    trustDelta = -params.alphaDecay;
    history.consecutiveUnattributed += 1;
  } else if (attribution === 'CONSISTENT') {
    // Only CONSISTENT frames get +betaRecovery
    trustDelta = params.betaRecovery;
    history.consecutiveUnattributed = Math.max(0, history.consecutiveUnattributed - 1);

    // Sub-threshold evidence term: persistent same-signed residual over multiple frames
    // steadily reduces trust (for the slow velocity creep scenario)
    if (history.sameSignResidualStreak >= 3 && Math.abs(residual) > 0.44 && mahalanobisDist > 0.95) {
      const streakFactor = Math.min(4.0, (history.sameSignResidualStreak - 2) * 0.4);
      const subThresholdPenalty = Math.min(
        0.22,
        0.05 * (mahalanobisDist / params.chiGate) * streakFactor + 0.025 * streakFactor
      );
      trustDelta = -subThresholdPenalty;
    }
  } else if (attribution === 'BENIGN_TIMING_SKEW') {
    // If timing skew persists in same direction, apply sub-threshold drain
    if (history.sameSignResidualStreak >= 3 && Math.abs(residual) > 0.44) {
      const streakFactor = Math.min(4.0, (history.sameSignResidualStreak - 2) * 0.4);
      const subThresholdPenalty = Math.min(
        0.22,
        0.05 * (mahalanobisDist / params.chiGate) * streakFactor + 0.025 * streakFactor
      );
      trustDelta = -subThresholdPenalty;
    } else {
      trustDelta = 0;
    }
  } else {
    // Benign-attributed frames: trustDelta = 0 (credibility preserved, but not artificially increased)
    trustDelta = 0;
  }

  history.trustScore = Math.max(
    0.0,
    Math.min(1.0, history.trustScore + trustDelta)
  );

  // Latch SPOOF_ATTACK_CONFIRMED for 20 frames after the last trust < threshold frame
  if (history.trustScore < params.trustThreshold) {
    history.alarmLatchCountdown = 20;
  } else if (history.alarmLatchCountdown > 0) {
    history.alarmLatchCountdown -= 1;
  }

  let alarmStatus: AlarmStatus = 'NORMAL';
  if (history.trustScore < params.trustThreshold || history.alarmLatchCountdown > 0) {
    alarmStatus = 'SPOOF_ATTACK_CONFIRMED';
  } else if (attribution.startsWith('BENIGN_')) {
    alarmStatus = 'BENIGN_ATTRIBUTED';
  }

  // ==========================================================================
  // Concurrent 4-Detector Defense Benchmark Evaluation
  // ==========================================================================
  const isAttackActive = measurement.isAttackActive;

  // 1. Naive Strict (±2.50σ)
  const naiveStrictAnomaly = mahalanobisDist > 2.50 || !measurement.radar.isDetected;
  const naiveStrictAlarm = naiveStrictAnomaly;
  const naiveStrictBrake = naiveStrictAlarm;
  let naiveStrictState: DetectorVerdict['state'] = 'NORMAL';
  if (naiveStrictAlarm) {
    if (isAttackActive) {
      naiveStrictState = 'CONFIRMED_ALARM';
      history.cumulativeStats.naiveStrict.trueDetections += 1;
    } else {
      naiveStrictState = 'FALSE_ALARM';
      history.cumulativeStats.naiveStrict.falseAlarms += 1;
    }
  }

  // 2. Naive Loose (±4.50σ) - docs: wide threshold ignores missing return briefly
  const naiveLooseAnomaly = mahalanobisDist > 4.50;
  const naiveLooseAlarm = naiveLooseAnomaly;
  const naiveLooseBrake = naiveLooseAlarm;
  let naiveLooseState: DetectorVerdict['state'] = 'NORMAL';
  if (naiveLooseAlarm) {
    if (isAttackActive) {
      naiveLooseState = 'CONFIRMED_ALARM';
      history.cumulativeStats.naiveLoose.trueDetections += 1;
    } else {
      naiveLooseState = 'FALSE_ALARM';
      history.cumulativeStats.naiveLoose.falseAlarms += 1;
    }
  } else if (isAttackActive) {
    naiveLooseState = 'UNDETECTED_ATTACK';
  }

  // 3. Strict + Persistence (N=3)
  if (naiveStrictAnomaly) {
    history.strictConsecutiveCount += 1;
  } else {
    history.strictConsecutiveCount = 0;
  }
  const strictPersistAlarm = history.strictConsecutiveCount >= 3;
  const strictPersistBrake = strictPersistAlarm;
  let strictPersistState: DetectorVerdict['state'] = 'NORMAL';
  if (strictPersistAlarm) {
    if (isAttackActive) {
      strictPersistState = 'CONFIRMED_ALARM';
      history.cumulativeStats.strictPersist.trueDetections += 1;
    } else {
      strictPersistState = 'FALSE_ALARM';
      history.cumulativeStats.strictPersist.falseAlarms += 1;
    }
  } else if (isAttackActive) {
    strictPersistState = 'UNDETECTED_ATTACK';
  }

  // 4. Proposed Cause-Aware
  const causeAwareAlarm = alarmStatus === 'SPOOF_ATTACK_CONFIRMED';
  const causeAwareBrake = causeAwareAlarm;
  let causeAwareState: DetectorVerdict['state'] = 'NORMAL';
  if (causeAwareAlarm) {
    if (isAttackActive) {
      causeAwareState = 'CONFIRMED_ALARM';
      history.cumulativeStats.causeAware.trueDetections += 1;
    } else {
      causeAwareState = 'FALSE_ALARM';
      history.cumulativeStats.causeAware.falseAlarms += 1;
    }
  } else if (alarmStatus === 'BENIGN_ATTRIBUTED') {
    causeAwareState = 'BENIGN_EXEMPT';
  } else if (isAttackActive && history.trustScore >= params.trustThreshold) {
    causeAwareState = 'NORMAL'; // Still integrating trust
  }

  return {
    rHat,
    range,
    azimuthDeg,
    vExpectedRad,
    vRadVec,
    vTanVec,
    vTanSpeed,
    cosPhi,
    aspectAngleDeg,
    residual,
    mahalanobisDist,
    chiSquare,
    isAnomaly,
    attribution,
    attributionTitle,
    attributionReason,
    ruleTrace,
    trustScore: history.trustScore,
    trustDelta,
    consecutiveUnattributed: history.consecutiveUnattributed,
    alarmStatus,
    detectors: {
      naiveStrict: {
        id: 'naive_strict',
        name: 'Naive Strict (±2.50σ)',
        formula: 'd_M > 2.50 || !radarDetected',
        isAnomaly: naiveStrictAnomaly,
        alarmTriggered: naiveStrictAlarm,
        emergencyBrakeActive: naiveStrictBrake,
        state: naiveStrictState,
        statusText: naiveStrictAlarm
          ? isAttackActive
            ? 'Alarm Triggered (Valid)'
            : 'FALSE EMERGENCY BRAKE'
          : 'Clear (Pass)',
        falseAlarmsCount: history.cumulativeStats.naiveStrict.falseAlarms,
        trueDetectionsCount: history.cumulativeStats.naiveStrict.trueDetections,
      },
      naiveLoose: {
        id: 'naive_loose',
        name: 'Naive Loose (±4.50σ)',
        formula: 'd_M > 4.50',
        isAnomaly: naiveLooseAnomaly,
        alarmTriggered: naiveLooseAlarm,
        emergencyBrakeActive: naiveLooseBrake,
        state: naiveLooseState,
        statusText: naiveLooseAlarm
          ? isAttackActive
            ? 'Alarm Triggered'
            : 'False Alarm'
          : isAttackActive
          ? 'UNDETECTED ATTACK (Gate Bypass)'
          : 'Clear (Pass)',
        falseAlarmsCount: history.cumulativeStats.naiveLoose.falseAlarms,
        trueDetectionsCount: history.cumulativeStats.naiveLoose.trueDetections,
      },
      strictPersist: {
        id: 'strict_persist',
        name: 'Strict + Persistence (N=3)',
        formula: '(d_M > 2.50) * 3 Consecutive Frames',
        isAnomaly: naiveStrictAnomaly,
        alarmTriggered: strictPersistAlarm,
        emergencyBrakeActive: strictPersistBrake,
        state: strictPersistState,
        statusText: strictPersistAlarm
          ? isAttackActive
            ? 'Alarm Confirmed (3 frames)'
            : 'FALSE ALARM (Sustained)'
          : isAttackActive
          ? 'Undetected (Counter Reset)'
          : `Clear (${history.strictConsecutiveCount}/3 frames)`,
        falseAlarmsCount: history.cumulativeStats.strictPersist.falseAlarms,
        trueDetectionsCount: history.cumulativeStats.strictPersist.trueDetections,
      },
      causeAware: {
        id: 'cause_aware',
        name: 'Proposed Cause-Aware',
        formula: 'Multi-Branch Attribution + Leaky Trust (T < 0.35)',
        isAnomaly: isAnomaly && attribution === 'UNATTRIBUTED_ANOMALY',
        alarmTriggered: causeAwareAlarm,
        emergencyBrakeActive: causeAwareBrake,
        state: causeAwareState,
        statusText: causeAwareAlarm
          ? 'SPOOF CONFIRMED: Safe Brake Engaged'
          : alarmStatus === 'BENIGN_ATTRIBUTED'
          ? 'BENIGN EXEMPT: False Brake Suppressed'
          : 'Perception Verified (Normal)',
        falseAlarmsCount: history.cumulativeStats.causeAware.falseAlarms,
        trueDetectionsCount: history.cumulativeStats.causeAware.trueDetections,
      },
    },
  };
}
