import { aiTick } from "./ai";
import { completeSale } from "./commands";
import { ARCHETYPE_IDS, ARCHETYPES } from "./content/archetypes";
import { REQUESTS } from "./content/requests";
import type { Emit } from "./events";
import { LOOK_VARIANTS } from "./looks";
import { returningProfile } from "./loyalty";
import { endDayIfDue } from "./economy";
import { demandMultiplier } from "./reputation";
import { nextInt, pickWeighted } from "./rng";
import { dismissCustomer, newId, returnReservedStock } from "./state";
import { PRODUCTS } from "./content/products";
import { dayPhase, prepComplete, shiftTick, tidyOnDuty } from "./shift";
import { expireStock } from "./stock";
import { deliveryTick, resolveDeferral } from "./delivery";
import { isProductUnlocked, isTrending } from "./progression";
import { anyChatting, chatTick } from "./chat";
import { collectionBonus } from "./collection";
import { arrivalFactor } from "./market";
import type { Customer, Order, SimState } from "./types";

/** Tiến mô phỏng đúng một bước cố định `config.tickMs`. */
export function tick(state: SimState, emit: Emit): void {
  if (state.operations.pendingTransfer) return;
  const dt = state.config.tickMs;
  state.tick += 1;
  state.timeMs += dt;

  expireStock(state, emit);

  for (const order of Object.values(state.orders))
    advanceOrder(state, order, dt, emit);
  for (const customer of Object.values(state.customers))
    advanceCustomer(state, customer, dt, emit);
  chatTick(state, emit);
  fillCounters(state, emit);
  shiftTick(state, emit);
  aiTick(state, emit);
  deliveryTick(state, emit);
  // Chỉ đón khách khi tiệm đang mở; lúc chuẩn bị/đóng cửa, khách đầu tiên tới sau khi mở cửa.
  if (dayPhase(state) === "open") maybeSpawn(state, emit);
  else
    state.nextSpawnAtMs = Math.max(
      state.nextSpawnAtMs,
      state.timeMs + state.config.firstSpawnMs,
    );

  for (const worker of Object.values(state.workers)) {
    if (state.timeMs >= worker.emoteUntilMs)
      worker.expression = worker.orderId || worker.task ? "focused" : "neutral";
  }

  endDayIfDue(state, emit);
}

function advanceOrder(
  state: SimState,
  order: Order,
  dt: number,
  emit: Emit,
): void {
  if (
    order.state !== "chatting" &&
    order.productId &&
    order.productExpiresAtMs !== null &&
    order.productExpiresAtMs <= state.timeMs
  ) {
    const productId = order.productId;
    state.stats.expiredStock += 1;
    state.stats.expiredCost += PRODUCTS[productId].cost;
    order.productId = null;
    order.productExpiresAtMs = null;
    order.state = "deciding";
    order.timerMs = order.timerTotalMs = 0;
    emit({ type: "stockExpired", productId, qty: 1 });
    return;
  }
  if (
    order.state !== "retrieving" &&
    order.state !== "checkingOut" &&
    order.state !== "referring" &&
    order.state !== "deferring"
  )
    return;
  order.timerMs = Math.max(0, order.timerMs - dt);
  if (order.timerMs > 0) return;
  if (order.state === "deferring") {
    resolveDeferral(state, order, emit);
    return;
  }

  const customer = state.customers[order.customerId];
  if (!customer) return;
  const request = REQUESTS[order.requestId];

  if (order.state === "retrieving") {
    const productId = order.productId;
    if (!productId) return;
    if (request?.acceptable.includes(productId)) {
      order.state = "ready";
      emit({ type: "productReady", orderId: order.id, productId });
      return;
    }
    // Khách xem hàng và từ chối: trả hàng về kệ, quay lại bước chọn.
    order.facts.push("wrong-item");
    order.rejectedProductIds.push(productId);
    state.stats.wrongItems += 1;
    returnReservedStock(state, order.id);
    order.state = "deciding";
    customer.patienceMs = Math.max(
      0,
      customer.patienceMs -
        customer.patienceMaxMs * state.config.wrongItemPenalty,
    );
    customer.expression = "confused";
    customer.emoteUntilMs = state.timeMs + state.config.emoteMs;
    const worker = state.workers[order.workerId];
    if (worker) {
      worker.expression = "worried";
      worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    }
    emit({
      type: "wrongProduct",
      orderId: order.id,
      productId,
      customerId: customer.id,
    });
    return;
  }

  if (order.state === "checkingOut") {
    completeSale(state, order.id, emit);
    return;
  }

  const appropriate = request?.kind === "refer";
  order.facts.push(
    appropriate ? "appropriate-referral" : "unnecessary-referral",
  );
  if (appropriate) state.stats.referrals += 1;
  order.state = "done";
  emit({
    type: "referralCompleted",
    orderId: order.id,
    customerId: customer.id,
    appropriate,
  });
  dismissCustomer(
    state,
    customer,
    appropriate ? "referred" : "left-unserved",
    emit,
  );
}

