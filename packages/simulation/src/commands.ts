import { PRODUCTS } from "./content/products";
import { REQUESTS } from "./content/requests";
import { STAFF_CANDIDATES } from "./content/staff";
import type { ProductId, UpgradeEffect } from "./content/types";
import { UPGRADES } from "./content/upgrades";
import { COMPLAINT_RESPONSES, type ComplaintResponse } from "./content/reviews";
import { effectiveSpeed, priceBounds } from "./economy";
import { resolveComplaint } from "./reputation";
import type { Emit } from "./events";
import {
  dismissCustomer,
  newId,
  PLAYER_WORKER_ID,
  workerFromCandidate,
} from "./state";
import {
  gainExperience,
  hasTrait,
  refreshRecruits,
  retainWage,
} from "./recruit";
import { nextFloat, nextInt } from "./rng";
import { STATIONS, type StationId } from "./content/stations";
import {
  checkIn,
  currentShift,
  handOverCounters,
  isOnDuty,
  isPresent,
  markPrepDone,
  openStore,
  stationHeadcount,
} from "./shift";
import { addStock, takeStock } from "./stock";
import { cancelDelivery, nextPackItem } from "./delivery";
import {
  facilityLevel,
  isProductUnlocked,
  playerLevel,
  staffLimits,
  stockUnitCost,
} from "./progression";
import {
  PREP_TASK_IDS,
  SHIFT_IDS,
  type DeepReadonly,
  type Order,
  type PrepTaskId,
  type ShiftId,
  type SimState,
} from "./types";

/**
 * Lệnh là cách DUY NHẤT để thay đổi state từ bên ngoài. Người chơi và NPC gửi cùng loại lệnh
 * và đi qua cùng một bộ kiểm tra, nên đổi người điều khiển không nhân đôi logic nghiệp vụ.
 */
export type Command =
  | { type: "startService"; workerId: string; customerId: string }
  | {
      type: "pickProduct";
      workerId: string;
      orderId: string;
      productId: ProductId;
    }
  | { type: "refer"; workerId: string; orderId: string }
  | { type: "deferOrder"; workerId: string; orderId: string }
  | {
      type: "packDelivery";
      deliveryId: string;
      workerId?: string;
      productId?: ProductId;
    }
  | { type: "sendDelivery"; deliveryId: string; workerId?: string }
  | { type: "cancelDelivery"; deliveryId: string }
  | { type: "checkout"; workerId: string; orderId: string }
  | {
      type: "restock";
      productId: ProductId;
      workerId?: string;
      quantity?: number;
    }
  | { type: "hire"; candidateId: string }
  | { type: "assignCounter"; counterId: string; workerId: string }
  | { type: "buyUpgrade"; upgradeId: string }
  | {
      type: "respondComplaint";
      complaintId: string;
      response: ComplaintResponse;
    }
  | { type: "setPrice"; productId: ProductId; price: number }
  | { type: "dismissStaff"; workerId: string }
  | { type: "completePrep"; taskId: PrepTaskId; workerId: string }
  | { type: "openStore" }
  | { type: "setShifts"; workerId: string; shifts: ShiftId[] }
  | { type: "lockRecruit"; slot: number; locked: boolean }
  | { type: "rerollRecruits" }
  | { type: "retainStaff"; workerId: string }
  | { type: "interviewRecruit"; slot: number }
  | { type: "setRestDay"; workerId: string; rest: boolean }
  | { type: "setCounterPolicy"; keepOnShiftChange: boolean }
  | { type: "assignStation"; workerId: string; station: StationId };

