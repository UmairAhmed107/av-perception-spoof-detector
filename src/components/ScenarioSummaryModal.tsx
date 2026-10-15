// ============================================================================
// Scenario Debrief & Side-by-Side Scorecard Modal (Light Mode)
// Deep Physical Analysis & Detector Breakdown
// ============================================================================

import React from 'react';
import type { ScenarioId } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import { X, FileText } from 'lucide-react';

interface ScenarioSummaryModalProps {
  scenarioId: ScenarioId;
  onClose: () => void;
}

export const ScenarioSummaryModal: React.FC<ScenarioSummaryModalProps> = ({
  scenarioId,
  onClose,
}) => {
  const scen = SCENARIOS[scenarioId];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
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
            <FileText size={22} color="var(--cyan-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                SCENARIO SUMMARY & PHYSICAL DEBRIEF
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {scen.title} | Category: {scen.category}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Light Mode) */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target & Threat Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Target Entity
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                {scen.targetType}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Threat Classification
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: scen.threatDescription.includes('ATTACK') ? '#e11d48' : '#059669' }}>
                {scen.threatDescription}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Nominal Duration
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                {scen.durationSec.toFixed(1)} seconds (100 frames)
              </div>
            </div>
          </div>

          {/* Underlying Physical Phenomenon */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cyan-primary)', marginBottom: '6px' }}>
              PHYSICAL MECHANISM & SENSOR PHENOMENOLOGY
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {scen.physicalPhenomenon}
            </p>
          </div>

          {/* Side-by-Side 4-Detector Expected Performance Scorecard */}
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
              SIDE-BY-SIDE 4-DETECTOR SCORECARD ON THIS SCENARIO
            </div>

            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Naive Strict */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>1. Naive Strict (±2.50σ): </span>
                  <span style={{ color: 'var(--text-muted)' }}>{scen.detectorExpectedBehavior.naiveStrict}</span>
                </div>
              </div>

              {/* Naive Loose */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>2. Naive Loose (±4.50σ): </span>
                  <span style={{ color: 'var(--text-muted)' }}>{scen.detectorExpectedBehavior.naiveLoose}</span>
                </div>
              </div>

              {/* Strict + Persist */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>3. Strict + Persistence (N=3): </span>
                  <span style={{ color: 'var(--text-muted)' }}>{scen.detectorExpectedBehavior.strictPersist}</span>
                </div>
              </div>

              {/* Proposed Cause-Aware */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: '#047857' }}>4. Proposed Cause-Aware: </span>
                  <span style={{ color: '#0f172a' }}>{scen.detectorExpectedBehavior.causeAware}</span>
                </div>
                <span className="badge badge-emerald" style={{ marginLeft: '12px' }}>
                  OPTIMAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
