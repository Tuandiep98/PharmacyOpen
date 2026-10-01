import { cloneConfig, DEFAULT_CONFIG } from "./config";
import { PRODUCT_IDS, PRODUCTS } from "./content/products";
import { returnUnits } from "./stock";
import type { ProductId, StaffCandidateDef } from "./content/types";
import type { Emit } from "./events";
import { recordInteraction } from "./reputation";
import { recordVisit } from "./loyalty";
import { refreshRecruits } from "./recruit";
import { createStream } from "./rng";
import { emptyCollection } from "./collection";
import {
  SAVE_VERSION,
  SHIFT_IDS,
  type Customer,
  type CustomerOutcome,
  type SimConfig,
  type SimState,
  type SimStats,
  type StockEntry,
  type Worker,
  type WorkerDayStat,
} from "./types";

export const PLAYER_WORKER_ID = "w-player";

export function emptyDayStat(): WorkerDayStat {
  return { sales: 0, perfSum: 0, perfCount: 0, starsSum: 0, starsCount: 0 };
}

export function createInitialState(
  seed: number,
  config: SimConfig = DEFAULT_CONFIG,
): SimState {
  const stock = {} as Record<ProductId, StockEntry>;
  for (const [index, id] of PRODUCT_IDS.entries())
    stock[id] = {
      shelf: index < 4 ? PRODUCTS[id].shelfCapacity : 0,
      capacity: PRODUCTS[id].shelfCapacity,
      batches:
        index < 4
          ? [
              {
                qty: PRODUCTS[id].shelfCapacity,
                expiresAtMs: config.stockShelfLifeMs,
              },
            ]
          : [],
    };

  const player: Worker = {
    id: PLAYER_WORKER_ID,
    // Người chơi tự xưng "Tôi" trên mọi màn hình; khách ở quầy gọi bằng danh xưng (em, cháu…).
    name: "Tôi",
    role: "pharmacist",
    controller: "player",
    speed: 1,
    // Người chơi tự chọn món nên knowledge không dùng; communication áp dụng như mọi nhân viên.
    knowledge: 1,
    communication: 0.7,
    traits: [],
    hiddenTraits: [],
    rarity: "common",
    look: { gender: "female", skin: 1, hair: 0, hairStyle: 0, messy: false },
    wage: 0,
    wageOwed: 0,
    shifts: [...SHIFT_IDS],
    shiftsToday: ["morning"],
    orderId: null,
    task: null,
    thinkUntilMs: 0,
    expression: "neutral",
    emoteUntilMs: 0,
    served: 0,
    perfSum: 0,
    perfCount: 0,
    repStarsSum: 0,
    repCount: 0,
    xp: 0,
    level: 1,
    fatigue: 0,
    resigning: false,
    arrivesAtMs: 0,
    streak: 0,
    restDay: null,
    station: "support",
    dayStat: emptyDayStat(),
  };

  const prices = {} as Record<ProductId, number>;
  for (const id of PRODUCT_IDS) prices[id] = PRODUCTS[id].price;

  const stats: SimStats = {
    customersArrived: 0,
    sales: 0,
    revenue: 0,
    referrals: 0,
    leftAngry: 0,
    wrongItems: 0,
    safetyWarnings: 0,
    spentOnStock: 0,
    spentOnStaff: 0,
    spentOnUpgrades: 0,
    spentOnVouchers: 0,
    spentOnWages: 0,
    spentOnOperations: 0,
    turnedAway: 0,
    expiredStock: 0,
    returningCustomers: 0,
    costOfSales: 0,
    expiredCost: 0,
    waitMsSum: 0,
    servedCount: 0,
    tips: 0,
    pilfered: 0,
    deliveries: 0,
    lateDeliveries: 0,
    cancelledDeliveries: 0,
    backorders: 0,
    wentElsewhere: 0,
    rewardCoins: 0,
    itemSales: 0,
    chats: 0,
    chatsCompleted: 0,
    shopliftedUnits: 0,
    shopliftedCost: 0,
    burglaryLoss: 0,
    blindBagSpent: 0,
  };

  const ownConfig = cloneConfig(config);
  const state: SimState = {
    version: SAVE_VERSION,
    seed,
    tick: 0,
    timeMs: 0,
    nextId: 1,
    money: ownConfig.startingMoney,
    config: ownConfig,
    rng: {
      spawn: createStream(seed, "spawn"),
      customer: createStream(seed, "customer"),
      ai: createStream(seed, "ai"),
      review: createStream(seed, "review"),
      staff: createStream(seed, "staff"),
      delivery: createStream(seed, "delivery"),
      chat: createStream(seed, "chat"),
      loot: createStream(seed, "loot"),
      risk: createStream(seed, "risk"),
    },
    awareness: ownConfig.awarenessStart,
    standing: { day: 0, revenue: null, rating: null, staff: null },
    collection: emptyCollection(),
    finance: { loan: null, notice: null, bankrupt: false },
    security: {
      lockDurability: 0,
      riskHeat: 0,
      forceShoplifter: false,
      forceBurglary: false,
    },
    nextSpawnAtMs: ownConfig.firstSpawnMs,
    customers: {},
    queue: [],
    counters: [
      { id: "counter-1", customerId: null, operatorId: PLAYER_WORKER_ID },
    ],
    workers: { [PLAYER_WORKER_ID]: player },
    orders: {},
    deliveries: [],
    nextDeliveryAtMs: ownConfig.firstDeliveryMs,
    stock,
    loyalty: [],
    prices,
    day: 1,
    dayStartedAtMs: 0,
    dayReports: [],
    // Ngày khai trương: tiệm đã chuẩn bị sẵn và mở cửa ngay; từ ngày 2 mới có pha chuẩn bị.
    prep: { required: false, openedAtMs: 0, done: [] },
    operations: {
      score: 65,
      scoreAtDayStart: 65,
      choice: null,
      demandFactor: 1,
      transfers: 0,
      pendingTransfer: false,
    },
    shiftMark: { shift: "morning", stats: { ...stats } },
    shiftSummaries: [],
    ratingMilestones: [],
    recruits: [],
    recruitRerollDay: 0,
    keepCounterOnShiftChange: false,
    upgrades: [],
    interactions: [],
    reviews: [],
    complaints: [],
    reputation: { starsSum: 0, count: 0, histogram: [0, 0, 0, 0, 0] },
    stats,
    dayStart: {
      money: ownConfig.startingMoney,
      stats: { ...stats },
      starsSum: 0,
      reviewCount: 0,
    },
  };
  refreshRecruits(state);
  return state;
}

