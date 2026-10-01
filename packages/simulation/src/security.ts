import { PRODUCT_IDS, PRODUCTS } from "./content/products";
import type { ProductId } from "./content/types";
import type { Emit } from "./events";
import { playerLevel, stockUnitCost, unlockedProducts } from "./progression";
import { hasTrait, staffScore } from "./recruit";
import { nextFloat, nextInt } from "./rng";
import { isPresent } from "./shift";
import { returnReservedStock } from "./state";
import { takeStock } from "./stock";
import type { Customer, DeepReadonly, SimState, Worker } from "./types";

export const SECURITY_LOCK_UPGRADE = "security-lock";
export const SECURITY_CAMERA_UPGRADE = "security-camera";
export const SECURITY_LOCK_USES = 3;
export const LOAN_INTEREST = 0.1;

/** Tiệm càng nổi tiếng và càng xử lý sự cố ẩu thì càng hút trộm vặt. */
export function shoplifterSpawnChance(
  day: number,
  awareness = 0,
  riskHeat = 0,
): number {
  const base =
    day <= 2
      ? 0.005
      : day <= 5
        ? 0.03
        : day <= 10
          ? 0.06
          : day <= 20
            ? 0.1
            : 0.15;
  const fame = Math.max(0, Math.min(100, awareness)) * 0.0012;
  const heat = Number.isFinite(riskHeat) ? riskHeat : 0;
  return Math.min(0.45, Math.max(0, (base + fame) * (1 + heat)));
}

/** Tiệm nổi tiếng làm két hấp dẫn hơn; khoá vẫn giảm một nửa xác suất gặp. */
export function burglaryChance(
  day: number,
  hasWorkingLock: boolean,
  awareness = 0,
  riskHeat = 0,
): number {
  const base = day <= 5 ? 0.006 : day <= 15 ? 0.02 : 0.045;
  const fame = Math.max(0, Math.min(100, awareness)) * 0.0004;
  const heat = Number.isFinite(riskHeat) ? riskHeat : 0;
  const chance = Math.min(0.3, Math.max(0, (base + fame) * (1 + heat)));
  return hasWorkingLock ? chance * 0.5 : chance;
}

export function rollShopliftingState(
  state: SimState,
  returning: boolean,
): Customer["shoplifting"] {
  if (returning) return null;
  const forced = state.security.forceShoplifter;
  if (forced) state.security.forceShoplifter = false;
  if (
    !forced &&
    nextFloat(state.rng.risk) >=
      shoplifterSpawnChance(state.day, state.awareness, state.security.riskHeat)
  )
    return null;
  return {
    revealed: state.upgrades.includes(SECURITY_CAMERA_UPGRADE),
    confronted: false,
    forcedAttempt: forced,
  };
}

const gradeSecurity = { C: 0.08, B: 0.17, A: 0.29, S: 0.43 } as const;

function fullStaffScore(worker: DeepReadonly<Worker>) {
  return staffScore({
    ...worker,
    traits: [...worker.traits, ...worker.hiddenTraits],
  });
}

/** Khả năng một nhân viên đang có mặt tự nhận ra trộm trước khi tới quầy. */
export function staffShoplifterDetectionChance(
  worker: DeepReadonly<Worker>,
): number {
  if (worker.controller !== "ai") return 0;
  const { grade } = fullStaffScore(worker);
  let chance = gradeSecurity[grade] + (worker.level - 1) * 0.025;
  if (hasTrait(worker, "sharp-eyed")) chance += 0.35;
  if (hasTrait(worker, "meticulous")) chance += 0.08;
  if (hasTrait(worker, "sharp-memory")) chance += 0.07;
  if (hasTrait(worker, "tidy")) chance += 0.04;
  if (hasTrait(worker, "hardworking")) chance += 0.03;
  if (hasTrait(worker, "lazy")) chance -= 0.2;
  if (hasTrait(worker, "late")) chance -= 0.1;
  if (hasTrait(worker, "early-leaver")) chance -= 0.12;
  chance -= Math.max(0, worker.fatigue - 50) * 0.002;
  return Math.max(0.02, Math.min(0.92, chance));
}

