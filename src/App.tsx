// ============================================================================
// AV Perception Integrity & Defense Research Testbed
// Master Simulation Coordinator & Dashboard (Light Mode)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  ScenarioId,
  SimulationParams,
  FrameTelemetry,
  TimeSeriesPoint,
} from './types';
import { DEFAULT_SIM_PARAMS, SCENARIOS, generateScenarioMeasurement } from './lib/scenarios';
import { LinearKalmanFilter2D } from './lib/ekf';
import { createInitialHistory, evaluateFrame, type EvaluationHistory } from './lib/kinematics-engine';

// Components
import { BevCanvas } from './components/BevCanvas';
import { LiveAnalysisPanel } from './components/LiveAnalysisPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { FlowchartPipeline } from './components/FlowchartPipeline';
import { TrustChart } from './components/TrustChart';
import { DetectorsPanel } from './components/DetectorsPanel';
import { ControlPanel } from './components/ControlPanel';
import { GuidedTour } from './components/GuidedTour';

import { ScenarioAlertModal } from './components/ScenarioAlertModal';
import { ExplainFrameModal } from './components/ExplainFrameModal';
import { GeometryView } from './components/GeometryView';
import { MonteCarloModal } from './components/MonteCarloModal';
import { ScenarioSummaryModal } from './components/ScenarioSummaryModal';
import { GlossaryModal } from './components/GlossaryModal';

