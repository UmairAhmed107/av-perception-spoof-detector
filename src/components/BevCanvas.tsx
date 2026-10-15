// ============================================================================
// 2D Bird's-Eye-View (BEV) Sensor Fusion Canvas (Light Mode)
// Multi-Modal Kinematics, Radar Arc & Vector Decomposition
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import type { FrameTelemetry } from '../types';
import { Camera, Eye, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface BevCanvasProps {
  telemetry: FrameTelemetry | null;
  historyTrail: { x: number; y: number }[];
}

export const BevCanvas: React.FC<BevCanvasProps> = ({
  telemetry,
  historyTrail,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Overlay toggles
  const [showVectors, setShowVectors] = useState(true);
  const [showRadarArc, setShowRadarArc] = useState(true);
  const [showGrid] = useState(true);
  const [showTrail] = useState(true);

  // Take snapshot PNG
  const handleSaveSnapshot = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `av-simulation-bev-frame-${telemetry?.measurement.frameIndex ?? 0}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Hi-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Coordinate transformation:
    // Ego vehicle is at (width / 2, height - 70)
    const originX = width / 2;
    const originY = height - 70;
    const pixelsPerMeter = Math.min(width, height) / 28.0;

    const toCanvasX = (mX: number) => originX + mX * pixelsPerMeter;
    const toCanvasY = (mY: number) => originY - mY * pixelsPerMeter;

    // 1. Clear background (Light Mode Technical Canvas)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Road Tarmac & Lanes (Light Mode clean road)
    const roadHalfWidth = 7.0 * pixelsPerMeter;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(originX - roadHalfWidth, 0, roadHalfWidth * 2, height);

    // Road borders / guardrails
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX - roadHalfWidth, 0);
    ctx.lineTo(originX - roadHalfWidth, height);
    ctx.moveTo(originX + roadHalfWidth, 0);
    ctx.lineTo(originX + roadHalfWidth, height);
    ctx.stroke();

    // Guardrail posts
    ctx.fillStyle = '#94a3b8';
    for (let y = 0; y < height; y += 40) {
      ctx.fillRect(originX - roadHalfWidth - 3, y, 6, 8);
      ctx.fillRect(originX + roadHalfWidth - 3, y, 6, 8);
    }

    // Lane dashes (Center line)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Distance Range Rings (Grid in Light Mode)
    if (showGrid) {
      const ringMeters = [5, 10, 15, 20, 25];
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;

      for (const r of ringMeters) {
        const radiusPx = r * pixelsPerMeter;
        ctx.beginPath();
        ctx.arc(originX, originY, radiusPx, Math.PI, 2 * Math.PI, false);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${r}m`, originX + radiusPx - 24, originY + 14);
        ctx.fillText(`${r}m`, originX - radiusPx + 4, originY + 14);
      }
    }

    // 4. Radar Illumination Arc (60 deg FOV, 25m range)
    if (showRadarArc) {
      const radarRangePx = 25 * pixelsPerMeter;
      const fovRad = (60.0 * Math.PI) / 180.0;
      const startAngle = -Math.PI / 2 - fovRad / 2;
      const endAngle = -Math.PI / 2 + fovRad / 2;

      const grad = ctx.createRadialGradient(
        originX,
        originY,
        0,
        originX,
        originY,
        radarRangePx
      );
      grad.addColorStop(0, 'rgba(124, 58, 237, 0.16)');
      grad.addColorStop(0.7, 'rgba(124, 58, 237, 0.05)');
      grad.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.arc(originX, originY, radarRangePx, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Radar MTI Clutter Notch Zone Highlight
    if (telemetry?.evaluation.attribution === 'BENIGN_CLUTTER_NOTCH_DROP') {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.14)';
      ctx.beginPath();
      ctx.arc(originX, originY, 22 * pixelsPerMeter, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.lineTo(originX, originY);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Draw Motion Trail
    if (showTrail && historyTrail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < historyTrail.length; i++) {
        const ptX = toCanvasX(historyTrail[i].x);
        const ptY = toCanvasY(historyTrail[i].y);
        if (i === 0) ctx.moveTo(ptX, ptY);
        else ctx.lineTo(ptX, ptY);
      }
      ctx.stroke();

      for (let i = 0; i < historyTrail.length; i += 3) {
        const ptX = toCanvasX(historyTrail[i].x);
        const ptY = toCanvasY(historyTrail[i].y);
        ctx.fillStyle = `rgba(2, 132, 199, ${(i / historyTrail.length) * 0.7})`;
        ctx.beginPath();
        ctx.arc(ptX, ptY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Draw Ego AV
    ctx.save();
    ctx.translate(originX, originY);

    // Car shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.fillRect(-14, -20, 28, 48);

    // Car body
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, -22, 24, 44, 4);
    ctx.fill();
    ctx.stroke();

    // Windshield
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-9, -15, 18, 12, 2);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-10, -23, 5, 2);
    ctx.fillRect(5, -23, 5, 2);

    // Roof-mounted LiDAR puck
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bumper Radar sensor
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(-4, -24, 8, 3);

    ctx.restore();

    // 8. Draw Target Obstacle
    if (telemetry && telemetry.measurement.lidar.isDetected) {
      const targetPos = telemetry.ekf.pos;
      const tX = toCanvasX(targetPos.x);
      const tY = toCanvasY(targetPos.y);

      // A. Line-of-Sight Dotted Vector
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(tX, tY);
      ctx.stroke();
      ctx.setLineDash([]);

      // B. Confirmed Spoofing Alarm Halo
      if (telemetry.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED') {
        const time = Date.now() / 250;
        const pulseRadius = 24 + Math.sin(time) * 8;
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tX, tY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
        ctx.beginPath();
        ctx.arc(tX, tY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e11d48';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText('⚠ SPOOFED PHANTOM', tX + 22, tY - 10);
      }

      // C. Target Bounding Box
      ctx.save();
      ctx.translate(tX, tY);
      const headingRad = (telemetry.ekf.headingDeg * Math.PI) / 180.0;
      ctx.rotate(headingRad);

      const isAttack = telemetry.measurement.isAttackActive;
      ctx.fillStyle = isAttack ? '#e11d48' : '#059669';
      ctx.strokeStyle = isAttack ? '#be123c' : '#047857';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-10, -18, 20, 36, 4);
      ctx.fill();
      ctx.stroke();

      // Front bumper indicator
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -19, 12, 3);

      ctx.restore();

      // D. Kinematic Velocity Vectors
      if (showVectors) {
        const vScale = 12.0;

        // EKF Total Velocity (Cyan)
        const vxPx = telemetry.ekf.vel.x * vScale;
        const vyPx = -telemetry.ekf.vel.y * vScale;

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        drawArrow(ctx, tX, tY, tX + vxPx, tY + vyPx);

        // Radial Component along LOS (Purple)
        const radMag = telemetry.evaluation.vExpectedRad;
        const rHat = telemetry.evaluation.rHat;
        const vRadPxX = rHat.x * radMag * vScale;
        const vRadPxY = -rHat.y * radMag * vScale;

        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2.5;
        drawArrow(ctx, tX, tY, tX + vRadPxX, tY + vRadPxY);

        // Tangential Component (Amber)
        const vTan = telemetry.evaluation.vTanVec;
        const vTanPxX = vTan.x * vScale;
        const vTanPxY = -vTan.y * vScale;

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        drawArrow(ctx, tX + vRadPxX, tY + vRadPxY, tX + vRadPxX + vTanPxX, tY + vRadPxY + vTanPxY);
      }

      // E. Label target coordinates
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(
        `[${targetPos.x.toFixed(1)}m, ${targetPos.y.toFixed(1)}m]`,
        tX + 14,
        tY + 16
      );
      ctx.fillStyle = '#475569';
      ctx.fillText(
        `v: ${telemetry.ekf.speed.toFixed(1)} m/s`,
        tX + 14,
        tY + 28
      );
    }
  }, [telemetry, historyTrail, showVectors, showRadarArc, showGrid, showTrail]);

  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        minHeight: '440px',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '0.02em' }}>
            BIRD'S-EYE-VIEW (BEV) SENSOR FUSION
          </span>
          <span className="badge badge-cyan">2D CARTESIAN PLANE</span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowVectors(!showVectors)}
            className="btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderColor: showVectors ? 'var(--cyan-primary)' : '#cbd5e1',
            }}
            title="Toggle Velocity Vectors"
          >
            <Zap size={14} color={showVectors ? 'var(--cyan-primary)' : '#64748b'} />
            Vectors
          </button>
          <button
            onClick={() => setShowRadarArc(!showRadarArc)}
            className="btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderColor: showRadarArc ? 'var(--purple-radar)' : '#cbd5e1',
            }}
            title="Toggle Radar 60° FOV Arc"
          >
            Radar Arc
          </button>
          <button
            onClick={handleSaveSnapshot}
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            title="Export High-Resolution Canvas Snapshot"
          >
            <Camera size={14} />
            PNG
          </button>
        </div>
      </div>

      {/* Canvas Element */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />

        {/* In-Canvas Floating Vector Legend (Light Mode) */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '14px', height: '3px', background: '#0284c7' }} />
            <span>Blue: EKF Velocity v</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '14px', height: '3px', background: '#7c3aed' }} />
            <span>Purple: Radial Doppler v_rad</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '14px', height: '3px', background: '#d97706' }} />
            <span>Amber: Tangential Speed v_tan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '14px', borderTop: '2px dashed #64748b' }} />
            <span>Dotted: LOS Unit Vector r_hat</span>
          </div>
        </div>

        {/* Status Indicator Pill */}
        {telemetry && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {telemetry.evaluation.alarmStatus === 'SPOOF_ATTACK_CONFIRMED' ? (
              <span className="badge badge-rose pulse-alarm" style={{ padding: '6px 12px' }}>
                <ShieldAlert size={14} />
                SPOOF ATTACK CONFIRMED: BRAKE ENGAGED
              </span>
            ) : telemetry.evaluation.alarmStatus === 'BENIGN_ATTRIBUTED' ? (
              <span className="badge badge-amber" style={{ padding: '6px 12px' }}>
                <CheckCircle2 size={14} />
                {telemetry.evaluation.attributionTitle}
              </span>
            ) : (
              <span className="badge badge-emerald" style={{ padding: '6px 12px' }}>
                <CheckCircle2 size={14} />
                NORMAL PERCEPTION INTEGRITY
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headLen = 8;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}