export type RejectReason =
  | "unknown-worker"
  | "worker-busy"
  | "unknown-customer"
  | "customer-not-at-counter"
  | "customer-already-served"
  | "counter-assigned-elsewhere"
  | "unknown-order"
  | "not-your-order"
  | "invalid-order-state"
  | "unknown-product"
  | "out-of-stock"
  | "safety-referral-required"
  | "insufficient-funds"
  | "shelf-full"
  | "invalid-quantity"
  | "unknown-candidate"
  | "already-hired"
  | "staff-full"
  | "unknown-counter"
  | "unknown-upgrade"
  | "already-owned"
  | "level-locked"
  | "product-locked"
  | "previous-level-required"
  | "unknown-complaint"
  | "complaint-closed"
  | "price-out-of-range"
  | "cannot-dismiss-player"
  | "worker-off-duty"
  | "store-already-open"
  | "unknown-prep-task"
  | "prep-already-done"
  | "invalid-shifts"
  | "cannot-schedule-player"
  | "shift-full"
  | "worker-not-arrived"
  | "unknown-recruit"
  | "reroll-used"
  | "not-resigning"
  | "nothing-hidden"
  | "unknown-station"
  | "station-full"
  | "unknown-delivery"
  | "delivery-not-packing"
  | "delivery-not-packed"
  | "delivery-already-sent";

export type CommandResult = { ok: true } | { ok: false; reason: RejectReason };

const OK: CommandResult = { ok: true };
const reject = (reason: RejectReason): CommandResult => ({ ok: false, reason });

export function applyCommand(
  state: SimState,
  command: Command,
  emit: Emit,
): CommandResult {
  switch (command.type) {
    case "startService":
      return startService(state, command.workerId, command.customerId, emit);
    case "pickProduct":
      return pickProduct(
        state,
        command.workerId,
        command.orderId,
        command.productId,
        emit,
      );
    case "refer":
      return refer(state, command.workerId, command.orderId);
    case "deferOrder":
      return deferOrder(state, command.workerId, command.orderId, emit);
    case "packDelivery":
      return packDelivery(
        state,
        command.deliveryId,
        command.workerId ?? null,
        command.productId,
        emit,
      );
    case "sendDelivery":
      return sendDelivery(
        state,
        command.deliveryId,
        command.workerId ?? null,
        emit,
      );
    case "cancelDelivery":
      return cancelDeliveryCommand(state, command.deliveryId, emit);
    case "checkout":
      return checkout(state, command.workerId, command.orderId);
    case "restock":
      return restock(
        state,
        command.productId,
        command.workerId ?? null,
        command.quantity,
        emit,
      );
    case "hire":
      return hire(state, command.candidateId, emit);
    case "assignCounter":
      return assignCounter(state, command.counterId, command.workerId, emit);
    case "buyUpgrade":
      return buyUpgrade(state, command.upgradeId, emit);
    case "respondComplaint":
      return respondComplaint(
        state,
        command.complaintId,
        command.response,
        emit,
      );
    case "setPrice":
      return setPrice(state, command.productId, command.price, emit);
    case "dismissStaff":
      return dismissStaff(state, command.workerId, emit);
    case "completePrep":
      return completePrep(state, command.taskId, command.workerId, emit);
    case "openStore":
      return openStoreCommand(state, emit);
    case "setShifts":
      return setShifts(state, command.workerId, command.shifts, emit);
    case "lockRecruit":
      return lockRecruit(state, command.slot, command.locked);
    case "rerollRecruits":
      return rerollRecruits(state, emit);
    case "retainStaff":
      return retainStaff(state, command.workerId, emit);
    case "interviewRecruit":
      return interviewRecruit(state, command.slot, emit);
    case "setRestDay":
      return setRestDay(state, command.workerId, command.rest, emit);
    case "assignStation":
      return assignStation(state, command.workerId, command.station, emit);
    case "setCounterPolicy":
      state.keepCounterOnShiftChange = command.keepOnShiftChange;
      return OK;
  }
}

/** Đơn phải tồn tại và thuộc đúng nhân viên gửi lệnh (không ai làm thay đơn của người khác). */
function ownedOrder(
  state: SimState,
  workerId: string,
  orderId: string,
): Order | RejectReason {
  const order = state.orders[orderId];
  if (!order) return "unknown-order";
  if (order.workerId !== workerId) return "not-your-order";
  return order;
}

