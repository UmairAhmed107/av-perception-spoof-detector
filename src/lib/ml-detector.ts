// ============================================================================
// Machine Learning Random Forest Perception Integrity Detector
// In-Browser / TypeScript Evaluation of Trained Decision Forests
// ============================================================================

import modelData from './model.json';
import type { DetectorState, MLDetectorVerdict } from '../types';

export interface SerializedTree {
  feature: number[];
  threshold: number[];
  left: number[];
  right: number[];
  values: number[][];
}

export interface SerializedForest {
  classes: (number | string)[];
  n_estimators: number;
  max_depth: number;
  trees: SerializedTree[];
}

export interface MLModelPayload {
  version: string;
  features: string[];
  spoof_forest: SerializedForest;
  cause_forest: SerializedForest;
  metrics: {
    spoof_accuracy: number;
    spoof_far: number;
    spoof_detection_rate: number;
    cause_accuracy: number;
  };
}

const typedModel = modelData as unknown as MLModelPayload;

/**
 * Predicts class probabilities by averaging leaf distributions across all trees in the forest
 */
export function predictProba(forest: SerializedForest, features: number[]): number[] {
  const nClasses = forest.classes.length;
  const avgProbs = new Array(nClasses).fill(0);

  for (let t = 0; t < forest.trees.length; t++) {
    const tree = forest.trees[t];
    let node = 0;

    // Traverse decision tree down to leaf node
    while (tree.feature[node] !== -2) {
      const featIdx = tree.feature[node];
      const threshold = tree.threshold[node];
      node = features[featIdx] <= threshold ? tree.left[node] : tree.right[node];
    }

    const leafProbs = tree.values[node];
    for (let c = 0; c < nClasses; c++) {
      avgProbs[c] += leafProbs[c] ?? 0;
    }
  }

  for (let c = 0; c < nClasses; c++) {
    avgProbs[c] /= forest.trees.length;
  }

  return avgProbs;
}

/**
 * Evaluates binary spoof forest: returns P(is_spoof == 1) in [0.0, 1.0]
 */
export function predictSpoofProbability(features: number[]): number {
  const probs = predictProba(typedModel.spoof_forest, features);
  // classes are [0, 1], so index 1 corresponds to is_spoof=1
  return probs[1] ?? 0;
}

/**
 * Evaluates multiclass cause forest: returns argmax predicted physical cause and confidence
 */
export function predictCause(features: number[]): {
  cause: string;
  confidence: number;
  probabilities: Record<string, number>;
} {
  const probs = predictProba(typedModel.cause_forest, features);
  const classes = typedModel.cause_forest.classes as string[];

  let maxIdx = 0;
  let maxProb = -1;
  const probabilities: Record<string, number> = {};

  for (let i = 0; i < classes.length; i++) {
    const p = probs[i] ?? 0;
    probabilities[classes[i]] = p;
    if (p > maxProb) {
      maxProb = p;
      maxIdx = i;
    }
  }

  return {
    cause: classes[maxIdx] ?? 'CONSISTENT',
    confidence: maxProb,
    probabilities,
  };
}

/**
 * Assembles the ordered 12-feature vector matching training configuration
 */
export function extractMLFeatures(
  residual: number,
  sigmaTotal: number,
  mahalanobisDist: number,
  vExpectedRad: number,
  cosPhi: number,
  totalSpeed: number,
  lidarDensity: number,
  radarSnr: number,
  radarDetected: boolean | number,
  trackAge: number,
  rangeElongation: number,
  trustScore: number
): number[] {
  return [
    residual,
    sigmaTotal,
    mahalanobisDist,
    vExpectedRad,
    cosPhi,
    totalSpeed,
    lidarDensity,
    radarSnr,
    typeof radarDetected === 'boolean' ? (radarDetected ? 1 : 0) : radarDetected,
    trackAge,
    rangeElongation,
    trustScore,
  ];
}

/**
 * Evaluates full ML detector and produces benchmark-compatible verdict
 */
export function evaluateMLDetector(
  features: number[],
  isAttackActive: boolean,
  stats: { falseAlarms: number; trueDetections: number } = { falseAlarms: 0, trueDetections: 0 }
): MLDetectorVerdict {
  const spoofProbability = predictSpoofProbability(features);
  const { cause: predictedCause, confidence: causeConfidence } = predictCause(features);

  const isSpoof = spoofProbability >= 0.50;
  const alarmTriggered = isSpoof;
  const emergencyBrakeActive = alarmTriggered;

  let state: DetectorState = 'NORMAL';
  if (emergencyBrakeActive) {
    if (isAttackActive) {
      state = 'CONFIRMED_ALARM';
      stats.trueDetections += 1;
    } else {
      state = 'FALSE_ALARM';
      stats.falseAlarms += 1;
    }
  } else if (isAttackActive) {
    state = 'UNDETECTED_ATTACK';
  } else if (predictedCause.startsWith('BENIGN_') || predictedCause === 'CLUTTER_NOTCH' || predictedCause === 'RCS_DROPOUT' || predictedCause === 'MULTIPATH_GHOST' || predictedCause === 'BORESIGHT_DRIFT') {
    state = 'BENIGN_EXEMPT';
  }

  let statusText = `NORMAL: ${( (1 - spoofProbability) * 100).toFixed(0)}% Benign`;
  if (emergencyBrakeActive) {
    statusText = `SPOOF CONFIRMED: ${(spoofProbability * 100).toFixed(1)}% Prob [${predictedCause}]`;
  } else if (state === 'BENIGN_EXEMPT') {
    statusText = `BENIGN EXEMPT: [${predictedCause}] (${(causeConfidence * 100).toFixed(0)}%)`;
  } else if (state === 'UNDETECTED_ATTACK') {
    statusText = `ATTACK MISSED: P(Spoof)=${(spoofProbability * 100).toFixed(1)}%`;
  }

  return {
    id: 'ml_random_forest',
    name: 'ML (Random Forest)',
    formula: 'RF(n=50, d=8) | P(Spoof) ≥ 0.50',
    isAnomaly: isSpoof,
    alarmTriggered,
    emergencyBrakeActive,
    state,
    statusText,
    spoofProbability,
    predictedCause,
    causeConfidence,
    falseAlarmsCount: stats.falseAlarms,
    trueDetectionsCount: stats.trueDetections,
  };
}
