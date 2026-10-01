import {
  COLLECTIBLES,
  COLLECTIBLE_IDS,
  FIT_DROP_WEIGHTS,
  FIT_GRADE_WEIGHTS,
  FUSE_GRADE_ANCHORS,
  FUSE_PITY,
  GRADE_POWER,
  GRADE_SCORE,
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
  type CollectibleSlot,
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
  return {
    items: [],
    equipped: {},
    nextUid: 1,
    fusePity: 0,
    blindBagPurchases: 0,
    blindBagCollectibles: 0,
  };
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
    Object.entries(FIT_DROP_WEIGHTS) as [
      keyof typeof FIT_DROP_WEIGHTS,
      number,
    ][],
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
    return Object.keys(state.workers).map(
      (id) => `wear:${id}:${def.wearLayer}`,
    );
  return (def.places ?? SLOT_PLACES[def.slot]).filter(
    (place) =>
      !place.startsWith("counter-") ||
      state.counters.some((c) => c.id === place),
  );
}

const wearerId = (place: string) => place.split(":")[1];

/** Chỗ đeo đời cũ không ghi lớp; suy ra từ món để tránh hai kính cùng nằm trên mắt. */
function sameWearLayer(state: SimState, a: string, b: string): boolean {
  if (
    !a.startsWith("wear:") ||
    !b.startsWith("wear:") ||
    wearerId(a) !== wearerId(b)
  )
    return false;
  const layer = (place: string) => {
    const explicit = place.split(":")[2];
    if (explicit) return explicit;
    const item = itemAt(state, place);
    return item ? COLLECTIBLES[item.defId]?.wearLayer : undefined;
  };
  return layer(a) === layer(b);
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
function wearerActive(
  state: DeepReadonly<SimState>,
  workerId: string,
): boolean {
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
    if (place.startsWith("wear:") && !wearerActive(state, wearerId(place)!))
      continue;
    const item = state.collection.items.find((i) => i.uid === uid);
    for (const effect of item?.effects ?? [])
      if (effect.stat === stat) total += effect.value;
  }
  const cap = STAT_CAPS[stat];
  return Math.max(-cap, Math.min(cap, total));
}

export type CollectionResult =
  "ok" | "unknown-item" | "invalid-place" | "not-equipped" | "fuse-needs-three";