function advanceCustomer(
  state: SimState,
  customer: Customer,
  dt: number,
  emit: Emit,
): void {
  if (customer.phase === "leaving") {
    if (state.timeMs >= customer.leaveAtMs) delete state.customers[customer.id];
    return;
  }

  const order = customer.orderId ? state.orders[customer.orderId] : undefined;
  // Đã mua xong và đang trò chuyện: khách vui vẻ, không hao kiên nhẫn.
  if (order?.state === "chatting") {
    if (state.timeMs >= customer.emoteUntilMs) customer.expression = "happy";
    return;
  }
  const { patienceRate } = state.config;
  const baseRate =
    customer.phase === "queue"
      ? patienceRate.queue
      : order &&
          (order.state === "retrieving" ||
            order.state === "checkingOut" ||
            order.state === "referring" ||
            order.state === "deferring")
        ? patienceRate.working
        : patienceRate.deciding;
  // Nhân viên giao tiếp tốt giúp khách đang được phục vụ bớt sốt ruột (0.75×–1.25×).
  const server = order ? state.workers[order.workerId] : undefined;
  const served = server
    ? baseRate * (1.25 - 0.5 * server.communication)
    : baseRate;
  // Chuẩn bị đầu ngày đầy đủ (kệ gọn, hàng cận hạn đã rà) giúp khách bớt sốt ruột.
  // Người "Ngăn nắp" trong ca giữ tiệm gọn gàng: khách đang chờ ở hàng cũng bớt sốt ruột.
  const tidy = customer.phase === "queue" && tidyOnDuty(state) ? 0.9 : 1;
  // Khách xếp hàng thấy quầy đang tám chuyện thì sốt ruột nhanh hơn; đồ trang trí có thể làm dịu (hoặc ồn thêm).
  const waitingMood =
    customer.phase === "queue"
      ? (anyChatting(state) ? 1.2 : 1) *
        (1 - collectionBonus(state, "queuePatience"))
      : 1;
  const rate =
    (prepComplete(state) ? served * state.config.prepPatienceFactor : served) *
    tidy *
    waitingMood;
  customer.patienceMs = Math.max(0, customer.patienceMs - dt * rate);

  if (customer.patienceMs <= 0) {
    if (order) {
      returnReservedStock(state, order.id);
      order.facts.push("customer-left");
      order.state = "cancelled";
    }
    state.stats.leftAngry += 1;
    emit({ type: "customerLeft", customerId: customer.id, reason: "angry" });
    dismissCustomer(state, customer, "left-angry", emit);
    return;
  }

  if (state.timeMs < customer.emoteUntilMs) return;
  const ratio = customer.patienceMs / customer.patienceMaxMs;
  const request = REQUESTS[customer.requestId];
  if (ratio < 0.25) customer.expression = "angry";
  else if (request?.kind === "refer") customer.expression = "unwell";
  else if (ratio < 0.5) customer.expression = "impatient";
  else if (
    request?.kind === "need" &&
    customer.phase === "counter" &&
    order?.state === "deciding"
  )
    customer.expression = "thinking";
  else customer.expression = "neutral";
}

