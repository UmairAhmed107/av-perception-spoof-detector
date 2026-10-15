// ============================================================================
// Live Decision Pipeline Flowchart & Rule Trace (Light Mode)
// Real-Time Visual Architecture of the Cause-Aware Perception Defense
// ============================================================================

import React from 'react';
import type { FrameTelemetry } from '../types';
import {
  GitCommit,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Cpu,
} from 'lucide-react';

interface FlowchartPipelineProps {
  telemetry: FrameTelemetry | null;
  onOpenExplainFrame: () => void;
}

export const FlowchartPipeline: React.FC<FlowchartPipelineProps> = ({
  telemetry,
  onOpenExplainFrame,
}) => {
  if (!telemetry) return null;

  const { evaluation } = telemetry;
  const isAnomaly = evaluation.isAnomaly;
  const attribution = evaluation.attribution;
  const isSpoofConfirmed = evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED';
  const isBenign = evaluation.alarmStatus === 'BENIGN_ATTRIBUTED';

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
          <GitCommit size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.02em' }}>
            LIVE DECISION PIPELINE & RULE TRACE
          </span>
          <span className="badge badge-purple">CAUSE-AWARE ENGINE</span>
        </div>

        <button
          onClick={onOpenExplainFrame}
          className="btn-primary"
          style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '6px' }}
          title="Pause and inspect the step-by-step mathematical breakdown for this frame"
        >
          <HelpCircle size={15} />
          Explain Frame Math
        </button>
      </div>

      {/* 5-Stage Interactive Pipeline Flow (Light Mode) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '10px',
          position: 'relative',
        }}
      >
        {/* Node 1: Sensor Ingestion & EKF */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #bae6fd',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700 }}>STAGE 1</span>
            <Cpu size={14} color="#0284c7" />
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Sensor Ingestion & EKF</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            LiDAR + FMCW Doppler synch
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>
            4D CWNA Track
          </span>
        </div>

        {/* Node 2: Variance Projection & Residual */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e9d5ff',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: '#6d28d9', fontWeight: 700 }}>STAGE 2</span>
            <Sliders size={14} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>LOS Projection</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            r_hat^T P_v r_hat = σ_proj²
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>
            σ_tot: {telemetry.ekf.sigmaTotal.toFixed(2)} m/s
          </span>
        </div>

        {/* Node 3: Mahalanobis Gate */}
        <div
          style={{
            background: isAnomaly ? '#fff1f2' : '#f0fdf4',
            border: `1px solid ${isAnomaly ? '#fecdd3' : '#bbf7d0'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: isAnomaly ? '#be123c' : '#15803d', fontWeight: 700 }}>
              STAGE 3
            </span>
            {isAnomaly ? <AlertTriangle size={14} color="#e11d48" /> : <CheckCircle size={14} color="#059669" />}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Mahalanobis Gate</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            d_M = {evaluation.mahalanobisDist.toFixed(2)}σ
          </div>
          <span
            className={`badge ${isAnomaly ? 'badge-rose' : 'badge-emerald'}`}
            style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}
          >
            {isAnomaly ? 'ANOMALY DETECTED' : 'GATE CONSISTENT'}
          </span>
        </div>

        {/* Node 4: Attribution Rule */}
        <div
          style={{
            background: isBenign
              ? '#fffbeb'
              : isSpoofConfirmed
              ? '#fff1f2'
              : '#f8fafc',
            border: `1px solid ${
              isBenign
                ? '#fde68a'
                : isSpoofConfirmed
                ? '#fecdd3'
                : '#e2e8f0'
            }`,
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: isBenign ? '#b45309' : isSpoofConfirmed ? '#be123c' : '#0369a1',
                fontWeight: 700,
              }}
            >
              STAGE 4
            </span>
            <GitCommit size={14} color={isBenign ? '#d97706' : isSpoofConfirmed ? '#e11d48' : '#0284c7'} />
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Attribution Rule</div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={attribution}
          >
            {attribution}
          </div>
          <span
            className={`badge ${
              isBenign ? 'badge-amber' : isSpoofConfirmed ? 'badge-rose' : 'badge-cyan'
            }`}
            style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}
          >
            {isBenign ? 'PHYSICAL EXEMPT' : isSpoofConfirmed ? 'UNATTRIBUTED' : 'PASS'}
          </span>
        </div>

        {/* Node 5: Trust & Braking */}
        <div
          style={{
            background: isSpoofConfirmed
              ? '#fff1f2'
              : '#f8fafc',
            border: `1px solid ${isSpoofConfirmed ? '#fecdd3' : '#e2e8f0'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: isSpoofConfirmed ? '0 4px 12px rgba(225, 29, 72, 0.2)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.7rem', color: isSpoofConfirmed ? '#be123c' : '#047857', fontWeight: 700 }}>
              STAGE 5
            </span>
            {isSpoofConfirmed ? <ShieldAlert size={14} color="#e11d48" /> : <CheckCircle size={14} color="#059669" />}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Trust & Action</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Trust: {(evaluation.trustScore * 100).toFixed(0)}% (Δ {evaluation.trustDelta > 0 ? `+${evaluation.trustDelta.toFixed(2)}` : evaluation.trustDelta.toFixed(2)})
          </div>
          <span
            className={`badge ${isSpoofConfirmed ? 'badge-rose' : 'badge-emerald'}`}
            style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}
          >
            {isSpoofConfirmed ? 'EMERGENCY BRAKE' : 'NORMAL CRUISE'}
          </span>
        </div>
      </div>

      {/* Active Rule Explanation Callout (Light Mode) */}
      <div
        style={{
          background: '#f8fafc',
          borderLeft: `4px solid ${
            isSpoofConfirmed
              ? 'var(--rose-alarm)'
              : isBenign
              ? 'var(--amber-warn)'
              : 'var(--cyan-primary)'
          }`,
          borderTop: '1px solid #e2e8f0',
          borderRight: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 12px',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {evaluation.attributionTitle}:{' '}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{evaluation.attributionReason}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Streak: {evaluation.consecutiveUnattributed}/3 frames
          </span>
        </div>
      </div>
    </div>
  );
};
