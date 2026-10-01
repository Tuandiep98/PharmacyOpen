import { PRODUCTS } from "./content/products";
import type { ProductId } from "./content/types";
import type { Emit } from "./events";
import { levelSpeedFactor, traitSpeedFactor } from "./recruit";
import {
  closeStaffDay,
  currentShift,
  shiftPay,
  shiftSummary,
  startDay,
} from "./shift";
import { storeRating } from "./reputation";
import { dailyOperationsCase, evaluateOperations } from "./operations";
import { addItem, rollCollectible } from "./collection";
import { ITEM_SELL_PRICE } from "./content/collectibles";
import { updateAwareness } from "./market";
import { playerLevel } from "./progression";
import { regionStanding } from "./ranking";
import { nextFloat } from "./rng";
import { resolveNightAndDebt } from "./security";
import {
  SHIFT_IDS,
  type DayReport,
  type DeepReadonly,
  type SimState,
  type SimStats,
  type Worker,
} from "./types";

/*
 * Kinh tế idle (spec §3d): ngày trong game, lương theo ca, giá bán do người chơi đặt, tổng kết ngày.
 * Mọi khoản thu/chi vẫn đi qua state.money (số nguyên, không bao giờ âm).
 */

/** Tốc độ thực tế: bị nợ lương thì làm chậm hơn (hậu quả nhìn thấy được, không phạt ngầm). */
export function effectiveSpeed(
  worker: DeepReadonly<Worker>,
  owedFactor: number,
): number {
  const base =
    worker.speed * levelSpeedFactor(worker.level) * traitSpeedFactor(worker);
  return worker.wageOwed > 0 ? base * owedFactor : base;
}

/** Khoảng giá hợp lệ: không bán lỗ, không cao quá giá tham khảo × priceMaxFactor. */
export function priceBounds(
  state: DeepReadonly<SimState>,
  productId: ProductId,
): { min: number; max: number } {
  const product = PRODUCTS[productId];
  return {
    min: product.cost + 1,
    max: Math.ceil(product.referencePrice * state.config.priceMaxFactor),
  };
}

/** Tổng lương mỗi ngày theo lịch ca hiện tại của đội. */
export function dailyWages(state: DeepReadonly<SimState>): number {
  let total = 0;
  for (const worker of Object.values(state.workers))
    total += shiftPay(worker.wage, worker.shifts.length);
  return total;
}

/** Lương cuối ngày hôm nay theo số ca mỗi người đã thực sự vào làm. */
export function wagesDueToday(state: DeepReadonly<SimState>): number {
  let total = 0;
  for (const worker of Object.values(state.workers))
    total += shiftPay(worker.wage, worker.shiftsToday.length);
  return total;
}

/**
 * Lương sẽ phải trả lúc đóng ngày nếu mọi người làm đúng lịch: nợ cũ + lương các ca đã vào làm + các ca
 * còn lại hôm nay theo lịch (bỏ qua người nghỉ hôm nay). Cùng thứ tự trả như endDayIfDue.
 */
export function wagesDueTonight(state: DeepReadonly<SimState>): {
  owed: number;
  today: number;
  total: number;
} {
  const from = SHIFT_IDS.indexOf(currentShift(state));
  let owed = 0;
  let today = 0;
  for (const worker of Object.values(state.workers)) {
    owed += worker.wageOwed;
    const shifts = new Set(worker.shiftsToday);
    if (worker.restDay !== state.day) {
      for (const shift of worker.shifts)
        if (SHIFT_IDS.indexOf(shift) >= from) shifts.add(shift);
    }
    today += shiftPay(worker.wage, shifts.size);
  }
  return { owed, today, total: owed + today };
}

export function totalWagesOwed(state: DeepReadonly<SimState>): number {
  let total = 0;
  for (const worker of Object.values(state.workers)) total += worker.wageOwed;
  return total;
}