/** Khả năng nhân viên đứng quầy chặn được trộm trước khi kẻ đó lấy hàng. */
export function staffShoplifterCatchChance(
  worker: DeepReadonly<Worker>,
): number {
  if (worker.controller !== "ai") return 0;
  const { grade } = fullStaffScore(worker);
  let chance = gradeSecurity[grade] + 0.06 + (worker.level - 1) * 0.03;
  if (hasTrait(worker, "sharp-eyed")) chance += 0.28;
  if (hasTrait(worker, "meticulous")) chance += 0.08;
  if (hasTrait(worker, "sharp-memory")) chance += 0.06;
  if (hasTrait(worker, "quick-hands")) chance += 0.04;
  if (hasTrait(worker, "lazy")) chance -= 0.2;
  if (hasTrait(worker, "late")) chance -= 0.08;
  if (hasTrait(worker, "early-leaver")) chance -= 0.12;
  if (hasTrait(worker, "reckless")) chance -= 0.06;
  chance -= Math.max(0, worker.fatigue - 50) * 0.002;
  return Math.max(0.03, Math.min(0.95, chance));
}

const STAFF_SPOT_LINES = [
  "Khoan, vị khách kia có gì đó không ổn.",
  "Tôi để ý người này từ lúc mới vào rồi.",
  "Khách này đáng ngờ, để tôi theo dõi.",
] as const;

const STAFF_CATCH_LINES = [
  "Khoan đã, món trong túi chưa thanh toán nhé!",
  "Mời bạn đặt món đó lại kệ trước khi rời tiệm.",
  "Tôi thấy rồi nhé — mình nói chuyện một chút nào.",
  "Không có camera thì vẫn có người trông quầy nhé!",
] as const;

/** Mỗi nhân viên có mặt được một lượt quan sát độc lập khi trộm bước vào. */
export function tryStaffSpotShoplifter(
  state: SimState,
  customer: Customer,
  emit: Emit,
): boolean {
  if (!customer.shoplifting || customer.shoplifting.revealed) return false;
  const staff = Object.values(state.workers)
    .filter((worker) => worker.controller === "ai" && isPresent(state, worker))
    .sort(
      (a, b) =>
        staffShoplifterDetectionChance(b) - staffShoplifterDetectionChance(a),
    );
  for (const worker of staff) {
    if (nextFloat(state.rng.risk) >= staffShoplifterDetectionChance(worker))
      continue;
    customer.shoplifting.revealed = true;
    const line =
      STAFF_SPOT_LINES[
        nextInt(state.rng.risk, 0, STAFF_SPOT_LINES.length - 1)
      ]!;
    worker.expression = "focused";
    worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
    emit({
      type: "shoplifterSpotted",
      customerId: customer.id,
      workerId: worker.id,
      line,
    });
    return true;
  }
  return false;
}

/** Nhân viên vừa bán hàng có thể tự bắt trộm, kể cả khi tiệm chưa có camera. */
export function tryStaffCatchShoplifter(
  state: SimState,
  customer: Customer,
  workerId: string,
  emit: Emit,
): boolean {
  const risk = customer.shoplifting;
  const worker = state.workers[workerId];
  if (!risk || risk.confronted || !worker || worker.controller !== "ai")
    return false;
  let chance = staffShoplifterCatchChance(worker);
  if (risk.revealed) chance = Math.min(0.98, chance + 0.15);
  if (nextFloat(state.rng.risk) >= chance) return false;
  risk.revealed = true;
  risk.confronted = true;
  const staffLine =
    STAFF_CATCH_LINES[
      nextInt(state.rng.risk, 0, STAFF_CATCH_LINES.length - 1)
    ]!;
  const line = thiefLine(state, customer);
  customer.thiefLine = line;
  customer.expression = "confused";
  worker.expression = "happy";
  worker.emoteUntilMs = state.timeMs + state.config.emoteMs;
  emit({
    type: "shoplifterConfronted",
    customerId: customer.id,
    line,
    workerId,
    staffLine,
  });
  return true;
}

function totalStock(state: DeepReadonly<SimState>): number {
  return PRODUCT_IDS.reduce((sum, id) => sum + state.stock[id].shelf, 0);
}

/**
 * Trộm vặt chỉ ra tay sau khi mua. Ngày 3–5 tối đa một món và luôn chừa hàng,
 * về late game mới có thể lấy 2–4 món. Camera cho người chơi cơ hội chặn trước.
 */
