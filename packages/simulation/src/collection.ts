import {
  COLLECTIBLES,
  COLLECTIBLE_IDS,
  FIT_DROP_WEIGHTS,
  FIT_GRADE_WEIGHTS,
  GRADE_POWER,
  ITEM_SELL_PRICE,
  MAX_COLLECTION,
  SLOT_PLACES,
  STAT_CAPS,
} from "./content/collectibles";
import type { Emit } from "./events";
import { pickWeighted } from "./rng";
import {
  GRADES,
  type CollectStat,
  type CollectibleItem,
  type CollectionState,
  type DeepReadonly,
  type Grade,
  type SimState,
} from "./types";

/*
 * Đồ sưu tầm (thưởng mục tiêu ngày): rơi ngẫu nhiên có seed (luồng RNG `loot`), có hạng S/A/B/C, đặt
 * ở quầy/kệ/trong tiệm hoặc cho nhân vật đeo. Chỉ món đang đặt mới có tác dụng; món đeo chỉ có tác dụng
 * khi người đeo đang có mặt trong ca. Bộ sưu tập thuộc về người chơi nên đi theo qua các chi nhánh.
 */

export function emptyCollection(): CollectionState {
  return { items: [], equipped: {}, nextUid: 1 };
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Tạo một món cụ thể (dùng cho rơi đồ và test). */
export function makeItem(
  state: SimState,
  defId: string,
  grade: Grade,
): CollectibleItem {
  const def = COLLECTIBLES[defId]!;
  const power = GRADE_POWER[grade];
  return {
    uid: `it${state.collection.nextUid++}`,
    defId,
    grade,
    effects: def.effects.map(({ stat, base }) => ({
      stat,
      value: round3(base * (base >= 0 ? power.good : power.bad)),
    })),
    obtainedDay: state.day,
  };
}

/** Rơi một món: chọn độ hợp tiệm, rồi món, rồi hạng theo độ hợp. */
export function rollCollectible(state: SimState): CollectibleItem {
  const rng = state.rng.loot;
  const fit = pickWeighted(
    rng,
    Object.entries(FIT_DROP_WEIGHTS) as [keyof typeof FIT_DROP_WEIGHTS, number][],
  );
  const pool = COLLECTIBLE_IDS.filter((id) => COLLECTIBLES[id]!.fit === fit);
  const defId = pickWeighted(
    rng,
    pool.map((id) => [id, 1] as const),
  );
  const grade = pickWeighted(
    rng,
    GRADES.map((g) => [g, FIT_GRADE_WEIGHTS[fit][g]] as const),
  );
  return makeItem(state, defId, grade);
}

/** Thêm vào bộ sưu tập; đầy thì trả về false (người gọi đổi thành xu). */
export function addItem(state: SimState, item: CollectibleItem): boolean {
  if (state.collection.items.length >= MAX_COLLECTION) return false;
  state.collection.items.push(item);
  return true;
}

/** Chỗ đặt hợp lệ cho một món ở tiệm hiện tại. */
export function placesFor(
  state: DeepReadonly<SimState>,
  item: DeepReadonly<CollectibleItem>,
): string[] {
  const def = COLLECTIBLES[item.defId];
  if (!def) return [];
  if (def.slot === "wear")
    return Object.keys(state.workers).map((id) => `wear:${id}`);
  if (def.slot === "counter")
    return SLOT_PLACES.counter.filter((place) =>
      state.counters.some((c) => c.id === place),
    );
  return SLOT_PLACES[def.slot];
}

/** Chỗ đang đặt món này (null nếu đang cất). */
export function placeOf(
  state: DeepReadonly<SimState>,
  uid: string,
): string | null {
  for (const [place, id] of Object.entries(state.collection.equipped))
    if (id === uid) return place;
  return null;
}

export function itemAt(
  state: DeepReadonly<SimState>,
  place: string,
): DeepReadonly<CollectibleItem> | undefined {
  const uid = state.collection.equipped[place];
  return uid ? state.collection.items.find((i) => i.uid === uid) : undefined;
}

/** Người đeo có đang ở tiệm (trong ca, đã tới) không; người chơi luôn có mặt. */
function wearerActive(state: DeepReadonly<SimState>, workerId: string): boolean {
  const worker = state.workers[workerId];
  if (!worker) return false;
  if (worker.controller === "player") return true;
  const shift =
    state.timeMs - state.dayStartedAtMs < state.config.dayMs / 2
      ? "morning"
      : "afternoon";
  return (
    worker.restDay !== state.day &&
    worker.shifts.includes(shift) &&
    state.timeMs >= worker.arrivesAtMs
  );
}

/** Tổng hiệu ứng một chỉ số từ các món đang đặt/đeo có tác dụng, có trần cả hai chiều. */
export function collectionBonus(
  state: DeepReadonly<SimState>,
  stat: CollectStat,
): number {
  // Save cũ chưa migration (test tạo state thủ công) có thể thiếu bộ sưu tập.
  if (!state.collection) return 0;
  let total = 0;
  for (const [place, uid] of Object.entries(state.collection.equipped)) {
    if (place.startsWith("wear:") && !wearerActive(state, place.slice(5)))
      continue;
    const item = state.collection.items.find((i) => i.uid === uid);
    for (const effect of item?.effects ?? [])
      if (effect.stat === stat) total += effect.value;
  }
  const cap = STAT_CAPS[stat];
  return Math.max(-cap, Math.min(cap, total));
}

export type CollectionResult =
  | "ok"
  | "unknown-item"
  | "invalid-place"
  | "not-equipped";

/** Đặt/đeo một món; chỗ đó đang có món khác thì món cũ được cất lại. */
export function equipItem(
  state: SimState,
  uid: string,
  place: string,
  emit: Emit,
): CollectionResult {
  const item = state.collection.items.find((i) => i.uid === uid);
  if (!item) return "unknown-item";
  if (!placesFor(state, item).includes(place)) return "invalid-place";
  const previous = placeOf(state, uid);
  if (previous) delete state.collection.equipped[previous];
  state.collection.equipped[place] = uid;
  emit({ type: "itemEquipped", uid, place });
  return "ok";
}

export function unequipItem(
  state: SimState,
  uid: string,
  emit: Emit,
): CollectionResult {
  const place = placeOf(state, uid);
  if (!place) return "not-equipped";
  delete state.collection.equipped[place];
  emit({ type: "itemEquipped", uid, place: null });
  return "ok";
}

/** Bán lấy xu (theo hạng) hoặc bỏ đi; món đang đặt được gỡ trước. */
export function removeItem(
  state: SimState,
  uid: string,
  sell: boolean,
  emit: Emit,
): CollectionResult {
  const index = state.collection.items.findIndex((i) => i.uid === uid);
  const item = state.collection.items[index];
  if (!item) return "unknown-item";
  const place = placeOf(state, uid);
  if (place) delete state.collection.equipped[place];
  state.collection.items.splice(index, 1);
  const coins = sell ? ITEM_SELL_PRICE[item.grade] : 0;
  state.money += coins;
  state.stats.itemSales += coins;
  emit({ type: "itemRemoved", uid, defId: item.defId, coins });
  return "ok";
}

/**
 * Đọc lại bộ sưu tập từ bản sao lưu riêng của người chơi (tầng web giữ khi "chơi lại từ đầu"). Món lạ,
 * hạng hay hiệu ứng không hợp lệ bị bỏ; hiệu ứng được tính lại từ danh mục theo hạng để không sửa tay
 * được. Chỉ giữ chỗ đặt trong tiệm và món người chơi đeo (nhân viên cũ không còn).
 */
export function restoreCollection(raw: unknown): CollectionState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as { items?: unknown; equipped?: unknown };
  if (!Array.isArray(source.items)) return null;
  const restored = emptyCollection();
  const fake = { collection: restored, day: 0 } as SimState;
  for (const entry of source.items.slice(0, MAX_COLLECTION)) {
    const e = entry as Partial<CollectibleItem>;
    if (
      typeof e.defId !== "string" ||
      !COLLECTIBLES[e.defId] ||
      !GRADES.includes(e.grade as Grade)
    )
      continue;
    const item = makeItem(fake, e.defId, e.grade as Grade);
    item.obtainedDay = typeof e.obtainedDay === "number" ? e.obtainedDay : 0;
    // Giữ uid cũ để khớp chỗ đặt (nếu hợp lệ và không trùng).
    if (
      typeof e.uid === "string" &&
      /^it\d+$/.test(e.uid) &&
      !restored.items.some((i) => i.uid === e.uid)
    )
      item.uid = e.uid;
    restored.items.push(item);
  }
  restored.nextUid =
    1 +
    Math.max(0, ...restored.items.map((i) => Number(i.uid.slice(2)) || 0));
  const equipped =
    typeof source.equipped === "object" && source.equipped !== null
      ? (source.equipped as Record<string, unknown>)
      : {};
  const allowed = [
    ...SLOT_PLACES.counter,
    ...SLOT_PLACES.shelf,
    ...SLOT_PLACES.store,
    "wear:w-player",
  ];
  for (const [place, uid] of Object.entries(equipped))
    if (
      allowed.includes(place) &&
      typeof uid === "string" &&
      restored.items.some((i) => i.uid === uid)
    )
      restored.equipped[place] = uid;
  return restored;
}

/** Gỡ các món đang đeo trên người đã rời tiệm (nghỉ việc, điều chuyển). */
export function pruneEquipped(state: SimState): void {
  for (const [place, uid] of Object.entries(state.collection.equipped)) {
    const gone =
      (place.startsWith("wear:") && !state.workers[place.slice(5)]) ||
      (place.startsWith("counter-") &&
        !state.counters.some((c) => c.id === place)) ||
      !state.collection.items.some((i) => i.uid === uid);
    if (gone) delete state.collection.equipped[place];
  }
}
