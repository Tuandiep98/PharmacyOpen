import { FAMILY_NAMES, GIVEN_NAMES, RARITIES, RARITY_IDS, STAFF_HAIR_STYLES, TRAITS, TRAIT_IDS } from './content/staff';
import type { Gender, Rarity, StaffRole, TraitId } from './content/types';
import type { Emit } from './events';
import { LOOK_VARIANTS } from './looks';
import { nextFloat, nextInt, pickWeighted, type RngState } from './rng';
import type { DeepReadonly, Recruit, SimState, Worker } from './types';

/*
 * Nhân viên (spec §3g): ứng viên sinh ngẫu nhiên mỗi ngày theo độ hiếm, đặc điểm có lợi/có hại/ẩn,
 * tay nghề tăng theo lượt bán, mệt mỏi khi làm hai ca. Mọi random đi qua luồng RNG `staff`.
 */

type TraitHolder = { readonly traits: readonly TraitId[]; readonly hiddenTraits: readonly TraitId[] };

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
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  return level;
}

/** Mỗi cấp nhanh hơn 3% và hiểu hàng hơn 0,02. */
export function levelSpeedFactor(level: number): number {
  return 1 + 0.03 * (level - 1);
}

/** Tốc độ thực tế: chỉ số gốc × cấp × đặc điểm × (nợ lương thì chậm hơn). */
export function traitSpeedFactor(worker: TraitHolder): number {
  return (hasTrait(worker, 'quick-hands') ? 1.4 : 1) * (hasTrait(worker, 'reckless') ? 1.3 : 1);
}

/** Xác suất chọn đúng món / nhận ra khách cần đi khám. */
export function effectiveKnowledge(worker: DeepReadonly<Worker>): number {
  let k = worker.knowledge + 0.02 * (worker.level - 1);
  if (hasTrait(worker, 'meticulous')) k += 0.15;
  if (hasTrait(worker, 'sharp-memory')) k += 0.3;
  if (hasTrait(worker, 'slow-learner')) k *= 0.5;
  if (hasTrait(worker, 'reckless')) k *= 0.8;
  return Math.max(0, Math.min(1, k));
}

/** Bán đúng một món: cộng kinh nghiệm, báo lên cấp. */
export function gainExperience(worker: Worker, emit: Emit): void {
  if (worker.controller !== 'ai') return;
  worker.xp += 1;
  const level = levelFor(worker.xp);
  if (level > worker.level) {
    worker.level = level;
    emit({ type: 'staffLevelUp', workerId: worker.id, level });
  }
}

/** Đánh giá thấp do chính lỗi của người này: 10% khả năng mất chút kinh nghiệm (không bao giờ tụt cấp). */
export function loseExperience(state: SimState, worker: Worker, emit: Emit): void {
  if (worker.controller !== 'ai' || nextFloat(state.rng.staff) >= 0.1) return;
  const floor = LEVEL_XP[worker.level - 1] ?? 0;
  if (worker.xp <= floor) return;
  worker.xp = Math.max(floor, worker.xp - 3);
  emit({ type: 'staffSkillSlipped', workerId: worker.id });
}

// ---------------------------------------------------------------- Mệt mỏi

/** Mức mệt để xin thôi việc, và thay đổi cuối ngày theo số ca đã làm. */
export const QUIT_FATIGUE = 100;
export function fatigueDelta(worker: DeepReadonly<Worker>, shiftsWorked: number): number {
  if (shiftsWorked === 0) return -40;
  if (shiftsWorked === 1 || hasTrait(worker, 'ironman')) return -10;
  return 35;
}

/** Tăng lương giữ chân: +20% (ít nhất +1 xu/ca). */
export function retainWage(wage: number): number {
  return Math.max(wage + 1, Math.round(wage * 1.2));
}

// ---------------------------------------------------------------- Sinh ứng viên

const SPECIAL_GOOD = TRAIT_IDS.filter((id) => TRAITS[id].tone === 'good' && TRAITS[id].special);
const MINOR_GOOD = TRAIT_IDS.filter((id) => TRAITS[id].tone === 'good' && !TRAITS[id].special);
const MIXED = TRAIT_IDS.filter((id) => TRAITS[id].tone === 'mixed');
const BAD = TRAIT_IDS.filter((id) => TRAITS[id].tone === 'bad');
/** Các cặp mâu thuẫn không ra cùng một người. */
const CONFLICTS: [TraitId, TraitId][] = [
  ['sharp-memory', 'slow-learner'],
  ['hardworking', 'lazy'],
  ['quick-hands', 'reckless'],
  ['meticulous', 'reckless'],
  ['silver-tongue', 'hot-tempered'],
  ['ironman', 'lazy'],
];

