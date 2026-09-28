import { PRODUCTS } from './content/products';
import { REQUESTS } from './content/requests';
import { STAFF_CANDIDATES } from './content/staff';
import type { ProductId, UpgradeEffect } from './content/types';
import { UPGRADES } from './content/upgrades';
import { COMPLAINT_RESPONSES, type ComplaintResponse } from './content/reviews';
import { effectiveSpeed, priceBounds } from './economy';
import { resolveComplaint } from './reputation';
import type { Emit } from './events';
import { dismissCustomer, newId, PLAYER_WORKER_ID, workerFromCandidate } from './state';
import { addStock, takeStock } from './stock';
import { facilityLevel, isProductUnlocked, playerLevel, stockUnitCost } from './progression';
import type { Order, SimState } from './types';

/**
 * Lệnh là cách DUY NHẤT để thay đổi state từ bên ngoài. Người chơi và NPC gửi cùng loại lệnh
 * và đi qua cùng một bộ kiểm tra, nên đổi người điều khiển không nhân đôi logic nghiệp vụ.
 */
export type Command =
  | { type: 'startService'; workerId: string; customerId: string }
  | { type: 'pickProduct'; workerId: string; orderId: string; productId: ProductId }
  | { type: 'refer'; workerId: string; orderId: string }
  | { type: 'checkout'; workerId: string; orderId: string }
  | { type: 'restock'; productId: ProductId; workerId?: string }
  | { type: 'hire'; candidateId: string }
  | { type: 'assignCounter'; counterId: string; workerId: string }
  | { type: 'buyUpgrade'; upgradeId: string }
  | { type: 'respondComplaint'; complaintId: string; response: ComplaintResponse }
  | { type: 'setPrice'; productId: ProductId; price: number }
  | { type: 'dismissStaff'; workerId: string };

export type RejectReason =
  | 'unknown-worker'
  | 'worker-busy'
  | 'unknown-customer'
  | 'customer-not-at-counter'
  | 'customer-already-served'
  | 'counter-assigned-elsewhere'
  | 'unknown-order'
  | 'not-your-order'
  | 'invalid-order-state'
  | 'unknown-product'
  | 'out-of-stock'
  | 'safety-referral-required'
  | 'insufficient-funds'
  | 'shelf-full'
  | 'unknown-candidate'
  | 'already-hired'
  | 'staff-full'
  | 'unknown-counter'
  | 'unknown-upgrade'
  | 'already-owned'
  | 'level-locked'
  | 'product-locked'
  | 'previous-level-required'
  | 'unknown-complaint'
  | 'complaint-closed'
  | 'price-out-of-range'
  | 'cannot-dismiss-player';

export type CommandResult = { ok: true } | { ok: false; reason: RejectReason };

const OK: CommandResult = { ok: true };
const reject = (reason: RejectReason): CommandResult => ({ ok: false, reason });

export function applyCommand(state: SimState, command: Command, emit: Emit): CommandResult {
  switch (command.type) {
    case 'startService':
      return startService(state, command.workerId, command.customerId, emit);
    case 'pickProduct':
      return pickProduct(state, command.workerId, command.orderId, command.productId, emit);
    case 'refer':
      return refer(state, command.workerId, command.orderId);
    case 'checkout':
      return checkout(state, command.workerId, command.orderId);
    case 'restock':
      return restock(state, command.productId, command.workerId ?? null, emit);
    case 'hire':
      return hire(state, command.candidateId, emit);
    case 'assignCounter':
      return assignCounter(state, command.counterId, command.workerId, emit);
    case 'buyUpgrade':
      return buyUpgrade(state, command.upgradeId, emit);
    case 'respondComplaint':
      return respondComplaint(state, command.complaintId, command.response, emit);
    case 'setPrice':
      return setPrice(state, command.productId, command.price, emit);
    case 'dismissStaff':
      return dismissStaff(state, command.workerId, emit);
  }
}

