import { describe, expect, it } from 'vitest';
import { createInitialState, createSave, loadSave, PRODUCTS, SAVE_FORMAT, Simulation, type SimState } from '../src';
import { addStock, takeStock } from '../src/stock';
import { runFor } from './helpers';

describe('kho theo lô', () => {
  it('lấy hàng gần hết hạn trước và trả về đúng lô', () => {
    const s = createInitialState(1);
    const entry = s.stock.mask;
    entry.batches = [];
    entry.shelf = 0;
    addStock(entry, 2, 1000);
    addStock(entry, 3, 2000);
    expect(takeStock(entry)).toBe(1000);
    expect(entry.batches).toEqual([{ qty: 1, expiresAtMs: 1000 }, { qty: 3, expiresAtMs: 2000 }]);
    expect(entry.shelf).toBe(4);
  });

  it('thu hồi hàng hết hạn, không bán món đã quá hạn', () => {
    const s = createInitialState(2);
    s.config.stockShelfLifeMs = 1000;
    for (const entry of Object.values(s.stock)) for (const batch of entry.batches) batch.expiresAtMs = 1000;
    const sim = new Simulation(s);
    runFor(sim, 1000);
    expect(sim.snapshot.stats.expiredStock).toBe(Object.values(PRODUCTS).slice(0, 4).reduce((sum, p) => sum + p.shelfCapacity, 0));
    expect(Object.values(sim.snapshot.stock).every((e) => e.shelf === 0 && e.batches.length === 0)).toBe(true);
    expect(sim.drainEvents().some((e) => e.type === 'stockExpired')).toBe(true);
  });

  it('món đang được lấy mà hết hạn thì đơn quay lại bước chọn, không thu tiền', () => {
    const sim = Simulation.create(3);
    runFor(sim, 1700);
    const s = sim.snapshot as SimState;
    const customer = Object.values(s.customers).find((c) => c.phase === 'counter');
    expect(customer).toBeDefined();
    if (!customer) return;
    customer.requestId = 'named-mask';
    s.stock.mask.batches[0]!.expiresAtMs = s.timeMs + 500;
    expect(sim.dispatch({ type: 'startService', workerId: 'w-player', customerId: customer.id }).ok).toBe(true);
    const orderId = customer.orderId!;
    expect(sim.dispatch({ type: 'pickProduct', workerId: 'w-player', orderId, productId: 'mask' }).ok).toBe(true);
    runFor(sim, 500);
    expect(s.orders[orderId]?.state).toBe('deciding');
    expect(s.orders[orderId]?.productId).toBeNull();
    expect(s.stats.sales).toBe(0);
    expect(s.stats.expiredStock).toBeGreaterThan(0);
  });
});

describe('khách quen và lưu game v3', () => {
  it('khách quay lại giữ diện mạo, và save/load vẫn tất định', () => {
    const s = createInitialState(12);
    s.config.returningCustomerChance = 1;
    s.config.dayMs = 5000;
    s.money = 500;
    s.dayStart.money = 500;
    const sim = new Simulation(s);
    sim.dispatch({ type: 'hire', candidateId: 'dung' });
    sim.dispatch({ type: 'assignCounter', counterId: 'counter-1', workerId: 'w-dung' });
    runFor(sim, 80_000);
    expect(sim.snapshot.stats.returningCustomers).toBeGreaterThan(0);
    expect(sim.snapshot.loyalty.some((p) => p.visits > 1)).toBe(true);
    const save = createSave(sim.snapshot, 123);
    const loaded = loadSave(save);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const resumed = Simulation.fromState(loaded.state);
    runFor(sim, 30_000);
    runFor(resumed, 30_000);
    expect(resumed.serialize()).toEqual(sim.serialize());
  });

  it('nâng save v2 thành lô và từ chối tổng lô sai', () => {
    const old = createInitialState(4) as SimState;
    const raw = JSON.parse(JSON.stringify(old)) as Record<string, unknown>;
    delete raw.loyalty;
    const stock = raw.stock as Record<string, Record<string, unknown>>;
    for (const entry of Object.values(stock)) delete entry.batches;
    const stats = raw.stats as Record<string, unknown>;
    delete stats.expiredStock;
    delete stats.returningCustomers;
    raw.version = 2;
    const loaded = loadSave({ format: SAVE_FORMAT, version: 2, state: raw, savedAtWallMs: 7 });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.stock.mask.batches[0]?.qty).toBe(loaded.state.stock.mask.shelf);
    expect(loaded.state.config.offlineCapMs).toBe(600_000);
    loaded.state.stock.mask.batches[0]!.qty += 1;
    expect(loadSave(createSave(loaded.state, 8))).toEqual({ ok: false, error: 'corrupt' });
  });

  it('khiếu nại cũ tự đóng, đánh giá không bị sửa', () => {
    const state = createInitialState(5);
    state.config.dayMs = 1000;
    state.complaints.push({ id: 'k1', reviewId: 'r1', status: 'open', response: null, improved: false, atMs: 0 });
    state.reputation.starsSum = 2;
    state.reputation.count = 1;
    const sim = new Simulation(state);
    runFor(sim, 2000);
    expect(sim.snapshot.complaints[0]?.status).toBe('closed');
    expect(sim.snapshot.reputation.starsSum).toBe(2);
  });
});