export function resolveShoplifting(
  state: SimState,
  customer: Customer,
  emit: Emit,
  workerId?: string,
): void {
  const risk = customer.shoplifting;
  if (!risk || risk.confronted) return;
  let attempt =
    state.day <= 2
      ? 0.25
      : state.day <= 5
        ? 0.45
        : state.day <= 12
          ? 0.6
          : 0.75;
  const worker = workerId ? state.workers[workerId] : undefined;
  if (worker?.controller === "ai") {
    if (hasTrait(worker, "sharp-eyed")) attempt -= 0.18;
    if (hasTrait(worker, "meticulous")) attempt -= 0.08;
    if (hasTrait(worker, "tidy")) attempt -= 0.04;
    if (hasTrait(worker, "lazy")) attempt += 0.2;
    if (hasTrait(worker, "late")) attempt += 0.12;
    if (hasTrait(worker, "early-leaver")) attempt += 0.15;
    if (hasTrait(worker, "reckless")) attempt += 0.08;
  }
  attempt = Math.max(0.1, Math.min(0.95, attempt));
  if (!risk.forcedAttempt && nextFloat(state.rng.risk) >= attempt) return;

  const available = unlockedProducts(state).filter(
    (id) => state.stock[id].shelf > 0,
  );
  if (!available.length) return;
  const desired =
    state.day <= 5
      ? 1
      : state.day <= 12
        ? nextInt(state.rng.risk, 1, 2)
        : nextInt(state.rng.risk, 1, 4);
  // Trước ngày 8 luôn chừa ít nhất bốn món toàn tiệm để không gây soft-lock.
  const protectedUnits = state.day < 8 ? 4 : 0;
  const cap = Math.max(0, totalStock(state) - protectedUnits);
  const count = Math.min(desired, cap);
  if (count <= 0) return;

  const stolen: Partial<Record<ProductId, number>> = {};
  let cost = 0;
  for (let i = 0; i < count; i++) {
    const candidates = available.filter((id) => state.stock[id].shelf > 0);
    if (!candidates.length) break;
    const id = candidates[nextInt(state.rng.risk, 0, candidates.length - 1)]!;
    if (takeStock(state.stock[id]) === null) continue;
    stolen[id] = (stolen[id] ?? 0) + 1;
    cost += PRODUCTS[id].cost;
  }
  const units = Object.values(stolen).reduce((sum, qty) => sum + (qty ?? 0), 0);
  if (!units) return;
  state.stats.shopliftedUnits += units;
  state.stats.shopliftedCost += cost;
  emit({ type: "shoplifted", customerId: customer.id, stolen, units, cost });
  ensureEmergencyCapital(state, emit);
}

export const THIEF_LINES = [
  "Ơ kìa, có gì đâu mà căng — mình chỉ test camera thôi!",
  "Alo, content này không có trong kịch bản nha!",
  "Thôi xong, camera nét hơn tương lai của tôi rồi.",
  "Xin vía chạy nhanh, chứ xin hàng thì hơi quá tay.",
] as const;