function startService(
  state: SimState,
  workerId: string,
  customerId: string,
  emit: Emit,
): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (worker.orderId || worker.task) return reject("worker-busy");
  if (!isOnDuty(state, worker)) return reject("worker-off-duty");
  if (!isPresent(state, worker)) return reject("worker-not-arrived");
  const customer = state.customers[customerId];
  if (!customer) return reject("unknown-customer");
  const counter = state.counters.find((c) => c.customerId === customerId);
  if (customer.phase !== "counter" || !counter)
    return reject("customer-not-at-counter");
  if (customer.orderId) return reject("customer-already-served");
  if (counter.operatorId !== workerId)
    return reject("counter-assigned-elsewhere");

  const orderId = newId(state, "o");
  state.orders[orderId] = {
    id: orderId,
    customerId,
    workerId,
    requestId: customer.requestId,
    state: "deciding",
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
  if (customer.servedAtMs === null) {
    customer.servedAtMs = state.timeMs;
    state.stats.waitMsSum += state.timeMs - customer.arrivedAtMs;
    state.stats.servedCount += 1;
  }
  emit({ type: "serviceStarted", orderId, workerId, customerId });
  return OK;
}

function pickProduct(
  state: SimState,
  workerId: string,
  orderId: string,
  productId: ProductId,
  emit: Emit,
): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === "string") return reject(order);
  if (order.state !== "deciding") return reject("invalid-order-state");
  const product = PRODUCTS[productId];
  if (!product) return reject("unknown-product");

  if (REQUESTS[order.requestId]?.kind === "refer")
    return safetyBlock(state, order, productId, emit);

  if (!isProductUnlocked(state, productId)) return reject("product-locked");

  const entry = state.stock[productId];
  if (entry.shelf <= 0) return reject("out-of-stock");

  const expiresAtMs = takeStock(entry);
  if (expiresAtMs === null) return reject("out-of-stock");
  order.productId = productId;
  order.productExpiresAtMs = expiresAtMs;
  order.state = "retrieving";
  order.timerTotalMs = order.timerMs = Math.round(
    state.config.retrieveMs / workerSpeed(state, order.workerId),
  );
  emit({ type: "productPicked", orderId, productId });
  return OK;
}

/**
 * Quy tắc an toàn: khách mô tả triệu chứng thì không được bán (hay báo hết hàng để hẹn bán sau), dù là
 * người chơi hay NPC. Lệnh bị từ chối nhưng vẫn được ghi lại để tính hiệu suất và giải thích cho người chơi.
 */
function safetyBlock(
  state: SimState,
  order: Order,
  productId: ProductId | null,
  emit: Emit,
): CommandResult {
  order.facts.push("safety-warning");
  state.stats.safetyWarnings += 1;
  const worker = state.workers[order.workerId];
  if (worker) {
    worker.expression = "worried";
    worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
  }
  emit({
    type: "safetyWarning",
    orderId: order.id,
    productId,
    customerId: order.customerId,
    workerId: order.workerId,
  });
  return reject("safety-referral-required");
}

/**
 * Báo khách món cần đang tạm hết hàng. Sau lúc giải thích, khách chọn chờ đơn ship hoặc đi mua chỗ khác
 * (delivery.ts). Báo hết hàng khi kệ vẫn còn món phù hợp thì khách thấy bị từ chối vô lý.
 */
function deferOrder(
  state: SimState,
  workerId: string,
  orderId: string,
  emit: Emit,
): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === "string") return reject(order);
  if (order.state !== "deciding") return reject("invalid-order-state");
  if (REQUESTS[order.requestId]?.kind === "refer")
    return safetyBlock(state, order, null, emit);
  order.state = "deferring";
  order.timerTotalMs = order.timerMs = state.config.referMs;
  return OK;
}

