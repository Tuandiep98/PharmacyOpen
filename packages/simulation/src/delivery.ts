import { ARCHETYPE_IDS, ARCHETYPES } from './content/archetypes';
import { PRODUCTS } from './content/products';
import { REQUESTS } from './content/requests';
import type { ProductId } from './content/types';
import type { Emit } from './events';
import { isProductUnlocked, playerLevel, unlockedProducts } from './progression';
import { recordDelivery, demandMultiplier, type DeliveryResult } from './reputation';
import { nextFloat, nextInt, pickWeighted } from './rng';
import { dayElapsed, dayPhase, isPresent } from './shift';
import { dismissCustomer, newId } from './state';
import { returnUnits } from './stock';
import type { DeepReadonly, Delivery, DeliverySource, Order, SimState } from './types';

/*
 * Đơn ship (giao hàng tận nơi): đơn online rớt về trong giờ mở cửa, hoặc khách ở quầy gặp lúc hết hàng
 * và đồng ý chờ giao. Ai rảnh tay (người chơi hoặc NPC) gói từng món vào đơn, ghi phiếu và gửi;
 * shipper tới lấy rồi giao. Giao sau giờ đóng cửa của ngày hẹn là trễ; quá hạn lâu chưa gửi thì khách huỷ.
 * Tiền thu khi giao xong. Số đơn online tăng theo số nhân viên trong ca để tiệm mới không bị rối tay.
 */

/** Đơn còn cần người làm (chưa gửi). */
export function isOpenDelivery(delivery: DeepReadonly<Delivery>): boolean {
  return delivery.status === 'packing' || delivery.status === 'packed';
}

/** Mốc hạn giao của một ngày: giờ đóng cửa (trước pha dọn dẹp cuối ngày). */
export function dueAtFor(state: DeepReadonly<SimState>, day: number): number {
  return state.dayStartedAtMs + (day - state.day) * state.config.dayMs + state.config.dayMs - state.config.closingMs;
}

/** Nửa đầu ngày thì hẹn giao trong ngày được, muộn hơn thì hẹn hôm sau. */
function pickDueDay(state: SimState, preferToday: number): number {
  const early = dayElapsed(state) < state.config.dayMs * 0.5;
  return early && nextFloat(state.rng.delivery) < preferToday ? state.day : state.day + 1;
}

function createDelivery(state: SimState, source: DeliverySource, archetypeId: Delivery['archetypeId'], items: { productId: ProductId; qty: number }[], dueDay: number, emit: Emit): Delivery {
  const delivery: Delivery = {
    id: newId(state, 'd'),
    source,
    archetypeId,
    items: items.map((item) => ({ ...item, packed: [] })),
    createdAtMs: state.timeMs,
    dueDay,
    dueAtMs: dueAtFor(state, dueDay),
    status: 'packing',
    price: null,
    pickupAtMs: null,
    deliverAtMs: null,
    handledBy: [],
  };
  state.deliveries.push(delivery);
  emit({ type: 'deliveryCreated', deliveryId: delivery.id, source, dueDay });
  return delivery;
}

/** Nhân viên NPC đang trong ca: mỗi người làm đơn online rớt về dày hơn và thêm một chỗ chờ gói. */
function staffOnDuty(state: DeepReadonly<SimState>): number {
  return Object.values(state.workers).filter((w) => w.controller === 'ai' && isPresent(state, w)).length;
}

export function deliveryCap(state: DeepReadonly<SimState>): number {
  const hired = Object.values(state.workers).filter((w) => w.controller === 'ai').length;
  return Math.min(state.config.maxOpenDeliveries + hired, 5);
}

function onlineRate(state: DeepReadonly<SimState>): number {
  return (1 + 0.45 * staffOnDuty(state) + 0.1 * (playerLevel(state) - 1)) * demandMultiplier(state);
}

function spawnOnlineOrder(state: SimState, emit: Emit): void {
  const [min, max] = state.config.deliveryIntervalMs;
  const rng = state.rng.delivery;
  state.nextDeliveryAtMs = state.timeMs + Math.round(nextInt(rng, min, max) / onlineRate(state));
  if (state.deliveries.filter(isOpenDelivery).length >= deliveryCap(state)) return;
  const products = unlockedProducts(state);
  if (products.length === 0) return;
  const lines = products.length > 1 && nextFloat(rng) < 0.35 ? 2 : 1;
  const items: { productId: ProductId; qty: number }[] = [];
  while (items.length < lines) {
    const productId = products[nextInt(rng, 0, products.length - 1)]!;
    if (!items.some((item) => item.productId === productId)) items.push({ productId, qty: nextFloat(rng) < 0.3 ? 2 : 1 });
  }
  const archetypeId = pickWeighted(rng, ARCHETYPE_IDS.map((id) => [id, ARCHETYPES[id].spawnWeight] as const));
  createDelivery(state, 'online', archetypeId, items, pickDueDay(state, 0.5), emit);
}