/** Đặt/đeo một món; chỗ đó đang có món khác thì món cũ được cất lại. */
export function equipItem(
  state: SimState,
  uid: string,
  place: string,
  emit: Emit,
): CollectionResult {
  const item = state.collection.items.find((i) => i.uid === uid);
  if (!item) return "unknown-item";
  const legacyWear =
    place === `wear:${wearerId(place)}` &&
    COLLECTIBLES[item.defId]?.slot === "wear" &&
    !!state.workers[wearerId(place)!];
  if (!placesFor(state, item).includes(place) && !legacyWear)
    return "invalid-place";
  const previous = placeOf(state, uid);
  if (previous) delete state.collection.equipped[previous];
  for (const oldPlace of Object.keys(state.collection.equipped))
    if (sameWearLayer(state, oldPlace, place))
      delete state.collection.equipped[oldPlace];
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

/** Tỉ lệ hạng (%) khi ghép 3 món có các hạng này; `pity` = lần này được bảo hiểm (bỏ B/C). */
export function fuseGradeOdds(
  grades: readonly Grade[],
  pity = false,
): Record<Grade, number> {
  const score = grades.reduce((sum, g) => sum + GRADE_SCORE[g], 0);
  let lo = FUSE_GRADE_ANCHORS[0]!;
  let hi = FUSE_GRADE_ANCHORS[FUSE_GRADE_ANCHORS.length - 1]!;
  for (let i = 0; i < FUSE_GRADE_ANCHORS.length - 1; i++) {
    if (
      score >= FUSE_GRADE_ANCHORS[i]![0] &&
      score <= FUSE_GRADE_ANCHORS[i + 1]![0]
    ) {
      lo = FUSE_GRADE_ANCHORS[i]!;
      hi = FUSE_GRADE_ANCHORS[i + 1]!;
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (score - lo[0]) / (hi[0] - lo[0]);
  const odds = {} as Record<Grade, number>;
  for (const g of GRADES) odds[g] = lo[1][g] + (hi[1][g] - lo[1][g]) * t;
  if (pity) {
    odds.B = 0;
    odds.C = 0;
  }
  const total = GRADES.reduce((sum, g) => sum + odds[g], 0);
  for (const g of GRADES) odds[g] = round3((odds[g] / total) * 100);
  return odds;
}

/** Tỉ lệ loại món (%) khi ghép: theo số món mỗi loại trong 3 món đưa vào. */
export function fuseSlotOdds(
  defIds: readonly string[],
): Partial<Record<CollectibleSlot, number>> {
  const odds: Partial<Record<CollectibleSlot, number>> = {};
  for (const id of defIds) {
    const slot = COLLECTIBLES[id]?.slot;
    if (slot) odds[slot] = (odds[slot] ?? 0) + 100 / defIds.length;
  }
  return odds;
}

/** Lần ghép tới có được bảo hiểm (chắc chắn A trở lên) không. */
export function fusePityReady(state: DeepReadonly<SimState>): boolean {
  return (state.collection.fusePity ?? 0) >= FUSE_PITY - 1;
}

/**
 * Ghép 3 món khác nhau trong túi thành 1 món mới (luồng RNG `loot`). Món đang đặt/đeo được gỡ trước.
 * Hạng theo fuseGradeOdds, loại theo fuseSlotOdds, món cụ thể chọn đều trong loại đó.
 */
export function fuseItems(
  state: SimState,
  uids: readonly string[],
  emit: Emit,
): CollectionResult {
  if (uids.length !== 3 || new Set(uids).size !== 3) return "fuse-needs-three";
  const inputs = uids.map((uid) =>
    state.collection.items.find((i) => i.uid === uid),
  );
  if (inputs.some((item) => !item || !COLLECTIBLES[item.defId]))
    return "unknown-item";
  const used = inputs as CollectibleItem[];
  const pity = fusePityReady(state);
  const rng = state.rng.loot;
  const gradeOdds = fuseGradeOdds(
    used.map((i) => i.grade),
    pity,
  );
  const grade = pickWeighted(
    rng,
    GRADES.map((g) => [g, gradeOdds[g]] as const),
  );
  const slotOdds = fuseSlotOdds(used.map((i) => i.defId));
  const slot = pickWeighted(
    rng,
    Object.entries(slotOdds) as [CollectibleSlot, number][],
  );
  const pool = COLLECTIBLE_IDS.filter((id) => COLLECTIBLES[id]!.slot === slot);
  const defId = pickWeighted(
    rng,
    pool.map((id) => [id, 1] as const),
  );
  for (const item of used) {
    const place = placeOf(state, item.uid);
    if (place) delete state.collection.equipped[place];
  }
  state.collection.items = state.collection.items.filter(
    (i) => !uids.includes(i.uid),
  );
  const result = makeItem(state, defId, grade);
  state.collection.items.push(result);
  state.collection.fusePity =
    grade === "S" || grade === "A" ? 0 : (state.collection.fusePity ?? 0) + 1;
  emit({
    type: "itemsFused",
    consumed: used.map((i) => i.defId),
    uid: result.uid,
    defId,
    grade,
    pity,
  });
  return "ok";
}

/**
 * Đọc lại bộ sưu tập từ bản sao lưu riêng của người chơi (tầng web giữ khi "chơi lại từ đầu"). Món lạ,
 * hạng hay hiệu ứng không hợp lệ bị bỏ; hiệu ứng được tính lại từ danh mục theo hạng để không sửa tay
 * được. Chỉ giữ chỗ đặt trong tiệm và món người chơi đeo (nhân viên cũ không còn).
 */
export function restoreCollection(raw: unknown): CollectionState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const source = raw as {
    items?: unknown;
    equipped?: unknown;
    blindBagPurchases?: unknown;
    blindBagCollectibles?: unknown;
  };
  if (!Array.isArray(source.items)) return null;
  const restored = emptyCollection();
  if (
    typeof source.blindBagPurchases === "number" &&
    Number.isFinite(source.blindBagPurchases)
  )
    restored.blindBagPurchases = Math.max(
      0,
      Math.floor(source.blindBagPurchases),
    );
  if (
    typeof source.blindBagCollectibles === "number" &&
    Number.isFinite(source.blindBagCollectibles)
  )
    restored.blindBagCollectibles = Math.max(
      0,
      Math.floor(source.blindBagCollectibles),
    );
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
  const pity = (source as { fusePity?: unknown }).fusePity;
  if (typeof pity === "number" && Number.isFinite(pity))
    restored.fusePity = Math.max(0, Math.min(FUSE_PITY - 1, Math.floor(pity)));
  restored.nextUid =
    1 + Math.max(0, ...restored.items.map((i) => Number(i.uid.slice(2)) || 0));
  const equipped =
    typeof source.equipped === "object" && source.equipped !== null
      ? (source.equipped as Record<string, unknown>)
      : {};
  for (const [place, uid] of Object.entries(equipped)) {
    if (
      typeof uid !== "string" ||
      Object.values(restored.equipped).includes(uid)
    )
      continue;
    const item = restored.items.find((i) => i.uid === uid);
    if (!item) continue;
    const def = COLLECTIBLES[item.defId]!;
    if (def.slot === "wear") {
      if (
        place !== "wear:w-player" &&
        place !== `wear:w-player:${def.wearLayer}`
      )
        continue;
      const layerTaken = Object.entries(restored.equipped).some(
        ([oldPlace, oldUid]) =>
          oldPlace.startsWith("wear:w-player") &&
          COLLECTIBLES[restored.items.find((i) => i.uid === oldUid)!.defId]
            ?.wearLayer === def.wearLayer,
      );
      if (layerTaken) continue;
    } else if (!(def.places ?? SLOT_PLACES[def.slot]).includes(place)) continue;
    restored.equipped[place] = uid;
  }
  return restored;
}

/** Gỡ các món đang đeo trên người đã rời tiệm (nghỉ việc, điều chuyển). */
export function pruneEquipped(state: SimState): void {
  for (const [place, uid] of Object.entries(state.collection.equipped)) {
    const gone =
      (place.startsWith("wear:") && !state.workers[wearerId(place)!]) ||
      (place.startsWith("counter-") &&
        !state.counters.some((c) => c.id === place)) ||
      !state.collection.items.some((i) => i.uid === uid);
    if (gone) delete state.collection.equipped[place];
  }
}
