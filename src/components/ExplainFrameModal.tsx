// ============================================================================
// Explain Frame Mathematical Walkthrough Modal (Light Mode)
// 5-Stage Step-by-Step Derivation of Perceptual Decision Logic
// ============================================================================

import React from 'react';
import type { FrameTelemetry } from '../types';
import { X, HelpCircle } from 'lucide-react';

interface ExplainFrameModalProps {
  telemetry: FrameTelemetry | null;
  onClose: () => void;
}

export const ExplainFrameModal: React.FC<ExplainFrameModalProps> = ({
  telemetry,
  onClose,
}) => {
  if (!telemetry) return null;

  const { ekf, measurement, evaluation } = telemetry;
  const isAttack = measurement.isAttackActive;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={22} color="var(--cyan-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                STEP-BY-STEP FRAME MATHEMATICAL WALKTHROUGH
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Frame #{measurement.frameIndex} | Timestamp: {measurement.time.toFixed(2)}s | Threat: {isAttack ? 'ACTIVE ATTACK' : 'BENIGN'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 5-Stage Step-by-Step Content (Light Mode) */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Stage 1: Raw LiDAR Coordinates & 4D EKF State */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-cyan">STAGE 1</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Raw 3D LiDAR Measurement & 4D Kalman State
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              LiDAR delivers 2D position vector z = [z_x, z_y]^T. The 4D continuous-white-noise-acceleration Kalman Filter updates state estimate x = [p_x, p_y, v_x, v_y]^T:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>LiDAR Measured Pos: </span>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>
                  [{measurement.lidar.pos.x.toFixed(2)}, {measurement.lidar.pos.y.toFixed(2)}] m
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>EKF Filtered Pos: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  [{ekf.pos.x.toFixed(2)}, {ekf.pos.y.toFixed(2)}] m
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>EKF Filtered Velocity: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  [{ekf.vel.x.toFixed(2)}, {ekf.vel.y.toFixed(2)}] m/s (|v| = {ekf.speed.toFixed(2)})
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>LiDAR Point Density: </span>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  {(measurement.lidar.pointDensity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stage 2: Line of Sight Unit Vector & Kinematic Projection */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-purple">STAGE 2</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Line-of-Sight Unit Vector & Velocity Decomposition
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Because FMCW radar measures phase shifts along line of sight r_hat = p / ||p||, we project EKF velocity:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>LOS Unit Vector r_hat: </span>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                  [{evaluation.rHat.x.toFixed(3)}, {evaluation.rHat.y.toFixed(3)}]
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Range R & Azimuth θ: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  {evaluation.range.toFixed(2)}m @ {evaluation.azimuthDeg.toFixed(1)}°
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Expected Radial v_exp: </span>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>
                  v · r_hat = {evaluation.vExpectedRad.toFixed(2)} m/s
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Aspect Fraction |cos φ|: </span>
                <span style={{ color: '#d97706', fontWeight: 700 }}>
                  {evaluation.cosPhi.toFixed(2)} ({evaluation.aspectAngleDeg.toFixed(1)}°)
                </span>
              </div>
            </div>
          </div>

          {/* Stage 3: Directional Uncertainty & Radar Reading */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-cyan">STAGE 3</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Directional Variance Projection & Combined Error Budget
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Projecting velocity covariance matrix P_v onto r_hat yields σ_proj². Total 1-sigma budget is σ_total = sqrt(σ_radar² + σ_proj²):
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Projected Variance σ_proj: </span>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>
                  {ekf.sigmaVproj.toFixed(3)} m/s
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Radar Doppler Sensor Noise: </span>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>
                  0.350 m/s (77 GHz FMCW)
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Total Error Budget σ_total: </span>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  {ekf.sigmaTotal.toFixed(3)} m/s
                </span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px' }}>
                <span style={{ color: '#64748b' }}>Measured Radar Doppler: </span>
                <span style={{ color: measurement.radar.isDetected ? '#059669' : '#e11d48', fontWeight: 700 }}>
                  {measurement.radar.isDetected ? `${measurement.radar.doppler.toFixed(2)} m/s` : 'RETURN DROPPED'}
                </span>
              </div>
            </div>
          </div>

          {/* Stage 4: Residual, Mahalanobis Distance & Rule Trace */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-amber">STAGE 4</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Kinematic Innovation Residual & Physical Attribution Rule Checks
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Residual r = v_measured - v_expected = {evaluation.residual.toFixed(2)} m/s. Normalized Mahalanobis distance d_M = |r| / σ_total = {evaluation.mahalanobisDist.toFixed(2)}σ.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evaluation.ruleTrace.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    background: rule.triggered ? '#fffbeb' : '#ffffff',
                    border: `1px solid ${rule.triggered ? '#fde68a' : '#e2e8f0'}`,
                    borderLeft: `3px solid ${rule.triggered ? 'var(--amber-warn)' : '#cbd5e1'}`,
                    padding: '8px 12px',
                    borderRadius: '0 4px 4px 0',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: rule.triggered ? '#b45309' : '#0f172a' }}>
                      Check {rule.id}: {rule.name}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{rule.condition}</div>
                  </div>
                  <span
                    className={`badge ${rule.triggered ? 'badge-amber' : 'badge-cyan'}`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {rule.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 5: Asymmetric Leaky Trust Update & Brake Verdict */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-emerald">STAGE 5</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Asymmetric Leaky Trust Score & Braking Decision
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Because attribution = {evaluation.attribution}, trust updated by ΔT = {evaluation.trustDelta > 0 ? `+${evaluation.trustDelta.toFixed(2)}` : evaluation.trustDelta.toFixed(2)}. Current Trust: {(evaluation.trustScore * 100).toFixed(0)}%.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Final Perception Status
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  {evaluation.attributionTitle}
                </div>
              </div>
              <span
                className={`badge ${
                  evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED'
                    ? 'badge-rose'
                    : evaluation.alarmStatus === 'BENIGN_ATTRIBUTED'
                    ? 'badge-amber'
                    : 'badge-emerald'
                }`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                {evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED'
                  ? 'SPOOF ATTACK CONFIRMED: BRAKE ENGAGED'
                  : evaluation.alarmStatus === 'BENIGN_ATTRIBUTED'
                  ? 'BENIGN EXEMPT: BRAKE SUPPRESSED'
                  : 'NORMAL SENSOR FUSION'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