/** Gói một món vào đơn ship: lấy khỏi kệ (lô gần hết hạn trước). Đủ món thì đơn chờ ghi phiếu và gửi. */
function packDelivery(
  state: SimState,
  deliveryId: string,
  workerId: string | null,
  productId: ProductId | undefined,
  emit: Emit,
): CommandResult {
  const delivery = state.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return reject("unknown-delivery");
  if (delivery.status !== "packing") return reject("delivery-not-packing");
  if (workerId && !state.workers[workerId]) return reject("unknown-worker");
  const item = delivery.items.find(
    (i) => i.packed.length < i.qty && (!productId || i.productId === productId),
  );
  if (!item) return reject("invalid-quantity");
  if (!isProductUnlocked(state, item.productId))
    return reject("product-locked");
  const expiresAtMs = takeStock(state.stock[item.productId]);
  if (expiresAtMs === null) return reject("out-of-stock");
  item.packed.push(expiresAtMs);
  const by = workerId ?? PLAYER_WORKER_ID;
  if (!delivery.handledBy.includes(by)) delivery.handledBy.push(by);
  emit({
    type: "deliveryItemPacked",
    deliveryId,
    productId: item.productId,
    workerId,
  });
  if (!nextPackItem(delivery)) {
    delivery.status = "packed";
    emit({ type: "deliveryPacked", deliveryId });
  }
  return OK;
}

/** Ghi phiếu và gửi: chốt tiền thu theo giá bán hiện tại, gọi shipper tới lấy. */
function sendDelivery(
  state: SimState,
  deliveryId: string,
  workerId: string | null,
  emit: Emit,
): CommandResult {
  const delivery = state.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return reject("unknown-delivery");
  if (delivery.status !== "packed")
    return reject(
      delivery.status === "packing"
        ? "delivery-not-packed"
        : "delivery-already-sent",
    );
  delivery.price = delivery.items.reduce(
    (sum, item) => sum + state.prices[item.productId] * item.qty,
    0,
  );
  delivery.status = "awaiting-pickup";
  delivery.pickupAtMs = state.timeMs + state.config.shipperPickupMs;
  const by = workerId ?? PLAYER_WORKER_ID;
  if (!delivery.handledBy.includes(by)) delivery.handledBy.push(by);
  emit({ type: "deliverySent", deliveryId, workerId });
  return OK;
}

function cancelDeliveryCommand(
  state: SimState,
  deliveryId: string,
  emit: Emit,
): CommandResult {
  const delivery = state.deliveries.find((d) => d.id === deliveryId);
  if (!delivery) return reject("unknown-delivery");
  if (delivery.status !== "packing" && delivery.status !== "packed")
    return reject("delivery-already-sent");
  cancelDelivery(state, delivery, "shop", emit);
  return OK;
}

function refer(
  state: SimState,
  workerId: string,
  orderId: string,
): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === "string") return reject(order);
  if (order.state !== "deciding") return reject("invalid-order-state");
  order.state = "referring";
  order.timerTotalMs = order.timerMs = state.config.referMs;
  return OK;
}

function checkout(
  state: SimState,
  workerId: string,
  orderId: string,
): CommandResult {
  const order = ownedOrder(state, workerId, orderId);
  if (typeof order === "string") return reject(order);
  if (order.state !== "ready" || !order.productId)
    return reject("invalid-order-state");
  if (
    order.productExpiresAtMs !== null &&
    order.productExpiresAtMs <= state.timeMs
  )
    return reject("out-of-stock");
  if (!REQUESTS[order.requestId]?.acceptable.includes(order.productId))
    return reject("invalid-order-state");
  order.state = "checkingOut";
  order.timerTotalMs = order.timerMs = Math.round(
    state.config.checkoutMs / workerSpeed(state, order.workerId),
  );
  return OK;
}

function restock(
  state: SimState,
  productId: ProductId,
  workerId: string | null,
  quantity: number | undefined,
  emit: Emit,
): CommandResult {
  const product = PRODUCTS[productId];
  if (!product) return reject("unknown-product");
  if (!isProductUnlocked(state, productId)) return reject("product-locked");
  const entry = state.stock[productId];
  const missing = entry.capacity - entry.shelf;
  if (missing <= 0) return reject("shelf-full");
  // Mua tối đa số lượng đủ tiền; tổng tài sản (tiền + hàng) không giảm nên không thể kẹt vốn.
  const unitCost = stockUnitCost(state, productId);
  const qty = quantity ?? Math.min(missing, Math.floor(state.money / unitCost));
  if (quantity === undefined && qty <= 0) return reject("insufficient-funds");
  if (!Number.isSafeInteger(qty) || qty <= 0 || qty > missing)
    return reject("invalid-quantity");
  const cost = qty * unitCost;
  if (cost > state.money) return reject("insufficient-funds");
  state.money -= cost;
  addStock(entry, qty, state.timeMs + state.config.stockShelfLifeMs);
  state.stats.spentOnStock += cost;
  emit({ type: "restocked", productId, qty, cost, workerId });
  return OK;
}

