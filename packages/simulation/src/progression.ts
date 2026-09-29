import { PRODUCT_IDS, PRODUCTS } from "./content/products";
import type { ProductId } from "./content/types";
import { UPGRADES } from "./content/upgrades";
import { SHIFT_IDS, type DeepReadonly, type SimState } from "./types";

export const MILESTONES = [
  { level: 1, sales: 0, day: 1, slots: 4 },
  { level: 2, sales: 8, day: 2, slots: 8 },
  { level: 3, sales: 22, day: 3, slots: 12 },
  { level: 4, sales: 45, day: 5, slots: 16 },
  { level: 5, sales: 80, day: 7, slots: 20 },
] as const;

export function playerLevel(state: DeepReadonly<SimState>): number {
  if (
    state.upgrades.includes("warehouse-5") &&
    state.upgrades.includes("storefront-5")
  )
    return 5;
  return MILESTONES.reduce(
    (level, milestone) =>
      state.stats.sales >= milestone.sales && state.day >= milestone.day
        ? milestone.level
        : level,
    1,
  );
}

export function facilityLevel(
  state: DeepReadonly<SimState>,
  facility: "warehouse" | "storefront" | "wide-shelf",
): number {
  return (
    1 +
    state.upgrades.filter(
      (id) => id === facility || id.startsWith(`${facility}-`),
    ).length
  );
}

export function productLevel(id: ProductId): number {
  return Math.floor(PRODUCT_IDS.indexOf(id) / 4) + 1;
}

export function isProductUnlocked(
  state: DeepReadonly<SimState>,
  id: ProductId,
): boolean {
  const level = productLevel(id);
  return (
    level <= playerLevel(state) &&
    level <= facilityLevel(state, "warehouse") &&
    level <= facilityLevel(state, "storefront")
  );
}

export function unlockedProducts(state: DeepReadonly<SimState>): ProductId[] {
  return PRODUCT_IDS.filter((id) => isProductUnlocked(state, id));
}

/** Một mặt hàng thay đổi mỗi ngày; không dùng RNG nên save/replay luôn khớp. */
export function trendingProduct(state: DeepReadonly<SimState>): ProductId {
  const visible = unlockedProducts(state);
  return visible[(state.day * 3 + Math.floor(state.day / 3)) % visible.length]!;
}

export function isTrending(
  state: DeepReadonly<SimState>,
  id: ProductId,
): boolean {
  return trendingProduct(state) === id;
}

export function stockUnitCost(
  state: DeepReadonly<SimState>,
  id: ProductId,
): number {
  return isTrending(state, id)
    ? Math.ceil(PRODUCTS[id].cost * 1.2)
    : PRODUCTS[id].cost;
}

export function suggestedPrice(
  state: DeepReadonly<SimState>,
  id: ProductId,
): number {
  return isTrending(state, id)
    ? Math.ceil(PRODUCTS[id].referencePrice * 1.2)
    : PRODUCTS[id].referencePrice;
}

/** Chỗ nhân viên mỗi ca khi mới mở tiệm (không tính người chơi). */
export const BASE_STAFF_PER_SHIFT = 1;

export interface StaffLimits {
  /** Số NPC tối đa có lịch ở mỗi ca. */
  perShift: number;
  /** Số NPC tối đa trong đội: đủ người cho mọi ca cộng người dự phòng để luân phiên nghỉ. */
  total: number;
}

/** Tính từ các nâng cấp đã mua (hiệu ứng 'staff'), nên save cũ và nâng cấp mới luôn khớp mà không cần lưu thêm. */
export function staffLimits(state: DeepReadonly<SimState>): StaffLimits {
  let perShift = BASE_STAFF_PER_SHIFT;
  let reserve = 0;
  for (const id of state.upgrades) {
    for (const effect of UPGRADES[id]?.effects ?? []) {
      if (effect.type !== "staff") continue;
      perShift += effect.perShift;
      reserve += effect.reserve;
    }
  }
  return { perShift, total: perShift * SHIFT_IDS.length + reserve };
}

/** Nâng cấp kế tiếp (chưa mua) mở thêm chỗ nhân viên, để giao diện gợi ý đường mở rộng đội. */
export function nextStaffUpgrade(state: DeepReadonly<SimState>): string | null {
  const order = [
    "storefront-2",
    "storefront-3",
    "counter-2",
    "storefront-4",
    "storefront-5",
  ];
  return order.find((id) => !state.upgrades.includes(id)) ?? null;
}