export type DayGoalId = "profit" | "service" | "rating";

/** Ngưỡng mục tiêu ngày; mỗi mục đạt được là một sao xếp hạng ngày. */
export const DAY_GOALS = { serviceRate: 0.85, rating: 4 } as const;

/**
 * Tỉ lệ khách được phục vụ đúng (bán đúng món, khuyên đi khám đúng, hoặc hết hàng mà khách đồng ý
 * chờ đơn ship), null nếu chưa có khách.
 */
export function serviceRate(
  report: Pick<DayReport, "customers" | "sales" | "referrals" | "backorders">,
): number | null {
  return report.customers > 0
    ? Math.min(
        1,
        (report.sales + report.referrals + report.backorders) /
          report.customers,
      )
    : null;
}

/** Ba mục tiêu ngày: có lãi theo hoạt động, phục vụ tốt, khách hài lòng. */
export function dayGoals(
  report: Pick<
    DayReport,
    | "netProfit"
    | "customers"
    | "sales"
    | "referrals"
    | "backorders"
    | "avgStars"
    | "storeRating"
  >,
): { id: DayGoalId; met: boolean }[] {
  const rate = serviceRate(report);
  return [
    { id: "profit", met: report.netProfit > 0 },
    { id: "service", met: rate !== null && rate >= DAY_GOALS.serviceRate },
    // Chưa có đánh giá mới trong ngày thì xét điểm cửa hàng.
    {
      id: "rating",
      met: (report.avgStars ?? report.storeRating) >= DAY_GOALS.rating,
    },
  ];
}

/** Sổ sách từ đầu ngày tới hiện tại (dùng cho cả tổng kết cuối ngày lẫn màn hình "hôm nay"). */
export function dayReport(state: DeepReadonly<SimState>): DayReport {
  const start = state.dayStart;
  const now = state.stats;
  const diff = (key: keyof SimStats) => now[key] - start.stats[key];
  const reviews = state.reputation.count - start.reviewCount;
  const starsSum = state.reputation.starsSum - start.starsSum;
  const revenue = diff("revenue");
  const wages = diff("spentOnWages");
  const vouchers = diff("spentOnVouchers");
  const costOfSales = diff("costOfSales");
  const expiredCost = diff("expiredCost");
  // Một số save v14 đã được tạo trước khi bộ đếm này có mặt. Tránh NaN cả khi
  // phiên game cũ vẫn đang chạy trong tab và chưa được nạp lại qua migration.
  const operationsCost =
    (Number.isFinite(now.spentOnOperations) ? now.spentOnOperations : 0) -
    (Number.isFinite(start.stats.spentOnOperations)
      ? start.stats.spentOnOperations
      : 0);
  const served = diff("servedCount");
  const report: DayReport = {
    day: state.day,
    revenue,
    stockCost: diff("spentOnStock"),
    wages,
    wagesOwed: totalWagesOwed(state),
    investments:
      diff("spentOnStaff") +
      diff("spentOnUpgrades") +
      vouchers +
      diff("blindBagSpent"),
    profit: state.money - start.money,
    customers: diff("customersArrived"),
    sales: diff("sales"),
    referrals: diff("referrals"),
    leftAngry: diff("leftAngry"),
    turnedAway: diff("turnedAway"),
    reviews,
    expiredStock: diff("expiredStock"),
    returningCustomers: diff("returningCustomers"),
    // Phản hồi khiếu nại có thể nâng sao của đánh giá cũ; đó vẫn là thay đổi trong ngày nên giữ nguyên cách tính.
    avgStars: reviews > 0 ? starsSum / reviews : null,
    costOfSales,
    expiredCost,
    vouchers,
    operationsCost,
    // Nhập hàng là chuyển tiền thành hàng tồn, không phải lỗ; chỉ giá vốn của hàng đã bán/đã huỷ mới là chi phí.
    netProfit:
      revenue -
      costOfSales -
      wages -
      vouchers -
      operationsCost -
      expiredCost -
      diff("pilfered") -
      diff("shopliftedCost") -
      diff("burglaryLoss") -
      diff("blindBagSpent"),
    avgWaitMs: served > 0 ? diff("waitMsSum") / served : null,
    prepDone: state.prep.required ? state.prep.done.length : null,
    shifts: [
      ...state.shiftSummaries.map((s) => ({ ...s, staff: [...s.staff] })),
      shiftSummary(state),
    ],
    storeRating: storeRating(state),
    grade: 0,
    tips: diff("tips"),
    pilfered: diff("pilfered"),
    deliveries: diff("deliveries"),
    lateDeliveries: diff("lateDeliveries"),
    cancelledDeliveries: diff("cancelledDeliveries"),
    backorders: diff("backorders"),
    wentElsewhere: diff("wentElsewhere"),
    operationsScore: state.operations.score,
    operationsChange: state.operations.score - state.operations.scoreAtDayStart,
    incident: dailyOperationsCase(state)?.id ?? null,
    incidentChoice: state.operations.choice,
    staff: Object.values(state.workers)
      .filter((w) => w.shiftsToday.length > 0 || w.dayStat.sales > 0)
      .map((w) => ({
        workerId: w.id,
        name: w.name,
        role: w.role,
        level: w.level,
        shifts: w.shiftsToday.length,
        ...w.dayStat,
      })),
    awareness: state.awareness,
    awarenessChange: 0,
    chats: diff("chats"),
    chatsCompleted: diff("chatsCompleted"),
    reward: { coins: 0, itemUid: null },
    shopliftedUnits: diff("shopliftedUnits"),
    shopliftedCost: diff("shopliftedCost"),
    burglaryLoss: diff("burglaryLoss"),
    blindBagSpent: diff("blindBagSpent"),
  };
  report.grade = dayGoals(report).filter((g) => g.met).length;
  return report;
}