/**
 * Tuyển từ danh sách ứng viên hôm nay (hoặc hồ sơ cố định dùng cho test/balance). Người mới làm một ca:
 * ưu tiên ca đang diễn ra nếu còn chỗ (vào làm ngay, được tính lương ca này), không thì ca còn lại.
 * Số chỗ tăng theo nâng cấp tiệm (`staffLimits`); đội đông hơn giới hạn từ save cũ vẫn giữ nguyên.
 */
function hire(state: SimState, candidateId: string, emit: Emit): CommandResult {
  const slot = state.recruits.findIndex((r) => r?.id === candidateId);
  const candidate =
    slot >= 0 ? state.recruits[slot] : STAFF_CANDIDATES[candidateId];
  if (!candidate) return reject("unknown-candidate");
  const worker = workerFromCandidate(candidate);
  if (state.workers[worker.id]) return reject("already-hired");
  const limits = staffLimits(state);
  const staffCount = Object.values(state.workers).filter(
    (w) => w.controller === "ai",
  ).length;
  if (staffCount >= limits.total) return reject("staff-full");
  const now = currentShift(state);
  const shift = [now, ...SHIFT_IDS.filter((id) => id !== now)].find(
    (id) => shiftHeadcount(state, id) < limits.perShift,
  );
  if (!shift) return reject("shift-full");
  if (state.money < candidate.hireCost) return reject("insufficient-funds");
  state.money -= candidate.hireCost;
  state.stats.spentOnStaff += candidate.hireCost;
  worker.shifts = [shift];
  state.workers[worker.id] = worker;
  if (slot >= 0) state.recruits[slot] = null;
  checkIn(state, worker);
  emit({ type: "staffHired", workerId: worker.id, cost: candidate.hireCost });
  return OK;
}

/** Số NPC có lịch ở một ca (không tính người chơi). */
export function shiftHeadcount(
  state: DeepReadonly<SimState>,
  shift: ShiftId,
  exceptId?: string,
): number {
  return Object.values(state.workers).filter(
    (w) =>
      w.controller === "ai" && w.id !== exceptId && w.shifts.includes(shift),
  ).length;
}

function lockRecruit(
  state: SimState,
  slot: number,
  locked: boolean,
): CommandResult {
  const recruit = state.recruits[slot];
  if (!recruit) return reject("unknown-recruit");
  recruit.locked = locked;
  return OK;
}

/** Làm mới các ô không khoá, có trả phí, mỗi ngày một lần. */
function rerollRecruits(state: SimState, emit: Emit): CommandResult {
  if (state.recruitRerollDay === state.day) return reject("reroll-used");
  const cost = state.config.recruitRerollCost;
  if (state.money < cost) return reject("insufficient-funds");
  state.money -= cost;
  state.stats.spentOnStaff += cost;
  state.recruitRerollDay = state.day;
  refreshRecruits(state, "b");
  emit({ type: "recruitsRefreshed", paid: true });
  return OK;
}

/** Phỏng vấn trả phí: lộ đặc điểm ẩn của ứng viên trước khi quyết định tuyển (giá tuyển không đổi). */
function interviewRecruit(
  state: SimState,
  slot: number,
  emit: Emit,
): CommandResult {
  const recruit = state.recruits[slot];
  if (!recruit) return reject("unknown-recruit");
  if (recruit.hiddenTraits.length === 0) return reject("nothing-hidden");
  const cost = state.config.interviewCost;
  if (state.money < cost) return reject("insufficient-funds");
  state.money -= cost;
  state.stats.spentOnStaff += cost;
  const traits = [...recruit.hiddenTraits];
  recruit.traits.push(...traits);
  recruit.hiddenTraits = [];
  emit({ type: "recruitInterviewed", slot, traits });
  return OK;
}

