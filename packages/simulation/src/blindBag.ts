import { COLLECTIBLE_IDS, ITEM_SELL_PRICE } from "./content/collectibles";
import { PRODUCTS } from "./content/products";
import type { Emit } from "./events";
import { addItem, makeItem } from "./collection";
import { playerLevel, unlockedProducts } from "./progression";
import { nextFloat, nextInt, pickWeighted } from "./rng";
import { addStock } from "./stock";
import { GRADES, type DeepReadonly, type Grade, type SimState } from "./types";

export const BLIND_BAG_GRADE_ODDS: Record<Grade, number> = {
  S: 0.5,
  A: 2.5,
  B: 17,
  C: 80,
};

export const BLIND_BAG_TRASH = [
  "Trúng gió",
  "Cái nịt",
  "Cọng thun",
  "Một mẩu giấy ghi: chúc may mắn lần sau",
] as const;

export const BLIND_BAG_BASE_PRICE = 30;
export const BLIND_BAG_PRICE_STEP = 5;

export function blindBagPrice(state: DeepReadonly<SimState>): number {
  return (
    BLIND_BAG_BASE_PRICE +
    state.collection.blindBagCollectibles * BLIND_BAG_PRICE_STEP
  );
}

export type BlindBagResult = "ok" | "insufficient-funds";

/**
 * Túi mù là sink tiền có công khai rủi ro: 25% rác/không có gì, 27% hàng bán,
 * 48% đồ sưu tầm. Hạng S/A thấp hơn rõ rệt so với ghép ba món hạng C.
 */
export function openBlindBag(state: SimState, emit: Emit): BlindBagResult {
  const price = blindBagPrice(state);
  if (state.money < price) return "insufficient-funds";
  state.money -= price;
  state.stats.blindBagSpent += price;
  state.collection.blindBagPurchases += 1;

  const roll = nextFloat(state.rng.loot);
  if (roll < 0.25) {
    const label =
      BLIND_BAG_TRASH[nextInt(state.rng.loot, 0, BLIND_BAG_TRASH.length - 1)]!;
    emit({
      type: "blindBagOpened",
      price,
      outcome: "trash",
      label,
      uid: null,
      defId: null,
      grade: null,
      productId: null,
      qty: 0,
      overflowCoins: 0,
    });
    return "ok";
  }

  if (roll < 0.52) {
    const candidates = unlockedProducts(state).filter(
      (id) => state.stock[id].shelf < state.stock[id].capacity,
    );
    if (candidates.length) {
      const productId =
        candidates[nextInt(state.rng.loot, 0, candidates.length - 1)]!;
      const entry = state.stock[productId];
      const qty = Math.min(
        entry.capacity - entry.shelf,
        nextInt(
          state.rng.loot,
          1,
          Math.max(1, Math.min(5, playerLevel(state) + 1)),
        ),
      );
      addStock(entry, qty, state.timeMs + state.config.stockShelfLifeMs);
      emit({
        type: "blindBagOpened",
        price,
        outcome: "product",
        label: PRODUCTS[productId].name,
        uid: null,
        defId: null,
        grade: null,
        productId,
        qty,
        overflowCoins: 0,
      });
      return "ok";
    }
  }

  const grade = pickWeighted(
    state.rng.loot,
    GRADES.map((g) => [g, BLIND_BAG_GRADE_ODDS[g]] as const),
  );
  const defId =
    COLLECTIBLE_IDS[nextInt(state.rng.loot, 0, COLLECTIBLE_IDS.length - 1)]!;
  const item = makeItem(state, defId, grade);
  const stored = addItem(state, item);
  state.collection.blindBagCollectibles += 1;
  const overflowCoins = stored ? 0 : ITEM_SELL_PRICE[grade];
  if (!stored) {
    state.money += overflowCoins;
    state.stats.itemSales += overflowCoins;
  }
  emit({
    type: "blindBagOpened",
    price,
    outcome: "collectible",
    label: defId,
    uid: stored ? item.uid : null,
    defId,
    grade,
    productId: null,
    qty: 0,
    overflowCoins,
  });
  return "ok";
}