const BLURBS: Record<StaffRole, string[]> = {
  pharmacist: ['Dược sĩ mới ra trường, muốn học việc ở tiệm nhỏ.', 'Dược sĩ từng đứng quầy vài năm.', 'Dược sĩ chuyển nghề từ bán lẻ.'],
  clerk: ['Sinh viên làm thêm theo ca.', 'Từng bán hàng ở cửa hàng tiện lợi.', 'Muốn tìm việc ổn định gần nhà.'],
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const between = (r: RngState, [min, max]: [number, number]) => round2(min + nextFloat(r) * (max - min));
const pickOne = <T>(r: RngState, list: readonly T[]): T => list[nextInt(r, 0, list.length - 1)]!;

function addTrait(r: RngState, list: TraitId[], taken: TraitId[], pool: readonly TraitId[]): void {
  const options = pool.filter(
    (id) => !taken.includes(id) && !CONFLICTS.some(([a, b]) => (a === id && taken.includes(b)) || (b === id && taken.includes(a))),
  );
  if (options.length === 0) return;
  const id = pickOne(r, options);
  list.push(id);
  taken.push(id);
}

/** Đặc điểm theo độ hiếm: Thường/Khá thấy hết; Hiếm/Huyền thoại có thêm một đặc điểm ẩn. */
function rollTraits(r: RngState, rarity: Rarity): { traits: TraitId[]; hiddenTraits: TraitId[] } {
  const traits: TraitId[] = [];
  const hiddenTraits: TraitId[] = [];
  const taken: TraitId[] = [];
  switch (rarity) {
    case 'common':
      if (nextFloat(r) < 0.55) addTrait(r, traits, taken, [...MINOR_GOOD, ...MIXED]);
      if (nextFloat(r) < 0.25) addTrait(r, traits, taken, BAD);
      break;
    case 'good':
      addTrait(r, traits, taken, nextFloat(r) < 0.7 ? MINOR_GOOD : MIXED);
      if (nextFloat(r) < 0.15) addTrait(r, traits, taken, BAD);
      break;
    case 'rare':
      addTrait(r, traits, taken, SPECIAL_GOOD);
      if (nextFloat(r) < 0.1) addTrait(r, traits, taken, BAD);
      addTrait(r, hiddenTraits, taken, nextFloat(r) < 0.5 ? BAD : [...MINOR_GOOD, ...MIXED]);
      break;
    case 'legendary':
      addTrait(r, traits, taken, SPECIAL_GOOD);
      addTrait(r, traits, taken, MINOR_GOOD);
      addTrait(r, hiddenTraits, taken, nextFloat(r) < 0.5 ? BAD : SPECIAL_GOOD);
      break;
  }
  return { traits, hiddenTraits };
}

/** Lương mỗi ca theo năng lực nhìn thấy được; đặc điểm ẩn không tính vào giá (có thể là món hời hoặc rủi ro). */
function wageFor(role: StaffRole, rarity: Rarity, speed: number, knowledge: number, communication: number, traits: TraitId[]): number {
  let wage = 2 + (4 * (speed - 0.8)) / 0.5 + 5 * knowledge + 2 * communication + RARITIES[rarity].wageBonus;
  for (const id of traits) wage += TRAITS[id].tone === 'good' ? (TRAITS[id].special ? 3 : 2) : TRAITS[id].tone === 'bad' ? -1 : 0;
  if (role === 'pharmacist') wage += 2;
  return Math.max(4, Math.round(wage));
}

export function generateRecruit(r: RngState, id: string): Recruit {
  const rarity = pickWeighted(
    r,
    RARITY_IDS.map((rid) => [rid, RARITIES[rid].weight] as const),
  );
  const def = RARITIES[rarity];
  const gender: Gender = nextFloat(r) < 0.5 ? 'female' : 'male';
  const names = GIVEN_NAMES[gender];
  const name = `${pickOne(r, FAMILY_NAMES)} ${pickOne(r, names.middle)} ${pickOne(r, names.given)}`;
  const role: StaffRole = nextFloat(r) < 0.35 ? 'pharmacist' : 'clerk';
  const speed = between(r, def.speed);
  const knowledge = Math.min(0.95, round2(between(r, def.knowledge) + (role === 'pharmacist' ? 0.1 : 0)));
  const communication = between(r, def.communication);
  const { traits, hiddenTraits } = rollTraits(r, rarity);
  const wage = wageFor(role, rarity, speed, knowledge, communication, traits);
  const hireCost = Math.round((wage * (8 + RARITY_IDS.indexOf(rarity) * 3)) / 5) * 5;
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
export function refreshRecruits(state: SimState, tag = ''): void {
  const slots: (Recruit | null)[] = [];
  for (let i = 0; i < state.config.recruitSlots; i++) {
    const current = state.recruits[i];
    slots.push(current?.locked ? current : generateRecruit(state.rng.staff, `r${state.day}${tag}-${i}`));
  }
  state.recruits = slots;
}