/** Cho nghỉ trọn ngày mai (bỏ mọi ca, không lương, hồi mệt và đếm lại ngày làm liên tục), hoặc huỷ lịch nghỉ. */
function setRestDay(
  state: SimState,
  workerId: string,
  rest: boolean,
  emit: Emit,
): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (worker.controller === "player") return reject("cannot-schedule-player");
  worker.restDay = rest ? state.day + 1 : null;
  emit({ type: "restScheduled", workerId, day: worker.restDay });
  return OK;
}

/** Giữ chân người đang xin nghỉ: tăng lương vĩnh viễn, cho nghỉ lấy sức (mệt về 30). */
function retainStaff(
  state: SimState,
  workerId: string,
  emit: Emit,
): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (!worker.resigning) return reject("not-resigning");
  worker.wage = retainWage(worker.wage);
  worker.fatigue = 30;
  worker.resigning = false;
  emit({ type: "staffRetained", workerId, wage: worker.wage });
  return OK;
}

function assignCounter(
  state: SimState,
  counterId: string,
  workerId: string,
  emit: Emit,
): CommandResult {
  const counter = state.counters.find((c) => c.id === counterId);
  if (!counter) return reject("unknown-counter");
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (!isOnDuty(state, worker)) return reject("worker-off-duty");
  // Một người chỉ đứng một quầy; đơn đang làm dở vẫn thuộc người đã bắt đầu.
  const previous = state.counters.find(
    (c) => c.operatorId === workerId && c.id !== counterId,
  );
  if (previous) {
    previous.operatorId = null;
    emit({ type: "counterAssigned", counterId: previous.id, workerId: null });
  }
  counter.operatorId = workerId;
  emit({ type: "counterAssigned", counterId, workerId });
  if (previous) handOverCounters(state, emit);
  return OK;
}

/**
 * Xếp vị trí làm việc. "Quầy bán" dùng đúng luật giao quầy; vị trí khác ghi vào nhân viên. Người đang
 * đứng quầy chuyển sang vị trí khác thì quầy được giao lại (người "Hỗ trợ" trong ca, không có thì người chơi).
 */
function assignStation(
  state: SimState,
  workerId: string,
  station: StationId,
  emit: Emit,
): CommandResult {
  const def = STATIONS[station];
  if (!def) return reject("unknown-station");
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (station === "counter") {
    const counter =
      state.counters.find((c) => c.operatorId === workerId) ??
      state.counters.find((c) => c.operatorId === null) ??
      state.counters[0];
    return counter
      ? assignCounter(state, counter.id, workerId, emit)
      : reject("unknown-counter");
  }
  if (worker.controller === "player") return reject("cannot-schedule-player");
  if (
    def.capacity !== null &&
    stationHeadcount(state, station, workerId) >= def.capacity
  )
    return reject("station-full");
  worker.station = station;
  for (const counter of state.counters) {
    if (counter.operatorId !== workerId) continue;
    counter.operatorId = null;
    emit({ type: "counterAssigned", counterId: counter.id, workerId: null });
    handOverCounters(state, emit, false, workerId);
  }
  emit({ type: "stationAssigned", workerId, station });
  return OK;
}

