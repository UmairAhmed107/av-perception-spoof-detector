// ============================================================================
// 4D Linear Kalman Filter (EKF/LKF) with Directional Uncertainty
// Continuous-White-Noise-Acceleration (CWNA) Model
// ============================================================================

import { Vector2D, EKFState } from '../types';

export class LinearKalmanFilter2D {
  // State vector: [px, py, vx, vy]^T
  public x: number[];
  // Covariance matrix: 4x4
  public P: number[][];
  // Process noise spectral density (acceleration variance)
  private q: number;

  constructor(
    initialPos: Vector2D = { x: 0, y: 15 },
    initialVel: Vector2D = { x: 0, y: 0 },
    qAcc: number = 0.8
  ) {
    this.q = qAcc;
    this.x = [initialPos.x, initialPos.y, initialVel.x, initialVel.y];
    this.P = [
      [1.0, 0.0, 0.0, 0.0],
      [0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 4.0, 0.0],
      [0.0, 0.0, 0.0, 4.0],
    ];
  }

  public reset(
    pos: Vector2D,
    vel: Vector2D,
    posUncertainty: number = 1.0,
    velUncertainty: number = 4.0
  ) {
    this.x = [pos.x, pos.y, vel.x, vel.y];
    this.P = [
      [posUncertainty, 0.0, 0.0, 0.0],
      [0.0, posUncertainty, 0.0, 0.0],
      [0.0, 0.0, velUncertainty, 0.0],
      [0.0, 0.0, 0.0, velUncertainty],
    ];
  }

