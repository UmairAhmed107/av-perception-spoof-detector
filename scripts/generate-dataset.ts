// ============================================================================
// Synthetic Dataset Generator for Machine Learning Detection
// Generates dataset.csv across all 9 scenarios with randomized physical parameters
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { LinearKalmanFilter2D } from '../src/lib/ekf';
import { createInitialHistory, evaluateFrame } from '../src/lib/kinematics-engine';
import { SCENARIOS, DEFAULT_SIM_PARAMS } from '../src/lib/scenarios';
import { ScenarioId, SimulationParams, SensorMeasurement, Vector2D } from '../src/types';

// Standard normal sampler (Box-Muller)
function randomGaussian(mean: number, std: number): number {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 <= 1e-7) u1 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

function randomUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface DatasetRow {
  run_id: string;
  scenario_id: string;
  residual: number;
  sigmaTotal: number;
  mahalanobisDist: number;
  vExpectedRad: number;
  cosPhi: number;
  totalSpeed: number;
  lidarDensity: number;
  radarSnr: number;
  radarDetected: number;
  trackAge: number;
  rangeElongation: number;
  trustScore: number;
  is_spoof: number;
  cause: string;
}

const RUNS_PER_SCENARIO = 100;
const FRAMES_PER_RUN = 80; // 4.0 seconds at 20 Hz (dt = 0.05)
const DT = 0.05;

