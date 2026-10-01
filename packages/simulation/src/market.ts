import { collectionBonus } from "./collection";
import { DEFAULT_CONFIG } from "./config";
import { stableHash } from "./content/names";
import type { ArchetypeId } from "./content/types";
import { serviceRate } from "./economy";
import { demandMultiplier, storeRating } from "./reputation";
import type {
  AgeGroup,
  DayReport,
  DeepReadonly,
  Persona,
  RegionStanding,
  SimState,
} from "./types";

/*
 * Nhịp khách của tiệm (spec §3k). Tiệm mới mở ít người biết tới nên khách mới ghé thưa; độ nhận biết
 * (0–100) tăng dần mỗi ngày theo bốn nhóm yếu tố người chơi can thiệp được:
 *   1. lên top khu vực (ranking.ts),
 *   2. biển hiệu sáng đèn (nâng cấp),
 *   3. khách quen quay lại,
 *   4. giữ chân khách: phục vụ đúng món, nhân viên giao tiếp tốt, ít khách bỏ về.
 * Mức tăng mỗi ngày có trần nên tiệm không nổi tiếng chỉ sau một hai ngày.
 */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Mức tăng/giảm độ nhận biết tối đa trong một ngày. */
export const AWARENESS_DAILY_MAX = 7;
export const AWARENESS_DAILY_MIN = -4;

/** Thưởng lượng khách theo hạng tốt nhất trên các bảng xếp hạng khu vực. */
export function standingBoost(standing: DeepReadonly<RegionStanding>): number {
  const ranks = [standing.revenue, standing.rating, standing.staff].filter(
    (r): r is number => r !== null,
  );
  if (!ranks.length) return 0;
  const best = Math.min(...ranks);
  return best === 1 ? 0.08 : best <= 3 ? 0.05 : best <= 10 ? 0.02 : 0;
}

/**
 * Khách quen đang "nhớ" tiệm kéo thêm lượt ghé: mỗi người đã thân (độ thân cao) cộng một chút,
 * có trần để tiệm nhiều khách quen không đông bất thường.
 */
export function regularsPull(state: DeepReadonly<SimState>): number {
  let pull = 0;
  for (const p of state.loyalty) {
    if (p.goodVisits <= 0 || p.lastOutcome === "left-angry") continue;
    pull += 0.004 + (p.rapport / 100) * 0.012;
  }
  return Math.min(0.12, pull);
}

/**
 * Hệ số lượt khách ghé (nhân vào tốc độ sinh khách, cùng với danh tiếng sao và sự cố vận hành):
 * sàn `arrivalFloor` khi chưa ai biết tới, 1 khi độ nhận biết đạt 100; cộng thưởng top khu vực và
 * sức kéo của khách quen.
 */
export function arrivalFactor(state: DeepReadonly<SimState>): number {
  const floor = state.config.arrivalFloor;
  const known = clamp(state.awareness / 100, 0, 1);
  return (
    (floor + (1 - floor) * known) * (1 + standingBoost(state.standing)) +
    regularsPull(state)
  );
}

/**
 * Độ đông hiện tại 0..1 (dùng để rút ngắn chuyện trò khi đông): tốc độ khách ghé so với tiệm đã quen
 * mặt không có biển hiệu, cộng số người đang xếp hàng.
 */
export function trafficPressure(state: DeepReadonly<SimState>): number {
  const current =
    state.config.spawnIntervalMs[0]! + state.config.spawnIntervalMs[1]!;
  const base =
    DEFAULT_CONFIG.spawnIntervalMs[0] + DEFAULT_CONFIG.spawnIntervalMs[1];
  const rate =
    (base / current) *
    arrivalFactor(state) *
    demandMultiplier(state) *
    state.operations.demandFactor;
  return clamp((rate - 0.55) / 0.9 + 0.12 * state.queue.length, 0, 1);
}

/**
 * Xác suất một lượt khách là khách quen quay lại (khi có người đủ điều kiện): mặc định 30%, cộng khi có
 * người giao tiếp tốt đang trong ca, khi gần đây ít đưa nhầm món, và đồ sưu tầm; trừ khi hay đưa nhầm.
 */
export function returningChance(state: DeepReadonly<SimState>): number {
  let chance = state.config.returningCustomerChance;
  const shift =
    state.timeMs - state.dayStartedAtMs < state.config.dayMs / 2
      ? "morning"
      : "afternoon";
  const bestTalker = Math.max(
    0,
    ...Object.values(state.workers)
      .filter(
        (w) =>
          w.controller === "player" ||
          (w.restDay !== state.day && w.shifts.includes(shift)),
      )
      .map((w) => w.communication),
  );
  if (bestTalker >= 0.75) chance += 0.04;
  chance += accuracyBonus(state);
  chance += collectionBonus(state, "returnChance");
  return clamp(chance, 0.1, 0.6);
}

