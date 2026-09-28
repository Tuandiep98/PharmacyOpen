import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  createInitialState,
  evaluateSatisfaction,
  RARITIES,
  Simulation,
  TRAITS,
  type Rarity,
  type SimEvent,
  type SimState,
} from '../src';
import { generateRecruit, LEVEL_XP, levelFor } from '../src/recruit';
import { createStream } from '../src/rng';
import { autoPlay, runFor } from './helpers';

const mutable = (sim: Simulation) => sim.snapshot as SimState;

/** Tiệm có một nhân viên (hồ sơ cố định) đứng quầy, thêm đặc điểm cho trước. */
function withTraits(seed: number, traits: SimState['workers'][string]['traits']): { sim: Simulation; s: SimState } {
  const state = createInitialState(seed);
  state.money = 1000;
  state.dayStart.money = 1000;
  const sim = new Simulation(state);
  sim.dispatch({ type: 'hire', candidateId: 'dung' });
  sim.dispatch({ type: 'setShifts', workerId: 'w-dung', shifts: ['morning', 'afternoon'] });
  sim.dispatch({ type: 'assignCounter', counterId: 'counter-1', workerId: 'w-dung' });
  const s = mutable(sim);
  s.workers['w-dung']!.traits = [...traits, 'ironman'];
  return { sim, s };
}

describe('ứng viên hằng ngày', () => {
  it('mỗi ngày 3 ứng viên, tất định theo seed; ô khoá được giữ, ô khác thay mới', () => {
    const a = Simulation.create(42);
    const b = Simulation.create(42);
    expect(a.snapshot.recruits).toHaveLength(3);
    expect(a.snapshot.recruits).toEqual(b.snapshot.recruits);

    const kept = a.snapshot.recruits[1]!;
    expect(a.dispatch({ type: 'lockRecruit', slot: 1, locked: true }).ok).toBe(true);
    const others = [a.snapshot.recruits[0]!.id, a.snapshot.recruits[2]!.id];
    runFor(a, a.snapshot.config.dayMs);
    expect(a.snapshot.day).toBe(2);
    expect(a.snapshot.recruits[1]).toEqual({ ...kept, locked: true });
    expect(others).not.toContain(a.snapshot.recruits[0]!.id);
    expect(others).not.toContain(a.snapshot.recruits[2]!.id);
  });

  it('làm mới có trả phí, một lần mỗi ngày, giữ ô khoá', () => {
    const sim = Simulation.create(5);
    const s = mutable(sim);
    s.money = 100;
    sim.dispatch({ type: 'lockRecruit', slot: 0, locked: true });
    const locked = s.recruits[0];
    const before = s.recruits[2]!.id;
    expect(sim.dispatch({ type: 'rerollRecruits' }).ok).toBe(true);
    expect(s.money).toBe(100 - s.config.recruitRerollCost);
    expect(s.recruits[0]).toBe(locked);
    expect(s.recruits[2]!.id).not.toBe(before);
    expect(sim.dispatch({ type: 'rerollRecruits' })).toEqual({ ok: false, reason: 'reroll-used' });
  });

  it('độ hiếm theo trọng số; chỉ Hiếm/Huyền thoại có đặc điểm ẩn; không có cặp đặc điểm mâu thuẫn', () => {
    const r = createStream(7, 'staff');
    const counts: Record<Rarity, number> = { common: 0, good: 0, rare: 0, legendary: 0 };
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const recruit = generateRecruit(r, `t${i}`);
      counts[recruit.rarity]++;
      if (recruit.rarity === 'common' || recruit.rarity === 'good') expect(recruit.hiddenTraits).toEqual([]);
      else expect(recruit.hiddenTraits.length).toBeGreaterThan(0);
      const all = [...recruit.traits, ...recruit.hiddenTraits];
      expect(new Set(all).size).toBe(all.length);
      expect(all.includes('sharp-memory') && all.includes('slow-learner')).toBe(false);
      expect(recruit.wage).toBeGreaterThanOrEqual(4);
      expect(recruit.name.split(' ')).toHaveLength(3);
    }
    for (const rarity of Object.keys(counts) as Rarity[]) {
      expect(Math.abs(counts[rarity] / n - RARITIES[rarity].weight / 100)).toBeLessThan(0.02);
    }
  });
});

