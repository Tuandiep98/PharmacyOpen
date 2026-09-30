import {
  FAMILY_NAMES,
  GIVEN_NAMES,
  RARITIES,
  RARITY_IDS,
  STAFF_HAIR_STYLES,
  TRAITS,
  TRAIT_IDS,
} from "./content/staff";
import type { Gender, Rarity, StaffRole, TraitId } from "./content/types";
import type { Emit } from "./events";
import { LOOK_VARIANTS } from "./looks";
import { nextFloat, nextInt, pickWeighted, type RngState } from "./rng";
import { collectionBonus } from "./collection";
import type {
  DeepReadonly,
  Grade,
  Recruit,
  SimConfig,
  SimState,
  Worker,
} from "./types";

/*
 * Nhân viên (spec §3g): ứng viên sinh ngẫu nhiên mỗi ngày theo độ hiếm, đặc điểm có lợi/có hại/ẩn,
 * tay nghề tăng theo lượt bán, mệt mỏi khi làm hai ca. Mọi random đi qua luồng RNG `staff`.
 */

type TraitHolder = {
  readonly traits: readonly TraitId[];
  readonly hiddenTraits: readonly TraitId[];
};

/** Đặc điểm ẩn vẫn có tác dụng, chỉ là người chơi chưa thấy. */
export function hasTrait(worker: TraitHolder, id: TraitId): boolean {
  return worker.traits.includes(id) || worker.hiddenTraits.includes(id);
}

// ---------------------------------------------------------------- Tay nghề

/** Kinh nghiệm cần để đạt cấp n + 1 (mỗi lượt bán đúng = 1 kinh nghiệm). */
export const LEVEL_XP = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320] as const;
export const MAX_LEVEL = LEVEL_XP.length;

export function levelFor(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++)
    if (xp >= LEVEL_XP[i]!) level = i + 1;
  return level;
}

/** Mỗi cấp nhanh hơn 3% và hiểu hàng hơn 0,02. */
export function levelSpeedFactor(level: number): number {
  return 1 + 0.03 * (level - 1);
}

/** Tốc độ thực tế: chỉ số gốc × cấp × đặc điểm × (nợ lương thì chậm hơn). */
export function traitSpeedFactor(worker: TraitHolder): number {
  return (
    (hasTrait(worker, "quick-hands") ? 1.4 : 1) *
    (hasTrait(worker, "reckless") ? 1.3 : 1)
  );
}

/** Xác suất chọn đúng món / nhận ra khách cần đi khám. */
export function effectiveKnowledge(worker: DeepReadonly<Worker>): number {
  let k = worker.knowledge + 0.02 * (worker.level - 1);
  if (hasTrait(worker, "meticulous")) k += 0.15;
  if (hasTrait(worker, "sharp-memory")) k += 0.3;
  if (hasTrait(worker, "slow-learner")) k *= 0.5;
  if (hasTrait(worker, "reckless")) k *= 0.8;
  return Math.max(0, Math.min(1, k));
}

/** Bán đúng một món: cộng kinh nghiệm, báo lên cấp. */
export function gainExperience(worker: Worker, emit: Emit): void {
  if (worker.controller !== "ai") return;
  worker.xp += 1;
  const level = levelFor(worker.xp);
  if (level > worker.level) {
    worker.level = level;
    emit({ type: "staffLevelUp", workerId: worker.id, level });
  }
}

/** Đánh giá thấp do chính lỗi của người này: 10% khả năng mất chút kinh nghiệm (không bao giờ tụt cấp). */
export function loseExperience(
  state: SimState,
  worker: Worker,
  emit: Emit,
): void {
  if (worker.controller !== "ai" || nextFloat(state.rng.staff) >= 0.1) return;
  const floor = LEVEL_XP[worker.level - 1] ?? 0;
  if (worker.xp <= floor) return;
  worker.xp = Math.max(floor, worker.xp - 3);
  emit({ type: "staffSkillSlipped", workerId: worker.id });
}

// ---------------------------------------------------------------- Mệt mỏi