  /**
   * Predict step using CWNA Kinematic Model
   * Clamps dt to prevent numerical divergence if browser tab is blurred.
   */
  public predict(dtSeconds: number): void {
    const dt = Math.max(0.001, Math.min(0.1, dtSeconds));

    // State transition: x = F * x
    const px = this.x[0] + this.x[2] * dt;
    const py = this.x[1] + this.x[3] * dt;
    const vx = this.x[2];
    const vy = this.x[3];

    this.x[0] = px;
    this.x[1] = py;
    this.x[2] = vx;
    this.x[3] = vy;

    // F matrix
    // [1, 0, dt, 0 ]
    // [0, 1, 0,  dt]
    // [0, 0, 1,  0 ]
    // [0, 0, 0,  1 ]

    // Continuous Process Noise Covariance Q
    const dt2 = dt * dt;
    const dt3 = dt2 * dt;
    const q3 = (this.q * dt3) / 3.0;
    const q2 = (this.q * dt2) / 2.0;
    const q1 = this.q * dt;

    const Q: number[][] = [
      [q3, 0.0, q2, 0.0],
      [0.0, q3, 0.0, q2],
      [q2, 0.0, q1, 0.0],
      [0.0, q2, 0.0, q1],
    ];

    // Compute P_new = F * P * F^T + Q
    // Step 1: FP = F * P
    const FP: number[][] = [
      [
        this.P[0][0] + dt * this.P[2][0],
        this.P[0][1] + dt * this.P[2][1],
        this.P[0][2] + dt * this.P[2][2],
        this.P[0][3] + dt * this.P[2][3],
      ],
      [
        this.P[1][0] + dt * this.P[3][0],
        this.P[1][1] + dt * this.P[3][1],
        this.P[1][2] + dt * this.P[3][2],
        this.P[1][3] + dt * this.P[3][3],
      ],
      [this.P[2][0], this.P[2][1], this.P[2][2], this.P[2][3]],
      [this.P[3][0], this.P[3][1], this.P[3][2], this.P[3][3]],
    ];

    // Step 2: (FP) * F^T + Q
    const nextP: number[][] = Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const fT_0 = c === 0 ? 1 : 0;
        const fT_1 = c === 1 ? 1 : 0;
        const fT_2 = c === 0 ? dt : c === 2 ? 1 : 0;
        const fT_3 = c === 1 ? dt : c === 3 ? 1 : 0;

        nextP[r][c] =
          FP[r][0] * fT_0 +
          FP[r][1] * fT_1 +
          FP[r][2] * fT_2 +
          FP[r][3] * fT_3 +
          Q[r][c];
      }
    }

    this.P = nextP;
    this.sanitizeCovariance();
  }

  /**
   * Measurement Update with 2D LiDAR Position [zx, zy]
   */
  public updatePosition(measuredPos: Vector2D, posNoiseStd: number): void {
    const rVar = Math.max(1e-4, posNoiseStd * posNoiseStd);

    // Innovation residual: y = z - H * x
    const y0 = measuredPos.x - this.x[0];
    const y1 = measuredPos.y - this.x[1];

    // Innovation covariance: S = H * P * H^T + R
    // Since H = [[1,0,0,0], [0,1,0,0]], H * P * H^T is the upper-left 2x2 of P
    const s00 = this.P[0][0] + rVar;
    const s01 = this.P[0][1];
    const s10 = this.P[1][0];
    const s11 = this.P[1][1] + rVar;

    const detS = s00 * s11 - s01 * s10;
    if (Math.abs(detS) < 1e-9) {
      // Degenerate measurement covariance; skip update
      return;
    }

    const invDet = 1.0 / detS;
    const invS00 = s11 * invDet;
    const invS01 = -s01 * invDet;
    const invS10 = -s10 * invDet;
    const invS11 = s00 * invDet;

    // Kalman gain: K = P * H^T * inv(S)
    // P * H^T is 4x2 consisting of the first two columns of P
    const K: number[][] = Array(4)
      .fill(0)
      .map(() => Array(2).fill(0));

    for (let r = 0; r < 4; r++) {
      const pR0 = this.P[r][0];
      const pR1 = this.P[r][1];
      K[r][0] = pR0 * invS00 + pR1 * invS10;
      K[r][1] = pR0 * invS01 + pR1 * invS11;
    }

    // State update: x = x + K * y
    for (let r = 0; r < 4; r++) {
      this.x[r] += K[r][0] * y0 + K[r][1] * y1;
    }

    // Covariance update: P = (I - K * H) * P
    // I_KH = I - K*H
    const I_KH: number[][] = [
      [1 - K[0][0], -K[0][1], 0, 0],
      [-K[1][0], 1 - K[1][1], 0, 0],
      [-K[2][0], -K[2][1], 1, 0],
      [-K[3][0], -K[3][1], 0, 1],
    ];

    const updatedP: number[][] = Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += I_KH[i][k] * this.P[k][j];
        }
        updatedP[i][j] = sum;
      }
    }

    this.P = updatedP;
    this.sanitizeCovariance();
  }

  /**
   * Projects velocity covariance along target Line-of-Sight unit vector:
   * sigma_{v, proj}^2 = r_hat^T * P_v * r_hat
   */
  public projectVelocityVariance(rHat: Vector2D): number {
    const Pvx_vx = this.P[2][2];
    const Pvx_vy = this.P[2][3];
    const Pvy_vx = this.P[3][2];
    const Pvy_vy = this.P[3][3];

    // r_hat^T * P_v * r_hat = rx^2 * P22 + 2*rx*ry*P23 + ry^2 * P33
    const projVar =
      rHat.x * rHat.x * Pvx_vx +
      rHat.x * rHat.y * (Pvx_vy + Pvy_vx) +
      rHat.y * rHat.y * Pvy_vy;

    return Math.max(1e-6, projVar);
  }

  /**
   * Enforces symmetry and positive-definiteness bounds
   */
  private sanitizeCovariance(): void {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const avg = (this.P[i][j] + this.P[j][i]) / 2.0;
        this.P[i][j] = avg;
        this.P[j][i] = avg;
      }
      this.P[i][i] = Math.max(1e-4, Math.min(250.0, this.P[i][i]));
    }
  }

  /**
   * Extracts telemetry snapshot
   */
  public getStateSnapshot(
    rHat: Vector2D,
    radarSensorNoise: number = 0.35
  ): EKFState {
    const vx = this.x[2];
    const vy = this.x[3];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const headingDeg = (Math.atan2(vy, vx) * 180.0) / Math.PI;

    const sigmaVx = Math.sqrt(Math.max(1e-6, this.P[2][2]));
    const sigmaVy = Math.sqrt(Math.max(1e-6, this.P[3][3]));

    const sigmaVproj2 = this.projectVelocityVariance(rHat);
    const sigmaVproj = Math.sqrt(sigmaVproj2);

    const sigmaTotal = Math.sqrt(radarSensorNoise * radarSensorNoise + sigmaVproj2);

    return {
      pos: { x: this.x[0], y: this.x[1] },
      vel: { x: vx, y: vy },
      speed,
      headingDeg,
      cov: this.P.map((row) => [...row]),
      sigmaVx,
      sigmaVy,
      sigmaVproj,
      sigmaTotal,
    };
  }
}
