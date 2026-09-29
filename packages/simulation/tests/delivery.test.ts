import { describe, expect, it } from 'vitest';
import { createInitialState, createSave, loadSave, Simulation, type Customer, type SimEvent, type SimState } from '../src';
import { runFor } from './helpers';

const mutable = (sim: Simulation) => sim.snapshot as SimState;

/** Tiệm tắt khách và đơn ngẫu nhiên để dựng tình huống bằng tay. */
function quietStore(seed = 1) {
  const state = createInitialState(seed);
  state.money = 1000;
  state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
  state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
  const sim = new Simulation(state);
  return { sim, s: mutable(sim) };
}

function customerAtCounter(s: SimState, requestId: string, archetypeId: Customer['archetypeId'] = 'curious'): string {
  s.customers.cx = {
    id: 'cx',
    archetypeId,
    requestId,
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    phase: 'counter',
    arrivedAtMs: s.timeMs,
    servedAtMs: null,
    patienceMs: 60_000,
    patienceMaxMs: 60_000,
    expression: 'neutral',
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
    loyaltyId: null,
  };
  s.counters[0]!.customerId = 'cx';
  return 'cx';
}

function emptyShelf(s: SimState, id: 'mask' | 'bandage') {
  s.stock[id].shelf = 0;
  s.stock[id].batches = [];
}

/** Người chơi mở lượt phục vụ rồi báo hết hàng, chờ khách quyết định. */
function deferAtCounter(sim: Simulation, s: SimState) {
  expect(sim.dispatch({ type: 'startService', workerId: 'w-player', customerId: 'cx' }).ok).toBe(true);
  const orderId = s.customers.cx!.orderId!;
  expect(sim.dispatch({ type: 'deferOrder', workerId: 'w-player', orderId }).ok).toBe(true);
  const events: SimEvent[] = [];
  runFor(sim, s.config.referMs + 200, () => events.push(...sim.drainEvents()));
  events.push(...sim.drainEvents());
  return events;
}

describe('báo tạm hết hàng', () => {
  it('hết hàng thật: khách chọn chờ đơn ship hoặc đi chỗ khác, tất định theo seed', () => {
    const outcomes = new Set<boolean>();
    for (let seed = 1; seed <= 12; seed++) {
      const { sim, s } = quietStore(seed);
      emptyShelf(s, 'mask');
      customerAtCounter(s, 'named-mask');
      const events = deferAtCounter(sim, s);
      const decided = events.find((e) => e.type === 'backorderDecided');
      expect(decided?.type === 'backorderDecided' && decided.needless).toBe(false);
      if (decided?.type !== 'backorderDecided') throw new Error('thiếu sự kiện');
      outcomes.add(decided.accepted);
      expect(s.customers.cx!.outcome).toBe(decided.accepted ? 'backordered' : 'went-elsewhere');
      expect(s.deliveries).toHaveLength(decided.accepted ? 1 : 0);
      if (decided.accepted) {
        expect(s.deliveries[0]).toMatchObject({ source: 'backorder', status: 'packing', items: [{ productId: 'mask', qty: 1, packed: [] }] });
        expect(s.stats.backorders).toBe(1);
      } else {
        expect(s.stats.wentElsewhere).toBe(1);
      }
    }
    expect(outcomes).toEqual(new Set([true, false]));
  });

  it('kệ vẫn còn hàng mà báo hết: khách bỏ đi, bị tính là từ chối vô lý', () => {
    const { sim, s } = quietStore(2);
    customerAtCounter(s, 'named-mask');
    const events = deferAtCounter(sim, s);
    expect(events.some((e) => e.type === 'backorderDecided' && e.needless)).toBe(true);
    expect(s.customers.cx!.outcome).toBe('left-unserved');
    expect(s.interactions.at(-1)?.performance).toBeLessThan(100);
    expect(s.deliveries).toHaveLength(0);
  });

  it('khách có triệu chứng: không được báo hết hàng để hẹn bán sau', () => {
    const { sim, s } = quietStore(3);
    customerAtCounter(s, 'refer-fever');
    sim.dispatch({ type: 'startService', workerId: 'w-player', customerId: 'cx' });
    const orderId = s.customers.cx!.orderId!;
    expect(sim.dispatch({ type: 'deferOrder', workerId: 'w-player', orderId })).toEqual({ ok: false, reason: 'safety-referral-required' });
    expect(s.stats.safetyWarnings).toBe(1);
  });
});