/** Đơn phải tồn tại và thuộc đúng nhân viên gửi lệnh (không ai làm thay đơn của người khác). */
function ownedOrder(state: SimState, workerId: string, orderId: string): Order | RejectReason {
  const order = state.orders[orderId];
  if (!order) return 'unknown-order';
  if (order.workerId !== workerId) return 'not-your-order';
  return order;
}

function startService(state: SimState, workerId: string, customerId: string, emit: Emit): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject('unknown-worker');
  if (worker.orderId || worker.task) return reject('worker-busy');
  const customer = state.customers[customerId];
  if (!customer) return reject('unknown-customer');
  const counter = state.counters.find((c) => c.customerId === customerId);
  if (customer.phase !== 'counter' || !counter) return reject('customer-not-at-counter');
  if (customer.orderId) return reject('customer-already-served');
  if (counter.operatorId !== workerId) return reject('counter-assigned-elsewhere');

  const orderId = newId(state, 'o');
  state.orders[orderId] = {
    id: orderId,
    customerId,
    workerId,
    requestId: customer.requestId,
    state: 'deciding',
    productId: null,
    productExpiresAtMs: null,
    timerMs: 0,
    timerTotalMs: 0,
    facts: [],
    rejectedProductIds: [],
    price: null,
  };
  worker.orderId = orderId;
  worker.thinkUntilMs = 0;
  customer.orderId = orderId;
  customer.servedAtMs ??= state.timeMs;
  emit({ type: 'serviceStarted', orderId, workerId, customerId });
  return OK;
}

function pickProduct(state: SimState, workerId: string, orderId: string, productId: ProductId, emit: Emit): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === 'string') return reject(order);
  if (order.state !== 'deciding') return reject('invalid-order-state');
  const product = PRODUCTS[productId];
  if (!product) return reject('unknown-product');

  // Quy tắc an toàn: khách mô tả triệu chứng thì không được bán, dù là người chơi hay NPC.
  // Lệnh bị từ chối nhưng vẫn được ghi lại để tính hiệu suất và giải thích cho người chơi.
  const request = REQUESTS[order.requestId];
  if (request?.kind === 'refer') {
    order.facts.push('safety-warning');
    state.stats.safetyWarnings += 1;
    const worker = state.workers[order.workerId];
    if (worker) {
      worker.expression = 'worried';
      worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    }
    emit({ type: 'safetyWarning', orderId, productId, customerId: order.customerId, workerId: order.workerId });
    return reject('safety-referral-required');
  }

  if (!isProductUnlocked(state, productId)) return reject('product-locked');

  const entry = state.stock[productId];
  if (entry.shelf <= 0) return reject('out-of-stock');

  const expiresAtMs = takeStock(entry);
  if (expiresAtMs === null) return reject('out-of-stock');
  order.productId = productId;
  order.productExpiresAtMs = expiresAtMs;
  order.state = 'retrieving';
  order.timerTotalMs = order.timerMs = Math.round(state.config.retrieveMs / workerSpeed(state, order.workerId));
  emit({ type: 'productPicked', orderId, productId });
  return OK;
}

function refer(state: SimState, workerId: string, orderId: string): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === 'string') return reject(order);
  if (order.state !== 'deciding') return reject('invalid-order-state');
  order.state = 'referring';
  order.timerTotalMs = order.timerMs = state.config.referMs;
  return OK;
}

function checkout(state: SimState, workerId: string, orderId: string): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === 'string') return reject(order);
  if (order.state !== 'ready' || !order.productId) return reject('invalid-order-state');
  if (order.productExpiresAtMs !== null && order.productExpiresAtMs <= state.timeMs) return reject('out-of-stock');
  if (!REQUESTS[order.requestId]?.acceptable.includes(order.productId)) return reject('invalid-order-state');
  order.state = 'checkingOut';
  order.timerTotalMs = order.timerMs = Math.round(state.config.checkoutMs / workerSpeed(state, order.workerId));
  return OK;
}