function thiefLine(
  state: DeepReadonly<SimState>,
  customer: DeepReadonly<Customer>,
) {
  const digits = customer.id.replace(/\D/g, "");
  const customerKey = digits
    ? Number(digits)
    : [...customer.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return THIEF_LINES[
    (state.seed + state.day + customerKey) % THIEF_LINES.length
  ]!;
}

/** Camera đã gắn cờ thì bấm bảng tên để đuổi; không tính thành khách phục vụ lỗi. */
export function confrontShoplifter(
  state: SimState,
  customerId: string,
  emit: Emit,
): boolean {
  const customer = state.customers[customerId];
  if (!customer?.shoplifting?.revealed || customer.shoplifting.confronted)
    return false;
  customer.shoplifting.confronted = true;
  if (customer.orderId) {
    const order = state.orders[customer.orderId];
    if (order) {
      returnReservedStock(state, order.id);
      const worker = state.workers[order.workerId];
      if (worker?.orderId === order.id) worker.orderId = null;
      delete state.orders[order.id];
    }
    customer.orderId = null;
  }
  for (const counter of state.counters)
    if (counter.customerId === customer.id) counter.customerId = null;
  state.queue = state.queue.filter((id) => id !== customer.id);
  customer.phase = "leaving";
  customer.leaveAtMs = state.timeMs + Math.max(2600, state.config.leaveMs);
  customer.expression = "confused";
  const line = thiefLine(state, customer);
  customer.thiefLine = line;
  emit({
    type: "shoplifterConfronted",
    customerId,
    line,
    workerId: null,
    staffLine: null,
  });
  return true;
}

/** Tự cứu vốn đúng lúc không còn hàng và không đủ mua nổi một món đã mở. */
export function ensureEmergencyCapital(state: SimState, emit: Emit): void {
  if (state.finance.loan || totalStock(state) > 0) return;
  const products = unlockedProducts(state);
  const minCost = Math.min(...products.map((id) => stockUnitCost(state, id)));
  if (state.money >= minCost) return;
  const amount = Math.max(60, 35 + playerLevel(state) * 20 - state.money);
  state.money += amount;
  state.finance.loan = {
    principal: amount,
    balance: amount,
    borrowedDay: state.day,
    dueDay: state.day + 7,
    seizureDay: state.day + 14,
    // Ngày đáo hạn vẫn là cơ hội trả đúng hạn; lãi chỉ bắt đầu từ ngày kế tiếp.
    lastInterestDay: state.day + 7,
  };
  state.finance.notice = { kind: "emergency-loan", amount };
  emit({ type: "emergencyLoanTaken", amount, dueDay: state.day + 7 });
}

/** Chốt nửa đêm: biến cố cạy cửa, lãi quá hạn và siết nợ. */
export function resolveNightAndDebt(state: SimState, emit: Emit): void {
  const workingLock = state.security.lockDurability > 0;
  const forcedBurglary = state.security.forceBurglary;
  state.security.forceBurglary = false;
  if (
    forcedBurglary ||
    nextFloat(state.rng.risk) <
      burglaryChance(
        state.day,
        workingLock,
        state.awareness,
        state.security.riskHeat,
      )
  ) {
    if (workingLock) {
      state.security.lockDurability -= 1;
      const broken = state.security.lockDurability === 0;
      if (broken)
        state.upgrades = state.upgrades.filter(
          (id) => id !== SECURITY_LOCK_UPGRADE,
        );
      state.finance.notice = {
        kind: "lock-blocked",
        durability: state.security.lockDurability,
        broken,
      };
      emit({
        type: "burglaryBlocked",
        durability: state.security.lockDurability,
        broken,
      });
    } else {
      const cashLost = Math.min(
        state.money,
        Math.round(state.money * (0.65 + nextFloat(state.rng.risk) * 0.35)),
      );
      state.money -= cashLost;
      let stockLost = 0;
      // Kẻ cạy cửa nhắm két; hàng hoá phần lớn còn nguyên (0–20% mỗi kệ).
      for (const id of PRODUCT_IDS) {
        const entry = state.stock[id];
        const take = Math.min(
          entry.shelf,
          Math.floor(entry.shelf * nextFloat(state.rng.risk) * 0.2),
        );
        for (let i = 0; i < take; i++)
          if (takeStock(entry) !== null) stockLost += 1;
      }
      state.stats.burglaryLoss += cashLost;
      state.finance.notice = { kind: "burglary", cashLost, stockLost };
      emit({ type: "overnightBurglary", cashLost, stockLost });
    }
  }

  // Tin đồn và sơ hở an ninh nguội dần; lựa chọn tốt có thể giữ mức âm bảo vệ.
  const heat = Number.isFinite(state.security.riskHeat)
    ? state.security.riskHeat
    : 0;
  state.security.riskHeat =
    Math.abs(heat) <= 0.08 ? 0 : heat - Math.sign(heat) * 0.08;

  const loan = state.finance.loan;
  if (loan && state.day >= loan.dueDay) {
    for (let day = loan.lastInterestDay + 1; day <= state.day; day++)
      loan.balance = Math.ceil(loan.balance * (1 + LOAN_INTEREST));
    loan.lastInterestDay = state.day;
    if (state.day >= loan.seizureDay) {
      if (state.money >= loan.balance) {
        const amount = loan.balance;
        state.money -= amount;
        state.finance.loan = null;
        state.finance.notice = { kind: "seized", amount };
        emit({ type: "debtSeized", amount });
      } else {
        state.finance.bankrupt = true;
        state.finance.notice = { kind: "bankrupt", balance: loan.balance };
        emit({ type: "bankruptcyDeclared", balance: loan.balance });
      }
    } else if (!state.finance.notice) {
      state.finance.notice = {
        kind: "loan-due",
        balance: loan.balance,
        daysLeft: loan.seizureDay - state.day,
      };
      emit({
        type: "loanInterestCharged",
        balance: loan.balance,
        daysLeft: loan.seizureDay - state.day,
      });
    }
  }
  ensureEmergencyCapital(state, emit);
}

export function repayLoan(state: SimState, emit: Emit): boolean {
  const loan = state.finance.loan;
  if (!loan || state.money < loan.balance) return false;
  const amount = loan.balance;
  state.money -= amount;
  state.finance.loan = null;
  state.finance.notice = null;
  emit({ type: "loanRepaid", amount });
  return true;
}