/** Xu thưởng theo số mục tiêu ngày đạt được (tăng nhẹ theo cấp tiệm) và cơ hội rơi đồ sưu tầm. */
export const DAY_REWARD_COINS = [0, 8, 18, 32] as const;
export const DAY_REWARD_ITEM_CHANCE = [0, 0.12, 0.3, 0.55] as const;

export function operationsRewardChance(
  report: DeepReadonly<DayReport>,
): number {
  if (!report.incident) return 0;
  return report.incidentChoice === "careful"
    ? 0.18
    : report.incidentChoice === "practical"
      ? 0.08
      : 0;
}

export function dayRewardCoins(grade: number, level: number): number {
  return Math.round(
    (DAY_REWARD_COINS[Math.max(0, Math.min(3, grade))] ?? 0) *
      (1 + 0.2 * (level - 1)),
  );
}

/** Trao thưởng mục tiêu ngày vào két (thu nhập ngoài bán hàng, không tính vào lãi ròng). */
function grantDayReward(state: SimState, report: DayReport, emit: Emit): void {
  const coins = dayRewardCoins(report.grade, playerLevel(state));
  state.money += coins;
  state.stats.rewardCoins += coins;
  let itemUid: string | null = null;
  let overflowCoins = 0;
  const goalChance =
    DAY_REWARD_ITEM_CHANCE[Math.max(0, Math.min(3, report.grade))] ?? 0;
  const operationsChance = operationsRewardChance(report);
  const chance = 1 - (1 - goalChance) * (1 - operationsChance);
  if (chance > 0 && nextFloat(state.rng.loot) < chance) {
    const item = rollCollectible(state);
    if (addItem(state, item)) itemUid = item.uid;
    else {
      // Bộ sưu tập đầy: món mới được bán luôn lấy xu.
      overflowCoins = ITEM_SELL_PRICE[item.grade];
      state.money += overflowCoins;
      state.stats.itemSales += overflowCoins;
    }
  }
  report.reward = { coins: coins + overflowCoins, itemUid };
  emit({
    type: "dayRewarded",
    day: report.day,
    coins,
    itemUid,
    overflowCoins,
  });
}