function fillCounters(state: SimState, emit: Emit): void {
  for (const counter of state.counters) {
    if (counter.customerId || !counter.operatorId) continue;
    const nextId = state.queue.shift();
    if (!nextId) return;
    const customer = state.customers[nextId];
    if (!customer) continue;
    customer.phase = "counter";
    counter.customerId = nextId;
    emit({
      type: "customerAtCounter",
      customerId: nextId,
      counterId: counter.id,
    });
  }
}

function maybeSpawn(state: SimState, emit: Emit): void {
  if (state.timeMs < state.nextSpawnAtMs) return;
  const [min, max] = state.config.spawnIntervalMs;
  // Danh tiếng tác động lên lượng khách ghé (có trần/sàn), không lên giá trị mỗi đơn. Tiệm mới mở
  // ít người biết nên khách thưa, tăng dần theo độ nhận biết (market.ts).
  state.nextSpawnAtMs =
    state.timeMs +
    Math.round(
      nextInt(state.rng.spawn, min, max) /
        (demandMultiplier(state) *
          state.operations.demandFactor *
          arrivalFactor(state)),
    );
  // Hàng đầy thì khách bỏ đi từ ngoài cửa: mất một lượt khách, UI cảnh báo để người chơi mở rộng.
  if (state.queue.length >= state.config.maxQueue) {
    state.stats.turnedAway += 1;
    emit({ type: "customerTurnedAway" });
    return;
  }

  const rng = state.rng.customer;
  const returning = returningProfile(state);
  const archetype = returning
    ? ARCHETYPES[returning.archetypeId]
    : ARCHETYPES[
        pickWeighted(
          rng,
          ARCHETYPE_IDS.map((id) => [id, ARCHETYPES[id].spawnWeight] as const),
        )
      ];
  const requestId = pickWeighted(
    rng,
    Object.entries(archetype.requestWeights)
      .filter(([id]) => {
        const request = REQUESTS[id];
        return (
          request?.kind === "refer" ||
          request?.acceptable.some((productId) =>
            isProductUnlocked(state, productId),
          )
        );
      })
      .map(
        ([id, w]) =>
          [
            id,
            (w ?? 0) *
              (REQUESTS[id]?.acceptable.some((productId) =>
                isTrending(state, productId),
              )
                ? 2.2
                : 1),
          ] as const,
      ),
  );
  const patience = nextInt(
    rng,
    archetype.patienceMs[0],
    archetype.patienceMs[1],
  );
  const id = newId(state, "c");
  state.customers[id] = {
    id,
    archetypeId: archetype.id,
    requestId,
    look: returning
      ? { ...returning.look }
      : {
          skin: nextInt(rng, 0, LOOK_VARIANTS.skin - 1),
          hair: nextInt(rng, 0, LOOK_VARIANTS.hair - 1),
          hairStyle: nextInt(rng, 0, LOOK_VARIANTS.hairStyle - 1),
          outfit: nextInt(rng, 0, LOOK_VARIANTS.outfit - 1),
        },
    phase: "queue",
    arrivedAtMs: state.timeMs,
    servedAtMs: null,
    patienceMs: patience,
    patienceMaxMs: patience,
    expression: "neutral",
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
    loyaltyId: returning?.id ?? null,
    chat: null,
    chatBonus: 0,
  };
  state.queue.push(id);
  state.stats.customersArrived += 1;
  if (returning) state.stats.returningCustomers += 1;
  emit({ type: "customerArrived", customerId: id });
}