describe('đơn ship', () => {
  function withOrder(seed = 4, qty = 2) {
    const q = quietStore(seed);
    q.s.deliveries.push({
      id: 'd1',
      source: 'online',
      archetypeId: 'careful',
      items: [{ productId: 'mask', qty, packed: [] }],
      createdAtMs: q.s.timeMs,
      dueDay: q.s.day,
      dueAtMs: q.s.dayStartedAtMs + q.s.config.dayMs - q.s.config.closingMs,
      status: 'packing',
      price: null,
      pickupAtMs: null,
      deliverAtMs: null,
      handledBy: [],
    });
    return q;
  }

  it('gói từng món lấy từ kệ, ghi phiếu gửi, shipper lấy rồi giao: thu tiền khi giao', () => {
    const { sim, s } = withOrder();
    const shelf = s.stock.mask.shelf;
    expect(sim.dispatch({ type: 'sendDelivery', deliveryId: 'd1' })).toEqual({ ok: false, reason: 'delivery-not-packed' });
    expect(sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' }).ok).toBe(true);
    expect(s.deliveries[0]!.status).toBe('packing');
    expect(sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' }).ok).toBe(true);
    expect(s.deliveries[0]!.status).toBe('packed');
    expect(s.stock.mask.shelf).toBe(shelf - 2);
    expect(sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' })).toEqual({ ok: false, reason: 'delivery-not-packing' });

    const money = s.money;
    expect(sim.dispatch({ type: 'sendDelivery', deliveryId: 'd1' }).ok).toBe(true);
    expect(s.deliveries[0]).toMatchObject({ status: 'awaiting-pickup', price: s.prices.mask * 2 });
    expect(sim.dispatch({ type: 'cancelDelivery', deliveryId: 'd1' })).toEqual({ ok: false, reason: 'delivery-already-sent' });
    const events: SimEvent[] = [];
    runFor(sim, s.config.shipperPickupMs + s.config.deliveryTransitMs + 200, () => events.push(...sim.drainEvents()));
    events.push(...sim.drainEvents());
    expect(events.some((e) => e.type === 'deliveryPickedUp')).toBe(true);
    expect(events.some((e) => e.type === 'deliveryCompleted' && !e.late && e.amount === s.prices.mask * 2)).toBe(true);
    expect(s.money).toBe(money + s.prices.mask * 2);
    expect(s.stats.deliveries).toBe(1);
    expect(s.deliveries).toHaveLength(0);
  });

  it('kệ hết món cần gói thì không gói được; huỷ đơn trả món đã gói về kệ', () => {
    const { sim, s } = withOrder(5);
    expect(sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' }).ok).toBe(true);
    emptyShelf(s, 'mask');
    expect(sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' })).toEqual({ ok: false, reason: 'out-of-stock' });
    expect(sim.dispatch({ type: 'cancelDelivery', deliveryId: 'd1' }).ok).toBe(true);
    expect(s.stock.mask.shelf).toBe(1);
    expect(s.stats.cancelledDeliveries).toBe(1);
  });

  it('giao sau giờ hẹn là trễ: khách chê và điểm tiệm giảm; quá hạn lâu chưa gửi thì bị huỷ', () => {
    const { sim, s } = withOrder(6, 1);
    const delivery = s.deliveries[0]!;
    delivery.dueAtMs = s.timeMs + 1000;
    sim.dispatch({ type: 'packDelivery', deliveryId: 'd1' });
    sim.dispatch({ type: 'sendDelivery', deliveryId: 'd1' });
    const events: SimEvent[] = [];
    runFor(sim, s.config.shipperPickupMs + s.config.deliveryTransitMs + 200, () => events.push(...sim.drainEvents()));
    expect(events.some((e) => e.type === 'deliveryCompleted' && e.late)).toBe(true);
    expect(s.stats.lateDeliveries).toBe(1);
    const review = s.reviews.at(-1);
    expect(review?.reasons).toContain('late-delivery');
    expect(review?.stars).toBeLessThanOrEqual(2);
    expect(review?.workerId).toBeNull();

    const { sim: sim2, s: s2 } = withOrder(7, 1);
    s2.deliveries[0]!.dueAtMs = s2.timeMs;
    const events2: SimEvent[] = [];
    runFor(sim2, s2.config.deliveryGraceMs + 200, () => events2.push(...sim2.drainEvents()));
    expect(events2.some((e) => e.type === 'deliveryCancelled' && e.reason === 'overdue')).toBe(true);
    expect(s2.deliveries).toHaveLength(0);
    expect(s2.reputation.histogram[0]).toBeGreaterThan(0);
  });

  it('nhân viên rảnh tay tự gói, ghi phiếu và gửi đơn', () => {
    const { sim } = withOrder(8, 2);
    sim.dispatch({ type: 'hire', candidateId: 'binh' });
    sim.dispatch({ type: 'assignStation', workerId: 'w-binh', station: 'support' });
    const events: SimEvent[] = [];
    runFor(sim, 35_000, () => events.push(...sim.drainEvents()));
    events.push(...sim.drainEvents());
    expect(events.filter((e) => e.type === 'deliveryItemPacked' && e.workerId === 'w-binh')).toHaveLength(2);
    expect(events.some((e) => e.type === 'deliverySent' && e.workerId === 'w-binh')).toBe(true);
    expect(events.some((e) => e.type === 'deliveryCompleted')).toBe(true);
  });

  it('nhân viên đứng quầy gặp món hết hàng mà không đủ xu nhập thì báo hết hàng thay vì để khách đợi', () => {
    const { sim, s } = quietStore(9);
    sim.dispatch({ type: 'hire', candidateId: 'binh' });
    sim.dispatch({ type: 'assignCounter', counterId: 'counter-1', workerId: 'w-binh' });
    emptyShelf(s, 'mask');
    s.money = 0;
    customerAtCounter(s, 'named-mask');
    const events: SimEvent[] = [];
    runFor(sim, 12_000, () => events.push(...sim.drainEvents()));
    expect(events.some((e) => e.type === 'backorderDecided' && !e.needless)).toBe(true);
    expect(s.customers.cx?.outcome ?? 'gone').not.toBe('left-angry');
  });
});

describe('đơn online rớt về theo tiến độ', () => {
  function countOnline(staff: number, seed: number): number {
    const state = createInitialState(seed);
    state.money = 5000;
    state.upgrades.push('storefront-2', 'storefront-3', 'counter-2', 'storefront-4');
    const sim = new Simulation(state);
    for (const id of ['binh', 'chi', 'dung'].slice(0, staff)) {
      sim.dispatch({ type: 'hire', candidateId: id });
      sim.dispatch({ type: 'setShifts', workerId: `w-${id}`, shifts: ['morning', 'afternoon'] });
      state.workers[`w-${id}`]!.traits.push('ironman');
    }
    let created = 0;
    runFor(sim, state.config.dayMs * 3, () => {
      for (const e of sim.drainEvents()) if (e.type === 'deliveryCreated' && e.source === 'online') created++;
    });
    return created;
  }

  it('tiệm chưa có nhân viên chỉ có vài đơn mỗi ngày; có nhân viên thì nhiều đơn hơn', () => {
    const alone = [1, 2, 3].map((seed) => countOnline(0, seed));
    const staffed = [1, 2, 3].map((seed) => countOnline(3, seed));
    const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
    for (const n of alone) expect(n).toBeLessThanOrEqual(9);
    expect(sum(alone)).toBeGreaterThan(0);
    expect(sum(staffed)).toBeGreaterThan(sum(alone));
  });

  it('đơn đang xử lý được lưu và tải lại', () => {
    const { sim, s } = quietStore(10);
    s.nextDeliveryAtMs = 0;
    runFor(sim, 200);
    expect(s.deliveries.length).toBe(1);
    sim.dispatch({ type: 'packDelivery', deliveryId: s.deliveries[0]!.id });
    const loaded = loadSave(createSave(s, 1));
    expect(loaded.ok && loaded.state.deliveries).toEqual(s.deliveries);
    const broken = createSave(s, 1);
    broken.state.deliveries[0]!.items[0]!.qty = 0;
    expect(loadSave(broken)).toEqual({ ok: false, error: 'corrupt' });
  });
});
