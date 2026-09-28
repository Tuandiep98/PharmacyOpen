import { aiTick } from './ai';
import { completeSale } from './commands';
import { ARCHETYPE_IDS, ARCHETYPES } from './content/archetypes';
import { REQUESTS } from './content/requests';
import type { Emit } from './events';
import { LOOK_VARIANTS } from './looks';
import { endDayIfDue } from './economy';
import { demandMultiplier } from './reputation';
import { nextInt, pickWeighted } from './rng';
import { dismissCustomer, newId, returnReservedStock } from './state';
import type { Customer, Order, SimState } from './types';

/** Tiến mô phỏng đúng một bước cố định `config.tickMs`. */
export function tick(state: SimState, emit: Emit): void {
  const dt = state.config.tickMs;
  state.tick += 1;
  state.timeMs += dt;

  for (const order of Object.values(state.orders)) advanceOrder(state, order, dt, emit);
  for (const customer of Object.values(state.customers)) advanceCustomer(state, customer, dt, emit);
  fillCounters(state, emit);
  aiTick(state, emit);
  maybeSpawn(state, emit);

  for (const worker of Object.values(state.workers)) {
    if (state.timeMs >= worker.emoteUntilMs) worker.expression = worker.orderId || worker.task ? 'focused' : 'neutral';
  }

  endDayIfDue(state, emit);
}

function advanceOrder(state: SimState, order: Order, dt: number, emit: Emit): void {
  if (order.state !== 'retrieving' && order.state !== 'checkingOut' && order.state !== 'referring') return;
  order.timerMs = Math.max(0, order.timerMs - dt);
  if (order.timerMs > 0) return;

  const customer = state.customers[order.customerId];
  if (!customer) return;
  const request = REQUESTS[order.requestId];

  if (order.state === 'retrieving') {
    const productId = order.productId;
    if (!productId) return;
    if (request?.acceptable.includes(productId)) {
      order.state = 'ready';
      emit({ type: 'productReady', orderId: order.id, productId });
      return;
    }
    // Khách xem hàng và từ chối: trả hàng về kệ, quay lại bước chọn.
    order.facts.push('wrong-item');
    order.rejectedProductIds.push(productId);
    state.stats.wrongItems += 1;
    returnReservedStock(state, order.id);
    order.state = 'deciding';
    customer.patienceMs = Math.max(0, customer.patienceMs - customer.patienceMaxMs * state.config.wrongItemPenalty);
    customer.expression = 'confused';
    customer.emoteUntilMs = state.timeMs + state.config.emoteMs;
    const worker = state.workers[order.workerId];
    if (worker) {
      worker.expression = 'worried';
      worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    }
    emit({ type: 'wrongProduct', orderId: order.id, productId, customerId: customer.id });
    return;
  }

  if (order.state === 'checkingOut') {
    completeSale(state, order.id, emit);
    return;
  }

  const appropriate = request?.kind === 'refer';
  order.facts.push(appropriate ? 'appropriate-referral' : 'unnecessary-referral');
  if (appropriate) state.stats.referrals += 1;
  order.state = 'done';
  emit({ type: 'referralCompleted', orderId: order.id, customerId: customer.id, appropriate });
  dismissCustomer(state, customer, appropriate ? 'referred' : 'left-unserved', emit);
}

function advanceCustomer(state: SimState, customer: Customer, dt: number, emit: Emit): void {
  if (customer.phase === 'leaving') {
    if (state.timeMs >= customer.leaveAtMs) delete state.customers[customer.id];
    return;
  }

  const order = customer.orderId ? state.orders[customer.orderId] : undefined;
  const { patienceRate } = state.config;
  const baseRate =
    customer.phase === 'queue'
      ? patienceRate.queue
      : order && (order.state === 'retrieving' || order.state === 'checkingOut' || order.state === 'referring')
        ? patienceRate.working
        : patienceRate.deciding;
  // Nhân viên giao tiếp tốt giúp khách đang được phục vụ bớt sốt ruột (0.75×–1.25×).
  const server = order ? state.workers[order.workerId] : undefined;
  const rate = server ? baseRate * (1.25 - 0.5 * server.communication) : baseRate;
  customer.patienceMs = Math.max(0, customer.patienceMs - dt * rate);

  if (customer.patienceMs <= 0) {
    if (order) {
      returnReservedStock(state, order.id);
      order.facts.push('customer-left');
      order.state = 'cancelled';
    }
    state.stats.leftAngry += 1;
    emit({ type: 'customerLeft', customerId: customer.id, reason: 'angry' });
    dismissCustomer(state, customer, 'left-angry', emit);
    return;
  }

  if (state.timeMs < customer.emoteUntilMs) return;
  const ratio = customer.patienceMs / customer.patienceMaxMs;
  const request = REQUESTS[customer.requestId];
  if (ratio < 0.25) customer.expression = 'angry';
  else if (request?.kind === 'refer') customer.expression = 'unwell';
  else if (ratio < 0.5) customer.expression = 'impatient';
  else if (request?.kind === 'need' && customer.phase === 'counter' && order?.state === 'deciding') customer.expression = 'thinking';
  else customer.expression = 'neutral';
}

function fillCounters(state: SimState, emit: Emit): void {
  for (const counter of state.counters) {
    if (counter.customerId) continue;
    const nextId = state.queue.shift();
    if (!nextId) return;
    const customer = state.customers[nextId];
    if (!customer) continue;
    customer.phase = 'counter';
    counter.customerId = nextId;
    emit({ type: 'customerAtCounter', customerId: nextId, counterId: counter.id });
  }
}

function maybeSpawn(state: SimState, emit: Emit): void {
  if (state.timeMs < state.nextSpawnAtMs) return;
  const [min, max] = state.config.spawnIntervalMs;
  // Danh tiếng tác động lên lượng khách ghé (có trần/sàn), không lên giá trị mỗi đơn.
  state.nextSpawnAtMs = state.timeMs + Math.round(nextInt(state.rng.spawn, min, max) / demandMultiplier(state));
  // Hàng đầy thì khách bỏ đi từ ngoài cửa: mất một lượt khách, UI cảnh báo để người chơi mở rộng.
  if (state.queue.length >= state.config.maxQueue) {
    state.stats.turnedAway += 1;
    emit({ type: 'customerTurnedAway' });
    return;
  }

  const rng = state.rng.customer;
  const archetype = ARCHETYPES[pickWeighted(rng, ARCHETYPE_IDS.map((id) => [id, ARCHETYPES[id].spawnWeight] as const))];
  const requestId = pickWeighted(
    rng,
    Object.entries(archetype.requestWeights).map(([id, w]) => [id, w ?? 0] as const),
  );
  const patience = nextInt(rng, archetype.patienceMs[0], archetype.patienceMs[1]);
  const id = newId(state, 'c');
  state.customers[id] = {
    id,
    archetypeId: archetype.id,
    requestId,
    look: {
      skin: nextInt(rng, 0, LOOK_VARIANTS.skin - 1),
      hair: nextInt(rng, 0, LOOK_VARIANTS.hair - 1),
      hairStyle: nextInt(rng, 0, LOOK_VARIANTS.hairStyle - 1),
      outfit: nextInt(rng, 0, LOOK_VARIANTS.outfit - 1),
    },
    phase: 'queue',
    arrivedAtMs: state.timeMs,
    servedAtMs: null,
    patienceMs: patience,
    patienceMaxMs: patience,
    expression: 'neutral',
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
  };
  state.queue.push(id);
  state.stats.customersArrived += 1;
  emit({ type: 'customerArrived', customerId: id });
}