function restock(state: SimState, productId: ProductId, workerId: string | null, emit: Emit): CommandResult {
  const product = PRODUCTS[productId];
  if (!product) return reject('unknown-product');
  if (!isProductUnlocked(state, productId)) return reject('product-locked');
  const entry = state.stock[productId];
  const missing = entry.capacity - entry.shelf;
  if (missing <= 0) return reject('shelf-full');
  // Mua tối đa số lượng đủ tiền; tổng tài sản (tiền + hàng) không giảm nên không thể kẹt vốn.
  const unitCost = stockUnitCost(state, productId);
  const qty = Math.min(missing, Math.floor(state.money / unitCost));
  if (qty <= 0) return reject('insufficient-funds');
  const cost = qty * unitCost;
  state.money -= cost;
  addStock(entry, qty, state.timeMs + state.config.stockShelfLifeMs);
  state.stats.spentOnStock += cost;
  emit({ type: 'restocked', productId, qty, cost, workerId });
  return OK;
}

function hire(state: SimState, candidateId: string, emit: Emit): CommandResult {
  const candidate = STAFF_CANDIDATES[candidateId];
  if (!candidate) return reject('unknown-candidate');
  const worker = workerFromCandidate(candidate);
  if (state.workers[worker.id]) return reject('already-hired');
  const staffCount = Object.values(state.workers).filter((w) => w.controller === 'ai').length;
  if (staffCount >= state.config.maxStaff) return reject('staff-full');
  if (state.money < candidate.hireCost) return reject('insufficient-funds');
  state.money -= candidate.hireCost;
  state.stats.spentOnStaff += candidate.hireCost;
  state.workers[worker.id] = worker;
  emit({ type: 'staffHired', workerId: worker.id, cost: candidate.hireCost });
  return OK;
}

function assignCounter(state: SimState, counterId: string, workerId: string, emit: Emit): CommandResult {
  const counter = state.counters.find((c) => c.id === counterId);
  if (!counter) return reject('unknown-counter');
  if (!state.workers[workerId]) return reject('unknown-worker');
  // Đơn đang làm dở vẫn do người cũ hoàn tất; người mới nhận từ khách tiếp theo.
  counter.operatorId = workerId;
  emit({ type: 'counterAssigned', counterId, workerId });
  return OK;
}

function buyUpgrade(state: SimState, upgradeId: string, emit: Emit): CommandResult {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return reject('unknown-upgrade');
  if (state.upgrades.includes(upgradeId)) return reject('already-owned');
  const levelMatch = /^(warehouse|storefront|scanner|sorted-shelf|wide-shelf|bench|signboard)-(\d+)$/.exec(upgradeId);
  if (levelMatch) {
    const base = levelMatch[1]!;
    const target = Number(levelMatch[2]);
    const current = base === 'warehouse' || base === 'storefront'
      ? facilityLevel(state, base)
      : state.upgrades.filter((id) => id === base || id.startsWith(`${base}-`)).length;
    if (current !== target - 1) return reject('previous-level-required');
    if (playerLevel(state) < target) return reject('level-locked');
  }
  if (state.money < upgrade.cost) return reject('insufficient-funds');
  state.money -= upgrade.cost;
  state.stats.spentOnUpgrades += upgrade.cost;
  state.upgrades.push(upgradeId);
  for (const effect of upgrade.effects) applyEffect(state, effect);
  emit({ type: 'upgradeBought', upgradeId, cost: upgrade.cost });
  return OK;
}

function respondComplaint(state: SimState, complaintId: string, response: ComplaintResponse, emit: Emit): CommandResult {
  const complaint = state.complaints.find((c) => c.id === complaintId);
  if (!complaint) return reject('unknown-complaint');
  if (complaint.status !== 'open') return reject('complaint-closed');
  if (!COMPLAINT_RESPONSES[response]) return reject('unknown-complaint');
  if (response === 'voucher') {
    const cost = state.config.reputation.voucherCost;
    if (state.money < cost) return reject('insufficient-funds');
    state.money -= cost;
    state.stats.spentOnVouchers += cost;
  }
  resolveComplaint(state, complaint, response, emit);
  return OK;
}

