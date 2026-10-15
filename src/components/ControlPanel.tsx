// ============================================================================
// Playback, Scenario Selection & Hyperparameter Controls (Light Mode)
// Real-Time AV Simulation Steering
// ============================================================================

import React, { useState } from 'react';
import type {
  ScenarioId,
  SimulationParams,
} from '../types';
import { SCENARIOS } from '../lib/scenarios';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Sliders,
  Settings2,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface ControlPanelProps {
  activeScenarioId: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepFrame: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  currentTime: number;
  currentFrame: number;
  params: SimulationParams;
  onChangeParams: (params: SimulationParams) => void;
  onResetParams: () => void;
  onOpenScenarioAlert?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  activeScenarioId,
  onSelectScenario,
  isPlaying,
  onTogglePlay,
  onStepFrame,
  onReset,
  playbackSpeed,
  onChangeSpeed,
  currentTime,
  currentFrame,
  params,
  onChangeParams,
  onResetParams,
  onOpenScenarioAlert,
}) => {
  const [showTuningDrawer, setShowTuningDrawer] = useState(false);
  const activeScen = SCENARIOS[activeScenarioId];

  const categories: { name: string; ids: ScenarioId[] }[] = [
    {
      name: 'Core Scenarios',
      ids: [
        'scen_1_cyclist_tangential',
        'scen_2_phantom_spoof',
        'scen_3_rcs_dropout',
        'scen_4_loose_bypass',
      ],
    },
    {
      name: 'Smarter Adversarial Attacks',
      ids: [
        'scen_5_slow_creep',
        'scen_6_phantom_tangential',
        'scen_7_pulsed_spoof',
      ],
    },
    {
      name: 'Rich Benign Physical Artifacts',
      ids: ['scen_8_guardrail_multipath', 'scen_9_boresight_drift'],
    },
  ];

  return (
    <div
      className="glass-panel"
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top Bar: Scenario Selector & Playback Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Scenario Selection Dropdown (Light Mode) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 320px' }}>
          <Layers size={18} color="var(--cyan-primary)" />
          <select
            value={activeScenarioId}
            onChange={(e) => onSelectScenario(e.target.value as ScenarioId)}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              flex: 1,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            }}
          >
            {categories.map((cat) => (
              <optgroup key={cat.name} label={cat.name} style={{ background: '#ffffff', color: '#64748b' }}>
                {cat.ids.map((id) => (
                  <option key={id} value={id} style={{ color: '#0f172a' }}>
                    {SCENARIOS[id].title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {onOpenScenarioAlert && (
            <button
              onClick={onOpenScenarioAlert}
              className="btn-secondary"
              style={{
                borderColor: '#f43f5e',
                color: '#e11d48',
                background: '#fff1f2',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '8px 12px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(225, 29, 72, 0.1)',
              }}
              title="Open Perception Threat Alert & Phenomenon Pop-up for Current Scenario"
            >
              <span>⚠️ Threat Alert</span>
            </button>
          )}
        </div>

        {/* Playback Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onTogglePlay}
            className={isPlaying ? 'btn-secondary' : 'btn-primary'}
            style={{ minWidth: '100px' }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={onStepFrame}
            disabled={isPlaying}
            className="btn-secondary"
            title="Step Forward One Frame (dt = 0.05s)"
          >
            <SkipForward size={16} />
            <span>STEP</span>
          </button>

          <button
            onClick={onReset}
            className="btn-secondary"
            title="Reset Simulation to Initial Conditions"
          >
            <RotateCcw size={16} />
            <span>RESET</span>
          </button>

          {/* Speed Selector (Light Mode) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #cbd5e1',
              padding: '2px',
            }}
          >
            {[0.25, 0.5, 1.0, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                style={{
                  background: playbackSpeed === s ? 'var(--cyan-primary)' : 'transparent',
                  color: playbackSpeed === s ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Toggle Hyperparameters Drawer */}
          <button
            onClick={() => setShowTuningDrawer(!showTuningDrawer)}
            className="btn-secondary"
            style={{
              borderColor: showTuningDrawer ? 'var(--cyan-primary)' : '#cbd5e1',
              color: showTuningDrawer ? 'var(--cyan-primary)' : 'var(--text-main)',
            }}
            title="Adjust Sensor Noise, Gate Limits & Trust Integrator Rates"
          >
            <Sliders size={16} />
            <span>TUNING</span>
          </button>
        </div>
      </div>

      {/* Timeline Status Bar (Light Mode) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>
            TIME: {currentTime.toFixed(2)}s / {activeScen.durationSec.toFixed(1)}s
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            FRAME: {currentFrame} (20 Hz)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#d97706', fontWeight: 600 }}>
            TARGET: {activeScen.targetType}
          </span>
          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
            {activeScen.category}
          </span>
        </div>
      </div>

      {/* Hyperparameter Tuning Collapsible Drawer (Light Mode) */}
      {showTuningDrawer && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings2 size={16} color="var(--cyan-primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                PHYSICAL ATTRIBUTION & SENSOR TUNING PARAMETERS
              </span>
            </div>
            <button
              onClick={onResetParams}
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
            >
              <RefreshCw size={12} />
              Reset Defaults
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              fontSize: '0.75rem',
            }}
          >
            {/* Radar Sensor Noise */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--purple-radar)', fontWeight: 600 }}>Radar Doppler Noise (σ_radar)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{params.sigmaRadar.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={params.sigmaRadar}
                onChange={(e) =>
                  onChangeParams({ ...params, sigmaRadar: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* LiDAR Position Noise */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>LiDAR Position Noise (σ_pos)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{params.sigmaLidar.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.01"
                value={params.sigmaLidar}
                onChange={(e) =>
                  onChangeParams({ ...params, sigmaLidar: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Chi-Square Gate Limit */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Chi-Square Gate Limit (γ)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{params.chiGate.toFixed(2)} σ</span>
              </div>
              <input
                type="range"
                min="1.50"
                max="4.50"
                step="0.10"
                value={params.chiGate}
                onChange={(e) =>
                  onChangeParams({ ...params, chiGate: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Radar MTI Clutter Notch Speed */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--amber-warn)', fontWeight: 600 }}>MTI Notch Speed (v_notch)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{params.clutterNotchSpeed.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={params.clutterNotchSpeed}
                onChange={(e) =>
                  onChangeParams({ ...params, clutterNotchSpeed: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Trust Decay Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#e11d48', fontWeight: 600 }}>Trust Penalty Decay (α)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>-{params.alphaDecay.toFixed(2)} / frame</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.05"
                value={params.alphaDecay}
                onChange={(e) =>
                  onChangeParams({ ...params, alphaDecay: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Trust Recovery Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#059669', fontWeight: 600 }}>Trust Credit Recovery (β)</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>+{params.betaRecovery.toFixed(2)} / frame</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.20"
                step="0.01"
                value={params.betaRecovery}
                onChange={(e) =>
                  onChangeParams({ ...params, betaRecovery: parseFloat(e.target.value) })
                }
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
