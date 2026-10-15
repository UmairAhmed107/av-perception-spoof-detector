// ============================================================================
// Temporal Trust Monitor & Kinematic Velocity Gate Chart (Light Mode)
// Time-Series Canvas Visualization (Mode 1: Trust T(t) | Mode 2: Doppler Gate Band)
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import type { TimeSeriesPoint } from '../types';
import { LineChart, Shield, Activity } from 'lucide-react';

interface TrustChartProps {
  history: TimeSeriesPoint[];
  currentTrust: number;
}

export const TrustChart: React.FC<TrustChartProps> = ({
  history,
  currentTrust,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chartMode, setChartMode] = useState<'trust' | 'gate'>('trust');

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

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 25;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    // Clear background (Light Mode Canvas)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText('Accumulating time-series data...', padLeft + 20, height / 2);
      return;
    }

    const nPoints = history.length;
    const getX = (idx: number) => padLeft + (idx / Math.max(1, nPoints - 1)) * plotWidth;

    if (chartMode === 'trust') {
      // ----------------------------------------------------------------------
      // MODE 1: Temporal Trust Score T(t) [0.0 to 1.0]
      // ----------------------------------------------------------------------
      const getY = (val: number) => padTop + (1.0 - Math.max(0, Math.min(1, val))) * plotHeight;

      // Draw Alarm Threshold Line (0.35)
      const yAlarm = getY(0.35);
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, yAlarm);
      ctx.lineTo(width - padRight, yAlarm);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText('Alarm Trip T = 0.35', padLeft + 8, yAlarm - 5);

      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('1.00', 10, getY(1.0) + 4);
      ctx.fillText('0.50', 10, getY(0.5) + 4);
      ctx.fillText('0.00', 10, getY(0.0) + 4);

      // Draw Trust Area Gradient
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
      grad.addColorStop(0, 'rgba(5, 150, 105, 0.2)');
      grad.addColorStop(0.65, 'rgba(217, 119, 6, 0.15)');
      grad.addColorStop(1, 'rgba(225, 29, 72, 0.2)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(history[0].trust));
      for (let i = 1; i < nPoints; i++) {
        ctx.lineTo(getX(i), getY(history[i].trust));
      }
      ctx.lineTo(getX(nPoints - 1), getY(0));
      ctx.lineTo(getX(0), getY(0));
      ctx.closePath();
      ctx.fill();

      // Draw Trust Curve Line
      ctx.strokeStyle = currentTrust < 0.35 ? '#e11d48' : currentTrust < 0.7 ? '#d97706' : '#059669';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(history[0].trust));
      for (let i = 1; i < nPoints; i++) {
        ctx.lineTo(getX(i), getY(history[i].trust));
      }
      ctx.stroke();

      const curX = getX(nPoints - 1);
      const curY = getY(history[nPoints - 1].trust);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(curX, curY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ----------------------------------------------------------------------
      // MODE 2: Kinematic Doppler Gate Band (v_expected +/- 2*sigma)
      // ----------------------------------------------------------------------
      let minV = -1.0;
      let maxV = 6.0;
      for (const p of history) {
        if (p.gateLower < minV) minV = p.gateLower - 0.5;
        if (p.gateUpper > maxV) maxV = p.gateUpper + 0.5;
        if (p.vMeasured !== null && p.vMeasured > maxV) maxV = p.vMeasured + 0.5;
        if (p.vMeasured !== null && p.vMeasured < minV) minV = p.vMeasured - 0.5;
      }

      const getGateY = (v: number) => {
        const norm = (v - minV) / Math.max(0.1, maxV - minV);
        return padTop + (1.0 - Math.max(0, Math.min(1, norm))) * plotHeight;
      };

      // Shaded Uncertainty Tube
      ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
      ctx.beginPath();
      ctx.moveTo(getX(0), getGateY(history[0].gateUpper));
      for (let i = 1; i < nPoints; i++) {
        ctx.lineTo(getX(i), getGateY(history[i].gateUpper));
      }
      for (let i = nPoints - 1; i >= 0; i--) {
        ctx.lineTo(getX(i), getGateY(history[i].gateLower));
      }
      ctx.closePath();
      ctx.fill();

      // Expected Radial Velocity Centerline
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(getX(0), getGateY(history[0].vExpected));
      for (let i = 1; i < nPoints; i++) {
        ctx.lineTo(getX(i), getGateY(history[i].vExpected));
      }
      ctx.stroke();

      // Measured Doppler Points
      for (let i = 0; i < nPoints; i++) {
        const pt = history[i];
        if (pt.vMeasured !== null) {
          const ptX = getX(i);
          const ptY = getGateY(pt.vMeasured);
          const isBreach = pt.vMeasured > pt.gateUpper || pt.vMeasured < pt.gateLower;

          ctx.fillStyle = isBreach ? '#e11d48' : '#7c3aed';
          ctx.beginPath();
          ctx.arc(ptX, ptY, isBreach ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${maxV.toFixed(1)}`, 10, padTop + 10);
      ctx.fillText(`${((maxV + minV) / 2).toFixed(1)}`, 10, padTop + plotHeight / 2);
      ctx.fillText(`${minV.toFixed(1)}`, 10, padTop + plotHeight - 2);
    }
  }, [history, chartMode, currentTrust]);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        minHeight: '260px',
      }}
    >
      {/* Header & Mode Switcher */}
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
          <LineChart size={18} color="var(--cyan-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            {chartMode === 'trust' ? 'TEMPORAL TRUST MONITOR T(t)' : 'KINEMATIC VELOCITY GATE BAND'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setChartMode('trust')}
            className="btn-secondary"
            style={{
              padding: '3px 9px',
              fontSize: '0.72rem',
              borderColor: chartMode === 'trust' ? 'var(--cyan-primary)' : '#cbd5e1',
              color: chartMode === 'trust' ? 'var(--cyan-primary)' : '#64748b',
            }}
          >
            <Shield size={13} color={chartMode === 'trust' ? 'var(--cyan-primary)' : '#64748b'} />
            Trust Score
          </button>
          <button
            onClick={() => setChartMode('gate')}
            className="btn-secondary"
            style={{
              padding: '3px 9px',
              fontSize: '0.72rem',
              borderColor: chartMode === 'gate' ? 'var(--purple-radar)' : '#cbd5e1',
              color: chartMode === 'gate' ? 'var(--purple-radar)' : '#64748b',
            }}
          >
            <Activity size={13} color={chartMode === 'gate' ? 'var(--purple-radar)' : '#64748b'} />
            ±2σ Gate Tube
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '180px' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
};
