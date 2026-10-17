// ============================================================================
// AV Perception Integrity & Defense Research Testbed
// Type Definitions & Telemetry Schemas
// ============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

export type AttributionCategory =
  | 'CONSISTENT'
  | 'BENIGN_TANGENTIAL_BLINDNESS'
  | 'BENIGN_CLUTTER_NOTCH_DROP'
  | 'BENIGN_RCS_DROPOUT'
  | 'BENIGN_TIMING_SKEW'
  | 'BENIGN_CALIBRATION_DRIFT'
  | 'BENIGN_MULTIPATH_GHOST'
  | 'BENIGN_LIDAR_CROSSTALK'
  | 'UNATTRIBUTED_ANOMALY';

export type AlarmStatus =
  | 'NORMAL'
  | 'BENIGN_ATTRIBUTED'
  | 'SPOOF_ATTACK_CONFIRMED';

export type DetectorState =
  | 'NORMAL'
  | 'FALSE_ALARM'
  | 'CONFIRMED_ALARM'
  | 'UNDETECTED_ATTACK'
  | 'BENIGN_EXEMPT';

export type ScenarioCategory =
  | 'Core Scenarios'
  | 'Smarter Adversarial Attacks'
  | 'Rich Benign Physical Artifacts';

export type ScenarioId =
  | 'scen_1_cyclist_tangential'
  | 'scen_2_phantom_spoof'
  | 'scen_3_rcs_dropout'
  | 'scen_4_loose_bypass'
  | 'scen_5_slow_creep'
  | 'scen_6_phantom_tangential'
  | 'scen_7_pulsed_spoof'
  | 'scen_8_guardrail_multipath'
  | 'scen_9_boresight_drift';

export interface SimulationParams {
  sigmaRadar: number; // radar Doppler measurement std (m/s, default ~0.35)
  sigmaLidar: number; // lidar position measurement std (m, default ~0.12)
  chiGate: number; // Mahalanobis gating limit (gamma, default ~2.50)
  tangentialEpsilon: number; // |cos phi| cutoff for tangential (default ~0.25)
  clutterNotchSpeed: number; // MTI notch speed threshold (m/s, default ~0.40)
  alphaDecay: number; // trust decay rate per anomaly frame (default ~0.20)
  betaRecovery: number; // trust recovery rate per benign frame (default ~0.05)
  trustThreshold: number; // trust alarm threshold (default ~0.35)
  streakThreshold: number; // consecutive frames required for alarm (default ~3)
}

export interface SensorMeasurement {
  time: number;
  frameIndex: number;
  groundTruth: {
    pos: Vector2D;
    vel: Vector2D;
    headingDeg: number;
    speed: number;
  };
  lidar: {
    pos: Vector2D;
    isDetected: boolean;
    pointDensity: number; // 0.0 - 1.0 (90%+ for synthetic/real)
  };
  radar: {
    doppler: number; // measured radial velocity (m/s)
    isDetected: boolean;
    snrDb: number; // SNR in dB
    trackAge: number; // frames of continuous radar track
    rangeElongation?: number; // multipath path elongation in meters
    nearReflector?: boolean; // proximity to guardrail or wall
  };
  rangeElongation?: number;
  nearReflector?: boolean;
  isAttackActive: boolean;
  attackType?: string;
  scenarioExplanation: string;
}

export interface EKFState {
  pos: Vector2D;
  vel: Vector2D;
  speed: number;
  headingDeg: number;
  cov: number[][]; // 4x4 covariance matrix
  sigmaVx: number;
  sigmaVy: number;
  sigmaVproj: number;
  sigmaTotal: number;
}

export interface DetectorVerdict {
  id: string;
  name: string;
  formula: string;
  isAnomaly: boolean;
  alarmTriggered: boolean;
  emergencyBrakeActive: boolean;
  state: DetectorState;
  statusText: string;
  falseAlarmsCount: number;
  trueDetectionsCount: number;
}

export interface PipelineEvaluation {
  // Line of sight
  rHat: Vector2D;
  range: number;
  azimuthDeg: number;
  // Velocity decomposition
  vExpectedRad: number;
  vRadVec: Vector2D;
  vTanVec: Vector2D;
  vTanSpeed: number;
  cosPhi: number;
  aspectAngleDeg: number;
  // Residuals & Gating
  residual: number;
  mahalanobisDist: number;
  chiSquare: number;
  isAnomaly: boolean;
  // Cause-Aware Attribution
  attribution: AttributionCategory;
  attributionTitle: string;
  attributionReason: string;
  ruleTrace: {
    id: number;
    name: string;
    condition: string;
    triggered: boolean;
    verdict: string;
  }[];
  // Temporal Trust
  trustScore: number;
  trustDelta: number;
  consecutiveUnattributed: number;
  alarmStatus: AlarmStatus;
  // Concurrent 4-Detector benchmark
  detectors: {
    naiveStrict: DetectorVerdict;
    naiveLoose: DetectorVerdict;
    strictPersist: DetectorVerdict;
    causeAware: DetectorVerdict;
  };
}

export interface FrameTelemetry {
  measurement: SensorMeasurement;
  ekf: EKFState;
  evaluation: PipelineEvaluation;
}

export interface TimeSeriesPoint {
  time: number;
  frameIndex: number;
  trust: number;
  vExpected: number;
  vMeasured: number | null;
  gateUpper: number;
  gateLower: number;
  mahalanobisDist: number;
  isAttack: boolean;
  isNotch: boolean;
  attribution: AttributionCategory;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  category: ScenarioCategory;
  title: string;
  subtitle: string;
  targetType: string;
  durationSec: number;
  initialPos: Vector2D;
  initialVel: Vector2D;
  headingDeg: number;
  threatDescription: string;
  physicalPhenomenon: string;
  detectorExpectedBehavior: {
    naiveStrict: string;
    naiveLoose: string;
    strictPersist: string;
    causeAware: string;
  };
  recommendedPlaybackSpeed: number;
}

export interface MonteCarloScenarioStats {
  scenarioId: ScenarioId;
  scenarioTitle: string;
  trials: number;
  detectors: Record<
    string,
    {
      name: string;
      falseAlarmRate: number; // percentage (0-100)
      detectionRate: number; // percentage (0-100)
      mttdFrames: number; // Mean Time to Detect in frames
      mttdSeconds: number; // Mean Time to Detect in seconds
    }
  >;
}
