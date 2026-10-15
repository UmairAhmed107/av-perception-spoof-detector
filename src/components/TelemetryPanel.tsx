// ============================================================================
// Real-Time Telemetry & Directional Gauges Panel (Light Mode)
// Kinematic Innovation, Mahalanobis Distance & Uncertainty Budgets
// ============================================================================

import React from 'react';
import type { FrameTelemetry } from '../types';
import { Activity, Compass, Gauge, Radio, ShieldCheck } from 'lucide-react';

interface TelemetryPanelProps {
  telemetry: FrameTelemetry | null;
  onOpenGeometry: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  onOpenGeometry,
}) => {
  if (!telemetry) {
    return (
      <div className="glass-panel" style={{ padding: '20px', minHeight: '380px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Awaiting telemetry stream...</p>
      </div>
    );
  }

  const { ekf, measurement, evaluation } = telemetry;

  const gateLimit = 2.5;
  const dM = evaluation.mahalanobisDist;
  const gatePercent = Math.min(100, (dM / 4.5) * 100);
  const isBreached = dM > gateLimit;

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header with Title and Geometry Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            TELEMETRY & KINEMATICS
          </span>
        </div>

        <button
          onClick={onOpenGeometry}
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
          title="Open Interactive Heading Angle Wheel & Velocity Decomposition"
        >
          <Compass size={14} color="var(--cyan-primary)" />
          Vector Geometry
        </button>
      </div>

      {/* Target Velocity Metrics Card (Light Mode) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Filtered Velocity (4D EKF)
          </span>
          <span className="badge badge-cyan font-mono">
            {ekf.speed.toFixed(2)} m/s ({(ekf.speed * 3.6).toFixed(1)} km/h)
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '4px' }}>
            <span style={{ color: '#64748b' }}>v_x (lat): </span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>
              {ekf.vel.x >= 0 ? `+${ekf.vel.x.toFixed(2)}` : ekf.vel.x.toFixed(2)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}> ±{ekf.sigmaVx.toFixed(2)}</span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '4px' }}>
            <span style={{ color: '#64748b' }}>v_y (long): </span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>
              {ekf.vel.y >= 0 ? `+${ekf.vel.y.toFixed(2)}` : ekf.vel.y.toFixed(2)}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}> ±{ekf.sigmaVy.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Radial vs Tangential Decomposition Bar (Light Mode) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Radial Doppler (LOS) vs Tangential
          </span>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--purple-radar)', fontWeight: 600 }}>
            |cos φ| = {evaluation.cosPhi.toFixed(2)} ({evaluation.aspectAngleDeg.toFixed(1)}°)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Expected Radial (v · r_hat):</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{evaluation.vExpectedRad.toFixed(2)} m/s</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (Math.abs(evaluation.vExpectedRad) / 6.0) * 100)}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#0284c7', fontWeight: 600 }}>Measured Radar Doppler:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {measurement.radar.isDetected
                  ? `${measurement.radar.doppler.toFixed(2)} m/s`
                  : 'DROP (0.0 m/s)'}
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${
                    measurement.radar.isDetected
                      ? Math.min(100, (Math.abs(measurement.radar.doppler) / 6.0) * 100)
                      : 0
                  }%`,
                  background: measurement.radar.isDetected
                    ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                    : '#e11d48',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#d97706', fontWeight: 600 }}>Orthogonal Tangential:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{evaluation.vTanSpeed.toFixed(2)} m/s</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (evaluation.vTanSpeed / 6.0) * 100)}%`,
                  background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mahalanobis Innovation Gate Gauge (Light Mode) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={15} color={isBreached ? '#e11d48' : '#059669'} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Mahalanobis Distance d_M
            </span>
          </div>
          <span
            className="font-mono"
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: isBreached ? '#e11d48' : '#059669',
            }}
          >
            {dM.toFixed(2)} σ
          </span>
        </div>

        {/* Progress Bar with Gate Marker */}
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: '#e2e8f0',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${gatePercent}%`,
              background: isBreached
                ? 'linear-gradient(90deg, #d97706, #e11d48)'
                : 'linear-gradient(90deg, #059669, #10b981)',
              transition: 'width 0.15s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(2.5 / 4.5) * 100}%`,
              width: '2px',
              background: '#0f172a',
            }}
            title="Chi-Square Gate: 2.50σ (99% CI)"
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>0.0σ</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Gate Limit: 2.50σ</span>
          <span>4.5σ+</span>
        </div>

        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>Total Budget (σ_total):</span>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>
            {ekf.sigmaTotal.toFixed(3)} m/s
          </span>
        </div>
      </div>

      {/* Sensor Channel Health */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Radio size={14} color="var(--purple-radar)" />
            <span style={{ color: 'var(--purple-radar)', fontWeight: 700 }}>77 GHz FMCW</span>
          </div>
          <div>SNR: {measurement.radar.snrDb.toFixed(1)} dB</div>
          <div>Track Age: {measurement.radar.trackAge} frames</div>
          <div style={{ color: measurement.radar.isDetected ? '#059669' : '#e11d48', fontWeight: 600 }}>
            {measurement.radar.isDetected ? '● RF Carrier Active' : '○ Return Dropped'}
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <ShieldCheck size={14} color="var(--cyan-primary)" />
            <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>3D LiDAR</span>
          </div>
          <div>Density: {(measurement.lidar.pointDensity * 100).toFixed(0)}%</div>
          <div>Range: {evaluation.range.toFixed(1)} m</div>
          <div style={{ color: measurement.lidar.isDetected ? '#059669' : '#e11d48', fontWeight: 600 }}>
            {measurement.lidar.isDetected ? '● Optical Track Active' : '○ No Points'}
          </div>
        </div>
      </div>
    </div>
  );
};
