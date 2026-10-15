// ============================================================================
// Guided Tour & Dynamic Scenario Walkthrough (Light Mode)
// Progressive Contextual Guidance Synchronized with Scenario Playback
// ============================================================================

import React, { useState } from 'react';
import type { ScenarioId } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import { Sparkles, X } from 'lucide-react';

interface GuidedTourProps {
  scenarioId: ScenarioId;
  currentTime: number;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  scenarioId,
  currentTime,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const scen = SCENARIOS[scenarioId];

  if (!isVisible) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => setIsVisible(true)}
          className="btn-secondary"
          style={{ padding: '3px 10px', fontSize: '0.72rem', gap: '5px' }}
        >
          <Sparkles size={12} color="var(--cyan-primary)" />
          Show Walkthrough Guide
        </button>
      </div>
    );
  }

  // Determine active phase based on playback timestamp
  let phaseIndex = 1;
  let phaseTitle = 'Phase 1: Sensor Ingestion & Baseline Kinematics';
  let phaseDescription =
    'LiDAR point clouds and 77 GHz radar Doppler streams are ingested. 4D Kalman filter tracks position and speed while projecting directional velocity covariance.';

  if (currentTime >= 1.0 && currentTime <= 3.2) {
    phaseIndex = 2;
    phaseTitle = 'Phase 2: Phenomenon Onset & Residual Divergence';
    phaseDescription = scen.threatDescription.includes('ATTACK')
      ? 'Adversarial pulse injection or velocity bias begins. Kinematic innovation residual breaches the Chi-Square gate limit.'
      : 'Target enters radar MTI clutter notch or experiences momentary multipath dropout. Naive detectors trigger false alarms!';
  } else if (currentTime > 3.2) {
    phaseIndex = 3;
    phaseTitle = 'Phase 3: Cause-Aware Attribution & Braking Decision';
    phaseDescription = scen.threatDescription.includes('ATTACK')
      ? 'Engine validates zero prior track history or longitudinal inconsistency. Temporal trust exhausts below 0.35, locking CONFIRMED SPOOFING alarm!'
      : 'Physics engine evaluates the 5 benign rules, recognizes tangential geometry or MTI clutter notch, exempts alarm, and preserves 100% trust!';
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(124, 58, 237, 0.05))',
        border: '1px solid #cbd5e1',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <div
          style={{
            background: 'var(--cyan-primary)',
            color: '#ffffff',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.8rem',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
          }}
        >
          {phaseIndex}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
              {phaseTitle}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
              LIVE WALKTHROUGH
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {phaseDescription}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: phaseIndex === step ? 'var(--cyan-primary)' : '#cbd5e1',
                boxShadow: phaseIndex === step ? '0 0 6px rgba(2, 132, 199, 0.5)' : 'none',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="btn-secondary"
          style={{ padding: '4px', borderRadius: '50%', border: 'none', background: 'transparent' }}
          title="Dismiss Walkthrough Banner"
        >
          <X size={15} color="#64748b" />
        </button>
      </div>
    </div>
  );
};