/** Mức mệt để xin thôi việc, và thay đổi cuối ngày theo số ca đã làm. */
export const QUIT_FATIGUE = 100;
export function fatigueDelta(
  worker: DeepReadonly<Worker>,
  shiftsWorked: number,
  config: Pick<SimConfig, "streakFatigueDays" | "streakFatigue">,
): number {
  if (shiftsWorked === 0) return -40;
  const base = shiftsWorked === 1 || hasTrait(worker, "ironman") ? -10 : 35;
  // Làm liên tục nhiều ngày không nghỉ cũng mệt, kể cả người "Trâu bò": cần xếp ngày nghỉ.
  return worker.streak >= config.streakFatigueDays
    ? base + config.streakFatigue
    : base;
}

/** Tăng lương giữ chân: +20% (ít nhất +1 xu/ca). */
export function retainWage(wage: number): number {
  return Math.max(wage + 1, Math.round(wage * 1.2));
}

// ---------------------------------------------------------------- Sinh ứng viên

const SPECIAL_GOOD = TRAIT_IDS.filter(
  (id) => TRAITS[id].tone === "good" && TRAITS[id].special,
);
const MINOR_GOOD = TRAIT_IDS.filter(
  (id) => TRAITS[id].tone === "good" && !TRAITS[id].special,
);
const MIXED = TRAIT_IDS.filter((id) => TRAITS[id].tone === "mixed");
const BAD = TRAIT_IDS.filter((id) => TRAITS[id].tone === "bad");
/** Các cặp mâu thuẫn không ra cùng một người. */
const CONFLICTS: [TraitId, TraitId][] = [
  ["sharp-memory", "slow-learner"],
  ["hardworking", "lazy"],
  ["quick-hands", "reckless"],
  ["meticulous", "reckless"],
  ["silver-tongue", "hot-tempered"],
  ["ironman", "lazy"],
];

