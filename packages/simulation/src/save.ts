import { cloneConfig, DEFAULT_CONFIG } from './config';
import { PRODUCT_IDS, PRODUCTS } from './content/products';
import { STAFF_CANDIDATES } from './content/staff';
import { SAVE_VERSION, type DeepReadonly, type SimState } from './types';

/*
 * Định dạng save có phiên bản. Save cũ được nâng cấp tuần tự (v1 → v2 → …) rồi kiểm tra cấu trúc;
 * save hỏng hoặc từ phiên bản mới hơn bị từ chối thay vì làm game chạy sai.
 * Hàm thuần: thời gian thực (savedAtWallMs) do tầng web truyền vào.
 */

export const SAVE_FORMAT = 'bo-cong-anh-save';

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAtWallMs: number;
  state: SimState;
}

export type LoadError = 'not-a-save' | 'newer-version' | 'corrupt';

export type LoadResult = { ok: true; state: SimState; savedAtWallMs: number } | { ok: false; error: LoadError };

export function createSave(state: DeepReadonly<SimState>, savedAtWallMs: number): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAtWallMs,
    state: JSON.parse(JSON.stringify(state)) as SimState,
  };
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function loadSave(raw: unknown): LoadResult {
  if (!isObject(raw) || raw.format !== SAVE_FORMAT || !isNum(raw.version) || !isObject(raw.state)) {
    return { ok: false, error: 'not-a-save' };
  }
  if (raw.version > SAVE_VERSION) return { ok: false, error: 'newer-version' };
  try {
    const state = JSON.parse(JSON.stringify(raw.state)) as Loose;
    for (let v = raw.version; v < SAVE_VERSION; v++) MIGRATIONS[v]?.(state);
    mergeConfig(state);
    state.version = SAVE_VERSION;
    if (!isValidState(state)) return { ok: false, error: 'corrupt' };
    return { ok: true, state, savedAtWallMs: isNum(raw.savedAtWallMs) ? raw.savedAtWallMs : 0 };
  } catch {
    return { ok: false, error: 'corrupt' };
  }
}

/** MIGRATIONS[n] nâng state từ phiên bản n lên n + 1. */
const MIGRATIONS: Record<number, (state: Loose) => void> = {
  1: (state) => {
    // v2: giá bán do người chơi đặt, ngày + lương, tổng kết ngày.
    const prices: Loose = {};
    for (const id of PRODUCT_IDS) prices[id] = PRODUCTS[id].price;
    state.prices = prices;
    const stats = isObject(state.stats) ? state.stats : {};
    stats.spentOnWages = 0;
    state.day = 1;
    state.dayStartedAtMs = isNum(state.timeMs) ? state.timeMs : 0;
    const reputation = isObject(state.reputation) ? state.reputation : {};
    state.dayStart = {
      money: state.money,
      stats: { ...stats },
      starsSum: reputation.starsSum ?? 0,
      reviewCount: reputation.count ?? 0,
    };
    state.dayReports = [];
    if (isObject(state.workers)) {
      for (const worker of Object.values(state.workers)) {
        if (!isObject(worker)) continue;
        const candidateId = typeof worker.id === 'string' ? worker.id.replace(/^w-/, '') : '';
        worker.wage = worker.controller === 'ai' ? (STAFF_CANDIDATES[candidateId]?.wage ?? 0) : 0;
        worker.wageOwed = 0;
      }
    }
    if (isObject(state.orders)) {
      for (const order of Object.values(state.orders)) if (isObject(order)) order.price = null;
    }
  },
  2: (state) => {
    // v3: tồn kho theo lô và hồ sơ khách quay lại. Hàng cũ nhận một hạn mới để không mất dữ liệu.
    const timeMs = isNum(state.timeMs) ? state.timeMs : 0;
    const life = DEFAULT_CONFIG.stockShelfLifeMs;
    if (isObject(state.config) && state.config.offlineCapMs === 60 * 60_000) {
      state.config.offlineCapMs = DEFAULT_CONFIG.offlineCapMs;
    }
    if (isObject(state.stock)) {
      for (const entry of Object.values(state.stock)) {
        if (isObject(entry) && isNum(entry.shelf)) {
          entry.batches = entry.shelf > 0 ? [{ qty: entry.shelf, expiresAtMs: timeMs + life }] : [];
        }
      }
    }
    if (isObject(state.orders)) {
      for (const order of Object.values(state.orders)) {
        if (isObject(order)) order.productExpiresAtMs = order.productId ? timeMs + life : null;
      }
    }
    if (isObject(state.customers)) {
      for (const customer of Object.values(state.customers)) if (isObject(customer)) customer.loyaltyId = null;
    }
    state.loyalty = [];
    if (Array.isArray(state.dayReports)) {
      for (const report of state.dayReports) {
        if (isObject(report)) {
          report.expiredStock = 0;
          report.returningCustomers = 0;
        }
      }
    }
    if (isObject(state.stats)) {
      state.stats.expiredStock = 0;
      state.stats.returningCustomers = 0;
    }
    if (isObject(state.dayStart) && isObject(state.dayStart.stats)) {
      state.dayStart.stats.expiredStock = 0;
      state.dayStart.stats.returningCustomers = 0;
    }
  },
};