export function workerFromCandidate(candidate: StaffCandidateDef): Worker {
  return {
    id: `w-${candidate.id}`,
    name: candidate.name,
    role: candidate.role,
    controller: "ai",
    speed: candidate.speed,
    knowledge: candidate.knowledge,
    communication: candidate.communication,
    traits: [...candidate.traits],
    hiddenTraits: [...candidate.hiddenTraits],
    rarity: candidate.rarity,
    look: { ...candidate.look },
    wage: candidate.wage,
    wageOwed: 0,
    // Lịch ca do lệnh hire đặt (một ca còn chỗ); chấm công khi vào ca.
    shifts: [],
    shiftsToday: [],
    orderId: null,
    task: null,
    thinkUntilMs: 0,
    expression: "neutral",
    emoteUntilMs: 0,
    served: 0,
    perfSum: 0,
    perfCount: 0,
    repStarsSum: 0,
    repCount: 0,
    xp: 0,
    level: 1,
    fatigue: 0,
    resigning: false,
    arrivesAtMs: 0,
    streak: 0,
    restDay: null,
    station: "support",
    dayStat: emptyDayStat(),
  };
}

export function newId(state: SimState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}

/** Trả hàng đã lấy về kệ (khi khách từ chối hoặc bỏ đi). */
export function returnReservedStock(state: SimState, orderId: string): void {
  const order = state.orders[orderId];
  if (!order?.productId) return;
  returnUnits(state, order.productId, [
    order.productExpiresAtMs ?? state.timeMs,
  ]);
  order.productId = null;
  order.productExpiresAtMs = null;
}

/**
 * Kết thúc lượt của khách: ghi nhận tương tác (hiệu suất, đánh giá, danh tiếng), giải phóng quầy,
 * nhân viên và cho khách rời cửa hàng.
 */
export function dismissCustomer(
  state: SimState,
  customer: Customer,
  outcome: CustomerOutcome,
  emit: Emit,
): void {
  recordInteraction(
    state,
    customer,
    customer.orderId ? state.orders[customer.orderId] : undefined,
    outcome,
    emit,
  );
  recordVisit(
    state,
    customer,
    outcome,
    customer.orderId ? state.orders[customer.orderId] : undefined,
  );
  if (customer.orderId) {
    const order = state.orders[customer.orderId];
    if (order) {
      const worker = state.workers[order.workerId];
      if (worker && worker.orderId === order.id) {
        worker.orderId = null;
        worker.thinkUntilMs = 0;
      }
      // Đơn đã xong hoặc đã hủy không giữ lại trong state để save gọn.
      delete state.orders[order.id];
    }
    customer.orderId = null;
  }
  for (const counter of state.counters) {
    if (counter.customerId === customer.id) counter.customerId = null;
  }
  state.queue = state.queue.filter((id) => id !== customer.id);
  customer.phase = "leaving";
  customer.outcome = outcome;
  customer.leaveAtMs = state.timeMs + state.config.leaveMs;
  const waitedTooLong = customer.patienceMs / customer.patienceMaxMs < 0.35;
  customer.expression =
    outcome === "bought"
      ? waitedTooLong
        ? "neutral"
        : "happy"
      : outcome === "referred"
        ? "grateful"
        : outcome === "left-angry"
          ? "angry"
          : "neutral";
}
