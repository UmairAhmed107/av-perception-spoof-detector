// ============================================================================
// Live Perception Analysis & Decision Panel (Light Mode)
// Line-by-Line Dynamic Telemetry & Real-Time Next-to-Next Event Feed
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import type { FrameTelemetry, ScenarioId } from '../types';
import { SCENARIOS } from '../lib/scenarios';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Car,
  Ghost,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  Radio,
  Zap,
  Terminal,
  Clock,
} from 'lucide-react';

interface LiveAnalysisPanelProps {
  telemetry: FrameTelemetry | null;
  scenarioId: ScenarioId;
}

interface LogEntry {
  id: number;
  timeSec: number;
  frameIndex: number;
  tag: string;
  tagColor: string;
  message: string;
}

export const LiveAnalysisPanel: React.FC<LiveAnalysisPanelProps> = ({
  telemetry,
  scenarioId,
}) => {
  // Live rolling event log showing next-to-next updates
  const [eventLogs, setEventLogs] = useState<LogEntry[]>([]);
  const lastLoggedFrameRef = useRef<number>(-1);
  const logCounterRef = useRef<number>(0);

  const scen = SCENARIOS[scenarioId];

  useEffect(() => {
    if (!telemetry) return;

    const f = telemetry.measurement.frameIndex;
    const t = telemetry.measurement.time;

    // Log a new line every 5 frames (0.25s) or on major state shifts
    if (f !== lastLoggedFrameRef.current && f % 5 === 0) {
      lastLoggedFrameRef.current = f;
      logCounterRef.current += 1;

      const isAttack = telemetry.measurement.isAttackActive;
      const attribution = telemetry.evaluation.attribution;
      const canGo = !telemetry.evaluation.detectors.causeAware.emergencyBrakeActive;

      let tag = 'CRUISE';
      let tagColor = '#059669';
      let message = `Car Status: CAN GO | v_radar = ${
        telemetry.measurement.radar.isDetected
          ? `${telemetry.measurement.radar.doppler.toFixed(2)} m/s`
          : 'DROP'
      } | Speed: ${telemetry.ekf.speed.toFixed(1)} m/s`;

      if (telemetry.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED') {
        tag = 'SPOOF ALARM';
        tagColor = '#e11d48';
        message = `Fake Phantom verified | Zero radar return | Car Status: STOP (Brake active)`;
      } else if (attribution === 'BENIGN_CLUTTER_NOTCH_DROP') {
        tag = 'MTI NOTCH';
        tagColor = '#d97706';
        message = `Radar hardware notch dropped return (|v_rad| < 0.4 m/s) | Car Status: CAN GO (False brake suppressed)`;
      } else if (attribution === 'BENIGN_RCS_DROPOUT') {
        tag = 'RCS DROP';
        tagColor = '#d97706';
        message = `Water puddle multipath drop (SNR ${telemetry.measurement.radar.snrDb.toFixed(1)} dB) | Holding track in memory`;
      } else if (isAttack) {
        tag = 'ATTACK ACTIVE';
        tagColor = '#e11d48';
        message = `Kinematic offset detected: ${Math.abs(telemetry.evaluation.residual).toFixed(2)} m/s (${telemetry.evaluation.mahalanobisDist.toFixed(1)}σ deviation)`;
      }

      const newEntry: LogEntry = {
        id: logCounterRef.current,
        timeSec: t,
        frameIndex: f,
        tag,
        tagColor,
        message,
      };

      setEventLogs((prev) => [newEntry, ...prev.slice(0, 11)]);
    }
  }, [telemetry]);

  // Clear logs when scenario changes
  useEffect(() => {
    setEventLogs([]);
    lastLoggedFrameRef.current = -1;
  }, [scenarioId]);

  if (!telemetry) {
    return (
      <div className="glass-panel" style={{ padding: '20px', minHeight: '380px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Awaiting simulation telemetry stream...</p>
      </div>
    );
  }

  const { ekf, measurement, evaluation } = telemetry;
  const isAttack = measurement.isAttackActive;
  const attribution = evaluation.attribution;
  const alarmStatus = evaluation.alarmStatus;

  // ==========================================================================
  // LINE 1: RADAR SIGNAL MATCHING
  // ==========================================================================
  let line1Badge = 'MATCHING';
  let line1BadgeClass = 'badge-emerald';
  let line1Data = '';

  if (!measurement.radar.isDetected) {
    if (attribution === 'BENIGN_CLUTTER_NOTCH_DROP') {
      line1Badge = 'MTI NOTCH CUTOFF';
      line1BadgeClass = 'badge-amber';
      line1Data = `Hardware zero-Doppler notch active (|v_rad| = ${Math.abs(evaluation.vExpectedRad).toFixed(2)} m/s < 0.40 m/s cutoff). Radar intentionally muted tarmac reflections.`;
    } else if (attribution === 'BENIGN_RCS_DROPOUT') {
      line1Badge = 'RCS MULTIPATH DROP';
      line1BadgeClass = 'badge-amber';
      line1Data = `Water spray / pavement reflection caused SNR dip to ${measurement.radar.snrDb.toFixed(1)} dB. LiDAR points remain 100% dense.`;
    } else {
      line1Badge = 'NO RADAR RETURN';
      line1BadgeClass = 'badge-rose';
      line1Data = `Radar channel confirms clear asphalt (Doppler = 0.0 m/s, SNR = ${measurement.radar.snrDb.toFixed(1)} dB). Optical points have no radar reflection!`;
    }
  } else if (evaluation.mahalanobisDist > 2.50) {
    line1Badge = 'SIGNAL MISMATCH';
    line1BadgeClass = 'badge-rose';
    line1Data = `Measured Doppler (${measurement.radar.doppler.toFixed(2)} m/s) diverges from LiDAR (${evaluation.vExpectedRad.toFixed(2)} m/s). Residual Δ = ${Math.abs(evaluation.residual).toFixed(2)} m/s (${evaluation.mahalanobisDist.toFixed(1)}σ deviation).`;
  } else {
    line1Badge = 'COHERENT MATCH';
    line1BadgeClass = 'badge-emerald';
    line1Data = `Measured Doppler: ${measurement.radar.doppler.toFixed(2)} m/s | Expected: ${evaluation.vExpectedRad.toFixed(2)} m/s | Residual Δ: ${Math.abs(evaluation.residual).toFixed(2)} m/s (${evaluation.mahalanobisDist.toFixed(2)}σ). Both sensors agree.`;
  }

  // ==========================================================================
  // LINE 2: ATTACK OR FALSE ATTACK
  // ==========================================================================
  let line2Badge = 'BENIGN EVENT';
  let line2BadgeClass = 'badge-emerald';
  let line2Data = '';

  if (isAttack) {
    line2Badge = 'ACTIVE ATTACK';
    line2BadgeClass = 'badge-rose pulse-alarm';
    if (scenarioId === 'scen_2_phantom_spoof') {
      line2Data = `Optical Pulse Injection: Synthesizing fake 3D point cloud at [${ekf.pos.x.toFixed(1)}, ${ekf.pos.y.toFixed(1)}]m. Radar confirms empty road ahead.`;
    } else if (scenarioId === 'scen_4_loose_bypass') {
      line2Data = `Calibrated Offset Attack: Injected +1.35 m/s bias (+3.8σ) designed to slip inside naive ±4.50σ loose gates.`;
    } else if (scenarioId === 'scen_5_slow_creep') {
      line2Data = `Slow Velocity Creep: Velocity ramping dynamically at +0.40 m/s² (Current offset: +${(0.4 * (measurement.time - 1.0)).toFixed(2)} m/s).`;
    } else if (scenarioId === 'scen_6_phantom_tangential') {
      line2Data = `Rule Evasion Exploit: Lateral phantom projected sideways at +4.8 m/s to trick tangential Doppler exemption rule.`;
    } else if (scenarioId === 'scen_7_pulsed_spoof') {
      line2Data = `Anti-Persistence Pulsing: Toggling 3 Hz square wave (1 frame on, 1 frame off) to repeatedly reset integer counters.`;
    } else {
      line2Data = `Active optical sensor manipulation in progress.`;
    }
  } else {
    line2Badge = 'BENIGN PHYSICAL CAUSE';
    line2BadgeClass = 'badge-emerald';
    if (scenarioId === 'scen_1_cyclist_tangential') {
      line2Data = `Crossing Cyclist: Perpendicular traverse (|cos φ| = ${evaluation.cosPhi.toFixed(2)}). Doppler physics is geometrically blind to cross-traffic speed.`;
    } else if (scenarioId === 'scen_3_rcs_dropout') {
      line2Data = `Wet Pavement Reflection: Puddle bounce caused destructive phase interference. High risk of false emergency braking.`;
    } else if (scenarioId === 'scen_8_guardrail_multipath') {
      line2Data = `Guardrail Specular Bounce: Metallic reflection elevated apparent Doppler by +1.8 m/s. LiDAR verifies true location.`;
    } else if (scenarioId === 'scen_9_boresight_drift') {
      line2Data = `Mechanical Mounting Rumble: 1.5° boresight angle drift inducing small +0.8σ bounded bias. Cleanly absorbed.`;
    } else {
      line2Data = `Natural environmental physics. Zero cyber-attack present.`;
    }
  }

  // ==========================================================================
  // LINE 3: CAR STATUS - CAN IT GO OR STOP?
  // ==========================================================================
  const shouldBrake = evaluation.detectors.causeAware.emergencyBrakeActive;
  const canGo = !shouldBrake;
  let line3Badge = canGo ? 'CAN GO (CRUISING)' : 'MUST STOP (BRAKE ENGAGED)';
  let line3BadgeClass = canGo ? 'badge-emerald' : 'badge-rose';
  let line3Data = '';

  if (shouldBrake) {
    line3Data = `Executive Action: EMERGENCY BRAKE ENGAGED | Deceleration active | Reason: Unverified optical phantom hazard confirmed ahead.`;
  } else if (attribution.startsWith('BENIGN_')) {
    line3Data = `Executive Action: CAN GO (PROCEED) | Speed: ${(ekf.speed * 3.6).toFixed(1)} km/h | Status: False emergency brake safely SUPPRESSED by cause-aware attribution.`;
  } else {
    line3Data = `Executive Action: CAN GO (PROCEED) | Speed: ${(ekf.speed * 3.6).toFixed(1)} km/h | Status: Perception verified, normal autonomous cruise authorized.`;
  }

  // ==========================================================================
  // LINE 4: REAL OBJECT OR FAKE OBJECT
  // ==========================================================================
  let isReal = true;
  let line4Badge = 'REAL PHYSICAL OBJECT';
  let line4BadgeClass = 'badge-cyan';
  let line4Data = '';

  if (
    (scenarioId === 'scen_2_phantom_spoof' && isAttack) ||
    (scenarioId === 'scen_6_phantom_tangential' && isAttack)
  ) {
    isReal = false;
    line4Badge = 'FAKE / SYNTHETIC PHANTOM';
    line4BadgeClass = 'badge-rose';
    line4Data = `Optical laser pulses synthesized fake ${(measurement.lidar.pointDensity * 100).toFixed(0)}% point density, but radar confirms 0 dB reflection and 0 frames track history. Object is NOT real.`;
  } else {
    isReal = true;
    line4Badge = `REAL OBJECT (${scen.targetType})`;
    line4BadgeClass = 'badge-cyan';
    line4Data = `Entity exists physically. Cross-verified with ${measurement.radar.trackAge} frames radar tracking history & physical radar cross-section.`;
  }

  // ==========================================================================
  // LINE 5: MOVING DIRECTION (Left, Right, Straight, etc.)
  // ==========================================================================
  const vx = ekf.vel.x;
  const vy = ekf.vel.y;
  let line5Badge = '';
  let line5Data = '';

  if (ekf.speed < 0.4) {
    line5Badge = 'STATIONARY';
    line5Data = `Target is stationary at [${ekf.pos.x.toFixed(1)}, ${ekf.pos.y.toFixed(1)}]m | Range: ${evaluation.range.toFixed(1)}m`;
  } else if (Math.abs(vx) > Math.abs(vy) * 1.3) {
    if (vx > 0) {
      line5Badge = 'MOVING RIGHT ➡️';
      line5Data = `Traversing across road from Left to Right: Lateral v_x = +${vx.toFixed(2)} m/s | Forward v_y = +${vy.toFixed(2)} m/s | Heading = ${ekf.headingDeg.toFixed(0)}° East`;
    } else {
      line5Badge = 'MOVING LEFT ⬅️';
      line5Data = `Traversing across road from Right to Left: Lateral v_x = ${vx.toFixed(2)} m/s | Forward v_y = +${vy.toFixed(2)} m/s | Heading = ${ekf.headingDeg.toFixed(0)}° West`;
    }
  } else {
    if (vx > 0.3) {
      line5Badge = 'FORWARD & RIGHT ↗️';
      line5Data = `Moving forward along lane angling Right: Longitudinal v_y = +${vy.toFixed(2)} m/s | Lateral v_x = +${vx.toFixed(2)} m/s | Heading = ${ekf.headingDeg.toFixed(0)}°`;
    } else if (vx < -0.3) {
      line5Badge = 'FORWARD & LEFT ↖️';
      line5Data = `Moving forward along lane angling Left: Longitudinal v_y = +${vy.toFixed(2)} m/s | Lateral v_x = ${vx.toFixed(2)} m/s | Heading = ${ekf.headingDeg.toFixed(0)}°`;
    } else {
      line5Badge = 'STRAIGHT AHEAD ⬆️';
      line5Data = `Cruising straight ahead in lane: Longitudinal v_y = +${vy.toFixed(2)} m/s | Lateral drift = ${vx.toFixed(2)} m/s | Heading = 90° North`;
    }
  }

  // ==========================================================================
  // LINE 6: WHAT ACTIONS SHOULD CAR TAKE?
  // ==========================================================================
  let line6Badge = '';
  let line6BadgeClass = 'badge-emerald';
  let line6Data = '';

  if (alarmStatus === 'SPOOF_ATTACK_CONFIRMED') {
    line6Badge = 'MAINTAIN CRUISE (IGNORE PHANTOM)';
    line6BadgeClass = 'badge-rose';
    line6Data = `Live Instruction: DO NOT slam emergency brakes on open road. Optical phantom detected. Hold highway trajectory and alert fleet cyber-security.`;
  } else if (attribution === 'BENIGN_CLUTTER_NOTCH_DROP') {
    line6Badge = 'PROCEED SAFELY (SUPPRESS FALSE BRAKE)';
    line6BadgeClass = 'badge-emerald';
    line6Data = `Live Instruction: Continue driving at normal cruising speed. Cyclist crossing right-of-way is verified. Do NOT trigger false brake; radar return will re-emerge past 0.40 m/s.`;
  } else if (attribution === 'BENIGN_RCS_DROPOUT') {
    line6Badge = 'HOLD TRACK IN MEMORY';
    line6BadgeClass = 'badge-emerald';
    line6Data = `Live Instruction: Maintain vehicle headway. Puddle splash caused transient 2-frame radar dip; target state held firmly in EKF memory.`;
  } else if (attribution === 'BENIGN_TIMING_SKEW') {
    line6Badge = 'CRUISE NORMALLY';
    line6BadgeClass = 'badge-emerald';
    line6Data = `Live Instruction: Timestamp synchronization skew is within 1.2 m/s jitter tolerance. Vehicle proceeds without disruption.`;
  } else if (isAttack) {
    line6Badge = 'ENGAGE CONTROLLED STOP';
    line6BadgeClass = 'badge-rose';
    line6Data = `Live Instruction: Statistical gate breached by adversarial velocity evasion. Safely decelerate to protect vehicle safety.`;
  } else {
    line6Badge = 'CONTINUE AUTONOMOUS CRUISE';
    line6BadgeClass = 'badge-emerald';
    line6Data = `Live Instruction: Cross-modal LiDAR-radar consensus verified. Highway cruising authorized.`;
  }

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '0.01em' }}>
            LIVE SITUATION ANALYSIS (REAL-TIME STREAM)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="badge badge-cyan font-mono" style={{ fontSize: '0.7rem' }}>
            FRAME #{measurement.frameIndex} (t = {measurement.time.toFixed(2)}s)
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. TERMINAL AT TOP: REAL-TIME EVENT STREAM (Next-to-Next Live Log)   */}
      {/* =================================================================== */}
      <div
        style={{
          background: '#0f172a',
          color: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          border: '1px solid #1e293b',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={14} color="#38bdf8" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', color: '#38bdf8' }}>
              REAL-TIME EVENT TICKER (NEXT-TO-NEXT LIVE LOG)
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            Streaming @ 20 Hz
          </span>
        </div>

        {/* Streaming entries */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '125px',
            overflowY: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
          }}
        >
          {eventLogs.length === 0 ? (
            <div style={{ color: '#64748b' }}>Waiting for next frame events...</div>
          ) : (
            eventLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  lineHeight: 1.3,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <span style={{ color: '#64748b', flexShrink: 0 }}>
                  [{log.timeSec.toFixed(2)}s]
                </span>
                <span
                  style={{
                    color: log.tagColor,
                    fontWeight: 700,
                    flexShrink: 0,
                    padding: '1px 5px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '3px',
                  }}
                >
                  {log.tag}
                </span>
                <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. LINE 1 TO LINE 6 BELOW TERMINAL: REAL-TIME DETAILED READOUTS     */}
      {/* =================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
        {/* LINE 1 */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: `4px solid ${line1BadgeClass.includes('emerald') ? '#059669' : line1BadgeClass.includes('amber') ? '#d97706' : '#e11d48'}`,
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 1: Radar Signal Matching
            </span>
            <span className={`badge ${line1BadgeClass}`} style={{ fontSize: '0.65rem' }}>
              {line1Badge}
            </span>
          </div>
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.73rem', lineHeight: 1.4 }}>
            {line1Data}
          </div>
        </div>

        {/* LINE 2 */}
        <div
          style={{
            background: isAttack ? '#fff1f2' : '#f0fdf4',
            border: `1px solid ${isAttack ? '#fecdd3' : '#bbf7d0'}`,
            borderLeft: `4px solid ${isAttack ? '#e11d48' : '#059669'}`,
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 2: Attack or False Attack?
            </span>
            <span className={`badge ${line2BadgeClass}`} style={{ fontSize: '0.65rem' }}>
              {line2Badge}
            </span>
          </div>
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.73rem', lineHeight: 1.4 }}>
            {line2Data}
          </div>
        </div>

        {/* LINE 3 */}
        <div
          style={{
            background: canGo ? '#f0fdf4' : '#fff1f2',
            border: `1px solid ${canGo ? '#bbf7d0' : '#fecdd3'}`,
            borderLeft: `4px solid ${canGo ? '#059669' : '#e11d48'}`,
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 3: Car Status: Can It Go or Stop?
            </span>
            <span className={`badge ${line3BadgeClass}`} style={{ fontSize: '0.65rem' }}>
              {line3Badge}
            </span>
          </div>
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.73rem', lineHeight: 1.4 }}>
            {line3Data}
          </div>
        </div>

        {/* LINE 4 */}
        <div
          style={{
            background: isReal ? '#f8fafc' : '#fff1f2',
            border: `1px solid ${isReal ? '#e2e8f0' : '#fecdd3'}`,
            borderLeft: `4px solid ${isReal ? '#0284c7' : '#e11d48'}`,
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 4: Real Object or Fake Object?
            </span>
            <span className={`badge ${line4BadgeClass}`} style={{ fontSize: '0.65rem' }}>
              {line4Badge}
            </span>
          </div>
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.73rem', lineHeight: 1.4 }}>
            {line4Data}
          </div>
        </div>

        {/* LINE 5 */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #7c3aed',
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 5: Moving Direction (Left / Right / Which Direction?)
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
              {line5Badge}
            </span>
          </div>
          <div style={{ color: '#334155', fontFamily: 'var(--font-mono)', fontSize: '0.73rem', lineHeight: 1.4 }}>
            {line5Data}
          </div>
        </div>

        {/* LINE 6 */}
        <div
          style={{
            background: canGo ? '#f0fdf4' : '#fff1f2',
            border: `1.5px solid ${canGo ? '#86efac' : '#fecdd3'}`,
            borderLeft: `4px solid ${canGo ? '#059669' : '#e11d48'}`,
            padding: '8px 12px',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>
              LINE 6: What Action Should Car Take?
            </span>
            <span className={`badge ${line6BadgeClass}`} style={{ fontSize: '0.65rem' }}>
              {line6Badge}
            </span>
          </div>
          <div style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.4 }}>
            👉 {line6Data}
          </div>
        </div>
      </div>
    </div>
  );
};