/** Tiến độ ngày hiện tại, 0..1. */
export function dayProgress(state: DeepReadonly<SimState>): number {
  return Math.min(
    1,
    (state.timeMs - state.dayStartedAtMs) / state.config.dayMs,
  );
}

/** Còn khách chưa rời tiệm: đang xếp hàng, ở quầy hoặc đang trò chuyện. */
export function customersInStore(state: DeepReadonly<SimState>): boolean {
  return Object.values(state.customers).some((c) => c.phase !== "leaving");
}

/**
 * Cuối ngày: trả lương theo số ca đã vào làm (nợ cũ trước, lương mới sau; thiếu xu thì ghi nợ),
 * chốt tổng kết, bắt đầu ngày mới ở pha chuẩn bị. Gọi mỗi tick. Hết giờ mà còn khách thì tăng ca
 * phục vụ nốt (tối đa `overtimeMaxMs`) rồi mới chốt.
 */
export function endDayIfDue(state: SimState, emit: Emit): void {
  const elapsed = state.timeMs - state.dayStartedAtMs;
  if (elapsed < state.config.dayMs) return;
  if (
    elapsed < state.config.dayMs + state.config.overtimeMaxMs &&
    customersInStore(state)
  )
    return;

  // Khiếu nại cũ tự đóng sau 2 ngày game; đánh giá và số sao vẫn giữ nguyên.
  for (const complaint of state.complaints) {
    if (
      complaint.status === "open" &&
      state.timeMs - complaint.atMs >= 2 * state.config.dayMs
    ) {
      complaint.status = "closed";
    }
  }

  let paidTotal = 0;
  for (const worker of Object.values(state.workers)) {
    const due =
      worker.wageOwed + shiftPay(worker.wage, worker.shiftsToday.length);
    if (due <= 0) continue;
    const paid = Math.min(state.money, due);
    state.money -= paid;
    paidTotal += paid;
    worker.wageOwed = due - paid;
    if (worker.wageOwed > 0) {
      worker.expression = "worried";
      worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    }
  }
  state.stats.spentOnWages += paidTotal;
  closeStaffDay(state, emit);
  resolveNightAndDebt(state, emit);

  const report = dayReport(state);
  evaluateOperations(state, report, emit);
  grantDayReward(state, report, emit);
  updateAwareness(state, report);
  state.dayReports.push(report);
  if (state.dayReports.length > state.config.keepDayReports) {
    state.dayReports.splice(
      0,
      state.dayReports.length - state.config.keepDayReports,
    );
  }
  // Hạng khu vực chốt theo 7 ngày gần nhất (tính cả hôm nay); dùng cho lượng khách ngày mai.
  state.standing = regionStanding(state);
  emit({ type: "dayEnded", report });

  state.day += 1;
  state.dayStartedAtMs = state.timeMs;
  state.dayStart = {
    money: state.money,
    stats: { ...state.stats },
    starsSum: state.reputation.starsSum,
    reviewCount: state.reputation.count,
  };
  startDay(state, emit);
}

/**
 * Tiệm chỉ tự chạy khi vắng mặt nếu quầy đã giao cho nhân viên NPC. Người chơi tự đứng quầy
 * thì tiệm "đóng cửa" khi vắng: thời gian không trôi, không trả lương, không mất khách.
 */
export function canRunUnattended(state: DeepReadonly<SimState>): boolean {
  return (
    !state.operations.pendingTransfer &&
    !state.finance.bankrupt &&
    !state.finance.notice &&
    state.counters.some(
      (c) =>
        (c.operatorId ? state.workers[c.operatorId] : undefined)?.controller ===
        "ai",
    )
  );
}