async function generateDataset() {
  const scenarioIds = Object.keys(SCENARIOS) as ScenarioId[];
  const allRows: DatasetRow[] = [];
  const classCounts: Record<string, number> = {};

  let globalRunId = 0;

  for (const scenId of scenarioIds) {
    const baseScen = SCENARIOS[scenId];

    for (let r = 0; r < RUNS_PER_SCENARIO; r++) {
      globalRunId++;
      const runIdStr = `run_${globalRunId}`;

      // 1. Randomized physical scenario parameters
      const speedScale = randomUniform(0.80, 1.25);
      const initVel: Vector2D = {
        x: baseScen.initialVel.x * speedScale,
        y: baseScen.initialVel.y * speedScale,
      };

      const posXOffset = randomUniform(-1.5, 1.5);
      const posYOffset = randomUniform(-2.0, 2.0);
      const initPos: Vector2D = {
        x: baseScen.initialPos.x + posXOffset,
        y: baseScen.initialPos.y + posYOffset,
      };

      // 2. Randomized sensor noise & attack parameters
      const runParams: SimulationParams = {
        ...DEFAULT_SIM_PARAMS,
        sigmaRadar: randomUniform(0.25, 0.45),
        sigmaLidar: randomUniform(0.08, 0.16),
      };

      const attackMagVelOffset = randomUniform(1.10, 1.80); // Scenario 4
      const attackMagCreepRate = randomUniform(0.32, 0.52); // Scenario 5
      const attackMagPulseOffset = randomUniform(1.80, 2.60); // Scenario 7
      const rcsDropDurationFrames = Math.floor(randomUniform(2, 6)); // Scenario 3
      const rcsDropStartSec = randomUniform(1.8, 2.2);
      const multipathDopplerBump = randomUniform(1.4, 2.2); // Scenario 8
      const multipathRangeElong = randomUniform(1.0, 1.8);
      const boresightBias = randomUniform(0.22, 0.35); // Scenario 9

      const ekf = new LinearKalmanFilter2D(initPos, initVel, 0.8);
      const history = createInitialHistory();

      for (let f = 0; f < FRAMES_PER_RUN; f++) {
        const timeSec = f * DT;

        // Kinematics forward integration
        let truePosX = initPos.x + initVel.x * timeSec;
        let truePosY = initPos.y + initVel.y * timeSec;
        let trueVx = initVel.x;
        let trueVy = initVel.y;

        let lidarDetected = true;
        let lidarPointDensity = randomUniform(0.90, 0.98);
        const lidarNoiseX = randomGaussian(0, runParams.sigmaLidar);
        const lidarNoiseY = randomGaussian(0, runParams.sigmaLidar);

        let radarDetected = true;
        let radarDopplerNoise = randomGaussian(0, runParams.sigmaRadar);
        let radarSnrDb = randomUniform(16.0, 20.0);
        let radarTrackAge = f + 1;
        let rangeElongation = 0.0;
        let nearReflector = false;

        let groundTruthIsSpoof = 0;
        let groundTruthCause = 'CONSISTENT';

        const trueRange = Math.max(0.1, Math.sqrt(truePosX * truePosX + truePosY * truePosY));
        const rHatX = truePosX / trueRange;
        const rHatY = truePosY / trueRange;
        const trueRadSpeed = trueVx * rHatX + trueVy * rHatY;

        // Scenario ground-truth assignment
        switch (scenId) {
          case 'scen_1_cyclist_tangential': {
            const currentRadSpeed = trueVx * rHatX + trueVy * rHatY;
            if (Math.abs(currentRadSpeed) < runParams.clutterNotchSpeed) {
              radarDetected = false;
              radarSnrDb = randomUniform(1.0, 3.5);
              groundTruthCause = 'CLUTTER_NOTCH';
            }
            break;
          }

          case 'scen_2_phantom_spoof': {
            if (timeSec >= 1.0 && timeSec <= 5.5) {
              groundTruthIsSpoof = 1;
              groundTruthCause = 'OPTICAL_PHANTOM';
              lidarDetected = true;
              lidarPointDensity = randomUniform(0.92, 0.99);
              radarDetected = false;
              radarSnrDb = randomUniform(1.0, 3.0);
              radarTrackAge = 0;
            } else {
              lidarDetected = false;
              radarDetected = false;
              lidarPointDensity = 0.0;
            }
            break;
          }

          case 'scen_3_rcs_dropout': {
            radarTrackAge = Math.max(6, f);
            const drop1Start = 1.6;
            const drop1End = drop1Start + rcsDropDurationFrames * DT;
            const drop2Start = 3.0;
            const drop2End = drop2Start + rcsDropDurationFrames * DT;
            if ((timeSec >= drop1Start && timeSec < drop1End) || (timeSec >= drop2Start && timeSec < drop2End)) {
              radarDetected = false;
              radarSnrDb = randomUniform(2.0, 5.5);
              groundTruthCause = 'RCS_DROPOUT';
            }
            break;
          }

          case 'scen_4_loose_bypass': {
            if (timeSec >= 1.0) {
              groundTruthIsSpoof = 1;
              groundTruthCause = 'VELOCITY_OFFSET';
              const attackDt = timeSec - 1.0;
              truePosY += attackMagVelOffset * attackDt;
              trueVy += attackMagVelOffset;
            }
            break;
          }

          case 'scen_5_slow_creep': {
            if (timeSec >= 1.0) {
              groundTruthIsSpoof = 1;
              groundTruthCause = 'VELOCITY_CREEP';
              const creepDt = timeSec - 1.0;
              const deltaV = attackMagCreepRate * creepDt;
              truePosY += 0.5 * attackMagCreepRate * creepDt * creepDt;
              trueVy += deltaV;
            }
            break;
          }

          case 'scen_6_phantom_tangential': {
            groundTruthIsSpoof = 1;
            groundTruthCause = 'TANGENTIAL_PHANTOM';
            lidarDetected = true;
            lidarPointDensity = randomUniform(0.91, 0.97);
            radarDetected = false;
            radarTrackAge = 0;
            radarSnrDb = randomUniform(1.0, 3.0);
            break;
          }

          case 'scen_7_pulsed_spoof': {
            if (timeSec >= 0.8) {
              groundTruthIsSpoof = 1;
              groundTruthCause = 'PULSED_SPOOF';
              const frameOffset = Math.round((timeSec - 0.8) / 0.05);
              const isPulseOn = frameOffset % 2 === 0;
              const activePulseCount = Math.floor(frameOffset / 2) + 1;
              truePosY += activePulseCount * (attackMagPulseOffset * 0.05);
              if (isPulseOn) {
                trueVy += attackMagPulseOffset;
              }
            }
            break;
          }

          case 'scen_8_guardrail_multipath': {
            if (timeSec >= 1.2 && timeSec <= 3.8) {
              radarDopplerNoise += multipathDopplerBump;
              rangeElongation = multipathRangeElong;
              nearReflector = true;
              groundTruthCause = 'MULTIPATH_GHOST';
            }
            break;
          }

          case 'scen_9_boresight_drift': {
            radarDopplerNoise += boresightBias;
            groundTruthCause = 'BORESIGHT_DRIFT';
            break;
          }
        }

        const lidarPos: Vector2D = {
          x: truePosX + lidarNoiseX,
          y: truePosY + lidarNoiseY,
        };
        const measuredDoppler = trueRadSpeed + radarDopplerNoise;

        const measurement: SensorMeasurement = {
          time: timeSec,
          frameIndex: f,
          groundTruth: {
            pos: { x: truePosX, y: truePosY },
            vel: { x: trueVx, y: trueVy },
            speed: Math.hypot(trueVx, trueVy),
            headingDeg: baseScen.headingDeg,
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
          isAttackActive: groundTruthIsSpoof === 1,
          attackType: groundTruthIsSpoof === 1 ? groundTruthCause : undefined,
          scenarioExplanation: baseScen.subtitle,
        };

        // EKF Update
        ekf.predict(DT);
        if (measurement.lidar.isDetected) {
          ekf.updatePosition(measurement.lidar.pos, runParams.sigmaLidar);
        }

        const losRHat = {
          x: ekf.x[0] / Math.max(0.1, Math.hypot(ekf.x[0], ekf.x[1])),
          y: ekf.x[1] / Math.max(0.1, Math.hypot(ekf.x[0], ekf.x[1])),
        };
        const ekfSnapshot = ekf.getStateSnapshot(losRHat, runParams.sigmaRadar);

        // Evaluate kinematics engine pipeline
        const evalRes = evaluateFrame(measurement, ekfSnapshot, runParams, history);

        classCounts[groundTruthCause] = (classCounts[groundTruthCause] || 0) + 1;

        allRows.push({
          run_id: runIdStr,
          scenario_id: scenId,
          residual: Number(evalRes.residual.toFixed(4)),
          sigmaTotal: Number(ekfSnapshot.sigmaTotal.toFixed(4)),
          mahalanobisDist: Number(evalRes.mahalanobisDist.toFixed(4)),
          vExpectedRad: Number(evalRes.vExpectedRad.toFixed(4)),
          cosPhi: Number(evalRes.cosPhi.toFixed(4)),
          totalSpeed: Number(ekfSnapshot.speed.toFixed(4)),
          lidarDensity: Number(measurement.lidar.pointDensity.toFixed(4)),
          radarSnr: Number(measurement.radar.snrDb.toFixed(2)),
          radarDetected: measurement.radar.isDetected ? 1 : 0,
          trackAge: measurement.radar.trackAge,
          rangeElongation: Number(rangeElongation.toFixed(3)),
          trustScore: Number(evalRes.trustScore.toFixed(4)),
          is_spoof: groundTruthIsSpoof,
          cause: groundTruthCause,
        });
      }
    }
  }

  // Write dataset.csv
  const headers = [
    'run_id',
    'scenario_id',
    'residual',
    'sigmaTotal',
    'mahalanobisDist',
    'vExpectedRad',
    'cosPhi',
    'totalSpeed',
    'lidarDensity',
    'radarSnr',
    'radarDetected',
    'trackAge',
    'rangeElongation',
    'trustScore',
    'is_spoof',
    'cause',
  ];

  const csvLines = [headers.join(',')];
  for (const row of allRows) {
    csvLines.push(
      [
        row.run_id,
        row.scenario_id,
        row.residual,
        row.sigmaTotal,
        row.mahalanobisDist,
        row.vExpectedRad,
        row.cosPhi,
        row.totalSpeed,
        row.lidarDensity,
        row.radarSnr,
        row.radarDetected,
        row.trackAge,
        row.rangeElongation,
        row.trustScore,
        row.is_spoof,
        row.cause,
      ].join(',')
    );
  }

  const outPath = path.resolve(process.cwd(), 'dataset.csv');
  fs.writeFileSync(outPath, csvLines.join('\n'), 'utf-8');

  console.log(`Successfully generated dataset: ${outPath}`);
  console.log(`Total rows: ${allRows.length}`);
  console.log(`Total runs: ${globalRunId}`);
  console.log('\nRow distribution per cause:');
  console.table(classCounts);

  const spoofCount = allRows.filter((r) => r.is_spoof === 1).length;
  const benignCount = allRows.filter((r) => r.is_spoof === 0).length;
  console.log(`\nBinary distribution: is_spoof=1: ${spoofCount} (${((spoofCount / allRows.length) * 100).toFixed(1)}%), is_spoof=0: ${benignCount} (${((benignCount / allRows.length) * 100).toFixed(1)}%)`);
}

generateDataset().catch(console.error);
