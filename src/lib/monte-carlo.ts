// ============================================================================
// Monte Carlo Statistical Validation Engine
// High-Throughput Multi-Trial Empirical Benchmark
// ============================================================================

import {
  ScenarioId,
  SimulationParams,
  MonteCarloScenarioStats,
} from '../types';
import { SCENARIOS, generateScenarioMeasurement } from './scenarios';
import { LinearKalmanFilter2D } from './ekf';
import {
  createInitialHistory,
  evaluateFrame,
} from './kinematics-engine';

export interface MonteCarloProgressCallback {
  (currentTrial: number, totalTrials: number, percent: number): void;
}

/**
 * Runs randomized Monte Carlo simulation trials for a given scenario
 */
export async function runMonteCarloTrials(
  scenarioId: ScenarioId,
  numTrials: number = 200,
  params: SimulationParams,
  onProgress?: MonteCarloProgressCallback
): Promise<MonteCarloScenarioStats> {
  const scen = SCENARIOS[scenarioId];
  const dt = 0.05; // 20 Hz
  const totalFrames = 80; // 4.0 seconds duration

  const detectorAccumulators = {
    naive_strict: {
      name: 'Naive Strict (±2.50σ)',
      benignFrames: 0,
      falseAlarmFrames: 0,
      attackTrials: 0,
      detectedTrials: 0,
      timeToDetectFramesSum: 0,
    },
    naive_loose: {
      name: 'Naive Loose (±4.50σ)',
      benignFrames: 0,
      falseAlarmFrames: 0,
      attackTrials: 0,
      detectedTrials: 0,
      timeToDetectFramesSum: 0,
    },
    strict_persist: {
      name: 'Strict + Persist (N=3)',
      benignFrames: 0,
      falseAlarmFrames: 0,
      attackTrials: 0,
      detectedTrials: 0,
      timeToDetectFramesSum: 0,
    },
    cause_aware: {
      name: 'Proposed Cause-Aware',
      benignFrames: 0,
      falseAlarmFrames: 0,
      attackTrials: 0,
      detectedTrials: 0,
      timeToDetectFramesSum: 0,
    },
  };

  const batchSize = Math.max(10, Math.floor(numTrials / 20));

  for (let trial = 0; trial < numTrials; trial++) {
    // Yield to browser event loop periodically to prevent UI freeze
    if (trial % batchSize === 0) {
      if (onProgress) {
        onProgress(trial, numTrials, Math.round((trial / numTrials) * 100));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const ekf = new LinearKalmanFilter2D(
      scen.initialPos,
      scen.initialVel,
      0.8
    );
    const history = createInitialHistory();

    let trialHasAttack = false;
    let attackStartFrame = -1;

    let detectedNaiveStrict = false;
    let detectedNaiveLoose = false;
    let detectedStrictPersist = false;
    let detectedCauseAware = false;

    let mttdNaiveStrict = -1;
    let mttdNaiveLoose = -1;
    let mttdStrictPersist = -1;
    let mttdCauseAware = -1;

    for (let f = 0; f < totalFrames; f++) {
      const timeSec = f * dt;
      const measurement = generateScenarioMeasurement(
        scenarioId,
        timeSec,
        f,
        params
      );

      if (measurement.isAttackActive) {
        trialHasAttack = true;
        if (attackStartFrame === -1) {
          attackStartFrame = f;
        }
      }

      // EKF step
      ekf.predict(dt);
      if (measurement.lidar.isDetected) {
        ekf.updatePosition(measurement.lidar.pos, params.sigmaLidar);
      }

      const { rHat } = {
        rHat: {
          x: ekf.x[0] / Math.max(0.1, Math.hypot(ekf.x[0], ekf.x[1])),
          y: ekf.x[1] / Math.max(0.1, Math.hypot(ekf.x[0], ekf.x[1])),
        },
      };
      const ekfSnapshot = ekf.getStateSnapshot(rHat, params.sigmaRadar);

      const evalResult = evaluateFrame(
        measurement,
        ekfSnapshot,
        params,
        history
      );

      // Analyze detections and false alarms
      if (!measurement.isAttackActive) {
        // Benign frame: evaluate false alarms
        detectorAccumulators.naive_strict.benignFrames++;
        detectorAccumulators.naive_loose.benignFrames++;
        detectorAccumulators.strict_persist.benignFrames++;
        detectorAccumulators.cause_aware.benignFrames++;

        if (evalResult.detectors.naiveStrict.alarmTriggered) {
          detectorAccumulators.naive_strict.falseAlarmFrames++;
        }
        if (evalResult.detectors.naiveLoose.alarmTriggered) {
          detectorAccumulators.naive_loose.falseAlarmFrames++;
        }
        if (evalResult.detectors.strictPersist.alarmTriggered) {
          detectorAccumulators.strict_persist.falseAlarmFrames++;
        }
        if (evalResult.detectors.causeAware.alarmTriggered) {
          detectorAccumulators.cause_aware.falseAlarmFrames++;
        }
      } else {
        // Attack frame: evaluate detection rate & MTTD
        const framesSinceAttack = f - attackStartFrame + 1;

        if (
          evalResult.detectors.naiveStrict.alarmTriggered &&
          !detectedNaiveStrict
        ) {
          detectedNaiveStrict = true;
          mttdNaiveStrict = framesSinceAttack;
        }
        if (
          evalResult.detectors.naiveLoose.alarmTriggered &&
          !detectedNaiveLoose
        ) {
          detectedNaiveLoose = true;
          mttdNaiveLoose = framesSinceAttack;
        }
        if (
          evalResult.detectors.strictPersist.alarmTriggered &&
          !detectedStrictPersist
        ) {
          detectedStrictPersist = true;
          mttdStrictPersist = framesSinceAttack;
        }
        if (
          evalResult.detectors.causeAware.alarmTriggered &&
          !detectedCauseAware
        ) {
          detectedCauseAware = true;
          mttdCauseAware = framesSinceAttack;
        }
      }
    }

    // Accumulate trial-level detection stats if attack occurred
    if (trialHasAttack) {
      detectorAccumulators.naive_strict.attackTrials++;
      detectorAccumulators.naive_loose.attackTrials++;
      detectorAccumulators.strict_persist.attackTrials++;
      detectorAccumulators.cause_aware.attackTrials++;

      if (detectedNaiveStrict) {
        detectorAccumulators.naive_strict.detectedTrials++;
        detectorAccumulators.naive_strict.timeToDetectFramesSum +=
          mttdNaiveStrict;
      }
      if (detectedNaiveLoose) {
        detectorAccumulators.naive_loose.detectedTrials++;
        detectorAccumulators.naive_loose.timeToDetectFramesSum +=
          mttdNaiveLoose;
      }
      if (detectedStrictPersist) {
        detectorAccumulators.strict_persist.detectedTrials++;
        detectorAccumulators.strict_persist.timeToDetectFramesSum +=
          mttdStrictPersist;
      }
      if (detectedCauseAware) {
        detectorAccumulators.cause_aware.detectedTrials++;
        detectorAccumulators.cause_aware.timeToDetectFramesSum +=
          mttdCauseAware;
      }
    }
  }

  if (onProgress) {
    onProgress(numTrials, numTrials, 100);
  }

  // Calculate final percentages
  const stats: MonteCarloScenarioStats = {
    scenarioId,
    scenarioTitle: scen.title,
    trials: numTrials,
    detectors: {},
  };

  const keys = [
    'naive_strict',
    'naive_loose',
    'strict_persist',
    'cause_aware',
  ] as const;

  for (const key of keys) {
    const acc = detectorAccumulators[key];
    const far =
      acc.benignFrames > 0
        ? (acc.falseAlarmFrames / acc.benignFrames) * 100.0
        : 0.0;
    const detRate =
      acc.attackTrials > 0
        ? (acc.detectedTrials / acc.attackTrials) * 100.0
        : 100.0;
    const mttdFrames =
      acc.detectedTrials > 0
        ? acc.timeToDetectFramesSum / acc.detectedTrials
        : 0.0;
    const mttdSeconds = mttdFrames * dt;

    stats.detectors[key] = {
      name: acc.name,
      falseAlarmRate: Number(far.toFixed(1)),
      detectionRate: Number(detRate.toFixed(1)),
      mttdFrames: Number(mttdFrames.toFixed(1)),
      mttdSeconds: Number(mttdSeconds.toFixed(2)),
    };
  }

  return stats;
}