function buyUpgrade(
  state: SimState,
  upgradeId: string,
  emit: Emit,
): CommandResult {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return reject("unknown-upgrade");
  if (state.upgrades.includes(upgradeId)) return reject("already-owned");
  const levelMatch =
    /^(warehouse|storefront|scanner|sorted-shelf|wide-shelf|bench|signboard)-(\d+)$/.exec(
      upgradeId,
    );
  if (levelMatch) {
    const base = levelMatch[1]!;
    const target = Number(levelMatch[2]);
    const current =
      base === "warehouse" || base === "storefront"
        ? facilityLevel(state, base)
        : state.upgrades.filter(
            (id) => id === base || id.startsWith(`${base}-`),
          ).length;
    if (current !== target - 1) return reject("previous-level-required");
    if (playerLevel(state) < target) return reject("level-locked");
  }
  if (upgradeId === "counter-2" && playerLevel(state) < 3)
    return reject("level-locked");
  if (state.money < upgrade.cost) return reject("insufficient-funds");
  state.money -= upgrade.cost;
  state.stats.spentOnUpgrades += upgrade.cost;
  state.upgrades.push(upgradeId);
  for (const effect of upgrade.effects) applyEffect(state, effect);
  emit({ type: "upgradeBought", upgradeId, cost: upgrade.cost });
  return OK;
}

function respondComplaint(
  state: SimState,
  complaintId: string,
  response: ComplaintResponse,
  emit: Emit,
): CommandResult {
  const complaint = state.complaints.find((c) => c.id === complaintId);
  if (!complaint) return reject("unknown-complaint");
  if (complaint.status !== "open") return reject("complaint-closed");
  if (!COMPLAINT_RESPONSES[response]) return reject("unknown-complaint");
  if (response === "voucher") {
    const cost = state.config.reputation.voucherCost;
    if (state.money < cost) return reject("insufficient-funds");
    state.money -= cost;
    state.stats.spentOnVouchers += cost;
  }
  resolveComplaint(state, complaint, response, emit);
  return OK;
}

function setPrice(
  state: SimState,
  productId: ProductId,
  price: number,
  emit: Emit,
): CommandResult {
  if (!PRODUCTS[productId]) return reject("unknown-product");
  if (!isProductUnlocked(state, productId)) return reject("product-locked");
  const { min, max } = priceBounds(state, productId);
  if (!Number.isInteger(price) || price < min || price > max)
    return reject("price-out-of-range");
  state.prices[productId] = price;
  emit({ type: "priceChanged", productId, price });
  return OK;
}

/**
 * Cho nhân viên nghỉ: phải trả hết lương còn nợ trước (không có đường tắt né lương),
 * và chỉ khi người đó không đang phục vụ dở một khách. Quầy họ đứng giao lại cho người chơi.
 */
function dismissStaff(
  state: SimState,
  workerId: string,
  emit: Emit,
): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (worker.controller === "player" || workerId === PLAYER_WORKER_ID)
    return reject("cannot-dismiss-player");
  if (worker.orderId) return reject("worker-busy");
  if (state.money < worker.wageOwed) return reject("insufficient-funds");
  state.money -= worker.wageOwed;
  state.stats.spentOnWages += worker.wageOwed;
  for (const counter of state.counters) {
    if (counter.operatorId === workerId) {
      counter.operatorId = null;
      emit({ type: "counterAssigned", counterId: counter.id, workerId: null });
    }
  }
  // Việc bổ sung kệ dở dang chưa trừ tiền nên huỷ không mất gì.
  delete state.workers[workerId];
  handOverCounters(state, emit);
  emit({ type: "staffDismissed", workerId, name: worker.name });
  return OK;
}

/** Việc chuẩn bị đầu ngày: chỉ làm được trước khi mở cửa, mỗi việc một lần, người làm phải đang trong ca. */
function completePrep(
  state: SimState,
  taskId: PrepTaskId,
  workerId: string,
  emit: Emit,
): CommandResult {
  if (!PREP_TASK_IDS.includes(taskId)) return reject("unknown-prep-task");
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (!isOnDuty(state, worker)) return reject("worker-off-duty");
  if (state.prep.openedAtMs !== null) return reject("store-already-open");
  if (state.prep.done.includes(taskId)) return reject("prep-already-done");
  markPrepDone(state, taskId, workerId, emit);
  return OK;
}

/** Mở cửa sớm (không cần làm đủ việc chuẩn bị; việc bỏ qua được ghi vào tổng kết ngày). */
function openStoreCommand(state: SimState, emit: Emit): CommandResult {
  if (state.prep.openedAtMs !== null) return reject("store-already-open");
  openStore(state, false, emit);
  return OK;
}

