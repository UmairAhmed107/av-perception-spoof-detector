// ============================================================================
// Interactive Vector Geometry & Heading Rotation Wheel (Light Mode)
// Dynamic Doppler Radial Projection & Tangential Blindness Demonstration
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { X, Compass } from 'lucide-react';
import { computeLOS, decomposeVelocity } from '../lib/kinematics-engine';

interface GeometryViewProps {
  onClose: () => void;
}

export const GeometryView: React.FC<GeometryViewProps> = ({ onClose }) => {
  const [headingDeg, setHeadingDeg] = useState(45);
  const [speed, setSpeed] = useState(4.5);
  const [targetPosX, setTargetPosX] = useState(2.0);
  const [targetPosY] = useState(14.0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute live vector kinematics
  const targetPos = { x: targetPosX, y: targetPosY };
  const { rHat, azimuthDeg } = computeLOS(targetPos);

  const headingRad = (headingDeg * Math.PI) / 180.0;
  const vel = {
    x: speed * Math.cos(headingRad),
    y: speed * Math.sin(headingRad),
  };

  const {
    vExpectedRad,
    vTanVec,
    vTanSpeed,
    cosPhi,
    aspectAngleDeg,
  } = decomposeVelocity(vel, rHat);

  const isClutterNotch = Math.abs(vExpectedRad) < 0.40;
  const isTangentialBlind = cosPhi < 0.25;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 40;

    // Clear (Light Mode Compass)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Compass Outer Rings
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(cx - radius - 15, cy);
    ctx.lineTo(cx + radius + 15, cy);
    ctx.moveTo(cx, cy - radius - 15);
    ctx.lineTo(cx, cy + radius + 15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cardinal directions
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('N (+y Forward)', cx - 35, cy - radius - 8);
    ctx.fillText('S (-y Rear)', cx - 28, cy + radius + 18);
    ctx.fillText('E (+x Right)', cx + radius + 8, cy + 4);
    ctx.fillText('W (-x Left)', cx - radius - 70, cy + 4);

    // 1. Draw LOS Vector r_hat (Dotted Gray)
    const losLen = radius * 0.95;
    const losX = cx + rHat.x * losLen;
    const losY = cy - rHat.y * losLen;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(losX, losY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#475569';
    ctx.fillText(`r_hat (LOS: ${azimuthDeg.toFixed(1)}°)`, losX + 6, losY);

    // 2. Draw Target Velocity Vector (Blue)
    const vScale = 22.0;
    const vxPx = vel.x * vScale;
    const vyPx = -vel.y * vScale;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3.5;
    drawCompassArrow(ctx, cx, cy, cx + vxPx, cy + vyPx);

    // 3. Draw Radial Doppler Projection along LOS (Purple)
    const vRadPxX = rHat.x * vExpectedRad * vScale;
    const vRadPxY = -rHat.y * vExpectedRad * vScale;

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3.0;
    drawCompassArrow(ctx, cx, cy, cx + vRadPxX, cy + vRadPxY);

    // 4. Draw Tangential Velocity Component (Amber)
    const vTanPxX = vTanVec.x * vScale;
    const vTanPxY = -vTanVec.y * vScale;

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    drawCompassArrow(ctx, cx + vRadPxX, cy + vRadPxY, cx + vRadPxX + vTanPxX, cy + vRadPxY + vTanPxY);

    // 5. Connect projection line
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + vxPx, cy + vyPx);
    ctx.lineTo(cx + vRadPxX, cy + vRadPxY);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [headingDeg, speed, targetPosX, targetPosY, rHat, azimuthDeg, vel, vExpectedRad, vTanVec]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
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
            <Compass size={22} color="var(--cyan-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                VECTOR GEOMETRY COMPASS & STEERING WHEEL
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Rotate target heading dynamically to observe Doppler radial projection & tangential blindness
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Light Mode) */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Compass Canvas */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

            {/* In-Canvas Floating Legend */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                color: '#1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', background: '#0284c7' }} />
                <span>Blue: Total Velocity v</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', background: '#7c3aed' }} />
                <span>Purple: Projected Radial v_rad</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', background: '#d97706' }} />
                <span>Amber: Orthogonal Tangential v_tan</span>
              </div>
            </div>
          </div>

          {/* Interactive Heading Angle Steering Wheel / Sliders */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                  Target Heading Orientation (ψ)
                </span>
                <span className="badge badge-cyan font-mono">{headingDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={headingDeg}
                onChange={(e) => setHeadingDeg(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                <span>0° (East +x)</span>
                <span>90° (North +y Forward)</span>
                <span>180° (West -x)</span>
                <span>270° (South -y Rear)</span>
                <span>360°</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Speed ||v||</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>{speed.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Lateral Offset (x)</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>{targetPosX.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="-10.0"
                  max="10.0"
                  step="0.5"
                  value={targetPosX}
                  onChange={(e) => setTargetPosX(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Real-Time Mathematical Readouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600 }}>RADIAL DOPPLER (v · r_hat)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>
                {vExpectedRad.toFixed(2)} m/s
              </div>
              <div style={{ color: isClutterNotch ? '#d97706' : '#059669', fontSize: '0.7rem', marginTop: '2px', fontWeight: 600 }}>
                {isClutterNotch ? '⚠ Inside MTI Notch (< 0.4 m/s)' : '✓ Outside MTI Notch'}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600 }}>TANGENTIAL SPEED</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706' }}>
                {vTanSpeed.toFixed(2)} m/s
              </div>
              <div style={{ color: isTangentialBlind ? '#d97706' : '#059669', fontSize: '0.7rem', marginTop: '2px', fontWeight: 600 }}>
                {isTangentialBlind ? '⚠ Doppler Blind (|cos φ| < 0.25)' : '✓ Radial Observable'}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600 }}>ASPECT FRACTION |cos φ|</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {cosPhi.toFixed(2)} ({aspectAngleDeg.toFixed(1)}°)
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                {cosPhi > 0.8 ? 'Near Pure Radial' : cosPhi < 0.2 ? 'Near Pure Lateral' : 'Mixed Aspect'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function drawCompassArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headLen = 9;
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
