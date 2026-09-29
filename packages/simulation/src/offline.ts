import { canRunUnattended } from './economy';
import type { Simulation } from './simulation';
import type { SimState } from './types';

/*
 * Tiến trình khi vắng mặt: chạy ĐÚNG mô phỏng thật (cùng NPC, cùng luật, cùng seed) trong khoảng
 * thời gian đã trôi, có trần. Không có công thức ước lượng riêng nên không thể "offline lời hơn online".
 */

export interface OfflineSummary {
  /** Thời gian thật đã vắng mặt. */
  awayMs: number;
  /** Thời gian đã mô phỏng (≤ trần). */
  simulatedMs: number;
  capped: boolean;
  /** false: người chơi tự đứng quầy nên tiệm đóng cửa, không mô phỏng gì. */
  storeOpen: boolean;
  customers: number;
  sales: number;
  revenue: number;
  referrals: number;
  leftAngry: number;
  turnedAway: number;
  stockCost: number;
  wages: number;
  reviews: number;
  avgStars: number | null;
  complaints: number;
  openComplaints: number;
  daysEnded: number;
  moneyDelta: number;
  expiredStock: number;
  returningCustomers: number;
  /** Đơn ship giao xong (trong đó trễ hẹn) và bị huỷ khi vắng mặt. */
  deliveries: number;
  lateDeliveries: number;
  cancelledDeliveries: number;
}

/** Số tick tối đa chạy trước khi dọn hàng đợi sự kiện, tránh giữ hàng chục nghìn sự kiện trong bộ nhớ. */
const DRAIN_EVERY = 500;

export function runOffline(sim: Simulation, awayMs: number): OfflineSummary {
  const before = JSON.parse(JSON.stringify(sim.snapshot)) as SimState;
  const storeOpen = canRunUnattended(before);
  const capMs = before.config.offlineCapMs;
  const targetMs = storeOpen ? Math.min(Math.max(0, awayMs), capMs) : 0;
  const ticks = Math.floor(targetMs / before.config.tickMs);

  let complaints = 0;
  const countEvents = () => {
    for (const e of sim.drainEvents()) if (e.type === 'complaintOpened') complaints++;
  };
  countEvents();
  for (let i = 0; i < ticks; i++) {
    sim.step();
    if (i % DRAIN_EVERY === DRAIN_EVERY - 1) countEvents();
  }
  countEvents();

  const after = sim.snapshot;
  const reviews = after.reputation.count - before.reputation.count;
  return {
    awayMs,
    simulatedMs: ticks * before.config.tickMs,
    capped: storeOpen && awayMs > capMs,
    storeOpen,
    customers: after.stats.customersArrived - before.stats.customersArrived,
    sales: after.stats.sales - before.stats.sales,
    revenue: after.stats.revenue - before.stats.revenue,
    referrals: after.stats.referrals - before.stats.referrals,
    leftAngry: after.stats.leftAngry - before.stats.leftAngry,
    turnedAway: after.stats.turnedAway - before.stats.turnedAway,
    stockCost: after.stats.spentOnStock - before.stats.spentOnStock,
    wages: after.stats.spentOnWages - before.stats.spentOnWages,
    reviews,
    avgStars: reviews > 0 ? (after.reputation.starsSum - before.reputation.starsSum) / reviews : null,
    complaints,
    openComplaints: after.complaints.filter((c) => c.status === 'open').length,
    daysEnded: after.day - before.day,
    moneyDelta: after.money - before.money,
    expiredStock: after.stats.expiredStock - before.stats.expiredStock,
    returningCustomers: after.stats.returningCustomers - before.stats.returningCustomers,
    deliveries: after.stats.deliveries - before.stats.deliveries,
    lateDeliveries: after.stats.lateDeliveries - before.stats.lateDeliveries,
    cancelledDeliveries: after.stats.cancelledDeliveries - before.stats.cancelledDeliveries,
  };
}
