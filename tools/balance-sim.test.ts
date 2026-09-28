import { createInitialState, Simulation, type SimState } from '../packages/simulation/src';
import { describe, expect, it } from 'vitest';

type Scenario = { name: string; candidateId: string; money: number };
const SCENARIOS: Scenario[] = [
  { name: 'Bình', candidateId: 'binh', money: 300 },
  { name: 'Chi', candidateId: 'chi', money: 400 },
  { name: 'Dũng', candidateId: 'dung', money: 500 },
];

const seeds = Number(process.env.BALANCE_SEEDS ?? 12);
const days = Number(process.env.BALANCE_DAYS ?? 12);
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 100 || !Number.isInteger(days) || days < 1 || days > 60) {
  throw new Error('BALANCE_SEEDS cần 1–100; BALANCE_DAYS cần 1–60');
}

describe('mô phỏng cân bằng nhiều seed', () => { for (const scenario of SCENARIOS) it(scenario.name, () => {
  const rows: { profit: number; sales: number; away: number; expired: number; complaints: number; repeat: number }[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const state: SimState = createInitialState(seed);
    state.money = scenario.money;
    state.dayStart.money = scenario.money;
    const sim = new Simulation(state);
    sim.dispatch({ type: 'hire', candidateId: scenario.candidateId });
    sim.dispatch({ type: 'assignCounter', counterId: 'counter-1', workerId: `w-${scenario.candidateId}` });
    const starting = sim.snapshot.money;
    const ticks = days * state.config.dayMs / state.config.tickMs;
    let complaints = 0;
    for (let i = 0; i < ticks; i++) {
      sim.step();
      if (i % 500 === 499) {
        complaints += sim.drainEvents().filter((e) => e.type === 'complaintOpened').length;
      }
    }
    complaints += sim.drainEvents().filter((e) => e.type === 'complaintOpened').length;
    const s = sim.snapshot;
    rows.push({
      profit: (s.money - starting) / days,
      sales: s.stats.sales / days,
      away: (s.stats.leftAngry + s.stats.turnedAway) / days,
      expired: s.stats.expiredStock / days,
      complaints: complaints / days,
      repeat: s.stats.returningCustomers / days,
    });
  }
  const mean = (key: keyof typeof rows[number]) => Math.round(rows.reduce((sum, r) => sum + r[key], 0) / rows.length * 10) / 10;
  const profits = rows.map((r) => r.profit).sort((a, b) => a - b);
  const estimatedOffline = Math.round(mean('profit') * createInitialState(1).config.offlineCapMs / createInitialState(1).config.dayMs);
  console.log(`${scenario.name}: lợi/ngày ${mean('profit')} xu [${Math.round(profits[0]!)}..${Math.round(profits.at(-1)!)}], vắng 35 phút ~${estimatedOffline} xu (trần), bán ${mean('sales')}, bỏ về ${mean('away')}, hết hạn ${mean('expired')}, khiếu nại ${mean('complaints')}, khách quen ${mean('repeat')}`);
  expect(rows.every((r) => Number.isFinite(r.profit) && r.expired >= 0)).toBe(true);
  expect(estimatedOffline).toBeLessThan(650);
}); });