// Icons
import {
  Shield,
  BarChart3,
  Compass,
  FileText,
  BookOpen,
  Zap,
  Activity,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const App: React.FC = () => {
  // Scenario & Params state
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('scen_1_cyclist_tangential');
  const [params, setParams] = useState<SimulationParams>(DEFAULT_SIM_PARAMS);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  // Right column tab state: 'analysis' or 'telemetry'
  const [rightPanelTab, setRightPanelTab] = useState<'analysis' | 'telemetry'>('analysis');
  const [showTelemetryBelow, setShowTelemetryBelow] = useState<boolean>(true);

  // Active Telemetry snapshot
  const [telemetry, setTelemetry] = useState<FrameTelemetry | null>(null);
  const [timeSeriesHistory, setTimeSeriesHistory] = useState<TimeSeriesPoint[]>([]);
  const [motionTrail, setMotionTrail] = useState<{ x: number; y: number }[]>([]);

  // Modals state
  const [showScenarioAlert, setShowScenarioAlert] = useState<boolean>(true);
  const [showExplainModal, setShowExplainModal] = useState<boolean>(false);
  const [showGeometryModal, setShowGeometryModal] = useState<boolean>(false);
  const [showMonteCarloModal, setShowMonteCarloModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);

  // Simulation engine internal refs
  const engineRef = useRef<{
    timeSec: number;
    frameIndex: number;
    ekf: LinearKalmanFilter2D;
    history: EvaluationHistory;
    lastRafTime: number;
    accumulator: number;
  }>({
    timeSec: 0,
    frameIndex: 0,
    ekf: new LinearKalmanFilter2D(
      SCENARIOS['scen_1_cyclist_tangential'].initialPos,
      SCENARIOS['scen_1_cyclist_tangential'].initialVel
    ),
    history: createInitialHistory(),
    lastRafTime: performance.now(),
    accumulator: 0,
  });

  // Reinitialize simulation on scenario change or reset
  const initSimulation = useCallback(
    (scenarioId: ScenarioId) => {
      const scen = SCENARIOS[scenarioId];
      const engine = engineRef.current;
      engine.timeSec = 0;
      engine.frameIndex = 0;
      engine.ekf.reset(scen.initialPos, scen.initialVel, 1.0, 4.0);
      engine.history = createInitialHistory();
      engine.lastRafTime = performance.now();
      engine.accumulator = 0;

      // Generate frame 0
      const measurement = generateScenarioMeasurement(scenarioId, 0, 0, params);
      const rHat = {
        x: scen.initialPos.x / Math.max(0.1, Math.hypot(scen.initialPos.x, scen.initialPos.y)),
        y: scen.initialPos.y / Math.max(0.1, Math.hypot(scen.initialPos.x, scen.initialPos.y)),
      };
      const ekfSnapshot = engine.ekf.getStateSnapshot(rHat, params.sigmaRadar);
      const evaluation = evaluateFrame(measurement, ekfSnapshot, params, engine.history);

      const initialTelem: FrameTelemetry = {
        measurement,
        ekf: ekfSnapshot,
        evaluation,
      };

      setTelemetry(initialTelem);
      setCurrentTime(0);
      setCurrentFrame(0);
      setMotionTrail([{ x: scen.initialPos.x, y: scen.initialPos.y }]);
      setTimeSeriesHistory([
        {
          time: 0,
          frameIndex: 0,
          trust: 1.0,
          vExpected: evaluation.vExpectedRad,
          vMeasured: measurement.radar.isDetected ? measurement.radar.doppler : null,
          gateUpper: evaluation.vExpectedRad + 2 * ekfSnapshot.sigmaTotal,
          gateLower: evaluation.vExpectedRad - 2 * ekfSnapshot.sigmaTotal,
          mahalanobisDist: evaluation.mahalanobisDist,
          isAttack: measurement.isAttackActive,
          isNotch: evaluation.attribution === 'BENIGN_CLUTTER_NOTCH_DROP',
          attribution: evaluation.attribution,
        },
      ]);
    },
    [params]
  );

  // Handle Scenario switch
  const handleSelectScenario = (id: ScenarioId) => {
    setActiveScenarioId(id);
    setShowScenarioAlert(true);
    setIsPlaying(false);
    initSimulation(id);
  };

  // Step single frame forward (0.05s)
  const stepOneFrame = useCallback(() => {
    const engine = engineRef.current;
    const dt = 0.05; // 20 Hz
    engine.timeSec += dt;
    engine.frameIndex += 1;

    const scen = SCENARIOS[activeScenarioId];
    if (engine.timeSec > scen.durationSec) {
      engine.timeSec = 0;
      engine.frameIndex = 0;
      engine.ekf.reset(scen.initialPos, scen.initialVel);
      engine.history = createInitialHistory();
    }

    const measurement = generateScenarioMeasurement(
      activeScenarioId,
      engine.timeSec,
      engine.frameIndex,
      params
    );

    // EKF Predict & Update
    engine.ekf.predict(dt);
    if (measurement.lidar.isDetected) {
      engine.ekf.updatePosition(measurement.lidar.pos, params.sigmaLidar);
    }

    const curPos = { x: engine.ekf.x[0], y: engine.ekf.x[1] };
    const rHat = {
      x: curPos.x / Math.max(0.1, Math.hypot(curPos.x, curPos.y)),
      y: curPos.y / Math.max(0.1, Math.hypot(curPos.x, curPos.y)),
    };
    const ekfSnapshot = engine.ekf.getStateSnapshot(rHat, params.sigmaRadar);
    const evaluation = evaluateFrame(measurement, ekfSnapshot, params, engine.history);

    const newTelem: FrameTelemetry = {
      measurement,
      ekf: ekfSnapshot,
      evaluation,
    };

    setTelemetry(newTelem);
    setCurrentTime(engine.timeSec);
    setCurrentFrame(engine.frameIndex);

    // Update motion trail
    setMotionTrail((prev) => [...prev.slice(-29), { x: curPos.x, y: curPos.y }]);

    // Update time series history
    setTimeSeriesHistory((prev) => [
      ...prev.slice(-69),
      {
        time: engine.timeSec,
        frameIndex: engine.frameIndex,
        trust: evaluation.trustScore,
        vExpected: evaluation.vExpectedRad,
        vMeasured: measurement.radar.isDetected ? measurement.radar.doppler : null,
        gateUpper: evaluation.vExpectedRad + 2 * ekfSnapshot.sigmaTotal,
        gateLower: evaluation.vExpectedRad - 2 * ekfSnapshot.sigmaTotal,
        mahalanobisDist: evaluation.mahalanobisDist,
        isAttack: measurement.isAttackActive,
        isNotch: evaluation.attribution === 'BENIGN_CLUTTER_NOTCH_DROP',
        attribution: evaluation.attribution,
      },
    ]);
  }, [activeScenarioId, params]);

  // Main 60 FPS RequestAnimationFrame Simulation Loop
  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const engine = engineRef.current;
      const deltaMs = now - engine.lastRafTime;
      engine.lastRafTime = now;

      if (isPlaying) {
        engine.accumulator += (deltaMs / 1000) * playbackSpeed;
        const frameDt = 0.05; // 20 Hz step

        while (engine.accumulator >= frameDt) {
          stepOneFrame();
          engine.accumulator -= frameDt;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    engineRef.current.lastRafTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, stepOneFrame]);

  // Initial load
  useEffect(() => {
    initSimulation(activeScenarioId);
  }, [initSimulation, activeScenarioId]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px',
        gap: '16px',
        maxWidth: '1750px',
        margin: '0 auto',
      }}
    >
      {/* =================================================================== */}
      {/* TOP HEADER: BRANDING & PRIMARY MODAL LAUNCHERS                     */}
      {/* =================================================================== */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '14px',
          background: 'transparent',
        }}
      >
        {/* Crest & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Shield size={24} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  color: '#0f172a',
                }}
              >
                AV SENSOR INTEGRITY & DEFENSE
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                PERCEPTION TESTBED
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                4D EKF + CAUSE-AWARE ATTRIBUTION
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Interactive Cross-Modal LiDAR-Radar Verification & Physics-Informed Cause-Aware Attribution
            </p>
          </div>
        </div>

        {/* Modal Navigation Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowScenarioAlert(true)}
            className="btn-secondary"
            style={{
              borderColor: '#e11d48',
              color: '#e11d48',
              background: '#fff1f2',
              fontWeight: 700,
            }}
            title="Pop-Up Perception Threat Alert & Phenomenon Briefing for Active Scenario"
          >
            <AlertTriangle size={15} color="#e11d48" />
            <span>Scenario Alert</span>
          </button>

          <button
            onClick={() => setShowMonteCarloModal(true)}
            className="btn-secondary"
            title="Launch Multi-Trial Statistical Monte Carlo Benchmark"
          >
            <BarChart3 size={15} color="var(--cyan-primary)" />
            <span>Monte Carlo</span>
          </button>

          <button
            onClick={() => setShowGeometryModal(true)}
            className="btn-secondary"
            title="Interactive Target Heading Steering Wheel & Vector Decomposition"
          >
            <Compass size={15} color="var(--purple-radar)" />
            <span>Vector Geometry</span>
          </button>

          <button
            onClick={() => setShowSummaryModal(true)}
            className="btn-secondary"
            title="Active Scenario Debrief & 4-Detector Comparison Card"
          >
            <FileText size={15} color="#059669" />
            <span>Scenario Summary</span>
          </button>

          <button
            onClick={() => setShowGlossaryModal(true)}
            className="btn-secondary"
            title="Scientific Glossary, Notation & Threat Model"
          >
            <BookOpen size={15} color="#d97706" />
            <span>Glossary & Model</span>
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* GUIDED WALKTHROUGH BANNER (Synchronized with Scenario Timeline)     */}
      {/* =================================================================== */}
      <GuidedTour scenarioId={activeScenarioId} currentTime={currentTime} />

      {/* =================================================================== */}
      {/* MAIN TWO-COLUMN DASHBOARD GRID                                     */}
      {/* Left: BEV Canvas, Control Buttons directly below, then Flowchart   */}
      {/* Right: Live Analysis Panel (next to simulation), then Telemetry    */}
      {/* =================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1.15fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* =============================================================== */}
        {/* LEFT COLUMN: SIMULATION & PLAYBACK CONTROLS                     */}
        {/* =============================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Bird's-Eye-View Simulation Canvas */}
          <div style={{ height: '450px' }}>
            <BevCanvas telemetry={telemetry} historyTrail={motionTrail} />
          </div>

          {/* PLAYBACK CONTROLS DIRECTLY BELOW SIMULATION (Image 1 placement) */}
          <ControlPanel
            activeScenarioId={activeScenarioId}
            onSelectScenario={handleSelectScenario}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onStepFrame={stepOneFrame}
            onReset={() => initSimulation(activeScenarioId)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            currentTime={currentTime}
            currentFrame={currentFrame}
            params={params}
            onChangeParams={setParams}
            onResetParams={() => setParams(DEFAULT_SIM_PARAMS)}
            onOpenScenarioAlert={() => setShowScenarioAlert(true)}
          />

          {/* Live Decision Pipeline Flowchart */}
          <FlowchartPipeline
            telemetry={telemetry}
            onOpenExplainFrame={() => setShowExplainModal(true)}
          />
        </div>

        {/* =============================================================== */}
        {/* RIGHT COLUMN: LIVE ANALYSIS TAB & TELEMETRY (Image 2 placement)  */}
        {/* =============================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tab Selector Header for Right Column */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            }}
          >
            {/* Primary Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setRightPanelTab('analysis')}
                className="btn-secondary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: rightPanelTab === 'analysis' ? 'var(--cyan-primary)' : '#ffffff',
                  color: rightPanelTab === 'analysis' ? '#ffffff' : '#475569',
                  borderColor: rightPanelTab === 'analysis' ? 'var(--cyan-primary)' : '#cbd5e1',
                  boxShadow: rightPanelTab === 'analysis' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                  gap: '6px',
                }}
              >
                <Zap size={14} color={rightPanelTab === 'analysis' ? '#ffffff' : 'var(--cyan-primary)'} />
                Live Situation Analysis
              </button>

              <button
                onClick={() => setRightPanelTab('telemetry')}
                className="btn-secondary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: rightPanelTab === 'telemetry' ? 'var(--cyan-primary)' : '#ffffff',
                  color: rightPanelTab === 'telemetry' ? '#ffffff' : '#475569',
                  borderColor: rightPanelTab === 'telemetry' ? 'var(--cyan-primary)' : '#cbd5e1',
                  boxShadow: rightPanelTab === 'telemetry' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                  gap: '6px',
                }}
              >
                <Activity size={14} color={rightPanelTab === 'telemetry' ? '#ffffff' : 'var(--cyan-primary)'} />
                Telemetry & Kinematics
              </button>
            </div>

            {/* Quick Toggle to show both below */}
            {rightPanelTab === 'analysis' && (
              <button
                onClick={() => setShowTelemetryBelow(!showTelemetryBelow)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={13} />
                {showTelemetryBelow ? 'Hide Telemetry Below' : 'Show Telemetry Below'}
              </button>
            )}
          </div>

          {/* Main Tab Content directly next to Simulation */}
          {rightPanelTab === 'analysis' ? (
            <LiveAnalysisPanel
              telemetry={telemetry}
              scenarioId={activeScenarioId}
            />
          ) : (
            <TelemetryPanel
              telemetry={telemetry}
              onOpenGeometry={() => setShowGeometryModal(true)}
            />
          )}

          {/* Telemetry Panel placed below Analysis if user is on Analysis tab and has it expanded */}
          {rightPanelTab === 'analysis' && showTelemetryBelow && (
            <div>
              <TelemetryPanel
                telemetry={telemetry}
                onOpenGeometry={() => setShowGeometryModal(true)}
              />
            </div>
          )}

          {/* Temporal Trust Monitor & Gating Tube Chart */}
          <TrustChart
            history={timeSeriesHistory}
            currentTrust={telemetry?.evaluation.trustScore ?? 1.0}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* FULL-WIDTH CONCURRENT 4-DETECTOR DEFENSE BENCHMARK                  */}
      {/* =================================================================== */}
      <DetectorsPanel telemetry={telemetry} />

      {/* =================================================================== */}
      {/* FOOTER & SYSTEM STATUS (Light Mode)                                 */}
      {/* =================================================================== */}
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>
          Autonomous Vehicle Perception Integrity & Adversarial Defense Framework © 2026
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>EKF: 4D Continuous-White-Noise-Acceleration</span>
          <span>Sampling: 20 Hz (dt = 0.05s)</span>
          <span>Engine: RAF 60 FPS Reference</span>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* INTERACTIVE MODALS                                                  */}
      {/* =================================================================== */}
      {showScenarioAlert && (
        <ScenarioAlertModal
          scenarioId={activeScenarioId}
          onClose={() => setShowScenarioAlert(false)}
          onPlay={() => {
            setShowScenarioAlert(false);
            setIsPlaying(true);
          }}
        />
      )}

      {showExplainModal && (
        <ExplainFrameModal
          telemetry={telemetry}
          onClose={() => setShowExplainModal(false)}
        />
      )}

      {showGeometryModal && (
        <GeometryView onClose={() => setShowGeometryModal(false)} />
      )}

      {showMonteCarloModal && (
        <MonteCarloModal
          activeScenarioId={activeScenarioId}
          params={params}
          onClose={() => setShowMonteCarloModal(false)}
        />
      )}

      {showSummaryModal && (
        <ScenarioSummaryModal
          scenarioId={activeScenarioId}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {showGlossaryModal && (
        <GlossaryModal onClose={() => setShowGlossaryModal(false)} />
      )}
    </div>
  );
};

export default App;