const BLURBS: Record<StaffRole, string[]> = {
  pharmacist: [
    "Dược sĩ mới ra trường, muốn học việc ở tiệm nhỏ.",
    "Dược sĩ từng đứng quầy vài năm.",
    "Dược sĩ chuyển nghề từ bán lẻ.",
  ],
  clerk: [
    "Sinh viên làm thêm theo ca.",
    "Từng bán hàng ở cửa hàng tiện lợi.",
    "Muốn tìm việc ổn định gần nhà.",
  ],
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const between = (r: RngState, [min, max]: [number, number]) =>
  round2(min + nextFloat(r) * (max - min));
const pickOne = <T>(r: RngState, list: readonly T[]): T =>
  list[nextInt(r, 0, list.length - 1)]!;

function addTrait(
  r: RngState,
  list: TraitId[],
  taken: TraitId[],
  pool: readonly TraitId[],
): void {
  const options = pool.filter(
    (id) =>
      !taken.includes(id) &&
      !CONFLICTS.some(
        ([a, b]) =>
          (a === id && taken.includes(b)) || (b === id && taken.includes(a)),
      ),
  );
  if (options.length === 0) return;
  const id = pickOne(r, options);
  list.push(id);
  taken.push(id);
}

/** Đặc điểm theo độ hiếm: Thường/Khá thấy hết; Hiếm/Huyền thoại có thêm một đặc điểm ẩn. */
function rollTraits(
  r: RngState,
  rarity: Rarity,
): { traits: TraitId[]; hiddenTraits: TraitId[] } {
  const traits: TraitId[] = [];
  const hiddenTraits: TraitId[] = [];
  const taken: TraitId[] = [];
  // Kỹ năng dễ gặp hơn trước: người thường hầu như có một đặc điểm, người khá có thể có kỹ năng đặc biệt.
  switch (rarity) {
    case "common":
      if (nextFloat(r) < 0.8)
        addTrait(r, traits, taken, [...MINOR_GOOD, ...MIXED]);
      if (nextFloat(r) < 0.2) addTrait(r, traits, taken, BAD);
      break;
    case "good":
      addTrait(r, traits, taken, nextFloat(r) < 0.75 ? MINOR_GOOD : MIXED);
      if (nextFloat(r) < 0.3) addTrait(r, traits, taken, SPECIAL_GOOD);
      if (nextFloat(r) < 0.12) addTrait(r, traits, taken, BAD);
      break;
    case "rare":
      addTrait(r, traits, taken, SPECIAL_GOOD);
      if (nextFloat(r) < 0.5) addTrait(r, traits, taken, MINOR_GOOD);
      if (nextFloat(r) < 0.1) addTrait(r, traits, taken, BAD);
      addTrait(
        r,
        hiddenTraits,
        taken,
        nextFloat(r) < 0.5 ? BAD : [...MINOR_GOOD, ...MIXED],
      );
      break;
    case "legendary":
      addTrait(r, traits, taken, SPECIAL_GOOD);
      addTrait(r, traits, taken, MINOR_GOOD);
      addTrait(r, hiddenTraits, taken, nextFloat(r) < 0.5 ? BAD : SPECIAL_GOOD);
      break;
  }
  return { traits, hiddenTraits };
}

// ---------------------------------------------------------------- Hạng S/A/B/C

/** Giá trị đặc điểm khi chấm hạng: kỹ năng đặc biệt đáng giá nhất, đặc điểm xấu kéo hạng xuống. */
function traitValue(id: TraitId): number {
  const t = TRAITS[id];
  return t.tone === "good"
    ? t.special
      ? 10
      : 6
    : t.tone === "bad"
      ? t.special
        ? -10
        : -7
      : 2;
}

type Gradable = {
  readonly role: StaffRole;
  readonly speed: number;
  readonly knowledge: number;
  readonly communication: number;
  readonly traits: readonly TraitId[];
  readonly level?: number;
};

export interface StaffScore {
  /** 0–100: tổng năng lực làm việc (tốc độ, hiểu hàng, giao tiếp, kỹ năng/đặc điểm đã biết). */
  score: number;
  grade: Grade;
  parts: { speed: number; knowledge: number; communication: number; traits: number };
}

/**
 * Ngưỡng hạng theo điểm năng lực. Với tỉ lệ ứng viên hiện tại: S ~7%, A ~23%, B ~40%, C ~30%
 * (đo bằng 5000 ứng viên sinh ngẫu nhiên). Người làm lâu lên cấp thì điểm tăng, có thể lên hạng.
 */
export const GRADE_THRESHOLDS: Record<Exclude<Grade, "C">, number> = {
  S: 87,
  A: 71,
  B: 55,
};

export function gradeFor(score: number): Grade {
  return score >= GRADE_THRESHOLDS.S
    ? "S"
    : score >= GRADE_THRESHOLDS.A
      ? "A"
      : score >= GRADE_THRESHOLDS.B
        ? "B"
        : "C";
}

/**
 * Chấm năng lực theo những gì người chơi nhìn thấy (đặc điểm ẩn chưa tính, lộ ra thì hạng có thể đổi).
 * Tay nghề (cấp) nâng tốc độ và hiểu hàng thực tế nên người làm lâu có thể lên hạng.
 * Trọng số: hiểu hàng 34, tốc độ 32, giao tiếp 24, đặc điểm ±10; dược sĩ cộng 3 vì tư vấn chắc hơn.
 */
export function staffScore(worker: Gradable): StaffScore {
  const level = worker.level ?? 1;
  const holder = { traits: worker.traits, hiddenTraits: [] as TraitId[] };
  const speed =
    worker.speed * levelSpeedFactor(level) * traitSpeedFactor(holder);
  let knowledge = worker.knowledge + 0.02 * (level - 1);
  if (worker.traits.includes("meticulous")) knowledge += 0.15;
  if (worker.traits.includes("sharp-memory")) knowledge += 0.3;
  if (worker.traits.includes("slow-learner")) knowledge *= 0.5;
  if (worker.traits.includes("reckless")) knowledge *= 0.8;
  const parts = {
    speed: 32 * Math.max(0, Math.min(1, (speed - 0.75) / 0.6)),
    knowledge: 34 * Math.max(0, Math.min(1, knowledge)),
    communication: 24 * Math.max(0, Math.min(1, worker.communication)),
    traits: Math.max(
      -10,
      Math.min(10, worker.traits.reduce((sum, id) => sum + traitValue(id), 0) / 2),
    ),
  };
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        parts.speed +
          parts.knowledge +
          parts.communication +
          parts.traits +
          (worker.role === "pharmacist" ? 3 : 0) +
          5,
      ),
    ),
  );
  return { score, grade: gradeFor(score), parts };
}

