import { PRODUCTS } from './content/products';
import type { ProductId } from './content/types';
import type { Emit } from './events';
import type { DayReport, DeepReadonly, SimState, Worker } from './types';

/*
 * Kinh tế idle (spec §3d): ngày trong game, lương, giá bán do người chơi đặt, tổng kết ngày.
 * Mọi khoản thu/chi vẫn đi qua state.money (số nguyên, không bao giờ âm).
 */

/** Tốc độ thực tế: bị nợ lương thì làm chậm hơn (hậu quả nhìn thấy được, không phạt ngầm). */
export function effectiveSpeed(worker: DeepReadonly<Worker>, owedFactor: number): number {
  return worker.wageOwed > 0 ? worker.speed * owedFactor : worker.speed;
}

/** Khoảng giá hợp lệ: không bán lỗ, không cao quá giá tham khảo × priceMaxFactor. */
export function priceBounds(state: DeepReadonly<SimState>, productId: ProductId): { min: number; max: number } {
  const product = PRODUCTS[productId];
  return { min: product.cost + 1, max: Math.ceil(product.referencePrice * state.config.priceMaxFactor) };
}

/** Tổng lương phải trả mỗi ngày cho đội hiện tại. */
export function dailyWages(state: DeepReadonly<SimState>): number {
  let total = 0;
  for (const worker of Object.values(state.workers)) total += worker.wage;
  return total;
}

export function totalWagesOwed(state: DeepReadonly<SimState>): number {
  let total = 0;
  for (const worker of Object.values(state.workers)) total += worker.wageOwed;
  return total;
}

/** Sổ sách từ đầu ngày tới hiện tại (dùng cho cả tổng kết cuối ngày lẫn màn hình "hôm nay"). */
export function dayReport(state: DeepReadonly<SimState>): DayReport {
  const start = state.dayStart;
  const now = state.stats;
  const reviews = state.reputation.count - start.reviewCount;
  const starsSum = state.reputation.starsSum - start.starsSum;
  return {
    day: state.day,
    revenue: now.revenue - start.stats.revenue,
    stockCost: now.spentOnStock - start.stats.spentOnStock,
    wages: now.spentOnWages - start.stats.spentOnWages,
    wagesOwed: totalWagesOwed(state),
    investments:
      now.spentOnStaff -
      start.stats.spentOnStaff +
      (now.spentOnUpgrades - start.stats.spentOnUpgrades) +
      (now.spentOnVouchers - start.stats.spentOnVouchers),
    profit: state.money - start.money,
    customers: now.customersArrived - start.stats.customersArrived,
    sales: now.sales - start.stats.sales,
    referrals: now.referrals - start.stats.referrals,
    leftAngry: now.leftAngry - start.stats.leftAngry,
    turnedAway: now.turnedAway - start.stats.turnedAway,
    reviews,
    // Phản hồi khiếu nại có thể nâng sao của đánh giá cũ; đó vẫn là thay đổi trong ngày nên giữ nguyên cách tính.
    avgStars: reviews > 0 ? starsSum / reviews : null,
  };
}

/** Tiến độ ngày hiện tại, 0..1. */
export function dayProgress(state: DeepReadonly<SimState>): number {
  return Math.min(1, (state.timeMs - state.dayStartedAtMs) / state.config.dayMs);
}

/**
 * Cuối ngày: trả lương (nợ cũ trước, lương mới sau; thiếu xu thì ghi nợ), chốt tổng kết,
 * bắt đầu ngày mới. Gọi mỗi tick.
 */
export function endDayIfDue(state: SimState, emit: Emit): void {
  if (state.timeMs - state.dayStartedAtMs < state.config.dayMs) return;

  let paidTotal = 0;
  for (const worker of Object.values(state.workers)) {
    const due = worker.wageOwed + worker.wage;
    if (due <= 0) continue;
    const paid = Math.min(state.money, due);
    state.money -= paid;
    paidTotal += paid;
    worker.wageOwed = due - paid;
    if (worker.wageOwed > 0) {
      worker.expression = 'worried';
      worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    }
  }
  state.stats.spentOnWages += paidTotal;

  const report = dayReport(state);
  state.dayReports.push(report);
  if (state.dayReports.length > state.config.keepDayReports) {
    state.dayReports.splice(0, state.dayReports.length - state.config.keepDayReports);
  }
  emit({ type: 'dayEnded', report });

  state.day += 1;
  state.dayStartedAtMs = state.timeMs;
  state.dayStart = {
    money: state.money,
    stats: { ...state.stats },
    starsSum: state.reputation.starsSum,
    reviewCount: state.reputation.count,
  };
}

/**
 * Tiệm chỉ tự chạy khi vắng mặt nếu quầy đã giao cho nhân viên NPC. Người chơi tự đứng quầy
 * thì tiệm "đóng cửa" khi vắng: thời gian không trôi, không trả lương, không mất khách.
 */
export function canRunUnattended(state: DeepReadonly<SimState>): boolean {
  return state.counters.some((c) => state.workers[c.operatorId]?.controller === 'ai');
}