describe('đặc điểm', () => {
  it('đặc điểm ẩn lộ ra khi hết ca làm đầu tiên', () => {
    const { sim, s } = withTraits(3, []);
    s.workers['w-dung']!.hiddenTraits = ['sticky-fingers'];
    const events: SimEvent[] = [];
    runFor(sim, s.config.dayMs / 2 + 200, () => events.push(...sim.drainEvents()));
    expect(s.workers['w-dung']!.hiddenTraits).toEqual([]);
    expect(s.workers['w-dung']!.traits).toContain('sticky-fingers');
    expect(events.some((e) => e.type === 'traitRevealed' && e.workerId === 'w-dung')).toBe(true);
  });

  it('"Thần tài" có tiền boa (tính vào doanh thu); "Cầm nhầm tiền két" làm két thiếu và trừ vào lãi ròng', () => {
    const { sim, s } = withTraits(4, ['lucky', 'sticky-fingers']);
    runFor(sim, s.config.dayMs + 200);
    const report = s.dayReports[0]!;
    expect(report.tips).toBeGreaterThan(0);
    expect(report.pilfered).toBeGreaterThan(0);
    expect(report.netProfit).toBe(
      report.revenue - report.costOfSales - report.wages - report.vouchers - report.expiredCost - report.pilfered,
    );
    expect(report.profit).toBe(report.revenue - report.stockCost - report.wages - report.investments - report.pilfered);
  });

  it('"Hay đi trễ" chưa tới thì chưa phục vụ được', () => {
    const { sim, s } = withTraits(5, ['late']);
    runFor(sim, s.config.dayMs / 2 - (s.timeMs - s.dayStartedAtMs) + 100);
    const worker = s.workers['w-dung']!;
    expect(worker.arrivesAtMs).toBeGreaterThan(s.timeMs);
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    s.customers.cx = {
      id: 'cx',
      archetypeId: 'curious',
      requestId: 'named-mask',
      look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
      phase: 'counter',
      arrivedAtMs: s.timeMs,
      servedAtMs: null,
      patienceMs: 60000,
      patienceMaxMs: 60000,
      expression: 'neutral',
      emoteUntilMs: 0,
      orderId: null,
      outcome: null,
      leaveAtMs: 0,
      loyaltyId: null,
    };
    s.counters[0]!.customerId = 'cx';
    expect(sim.dispatch({ type: 'startService', workerId: 'w-dung', customerId: 'cx' })).toEqual({
      ok: false,
      reason: 'worker-not-arrived',
    });
    runFor(sim, 7000);
    expect(s.customers.cx?.orderId ?? s.customers.cx?.outcome).toBeTruthy();
  });

  it('"Nóng tính" làm khách kém hài lòng, "Dẻo miệng" làm khách vui hơn', () => {
    const base = {
      archetype: ARCHETYPES.curious,
      outcome: 'bought' as const,
      served: true,
      queueWaitMs: 1000,
      serviceMs: 3000,
      patienceRatio: 0.8,
      wrongCount: 0,
      price: 12,
      referencePrice: 12,
    };
    const plain = evaluateSatisfaction({ ...base, server: { communication: 0.7, traits: [] } });
    const rude = evaluateSatisfaction({ ...base, server: { communication: 0.7, traits: ['hot-tempered'] } });
    const sweet = evaluateSatisfaction({ ...base, server: { communication: 0.7, traits: ['silver-tongue'] } });
    expect(rude.satisfaction).toBeLessThan(plain.satisfaction);
    expect(rude.reasons).toContain('rude-staff');
    expect(sweet.satisfaction).toBeGreaterThan(plain.satisfaction);
    expect(TRAITS['hot-tempered'].tone).toBe('bad');
  });
});

describe('tay nghề và mệt mỏi', () => {
  it('bán đúng tăng kinh nghiệm và lên cấp', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(LEVEL_XP[1])).toBe(2);
    expect(levelFor(10_000)).toBe(LEVEL_XP.length);
    const { sim, s } = withTraits(6, []);
    const events: SimEvent[] = [];
    runFor(sim, 200_000, () => events.push(...sim.drainEvents()));
    const worker = s.workers['w-dung']!;
    expect(worker.xp).toBe(worker.served);
    expect(worker.level).toBe(levelFor(worker.xp));
    expect(worker.level).toBeGreaterThan(1);
    expect(events.some((e) => e.type === 'staffLevelUp')).toBe(true);
  });

  it('ép làm hai ca liên tục thì xin nghỉ; tăng lương giữ chân được, để quá một ngày thì nghỉ hẳn', () => {
    const state = createInitialState(8);
    state.money = 2000;
    state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    const sim = new Simulation(state);
    sim.dispatch({ type: 'hire', candidateId: 'binh' });
    sim.dispatch({ type: 'setShifts', workerId: 'w-binh', shifts: ['morning', 'afternoon'] });
    const s = mutable(sim);
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    const events: SimEvent[] = [];
    const run = (days: number) => {
      for (let d = 0; d < days; d++) {
        runFor(sim, s.config.dayMs);
        events.push(...sim.drainEvents());
        s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
      }
    };
    run(3);
    expect(s.workers['w-binh']!.resigning).toBe(true);
    expect(events.some((e) => e.type === 'resignationRequested')).toBe(true);

    expect(sim.dispatch({ type: 'retainStaff', workerId: 'w-binh' }).ok).toBe(true);
    expect(s.workers['w-binh']!.wage).toBe(7);
    expect(s.workers['w-binh']!.fatigue).toBe(30);
    expect(sim.dispatch({ type: 'retainStaff', workerId: 'w-binh' })).toEqual({ ok: false, reason: 'not-resigning' });

    // Mệt 30 → 65 → 100: sau hai ngày ca kép lại xin nghỉ; không giữ chân thì hết ngày sau nghỉ hẳn.
    run(2);
    expect(s.workers['w-binh']!.resigning).toBe(true);
    run(1);
    expect(s.workers['w-binh']).toBeUndefined();
    expect(events.some((e) => e.type === 'staffQuit')).toBe(true);
    expect(s.counters[0]!.operatorId).toBe('w-player');
  });

  it('làm một ca mỗi ngày thì không mệt thêm', () => {
    const sim = Simulation.create(9);
    const s = mutable(sim);
    s.money = 500;
    sim.dispatch({ type: 'hire', candidateId: 'chi' });
    runFor(sim, s.config.dayMs * 4, (x) => autoPlay(x));
    expect(s.workers['w-chi']!.fatigue).toBe(0);
    expect(s.workers['w-chi']!.resigning).toBe(false);
  });
});