/** Khoá config mới thêm lấy giá trị mặc định; giá trị đã bị nâng cấp thay đổi được giữ nguyên. */
function mergeConfig(state: Loose): void {
  const saved = isObject(state.config) ? state.config : {};
  const defaults = cloneConfig(DEFAULT_CONFIG);
  state.config = {
    ...defaults,
    ...saved,
    reputation: { ...defaults.reputation, ...(isObject(saved.reputation) ? saved.reputation : {}) },
    patienceRate: { ...defaults.patienceRate, ...(isObject(saved.patienceRate) ? saved.patienceRate : {}) },
  };
}

function isValidState(state: Loose): state is SimState & Loose {
  const s = state as Partial<Record<keyof SimState, unknown>>;
  if (![s.seed, s.tick, s.timeMs, s.nextId, s.money, s.nextSpawnAtMs, s.day, s.dayStartedAtMs].every(isNum)) return false;
  if ((s.money as number) < 0) return false;
  if (!isObject(s.rng) || !['spawn', 'customer', 'ai', 'review'].every((k) => isObject(s.rng) && isObject(s.rng[k]) && isNum(s.rng[k].s))) return false;
  if (!isObject(s.stock) || !isObject(s.prices)) return false;
  for (const id of PRODUCT_IDS) {
    const entry = s.stock[id];
    if (!isObject(entry) || !isNum(entry.shelf) || !isNum(entry.capacity) || !Number.isInteger(entry.shelf) || !Number.isInteger(entry.capacity) || entry.capacity < 0 || entry.shelf < 0 || entry.shelf > entry.capacity) return false;
    if (!Array.isArray(entry.batches) || !entry.batches.every((b: unknown) => isObject(b) && isNum(b.qty) && Number.isInteger(b.qty) && b.qty > 0 && isNum(b.expiresAtMs))) return false;
    if (entry.batches.reduce((sum: number, b: { qty: number }) => sum + b.qty, 0) !== entry.shelf) return false;
    if (!isNum(s.prices[id])) return false;
  }
  if (!isObject(s.workers) || !isObject(s.customers) || !isObject(s.orders)) return false;
  if (!Array.isArray(s.loyalty) || !s.loyalty.every((p: unknown) => isObject(p) && typeof p.id === 'string' && isNum(p.visits) && isNum(p.goodVisits) && p.goodVisits <= p.visits && isNum(p.nextEligibleAtMs) && isObject(p.look))) return false;
  if (!isObject(s.stats) || !isNum(s.stats.expiredStock) || !isNum(s.stats.returningCustomers)) return false;
  for (const worker of Object.values(s.workers)) {
    if (!isObject(worker) || typeof worker.id !== 'string' || !isNum(worker.speed) || !isNum(worker.wage) || !isNum(worker.wageOwed)) return false;
  }
  for (const customer of Object.values(s.customers)) {
    if (!isObject(customer) || typeof customer.id !== 'string' || !(customer.loyaltyId === null || typeof customer.loyaltyId === 'string')) return false;
  }
  for (const order of Object.values(s.orders)) {
    if (!isObject(order) || typeof order.id !== 'string' || !(order.productExpiresAtMs === null || isNum(order.productExpiresAtMs))) return false;
  }
  const workers = s.workers;
  if (!Array.isArray(s.counters) || s.counters.length === 0) return false;
  if (!s.counters.every((c: unknown) => isObject(c) && typeof c.operatorId === 'string' && isObject(workers[c.operatorId]))) return false;
  if (!Array.isArray(s.queue) || !Array.isArray(s.upgrades) || !Array.isArray(s.interactions)) return false;
  if (!Array.isArray(s.reviews) || !Array.isArray(s.complaints) || !Array.isArray(s.dayReports)) return false;
  if (!isObject(s.reputation) || !isObject(s.stats) || !isObject(s.dayStart)) return false;
  return true;
}
