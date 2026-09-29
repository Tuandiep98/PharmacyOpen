import { PRODUCT_IDS, PRODUCTS } from "./content/products";
import type { ProductId } from "./content/types";
import type { Emit } from "./events";
import type { DeepReadonly, SimState, StockEntry } from "./types";

/** FIFO theo hạn dùng; shelf luôn bằng tổng số món trong các lô. */
export function takeStock(entry: StockEntry): number | null {
  entry.batches.sort((a, b) => a.expiresAtMs - b.expiresAtMs);
  const first = entry.batches[0];
  if (!first || entry.shelf <= 0) return null;
  first.qty -= 1;
  entry.shelf -= 1;
  if (first.qty === 0) entry.batches.shift();
  return first.expiresAtMs;
}

export function addStock(
  entry: StockEntry,
  qty: number,
  expiresAtMs: number,
): void {
  if (qty <= 0) return;
  const batch = entry.batches.find((b) => b.expiresAtMs === expiresAtMs);
  if (batch) batch.qty += qty;
  else entry.batches.push({ qty, expiresAtMs });
  entry.shelf += qty;
  entry.batches.sort((a, b) => a.expiresAtMs - b.expiresAtMs);
}

/** Thu hồi lô hết hạn trước khi nhận lệnh bán hoặc bổ sung mới. */
export function expireStock(state: SimState, emit: Emit): void {
  for (const id of PRODUCT_IDS) {
    const entry = state.stock[id];
    let expired = 0;
    while (entry.batches[0] && entry.batches[0].expiresAtMs <= state.timeMs) {
      expired += entry.batches.shift()!.qty;
    }
    if (expired > 0) {
      entry.shelf -= expired;
      state.stats.expiredStock += expired;
      state.stats.expiredCost += expired * PRODUCTS[id].cost;
      emit({ type: "stockExpired", productId: id, qty: expired });
    }
  }
}

/**
 * Trả món đã lấy khỏi kệ về lại kệ (khách từ chối, bỏ đi, đơn ship bị huỷ). Món đã hết hạn
 * hoặc kệ đã đầy thì tính là hàng huỷ.
 */
export function returnUnits(
  state: SimState,
  productId: ProductId,
  expiries: readonly number[],
): void {
  const entry = state.stock[productId];
  for (const expiresAtMs of expiries) {
    if (expiresAtMs > state.timeMs && entry.shelf < entry.capacity) {
      addStock(entry, 1, expiresAtMs);
    } else {
      state.stats.expiredStock += 1;
      state.stats.expiredCost += PRODUCTS[productId].cost;
    }
  }
}

export function nextExpiry(
  state: DeepReadonly<SimState>,
  id: ProductId,
): number | null {
  return state.stock[id].batches[0]?.expiresAtMs ?? null;
}