/**
 * Xếp lịch ca cho NPC. Thêm ca đang diễn ra thì người đó vào ca ngay (được tính lương ca này);
 * bỏ ca đang diễn ra thì người đó tan ca sau khi xong việc dở, ca đã chấm công vẫn được trả lương.
 */
function setShifts(
  state: SimState,
  workerId: string,
  shifts: ShiftId[],
  emit: Emit,
): CommandResult {
  const worker = state.workers[workerId];
  if (!worker) return reject("unknown-worker");
  if (worker.controller === "player") return reject("cannot-schedule-player");
  const next = SHIFT_IDS.filter((id) => shifts.includes(id));
  if (next.length === 0 || next.length !== new Set(shifts).size)
    return reject("invalid-shifts");
  const { perShift } = staffLimits(state);
  if (
    next.some(
      (id) =>
        !worker.shifts.includes(id) &&
        shiftHeadcount(state, id, workerId) >= perShift,
    )
  ) {
    return reject("shift-full");
  }
  worker.shifts = next;
  checkIn(state, worker);
  handOverCounters(state, emit);
  emit({ type: "staffScheduled", workerId, shifts: [...next] });
  return OK;
}

function workerSpeed(state: SimState, workerId: string): number {
  const worker = state.workers[workerId];
  return worker ? effectiveSpeed(worker, state.config.owedWageSpeedFactor) : 1;
}

function applyEffect(state: SimState, effect: UpgradeEffect): void {
  const config = state.config;
  switch (effect.type) {
    case "counter":
      state.counters.push({
        id: "counter-2",
        customerId: null,
        operatorId: null,
      });
      break;
    case "catalog":
    case "staff":
      // Quyền nhập/trưng bày và số chỗ nhân viên được tính từ danh sách nâng cấp trong progression.ts.
      break;
    case "scale":
      config[effect.key] = Math.round(config[effect.key] * effect.factor);
      break;
    case "shelfCapacity":
      for (const entry of Object.values(state.stock))
        entry.capacity += effect.add;
      break;
    case "queue":
      config.maxQueue += effect.addMax;
      config.patienceRate.queue *= effect.patienceFactor;
      break;
    case "spawnInterval":
      config.spawnIntervalMs = [
        Math.round(config.spawnIntervalMs[0] * effect.factor),
        Math.round(config.spawnIntervalMs[1] * effect.factor),
      ];
      break;
  }
}

/** Hoàn tất bán hàng: kiểm tra lại và ghi sổ trong một bước (nguyên tử). */
export function completeSale(
  state: SimState,
  orderId: string,
  emit: Emit,
): void {
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
  state.stats.costOfSales += PRODUCTS[productId].cost;
  order.state = "done";
  order.facts.push("correct-item");
  const worker = state.workers[order.workerId];
  let tip = 0;
  if (worker) {
    worker.served += 1;
    worker.expression = "happy";
    worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    gainExperience(worker, emit);
    // "Thần tài": khách boa gấp đôi; "Cầm nhầm tiền két": két hụt vài xu (lộ ra khi đối soát cuối ngày).
    if (hasTrait(worker, "lucky") && nextFloat(state.rng.staff) < 0.2)
      tip = amount;
    if (
      hasTrait(worker, "sticky-fingers") &&
      nextFloat(state.rng.staff) < 0.15
    ) {
      const taken = Math.min(state.money, nextInt(state.rng.staff, 1, 3));
      state.money -= taken;
      state.stats.pilfered += taken;
    }
  }
  state.money += tip;
  state.stats.revenue += tip;
  state.stats.tips += tip;
  const counterId =
    state.counters.find((c) => c.customerId === customer.id)?.id ?? "counter-1";
  emit({
    type: "saleCompleted",
    orderId,
    productId,
    amount,
    tip,
    customerId: customer.id,
    workerId: order.workerId,
    counterId,
  });
  dismissCustomer(state, customer, "bought", emit);
}
