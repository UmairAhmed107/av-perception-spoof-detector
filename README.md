# Autonomous Vehicle Perception Integrity & Adversarial Defense Framework

> **Interactive Cross-Modal Sensor Verification and Benign-Cause Physical Attribution Simulation for Autonomous Vehicle Perception Integrity**

---

## 📌 Overview

Modern Autonomous Vehicles (AVs) rely on multi-sensor suites combining **LiDAR** (spatial precision) and **77 GHz FMCW Radar** (direct Doppler radial velocity measurement). However, conventional cross-modal sensor fusion algorithms suffer from a catastrophic dilemma:
1. **Overly Strict Validation Gates**: Mistake natural physics phenomena (radar clutter notch dropouts, wet pavement multipath, road rumble boresight drift) for cyber-attacks, triggering hazardous phantom emergency braking on open highways.
2. **Overly Loose Validation Gates**: Fail to detect calibrated velocity offset injections, slow velocity creeps, and anti-persistence pulsed spoofing attacks.

This repository implements a **Physics-Informed Cause-Aware Sensor Attribution Testbed** that mathematically isolates adversarial pulse injections from benign environmental artifacts using:
- **4D Continuous-White-Noise-Acceleration Kalman Filter (EKF/LKF)**
- **Directional Uncertainty Covariance Projection** ($\sigma_{v,\text{proj}}^2 = \hat{\mathbf{r}}^T \mathbf{P}_v \hat{\mathbf{r}}$)
- **$\chi^2$ Mahalanobis Innovation Gating**
- **5-Rule Benign-Cause Physics Attribution Engine**
- **Asymmetric Leaky Temporal Trust Accumulation**

---

## 🚀 Key Features

- **Real-Time Bird's-Eye-View (BEV) Simulation**: 20 Hz / 60 FPS live rendering of AV ego-vehicle, target obstacle trajectory, LiDAR point clouds, Doppler radar velocity cones, and directional innovation tubes.
- **Top Terminal & 6 Live Decision Lines**:
  - **Live Terminal (Event Ticker)**: 20 Hz streaming logs recording next-to-next state transitions and sensor events.
  - **Line 1: Radar Signal Matching**: Dynamic Doppler residual tracking and $\sigma$ gate deviation.
  - **Line 2: Attack or False Attack?**: Discerning cyber attacks from benign physical artifacts.
  - **Line 3: Car Status: Can It Go or Stop?**: Executive control verifying whether highway cruise is safe or emergency braking is required.
  - **Line 4: Real Object or Fake Object?**: Cross-modal verification of physical existence vs. synthetic phantom cloud.
  - **Line 5: Moving Direction**: Lateral, longitudinal, and angular heading tracking ($v_x, v_y, \theta$).
  - **Line 6: What Action Should Car Take?**: Concrete driving instructions ensuring passenger safety and avoiding rear-end collisions.
- **Scenario Briefing Pop-up Alerts**: Detailed threat briefings for all 9 scenarios explaining conventional failure traps and cause-aware defense solutions.
- **Concurrent 4-Detector Defense Benchmark**:
  - *Detector A: Naive Strict ($\gamma = 2.0\sigma$)*
  - *Detector B: Naive Loose ($\gamma = 4.5\sigma$)*
  - *Detector C: Asymmetric Temporal Trust Accumulator*
  - *Detector D: Full Cause-Aware Physical Attribution Engine*
- **Interactive Mathematical Tools**:
  - **Multi-Trial Monte Carlo Benchmark**: 100-trial statistical verification with synthetic sensor noise distributions.
  - **Interactive Vector Geometry Visualizer**: Live heading steering wheel and velocity vector decomposition into line-of-sight radial ($v_{\text{rad}}$) and tangential ($v_{\text{tan}}$) components.
  - **Frame-by-Frame Mathematical Explainer**: Step-by-step matrix calculation inspector.

---

## 🧪 9 Benchmark Scenarios

| # | Scenario | Type | Description |
|---|---|---|---|
| **1** | **Benign Tangential Crossing** | Benign | Cyclist crosses perpendicularly; hardware MTI notch filters out $|v_{\text{rad}}| < 0.4\text{ m/s}$ tarmac clutter. |
| **2** | **Injected Phantom Obstacle** | Attack | Optical laser pulses synthesize a fake 3D obstacle ahead; radar confirms empty asphalt. |
| **3** | **RCS Multipath Dropout** | Benign | Water spray & road puddles cause transient 2-frame radar SNR dip; EKF holds state in memory. |
| **4** | **Calibrated Gate Bypass Attack** | Attack | Adversary injects calibrated $+1.35\text{ m/s}$ ($+3.8\sigma$) velocity offset to slip inside loose $\pm 4.5\sigma$ gates. |
| **5** | **Slow Velocity Creep** | Attack | Adversarial drift ramping at $+0.40\text{ m/s}^2$; caught by the asymmetric trust accumulator. |
| **6** | **Phantom in Tangential Blind Zone** | Attack | Lateral phantom projected sideways at $4.8\text{ m/s}$ to exploit tangential Doppler exemption rules. |
| **7** | **Pulsed Fake Dropouts** | Attack | $3\text{ Hz}$ square-wave laser injection defeating integer persistence counters; caught by asymmetric decay ($\alpha \gg \beta$). |
| **8** | **Guardrail Multipath Ghost** | Benign | Specular RF reflection from metal barrier creates $+1.8\text{ m/s}$ apparent Doppler shift. |
| **9** | **Sensor Boresight Drift** | Benign | $1.5^\circ$ bracket vibration drift cleanly absorbed within statistical confidence bounds. |

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Icons**: Lucide React
- **Styling**: Pure Modern Vanilla CSS (Clean Light Theme, Glassmorphism, Micro-animations)
- **Math Engine**: Native TypeScript 4D Linear Kalman Filter & Chi-Square Innovation Gating

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation

```bash
git clone https://github.com/Nithesh-hash/av-sensor-integrity.git
cd av-sensor-integrity
npm install
```

### Running Locally

```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

---