/** Độ chính xác gần đây (40 lượt khách gần nhất có người phục vụ): ít đưa nhầm thì khách tin tiệm hơn. */
export function accuracyBonus(state: DeepReadonly<SimState>): number {
  const served = state.interactions.filter((i) => i.workerId !== null);
  if (served.length < 5) return 0;
  const clean =
    served.filter((i) => i.wrongProductIds.length === 0).length / served.length;
  return clean >= 0.95 ? 0.05 : clean >= 0.85 ? 0.02 : clean < 0.7 ? -0.04 : 0;
}

/** Chi tiết mức thay đổi độ nhận biết trong ngày (giao diện hiện từng dòng). */
export interface AwarenessBreakdown {
  wordOfMouth: number;
  signboard: number;
  regulars: number;
  service: number;
  lost: number;
  ranking: number;
  rating: number;
  decor: number;
  total: number;
}

export function awarenessBreakdown(
  state: DeepReadonly<SimState>,
  report: DeepReadonly<DayReport>,
): AwarenessBreakdown {
  const signLevel = state.upgrades.filter(
    (id) => id === "signboard" || id.startsWith("signboard-"),
  ).length;
  const rate = serviceRate(report);
  const wrong = Math.max(
    0,
    state.stats.wrongItems - state.dayStart.stats.wrongItems,
  );
  const lost = report.leftAngry + report.turnedAway;
  const parts = {
    // Người trong xóm tự truyền tai nhau; tiệm càng quen mặt thì càng ít "tin mới" để kể.
    wordOfMouth: state.awareness < 50 ? 3 : 2,
    signboard: signLevel * 1.2,
    regulars: Math.min(3, report.returningCustomers * 0.6),
    service:
      (rate === null ? 0 : rate >= 0.9 ? 2 : rate >= 0.75 ? 1 : 0) -
      Math.min(3, wrong * 0.5),
    lost: -Math.min(3, lost * 0.4),
    ranking:
      standingBoost(state.standing) >= 0.05
        ? 2
        : standingBoost(state.standing) > 0
          ? 1
          : 0,
    rating: storeRating(state) >= 4.3 ? 1 : storeRating(state) < 3 ? -1 : 0,
    decor: collectionBonus(state, "awareness"),
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    ...parts,
    total:
      Math.round(clamp(sum, AWARENESS_DAILY_MIN, AWARENESS_DAILY_MAX) * 10) /
      10,
  };
}

/** Cuối ngày: cập nhật độ nhận biết (0–100) theo kết quả ngày. */
export function updateAwareness(state: SimState, report: DayReport): void {
  const before = state.awareness;
  const { total } = awarenessBreakdown(state, report);
  state.awareness = Math.round(clamp(before + total, 0, 100) * 10) / 10;
  report.awareness = state.awareness;
  report.awarenessChange = Math.round((state.awareness - before) * 10) / 10;
}

// ---------------------------------------------------------------- Chân dung khách quen

const AGE_BY_ARCHETYPE: Record<ArchetypeId, [AgeGroup, number][]> = {
  hurried: [
    ["adult", 70],
    ["young", 30],
  ],
  curious: [
    ["young", 80],
    ["adult", 20],
  ],
  demanding: [
    ["adult", 60],
    ["senior", 40],
  ],
  careful: [
    ["senior", 70],
    ["adult", 30],
  ],
  thrifty: [
    ["senior", 60],
    ["adult", 40],
  ],
};

const OPENNESS: Record<ArchetypeId, number> = {
  curious: 0.8,
  careful: 0.6,
  thrifty: 0.55,
  hurried: 0.3,
  demanding: 0.25,
};

/** Tuổi, giới tính, độ cởi mở: suy từ kiểu khách + băm id, ổn định qua các lần tải. */
export function personaFor(
  id: string,
  archetypeId: ArchetypeId,
  female: boolean,
): Persona {
  const roll = stableHash(`${id}:age`) % 100;
  let acc = 0;
  let age: AgeGroup = "adult";
  for (const [group, weight] of AGE_BY_ARCHETYPE[archetypeId]) {
    acc += weight;
    if (roll < acc) {
      age = group;
      break;
    }
  }
  const jitter = ((stableHash(`${id}:open`) % 41) - 20) / 100;
  return {
    age,
    female,
    openness:
      Math.round(clamp(OPENNESS[archetypeId] + jitter, 0.05, 0.95) * 100) / 100,
  };
}
