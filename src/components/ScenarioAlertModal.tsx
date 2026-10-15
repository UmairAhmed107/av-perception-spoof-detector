// ============================================================================
// Scenario Pop-Up Alert Modal
// Critical Threat Briefing & Physical Phenomenon Warning per Scenario
// ============================================================================

import React from 'react';
import type { ScenarioId } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  Play,
  Zap,
  Radio,
  Eye,
  Info,
} from 'lucide-react';

interface ScenarioAlertModalProps {
  scenarioId: ScenarioId;
  onClose: () => void;
  onPlay: () => void;
}

interface ScenarioAlertContent {
  headline: string;
  threatType: 'ATTACK' | 'BENIGN';
  alertBanner: string;
  trapForConventional: string;
  causeAwareDefense: string;
  criticalMetrics: { label: string; value: string }[];
}

const SCENARIO_ALERTS: Record<ScenarioId, ScenarioAlertContent> = {
  scen_1_cyclist_tangential: {
    headline: 'Benign Tangential Crossing: Zero-Doppler Clutter Notch Drop',
    threatType: 'BENIGN',
    alertBanner: 'BENIGN PHYSICAL PHENOMENON ALERT: High False Emergency Braking Risk!',
    trapForConventional:
      'As the cyclist traverses perpendicularly across the roadway at 4.8 m/s, line-of-sight geometry causes expected radial Doppler velocity |v_rad| to drop below 0.40 m/s. The 77 GHz radar hardware Moving Target Indication (MTI) filter discards the return to reject stationary tarmac clutter. Naive systems treat the missing return as an unverified phantom and SLAM on the emergency brakes!',
    causeAwareDefense:
      'The Cause-Aware Engine mathematically verifies |cos φ| < 0.25 and |v_rad| < 0.40 m/s while speed > 1.0 m/s. It classifies the event as BENIGN_CLUTTER_NOTCH_DROP, suppresses false emergency braking, accumulates credibility trust, and maintains safe cruising.',
    criticalMetrics: [
      { label: 'True Cyclist Speed', value: '4.8 m/s (17.3 km/h)' },
      { label: 'MTI Notch Threshold', value: '0.40 m/s cutoff' },
      { label: 'Naive Strict Outcome', value: 'FALSE EMERGENCY BRAKE' },
      { label: 'Cause-Aware Outcome', value: 'SAFE CRUISE MAINTAINED' },
    ],
  },

  scen_2_phantom_spoof: {
    headline: 'Injected Phantom Obstacle: Optical LiDAR Laser Spoofing',
    threatType: 'ATTACK',
    alertBanner: 'CRITICAL CYBER THREAT ALERT: Active Laser Pulse Injection Attack!',
    trapForConventional:
      'An adversary ahead transmits precisely timed laser pulses synchronized with the AV LiDAR scan between t = 1.0s and 5.5s, synthesizing a realistic 3D passenger car obstacle ahead. Conventional single-modality systems slam brakes on empty roads, creating severe rear-end collision hazards at highway speeds.',
    causeAwareDefense:
      'The Cause-Aware Engine cross-verifies the 3D LiDAR point cloud against trusted 77 GHz FMCW radar returns. Radar confirms empty roadway (0 dB SNR, 0 m/s Doppler, and zero prior track history). Trust score drops rapidly (-0.20/frame), locking SPOOF ATTACK CONFIRMED within 3 frames (0.15s)!',
    criticalMetrics: [
      { label: 'LiDAR Synthetic Density', value: '96% Point Cloud' },
      { label: 'Radar FMCW Return', value: '0 dB (Empty Road)' },
      { label: 'Attack Timing Window', value: 't = 1.0s to 5.5s' },
      { label: 'Cause-Aware Defense', value: 'SPOOF CONFIRMED (0.15s)' },
    ],
  },

  scen_3_rcs_dropout: {
    headline: 'Momentary Radar RCS Multipath Dropout (Wet Pavement)',
    threatType: 'BENIGN',
    alertBanner: 'BENIGN SENSOR ANOMALY ALERT: Destructive RF Ground Interference!',
    trapForConventional:
      'Between t = 2.0s and 2.4s, road spray and puddles cause destructive RF multipath phase cancellation. The preceding car radar SNR dips to 4.2 dB (< 10 dB detection threshold) for 2 frames. Naive strict detectors trip a false alarm during these 2 dropped frames.',
    causeAwareDefense:
      'The Cause-Aware Engine evaluates prior track age (> 5 frames) and high optical point density (100%), attributes the gap to BENIGN_RCS_DROPOUT, and maintains the vehicle in Kalman filter memory without disrupting traffic.',
    criticalMetrics: [
      { label: 'Radar SNR Drop', value: 'Dips to 4.2 dB (< 10 dB)' },
      { label: 'Drop Duration', value: '2 frames (~0.10s)' },
      { label: 'LiDAR Density', value: '100% Solid Points' },
      { label: 'Executive Action', value: 'Hold Track in Memory' },
    ],
  },

  scen_4_loose_bypass: {
    headline: 'Calibrated Gate Bypass Attack (+1.35 m/s Velocity Offset)',
    threatType: 'ATTACK',
    alertBanner: 'STEALTH ATTACK ALERT: Naive Loose Threshold (+4.50σ) Bypass!',
    trapForConventional:
      'The adversary calculates the AV naive loose validation gate (±4.50σ) and injects a calibrated +1.35 m/s velocity offset (+3.8σ). Naive loose detectors are COMPLETELY BLIND (0% detection) because the offset remains inside ±4.50σ.',
    causeAwareDefense:
      'The Cause-Aware Engine dynamically evaluates the target line-of-sight unit vector. Because motion is longitudinal (|cos φ| ≈ 1.0), strict 2.50σ gating is preserved. The evasion attempt is detected immediately.',
    criticalMetrics: [
      { label: 'Injected Velocity Bias', value: '+1.35 m/s (+3.8σ)' },
      { label: 'Naive Loose Gate', value: '±4.50σ (COMPLETELY BLIND)' },
      { label: 'Detection Rate (Loose)', value: '0% Detection (Crashes)' },
      { label: 'Cause-Aware Defense', value: '100% Detection (Caught)' },
    ],
  },

  scen_5_slow_creep: {
    headline: 'Slow Velocity Creep: Ramped Adversarial Velocity Drift',
    threatType: 'ATTACK',
    alertBanner: 'ADVERSARIAL DRIFT ALERT: Continuous Ramped Drift (+0.40 m/s²)!',
    trapForConventional:
      'The attacker gradually ramps injected velocity by +0.40 m/s² (+0.02 m/s per frame) starting at t = 1.0s. Per-frame threshold detectors fail to alert during early frames because single-frame innovation remains small.',
    causeAwareDefense:
      'The Asymmetric Leaky Temporal Trust Accumulator steadily penalizes persistent unverified innovation (-0.20 per frame). Memory integration exhausts trust below 0.35, triggering a confirmed alarm by frame 5.',
    criticalMetrics: [
      { label: 'Drift Ramp Rate', value: '+0.40 m/s² (+0.02 m/s/frame)' },
      { label: 'Single-Frame Gate', value: 'Bypassed Initially' },
      { label: 'Accumulator Penalty', value: '-0.20 per drift frame' },
      { label: 'Alarm Triggered', value: 'By Frame 5 (0.25s)' },
    ],
  },

  scen_6_phantom_tangential: {
    headline: 'Phantom in Tangential Blind Zone: Rule Evasion Attempt',
    threatType: 'ATTACK',
    alertBanner: 'INTELLIGENT ATTACK ALERT: Exploiting Tangential Doppler Exemption!',
    trapForConventional:
      'An intelligent adversary projects a synthetic phantom moving sideways at 4.8 m/s specifically to trick the defense tangential Doppler exemption rule! Naive rule engines get fooled by the lateral velocity.',
    causeAwareDefense:
      'The Cause-Aware Engine verifies that the obstacle has ZERO prior radar track history and no environmental entry signature. It overrides the tangential exemption and confirms an active optical spoofing attack!',
    criticalMetrics: [
      { label: 'Attacker Velocity Vector', value: 'vx = +4.8 m/s (Lateral)' },
      { label: 'Prior Radar Track Age', value: '0 frames (Fake entry)' },
      { label: 'Naive Rule Engine', value: 'Tricked by lateral rule' },
      { label: 'Cause-Aware Defense', value: 'SPOOF CONFIRMED' },
    ],
  },

  scen_7_pulsed_spoof: {
    headline: 'Pulsed Fake Dropouts: Anti-Persistence 3 Hz Spoofing',
    threatType: 'ATTACK',
    alertBanner: 'ANTI-PERSISTENCE ATTACK ALERT: 3 Hz Square-Wave Injection!',
    trapForConventional:
      'The attacker toggles laser injection on for 1 frame and off for 1 frame (3 Hz square wave). Integer persistence counters requiring N=3 consecutive anomaly frames reset to zero on every pause frame and NEVER fire (0% detection)!',
    causeAwareDefense:
      'The Asymmetric Leaky Trust Accumulator applies rapid decay (α = 0.20) and conservative recovery (β = 0.05). Each pulse cycle yields a net trust loss of ΔT = -0.15, rapidly exhausting credibility and locking confirmed alarm.',
    criticalMetrics: [
      { label: 'Pulse Frequency', value: '3 Hz (1 frame on, 1 off)' },
      { label: 'Persistence N=3 Counter', value: 'Resets to 0 (0% CATCH)' },
      { label: 'Asymmetric Ratio', value: 'α=0.20 >> β=0.05 (Net -0.15)' },
      { label: 'Cause-Aware Defense', value: '100% Attack Catch' },
    ],
  },

  scen_8_guardrail_multipath: {
    headline: 'Guardrail Multipath Ghost: Metallic Specular RF Reflection',
    threatType: 'BENIGN',
    alertBanner: 'BENIGN RF PHENOMENON ALERT: Guardrail Specular Echo!',
    trapForConventional:
      'Radio waves bounce from a vehicle side panel to a metallic highway guardrail and back, creating an apparent ghost target return with +1.8 m/s elevated Doppler and range elongation.',
    causeAwareDefense:
      'Cross-modal spatial correlation confirms true vehicle position via 3D LiDAR point cloud bounding box geometry, isolating the primary reflection and suppressing false emergency braking.',
    criticalMetrics: [
      { label: 'Multipath Doppler Shift', value: '+1.8 m/s elevated' },
      { label: 'LiDAR Geometry', value: 'Confirms true car centroid' },
      { label: 'Naive Association', value: 'Trips false discrepancy' },
      { label: 'Cause-Aware Defense', value: 'FALSE BRAKE SUPPRESSED' },
    ],
  },

  scen_9_boresight_drift: {
    headline: 'Sensor Boresight Drift: 1.5° Mechanical Bracket Vibration',
    threatType: 'BENIGN',
    alertBanner: 'BENIGN WEAR ALERT: Mechanical Sensor Alignment Drift!',
    trapForConventional:
      'Continuous road rumble and engine vibration shift the radar boresight by 1.5°, inducing a persistent +0.8σ Doppler bias. Overly sensitive detectors degrade track credibility.',
    causeAwareDefense:
      'The Cause-Aware Engine recognizes the bounded innovation comfortably within the 2.50σ Chi-Square gate, maintaining 100% trust with zero false alarms.',
    criticalMetrics: [
      { label: 'Mechanical Angle Drift', value: '1.5° Boresight shift' },
      { label: 'Induced Doppler Bias', value: '+0.28 m/s (+0.8σ bounded)' },
      { label: 'Gate Tolerance', value: 'Absorbed within 2.50σ' },
      { label: 'Trust Score', value: 'Maintains 100% Credibility' },
    ],
  },
};