/**
 * Báo khách tạm hết hàng xong (lệnh deferOrder, sau thời gian giải thích). Còn hàng thật thì khách
 * thấy bị từ chối vô lý; hết thật thì khách chọn chờ đơn ship hoặc đi mua chỗ khác.
 */
export function resolveDeferral(state: SimState, order: Order, emit: Emit): void {
  const customer = state.customers[order.customerId];
  if (!customer) return;
  const request = REQUESTS[order.requestId];
  const product = request?.acceptable.find((id) => isProductUnlocked(state, id)) ?? request?.acceptable[0];
  order.state = 'done';
  if (!product || request?.acceptable.some((id) => state.stock[id].shelf > 0)) {
    order.facts.push('unnecessary-referral');
    emit({ type: 'backorderDecided', customerId: customer.id, accepted: false, deliveryId: null, dueDay: null, needless: true });
    dismissCustomer(state, customer, 'left-unserved', emit);
    return;
  }
  const chance = ARCHETYPES[customer.archetypeId].backorderChance + (customer.loyaltyId ? 0.15 : 0);
  if (nextFloat(state.rng.delivery) < chance) {
    const delivery = createDelivery(state, 'backorder', customer.archetypeId, [{ productId: product, qty: 1 }], pickDueDay(state, 0.7), emit);
    state.stats.backorders += 1;
    emit({ type: 'backorderDecided', customerId: customer.id, accepted: true, deliveryId: delivery.id, dueDay: delivery.dueDay, needless: false });
    dismissCustomer(state, customer, 'backordered', emit);
  } else {
    state.stats.wentElsewhere += 1;
    emit({ type: 'backorderDecided', customerId: customer.id, accepted: false, deliveryId: null, dueDay: null, needless: false });
    dismissCustomer(state, customer, 'went-elsewhere', emit);
  }
}

/** Món kế tiếp còn thiếu trong đơn (ưu tiên đúng món được chỉ định). */
export function nextPackItem(delivery: DeepReadonly<Delivery>, productId?: ProductId) {
  return delivery.items.find((item) => item.packed.length < item.qty && (!productId || item.productId === productId));
}

function finish(state: SimState, delivery: Delivery, result: DeliveryResult, emit: Emit): void {
  state.deliveries = state.deliveries.filter((d) => d.id !== delivery.id);
  recordDelivery(state, delivery, result, emit);
}

/** Huỷ đơn chưa gửi: món đã gói trả về kệ. Tiệm chủ động huỷ vẫn bị khách chê. */
export function cancelDelivery(state: SimState, delivery: Delivery, reason: 'shop' | 'overdue', emit: Emit): void {
  for (const item of delivery.items) returnUnits(state, item.productId, item.packed);
  for (const worker of Object.values(state.workers)) {
    if (worker.task && 'deliveryId' in worker.task && worker.task.deliveryId === delivery.id) worker.task = null;
  }
  state.stats.cancelledDeliveries += 1;
  emit({ type: 'deliveryCancelled', deliveryId: delivery.id, reason });
  finish(state, delivery, 'cancelled', emit);
}

/** Gọi mỗi tick: shipper lấy hàng, giao xong thì thu tiền, đơn quá hạn lâu bị huỷ, đơn online mới rớt về. */
export function deliveryTick(state: SimState, emit: Emit): void {
  for (const delivery of [...state.deliveries]) {
    if (delivery.status === 'awaiting-pickup' && delivery.pickupAtMs !== null && state.timeMs >= delivery.pickupAtMs) {
      delivery.status = 'shipping';
      delivery.deliverAtMs = state.timeMs + state.config.deliveryTransitMs;
      emit({ type: 'deliveryPickedUp', deliveryId: delivery.id });
    } else if (delivery.status === 'shipping' && delivery.deliverAtMs !== null && state.timeMs >= delivery.deliverAtMs) {
      const amount = delivery.price ?? 0;
      const late = delivery.deliverAtMs > delivery.dueAtMs;
      state.money += amount;
      state.stats.revenue += amount;
      state.stats.costOfSales += delivery.items.reduce((sum, item) => sum + PRODUCTS[item.productId].cost * item.qty, 0);
      state.stats.deliveries += 1;
      if (late) state.stats.lateDeliveries += 1;
      emit({ type: 'deliveryCompleted', deliveryId: delivery.id, amount, late });
      finish(state, delivery, late ? 'late' : 'on-time', emit);
    } else if (isOpenDelivery(delivery) && state.timeMs > delivery.dueAtMs + state.config.deliveryGraceMs) {
      cancelDelivery(state, delivery, 'overdue', emit);
    }
  }

  if (dayPhase(state) !== 'open') {
    state.nextDeliveryAtMs = Math.max(state.nextDeliveryAtMs, state.timeMs + state.config.firstDeliveryMs);
  } else if (state.timeMs >= state.nextDeliveryAtMs) {
    spawnOnlineOrder(state, emit);
  }
}

/** Thời gian còn lại tới hạn giao (âm = đã trễ). */
export function deliveryTimeLeft(state: DeepReadonly<SimState>, delivery: DeepReadonly<Delivery>): number {
  return delivery.dueAtMs - state.timeMs;
}
