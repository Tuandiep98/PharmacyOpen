import { describe, expect, it } from 'vitest';
import { createInitialState, createSave, loadSave, Simulation, type SimState } from '../src';
import { runFor } from './helpers';

function unlocked() {
  const state = createInitialState(101);
  state.day = 3;
  state.stats.sales = 22;
  state.money = 2000;
  const sim = new Simulation(state);
  expect(sim.dispatch({ type: 'buyUpgrade', upgradeId: 'counter-2' }).ok).toBe(true);
  return { sim, state };
}

describe('quầy thứ hai', () => {
  it('cần cấp tiệm 3 và chỉ mua được một lần; save một hoặc hai quầy đều tải được', () => {
    const old = createInitialState(9);
    old.money = 2000;
    const sim = new Simulation(old);
    expect(sim.dispatch({ type: 'buyUpgrade', upgradeId: 'counter-2' })).toEqual({ ok: false, reason: 'level-locked' });
    expect(loadSave(createSave(old, 1)).ok).toBe(true);
    const { sim: upgraded, state } = unlocked();
    expect(state.counters).toHaveLength(2);
    expect(state.counters[1]).toMatchObject({ id: 'counter-2', customerId: null, operatorId: null });
    expect(upgraded.dispatch({ type: 'buyUpgrade', upgradeId: 'counter-2' })).toEqual({ ok: false, reason: 'already-owned' });
    const loaded = loadSave(createSave(state, 2));
    expect(loaded.ok && loaded.state.counters).toEqual(state.counters);
  });

  it('quầy chưa có người không nhận khách, hai quầy có người nhận khách FIFO', () => {
    const { sim, state } = unlocked();
    state.config.spawnIntervalMs = [100, 100];
    state.nextSpawnAtMs = 0;
    runFor(sim, 500);
    expect(state.counters[0]?.customerId).toBeTruthy();
    expect(state.counters[1]?.customerId).toBeNull();
    expect(state.queue.length).toBeGreaterThan(0);
    expect(sim.dispatch({ type: 'hire', candidateId: 'binh' }).ok).toBe(true);
    expect(sim.dispatch({ type: 'assignCounter', counterId: 'counter-2', workerId: 'w-binh' }).ok).toBe(true);
    runFor(sim, 100);
    expect(state.counters[1]?.customerId).toBeTruthy();
    expect(state.counters[0]?.customerId).not.toBe(state.counters[1]?.customerId);
    expect(state.counters.map((c) => c.operatorId)).toEqual(['w-player', 'w-binh']);
    const second = state.counters[1]!.customerId!;
    expect(sim.dispatch({ type: 'startService', workerId: 'w-player', customerId: second })).toEqual({ ok: false, reason: state.customers[second]!.orderId ? 'customer-already-served' : 'counter-assigned-elsewhere' });
    expect(state.customers[second]!.orderId && state.orders[state.customers[second]!.orderId!]!.workerId).toBe('w-binh');
  });

  it('rời quầy sang hỗ trợ không bị giao lại ngay quầy vừa rời', () => {
    const { sim, state } = unlocked();
    expect(sim.dispatch({ type: 'hire', candidateId: 'binh' }).ok).toBe(true);
    expect(sim.dispatch({ type: 'assignCounter', counterId: 'counter-2', workerId: 'w-binh' }).ok).toBe(true);
    expect(sim.dispatch({ type: 'assignStation', workerId: 'w-binh', station: 'support' }).ok).toBe(true);
    expect(state.counters.map((c) => c.operatorId)).toEqual(['w-player', null]);
  });

  it('đổi quầy không nhân đôi người đứng; người nhận khách chỉ phục vụ quầy của mình', () => {
    const { sim, state } = unlocked();
    expect(sim.dispatch({ type: 'hire', candidateId: 'binh' }).ok).toBe(true);
    expect(sim.dispatch({ type: 'assignCounter', counterId: 'counter-2', workerId: 'w-binh' }).ok).toBe(true);
    expect(sim.dispatch({ type: 'assignCounter', counterId: 'counter-2', workerId: 'w-player' }).ok).toBe(true);
    expect(state.counters.map((c) => c.operatorId)).toEqual(['w-binh', 'w-player']);
    expect(new Set(state.counters.map((c) => c.operatorId)).size).toBe(2);
    const invalid = JSON.parse(JSON.stringify(state)) as SimState;
    invalid.counters[0]!.operatorId = 'w-player';
    expect(loadSave(createSave(invalid, 3))).toEqual({ ok: false, error: 'corrupt' });
  });
});