export const ScenarioAlertModal: React.FC<ScenarioAlertModalProps> = ({
  scenarioId,
  onClose,
  onPlay,
}) => {
  const alertInfo = SCENARIO_ALERTS[scenarioId];
  const isAttack = alertInfo.threatType === 'ATTACK';

  const handleStart = () => {
    onClose();
    onPlay();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          border: `2px solid ${isAttack ? '#f43f5e' : '#0284c7'}`,
          boxShadow: isAttack
            ? '0 25px 60px -15px rgba(225, 29, 72, 0.35), 0 0 30px rgba(225, 29, 72, 0.2)'
            : '0 25px 60px -15px rgba(2, 132, 199, 0.35), 0 0 30px rgba(2, 132, 199, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Alert Banner */}
        <div
          style={{
            background: isAttack
              ? 'linear-gradient(135deg, #e11d48, #be123c)'
              : 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAttack ? (
              <ShieldAlert size={28} color="#ffffff" className="pulse-alarm" />
            ) : (
              <ShieldCheck size={28} color="#ffffff" />
            )}
            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', fontWeight: 800, textTransform: 'uppercase', opacity: 0.9 }}>
                SCENARIO BRIEFING & PERCEPTION ALERT
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.25 }}>
                {alertInfo.headline}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              padding: '6px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Classification Banner */}
          <div
            style={{
              background: isAttack ? '#fff1f2' : '#f0fdf4',
              border: `1.5px solid ${isAttack ? '#fecdd3' : '#bbf7d0'}`,
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAttack ? <AlertTriangle size={18} color="#e11d48" /> : <CheckCircle2 size={18} color="#059669" />}
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isAttack ? '#be123c' : '#047857' }}>
                {alertInfo.alertBanner}
              </span>
            </div>
            <span className={`badge ${isAttack ? 'badge-rose' : 'badge-emerald'}`} style={{ fontSize: '0.68rem' }}>
              {isAttack ? 'CYBER ATTACK' : 'BENIGN EVENT'}
            </span>
          </div>

          {/* Section 1: The Trap for Conventional Systems */}
          <div
            style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderLeft: '4px solid #f97316',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', marginBottom: '4px' }}>
              ⚠️ Why Conventional Naive Fusion Fails on this Scenario:
            </div>
            <p style={{ fontSize: '0.82rem', color: '#431407', lineHeight: 1.45 }}>
              {alertInfo.trapForConventional}
            </p>
          </div>

          {/* Section 2: How Cause-Aware Defense Resolves It */}
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderLeft: '4px solid #0284c7',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
              🛡️ How Cause-Aware Physical Attribution Solves It:
            </div>
            <p style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.45 }}>
              {alertInfo.causeAwareDefense}
            </p>
          </div>

          {/* Section 3: Critical Scenario Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            {alertInfo.criticalMetrics.map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                }}
              >
                <div style={{ color: '#64748b', fontSize: '0.68rem' }}>{m.label}</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.8rem', marginTop: '2px' }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
            >
              Dismiss
            </button>
            <button
              onClick={handleStart}
              className="btn-primary"
              style={{
                padding: '8px 20px',
                background: isAttack
                  ? 'linear-gradient(135deg, #e11d48, #be123c)'
                  : 'linear-gradient(135deg, #0284c7, #0369a1)',
              }}
            >
              <Play size={16} />
              <span>Acknowledge & Start Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
