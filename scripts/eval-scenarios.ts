import { runMonteCarloTrials } from '../src/lib/monte-carlo';
import { SCENARIOS, DEFAULT_SIM_PARAMS } from '../src/lib/scenarios';
import { ScenarioId } from '../src/types';

async function main() {
  const scenarioIds = Object.keys(SCENARIOS) as ScenarioId[];
  console.log('Running Monte Carlo across all 9 scenarios (100 trials each)...\n');

  const results: any[] = [];

  for (const scenId of scenarioIds) {
    const scen = SCENARIOS[scenId];
    const stats = await runMonteCarloTrials(scenId, 100, DEFAULT_SIM_PARAMS);
    results.push({
      id: scenId,
      title: scen.title,
      threat: scen.threatDescription.includes('ATTACK') ? 'Attack' : 'Benign',
      naiveStrictFAR: stats.detectors.naive_strict.falseAlarmRate,
      naiveStrictDet: stats.detectors.naive_strict.detectionRate,
      naiveStrictMTTD: stats.detectors.naive_strict.mttdSeconds,
      naiveLooseFAR: stats.detectors.naive_loose.falseAlarmRate,
      naiveLooseDet: stats.detectors.naive_loose.detectionRate,
      naiveLooseMTTD: stats.detectors.naive_loose.mttdSeconds,
      strictPersistFAR: stats.detectors.strict_persist.falseAlarmRate,
      strictPersistDet: stats.detectors.strict_persist.detectionRate,
      strictPersistMTTD: stats.detectors.strict_persist.mttdSeconds,
      causeAwareFAR: stats.detectors.cause_aware.falseAlarmRate,
      causeAwareDet: stats.detectors.cause_aware.detectionRate,
      causeAwareMTTD: stats.detectors.cause_aware.mttdSeconds,
      mlFAR: stats.detectors.ml_random_forest?.falseAlarmRate ?? 0,
      mlDet: stats.detectors.ml_random_forest?.detectionRate ?? 0,
      mlMTTD: stats.detectors.ml_random_forest?.mttdSeconds ?? 0,
    });
  }

  console.log('| Scenario | Type | Naive Strict | Naive Loose | Strict + Persist (N=3) | Proposed Cause-Aware | ML (Random Forest) |');
  console.log('|---|---|---|---|---|---|---|');

  for (const r of results) {
    const formatDet = (far: number, det: number, mttd: number, isAttack: boolean) => {
      if (!isAttack) {
        return far > 5 ? `**FAILS** (${far.toFixed(1)}% FAR)` : `Passes (${far.toFixed(1)}% FAR)`;
      } else {
        return det < 50 ? `**FAILS** (${det.toFixed(1)}% Det)` : `Detected (${det.toFixed(1)}% Det, ${mttd.toFixed(2)}s)`;
      }
    };

    const isAttack = r.threat === 'Attack';
    const strictStr = formatDet(r.naiveStrictFAR, r.naiveStrictDet, r.naiveStrictMTTD, isAttack);
    const looseStr = formatDet(r.naiveLooseFAR, r.naiveLooseDet, r.naiveLooseMTTD, isAttack);
    const persistStr = formatDet(r.strictPersistFAR, r.strictPersistDet, r.strictPersistMTTD, isAttack);
    let causeStr = '';
    if (isAttack) {
      causeStr = r.causeAwareDet >= 90.0
        ? `**OPTIMAL** (${r.causeAwareDet.toFixed(1)}% Det, ${r.causeAwareMTTD.toFixed(2)}s)`
        : `**FAILS** (${r.causeAwareDet.toFixed(1)}% Det, ${r.causeAwareMTTD.toFixed(2)}s)`;
    } else {
      causeStr = r.causeAwareFAR < 2.0
        ? `**OPTIMAL** (${r.causeAwareFAR.toFixed(1)}% FAR)`
        : `**FAILS** (${r.causeAwareFAR.toFixed(1)}% FAR)`;
    }

    let mlStr = '';
    if (isAttack) {
      mlStr = r.mlDet >= 90.0
        ? `**OPTIMAL** (${r.mlDet.toFixed(1)}% Det, ${r.mlMTTD.toFixed(2)}s)`
        : `Detected (${r.mlDet.toFixed(1)}% Det, ${r.mlMTTD.toFixed(2)}s)`;
    } else {
      mlStr = r.mlFAR < 2.0
        ? `**OPTIMAL** (${r.mlFAR.toFixed(1)}% FAR)`
        : `Passes (${r.mlFAR.toFixed(1)}% FAR)`;
    }

    console.log(`| **${r.title}** | ${r.threat} | ${strictStr} | ${looseStr} | ${persistStr} | ${causeStr} | ${mlStr} |`);
  }
}

main().catch(console.error);