/**
 * Lương mỗi ca tỉ lệ với năng lực (tiềm năng mang lại doanh thu), có trần để người giỏi không "OP":
 * điểm 40 → ~6 xu/ca, 65 → ~9, 90 → ~12. Dược sĩ +1. Đặc điểm ẩn không tính vào giá.
 */
export function wageFor(score: number, role: StaffRole): number {
  return Math.max(
    4,
    Math.min(14, Math.round(1.5 + score * 0.115) + (role === "pharmacist" ? 1 : 0)),
  );
}

/** Phí tuyển nhẹ nhàng: vài ca lương, hạng càng cao càng nhiều ca (C 3 ca … S 6 ca), làm tròn 5 xu. */
export function hireCostFor(wage: number, grade: Grade): number {
  const shifts = { C: 3, B: 4, A: 5, S: 6 }[grade];
  return Math.max(10, Math.round((wage * shifts) / 5) * 5);
}

/**
 * `luck` (đồ sưu tầm "dễ tuyển người giỏi", có thể âm): dời trọng số độ hiếm về phía bậc cao/thấp.
 * Ví dụ +0,1 làm bậc Khá/Hiếm/Huyền thoại nhiều hơn khoảng 10–30%.
 */
export function rarityWeights(luck: number): [Rarity, number][] {
  return RARITY_IDS.map((rid, index) => [
    rid,
    Math.max(0.2, RARITIES[rid].weight * (1 + luck * index)),
  ]);
}

export function generateRecruit(
  r: RngState,
  id: string,
  luck = 0,
): Recruit {
  const rarity = pickWeighted(r, rarityWeights(luck));
  const def = RARITIES[rarity];
  const gender: Gender = nextFloat(r) < 0.5 ? "female" : "male";
  const names = GIVEN_NAMES[gender];
  const name = `${pickOne(r, FAMILY_NAMES)} ${pickOne(r, names.middle)} ${pickOne(r, names.given)}`;
  const role: StaffRole = nextFloat(r) < 0.35 ? "pharmacist" : "clerk";
  const speed = between(r, def.speed);
  const knowledge = Math.min(
    0.95,
    round2(between(r, def.knowledge) + (role === "pharmacist" ? 0.1 : 0)),
  );
  const communication = between(r, def.communication);
  const { traits, hiddenTraits } = rollTraits(r, rarity);
  const { score, grade } = staffScore({
    role,
    speed,
    knowledge,
    communication,
    traits,
  });
  const wage = wageFor(score, role);
  const hireCost = hireCostFor(wage, grade);
  return {
    id,
    name,
    role,
    blurb: pickOne(r, BLURBS[role]),
    hireCost,
    wage,
    speed,
    knowledge,
    communication,
    rarity,
    traits,
    hiddenTraits,
    look: {
      gender,
      skin: nextInt(r, 0, LOOK_VARIANTS.skin - 1),
      hair: nextInt(r, 0, LOOK_VARIANTS.hair - 1),
      hairStyle: pickOne(r, STAFF_HAIR_STYLES[gender]),
      // Hiếm gặp: đầu bù tóc rối, áo nhàu. Chỉ để vui, không ảnh hưởng chỉ số.
      messy: nextFloat(r) < 0.03,
    },
    locked: false,
  };
}

/**
 * Đầu ngày (và khi làm mới có trả phí): thay mọi ô không khoá bằng ứng viên mới.
 * `tag` giúp id không trùng khi làm mới hai lần trong cùng một ngày.
 */
export function refreshRecruits(state: SimState, tag = ""): void {
  const slots: (Recruit | null)[] = [];
  const luck = collectionBonus(state, "recruitLuck");
  for (let i = 0; i < state.config.recruitSlots; i++) {
    const current = state.recruits[i];
    slots.push(
      current?.locked
        ? current
        : generateRecruit(state.rng.staff, `r${state.day}${tag}-${i}`, luck),
    );
  }
  state.recruits = slots;
}
