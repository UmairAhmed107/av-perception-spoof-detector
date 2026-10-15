// ============================================================================
// Plain-Language Glossary & Cyber-Physical Threat Model Modal (Light Mode)
// Academic Reference & Mathematical Notation Lookup
// ============================================================================

import React from 'react';
import { X, BookOpen, Radio, Eye } from 'lucide-react';

interface GlossaryModalProps {
  onClose: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
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
            <BookOpen size={22} color="var(--cyan-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                SCIENTIFIC GLOSSARY & FORMAL THREAT MODEL
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mathematical Notation, Cyber-Physical Threat Assumptions & Sensor Physics
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Light Mode) */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Cyber-Physical Threat Model Architecture */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cyan-primary)', marginBottom: '8px' }}>
              FORMAL CYBER-PHYSICAL THREAT MODEL
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
                fontSize: '0.8rem',
              }}
            >
              {/* Optical LiDAR Channel */}
              <div
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#be123c', fontWeight: 700, marginBottom: '4px' }}>
                  <Eye size={16} />
                  Optical Channel: UNTRUSTED (LiDAR)
                </div>
                <p style={{ color: '#475569', lineHeight: 1.5 }}>
                  Adversary operates synchronized laser pulse emitters within line-of-sight. Can inject synthetic 3D point cloud clusters (&ge; 90% point density) to fabricate phantom vehicles, induce velocity creep, or pulse spoofing at 3–6 Hz.
                </p>
              </div>

              {/* Radio Frequency FMCW Radar Channel */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
                  <Radio size={16} />
                  RF Doppler Channel: TRUSTED GROUND TRUTH
                </div>
                <p style={{ color: '#475569', lineHeight: 1.5 }}>
                  Automotive 77 GHz FMCW radar measures phase shifts across frequency sweeps (Δf_D = 2 v_rad / λ). Cannot be spoofed without high-power multi-antenna RF transceivers. However, radar is subject to deterministic physical constraints (radial blindness, MTI clutter notch, and RCS multipath).
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical & Sensor Physics Glossary */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#0f172a',
              }}
            >
              MATHEMATICAL CONCEPTS & DEFINITIONS
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div>
                <strong style={{ color: 'var(--cyan-primary)' }}>Radial Doppler Velocity (v_rad): </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  The scalar projection of target 2D velocity along the sensor's line of sight: v_rad = v · r_hat. FMCW radar is physically blind to motion perpendicular to r_hat.
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--amber-warn)' }}>Tangential Doppler Blindness: </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  When an obstacle traverses perpendicularly across the roadway (|cos φ| &lt; 0.25), its true speed is high (e.g. 5 m/s) yet radial velocity is near zero. Naive cross-verification systems misinterpret this as a sensor fault.
                </span>
              </div>

              <div>
                <strong style={{ color: '#b45309' }}>Radar MTI Clutter Notch: </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  Moving Target Indication hardware notch filter that eliminates zero-Doppler reflections (|v_rad| &lt; 0.40 m/s) to prevent stationary tarmac, bridges, and guardrails from flooding the radar DSP buffer.
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--purple-radar)' }}>Directional Variance Projection (σ_proj²): </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  The transformation σ_proj² = r_hat^T P_v r_hat, projecting the 4D Kalman filter's velocity covariance matrix onto the line of sight to establish an exact 1-sigma uncertainty budget with radar noise: σ_total = sqrt(σ_radar² + σ_proj²).
                </span>
              </div>

              <div>
                <strong style={{ color: '#0284c7' }}>Chi-Square Mahalanobis Innovation Gating: </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  Normalized kinematic distance d_M = |r| / σ_total tested against gate limit γ = 2.50σ (~99% confidence interval) to isolate statistically significant sensor discrepancies.
                </span>
              </div>

              <div>
                <strong style={{ color: '#059669' }}>Asymmetric Leaky Temporal Trust Accumulator: </strong>
                <span style={{ color: 'var(--text-muted)' }}>
                  A track credibility integrator with rapid decay (α = 0.20 per unattributed anomaly frame) and conservative recovery (β = 0.05 per consistent/benign frame). Because α &gt;&gt; β, pulsed adversarial injection (alternating 1 frame on, 1 frame off) cannot exploit memory resets.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
