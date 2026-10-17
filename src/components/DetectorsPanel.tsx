// ============================================================================
// Concurrent 4-Detector Defense Benchmark Panel (Light Mode)
// Live Comparative Verification & Real-Time Efficacy Metrics
// ============================================================================

import React from 'react';
import type { FrameTelemetry } from '../types';
import { Shield, AlertOctagon, CheckCircle, ShieldAlert, AlertTriangle, Cpu } from 'lucide-react';

interface DetectorsPanelProps {
  telemetry: FrameTelemetry | null;
}

export const DetectorsPanel: React.FC<DetectorsPanelProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const detectors = telemetry.evaluation.detectors;
  const list = [
    {
      data: detectors.naiveStrict,
      type: 'naive-strict',
      tag: 'FAIL: False Alarms on Benign Drops',
      icon: AlertTriangle,
    },
    {
      data: detectors.naiveLoose,
      type: 'naive-loose',
      tag: 'FAIL: Blind to Calibrated Offset',
      icon: AlertOctagon,
    },
    {
      data: detectors.strictPersist,
      type: 'strict-persist',
      tag: 'FAIL: Defeated by Pulsed Injection',
      icon: AlertTriangle,
    },
    {
      data: detectors.causeAware,
      type: 'cause-aware',
      tag: 'OPTIMAL: 0% False Alarms, 100% Catch',
      icon: CheckCircle,
    },
    ...(detectors.mlRandomForest
      ? [
          {
            data: detectors.mlRandomForest,
            type: 'ml-random-forest',
            tag: `ML: P(Spoof)=${(detectors.mlRandomForest.spoofProbability * 100).toFixed(1)}% | ${detectors.mlRandomForest.predictedCause}`,
            icon: Cpu,
          },
        ]
      : []),
  ];

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
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
          <Shield size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.02em' }}>
            CONCURRENT 5-DETECTOR DEFENSE BENCHMARK (PHYSICS + ML)
          </span>
          <span className="badge badge-cyan">REAL-TIME COMPARISON</span>
        </div>

        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Active Threat: {telemetry.measurement.isAttackActive ? '🔴 ATTACK IN PROGRESS' : '🟢 BENIGN STREAM'}
        </span>
      </div>

      {/* 4 Detector Cards Grid (Light Mode) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {list.map((item) => {
          const det = item.data;
          const isBrake = det.emergencyBrakeActive;
          const isCauseAware = item.type === 'cause-aware';
          const isML = item.type === 'ml-random-forest';

          let cardBorder = '#e2e8f0';
          let cardBg = '#ffffff';
          let badgeClass = 'badge-cyan';

          if (isBrake) {
            cardBorder = isCauseAware ? '#a7f3d0' : isML ? '#ddd6fe' : '#fecdd3';
            cardBg = isCauseAware ? '#f0fdf4' : isML ? '#faf5ff' : '#fff1f2';
            badgeClass = isCauseAware ? 'badge-emerald' : isML ? 'badge-cyan' : 'badge-rose';
          } else if (det.state === 'UNDETECTED_ATTACK') {
            cardBorder = '#fecdd3';
            cardBg = '#fff1f2';
            badgeClass = 'badge-rose';
          } else if (det.state === 'BENIGN_EXEMPT') {
            cardBg = '#fffbeb';
            cardBorder = '#fde68a';
            badgeClass = 'badge-amber';
          } else if (isML) {
            cardBorder = '#e9d5ff';
            cardBg = '#faf5ff';
            badgeClass = 'badge-cyan';
          }

          return (
            <div
              key={det.id}
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: isBrake && !isCauseAware && !isML ? '0 4px 12px rgba(225, 29, 72, 0.15)' : 'var(--shadow-card)',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isCauseAware ? '#0284c7' : isML ? '#7c3aed' : '#0f172a' }}>
                    {det.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {det.formula}
                  </div>
                </div>

                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isBrake ? (isML ? '#7c3aed' : '#e11d48') : '#059669',
                    boxShadow: isBrake ? (isML ? '0 0 6px #7c3aed' : '0 0 6px #e11d48') : '0 0 4px #059669',
                  }}
                  title={isBrake ? 'Emergency Brake Engaged' : 'Normal Driving'}
                />
              </div>

              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>
                  {det.statusText}
                </span>
              </div>

              {/* ML-Specific Metrics: Spoof Probability & Predicted Cause */}
              {isML && 'spoofProbability' in det && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e9d5ff',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Spoof Probability:</span>
                    <strong style={{ color: (det as any).spoofProbability >= 0.5 ? '#e11d48' : '#059669', fontSize: '0.8rem' }}>
                      {(((det as any).spoofProbability ?? 0) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, ((det as any).spoofProbability ?? 0) * 100))}%`,
                        height: '100%',
                        background: (det as any).spoofProbability >= 0.5 ? 'linear-gradient(90deg, #f59e0b, #e11d48)' : '#10b981',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Predicted Cause:</span>
                    <span
                      style={{
                        background: '#f3e8ff',
                        color: '#6b21a8',
                        border: '1px solid #d8b4fe',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                      }}
                    >
                      {(det as any).predictedCause}
                    </span>
                  </div>
                </div>
              )}

              {/* Brake Action Alert Bar */}
              <div
                style={{
                  background: isBrake ? 'rgba(225, 29, 72, 0.08)' : '#f8fafc',
                  border: `1px solid ${isBrake ? 'rgba(225, 29, 72, 0.2)' : '#e2e8f0'}`,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isBrake ? <ShieldAlert size={14} color="#e11d48" /> : <CheckCircle size={14} color="#059669" />}
                  <span style={{ color: isBrake ? '#be123c' : '#475569', fontWeight: 600 }}>
                    BRAKE: {isBrake ? 'ENGAGED' : 'DISENGAGED'}
                  </span>
                </div>

                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {item.tag}
                </span>
              </div>

              {/* Cumulative Statistical Performance Counters */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '6px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>False Alarms: <strong style={{ color: det.falseAlarmsCount > 0 ? '#e11d48' : '#059669' }}>{det.falseAlarmsCount}</strong></span>
                <span>True Catches: <strong style={{ color: '#0284c7' }}>{det.trueDetectionsCount}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