function setPrice(state: SimState, productId: ProductId, price: number, emit: Emit): CommandResult {
  if (!PRODUCTS[productId]) return reject('unknown-product');
  if (!isProductUnlocked(state, productId)) return reject('product-locked');
  const { min, max } = priceBounds(state, productId);
  if (!Number.isInteger(price) || price < min || price > max) return reject('price-out-of-range');
  state.prices[productId] = price;
  emit({ type: 'priceChanged', productId, price });
  return OK;
}

/**
 * Cho nhân viên nghỉ: phải trả hết lương còn nợ trước (không có đường tắt né lương),
 * và chỉ khi người đó không đang phục vụ dở một khách. Quầy họ đứng giao lại cho người chơi.
 */
function dismissStaff(state: SimState, workerId: string, emit: Emit): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject('unknown-worker');
  if (worker.controller === 'player' || workerId === PLAYER_WORKER_ID) return reject('cannot-dismiss-player');
  if (worker.orderId) return reject('worker-busy');
  if (state.money < worker.wageOwed) return reject('insufficient-funds');
  state.money -= worker.wageOwed;
  state.stats.spentOnWages += worker.wageOwed;
  for (const counter of state.counters) {
    if (counter.operatorId === workerId) {
      counter.operatorId = PLAYER_WORKER_ID;
      emit({ type: 'counterAssigned', counterId: counter.id, workerId: PLAYER_WORKER_ID });
    }
  }
  // Việc bổ sung kệ dở dang chưa trừ tiền nên huỷ không mất gì.
  delete state.workers[workerId];
  emit({ type: 'staffDismissed', workerId, name: worker.name });
  return OK;
}

function workerSpeed(state: SimState, workerId: string): number {
  const worker = state.workers[workerId];
  return worker ? effectiveSpeed(worker, state.config.owedWageSpeedFactor) : 1;
}

function applyEffect(state: SimState, effect: UpgradeEffect): void {
  const config = state.config;
  switch (effect.type) {
    case 'catalog':
      // Quyền nhập/trưng bày được tính từ danh sách nâng cấp trong progression.ts.
      break;
    case 'scale':
      config[effect.key] = Math.round(config[effect.key] * effect.factor);
      break;
    case 'shelfCapacity':
      for (const entry of Object.values(state.stock)) entry.capacity += effect.add;
      break;
    case 'queue':
      config.maxQueue += effect.addMax;
      config.patienceRate.queue *= effect.patienceFactor;
      break;
    case 'spawnInterval':
      config.spawnIntervalMs = [
        Math.round(config.spawnIntervalMs[0] * effect.factor),
        Math.round(config.spawnIntervalMs[1] * effect.factor),
      ];
      break;
  }
}

/** Hoàn tất bán hàng: kiểm tra lại và ghi sổ trong một bước (nguyên tử). */
export function completeSale(state: SimState, orderId: string, emit: Emit): void {
  const order = state.orders[orderId];
  if (!order?.productId) return;
  const customer = state.customers[order.customerId];
  if (!customer) return;
  const productId = order.productId;
  const amount = state.prices[productId];
  order.price = amount;
  state.money += amount;
  state.stats.sales += 1;
  state.stats.revenue += amount;
  order.state = 'done';
  order.facts.push('correct-item');
  const worker = state.workers[order.workerId];
  if (worker) {
    worker.served += 1;
    worker.expression = 'happy';
    worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
  }
  emit({ type: 'saleCompleted', orderId, productId, amount, customerId: customer.id, workerId: order.workerId });
  dismissCustomer(state, customer, 'bought', emit);
}
