import { cloneConfig, DEFAULT_CONFIG } from "./config";
import { ARCHETYPES } from "./content/archetypes";
import { PRODUCT_IDS, PRODUCTS } from "./content/products";
import type { ArchetypeId, ProductId } from "./content/types";
import { looksFemale, loyalName } from "./content/names";
import { COLLECTIBLES } from "./content/collectibles";
import { emptyCollection } from "./collection";
import { personaFor } from "./market";
import { STAFF_CANDIDATES, TRAITS } from "./content/staff";
import { BACK_STATION_IDS, type BackStationId } from "./content/stations";
import { levelFor, refreshRecruits } from "./recruit";
import { createStream } from "./rng";
import { dayGoals } from "./economy";
import { OPERATIONS_CASES } from "./operations";
import { emptyDayStat, PLAYER_WORKER_ID } from "./state";
import {
  GRADES,
  PREP_TASK_IDS,
  SAVE_VERSION,
  SHIFT_IDS,
  type DayReport,
  type DeepReadonly,
  type PrepTaskId,
  type ShiftId,
  type SimState,
} from "./types";

/*
 * Định dạng save có phiên bản. Save cũ được nâng cấp tuần tự (v1 → v2 → …) rồi kiểm tra cấu trúc;
 * save hỏng hoặc từ phiên bản mới hơn bị từ chối thay vì làm game chạy sai.
 * Hàm thuần: thời gian thực (savedAtWallMs) do tầng web truyền vào.
 */

export const SAVE_FORMAT = "bo-cong-anh-save";

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAtWallMs: number;
  state: SimState;
}

export type LoadError =
  "not-a-save" | "newer-version" | "corrupt" | "file-too-large";

export type LoadResult =
  | { ok: true; state: SimState; savedAtWallMs: number }
  | { ok: false; error: LoadError };

export function createSave(
  state: DeepReadonly<SimState>,
  savedAtWallMs: number,
): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAtWallMs,
    state: JSON.parse(JSON.stringify(state)) as SimState,
  };
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function loadSave(raw: unknown): LoadResult {
  if (
    !isObject(raw) ||
    raw.format !== SAVE_FORMAT ||
    !isNum(raw.version) ||
    !isObject(raw.state)
  ) {
    return { ok: false, error: "not-a-save" };
  }
  if (raw.version > SAVE_VERSION) return { ok: false, error: "newer-version" };
  try {
    const state = JSON.parse(JSON.stringify(raw.state)) as Loose;
    for (let v = raw.version; v < SAVE_VERSION; v++) MIGRATIONS[v]?.(state);
    mergeConfig(state);
    state.version = SAVE_VERSION;
    if (!isValidState(state)) return { ok: false, error: "corrupt" };
    if (state.recruits.length === 0) refreshRecruits(state);
    return {
      ok: true,
      state,
      savedAtWallMs: isNum(raw.savedAtWallMs) ? raw.savedAtWallMs : 0,
    };
  } catch {
    return { ok: false, error: "corrupt" };
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
        const candidateId =
          typeof worker.id === "string" ? worker.id.replace(/^w-/, "") : "";
        // Hồ sơ cố định giờ ghi lương mỗi ca; save v1 dùng lương trọn ngày (hai ca), migration v6 chia lại.
        worker.wage =
          worker.controller === "ai"
            ? (STAFF_CANDIDATES[candidateId]?.wage ?? 0) * 2
            : 0;
        worker.wageOwed = 0;
      }
    }
    if (isObject(state.orders)) {
      for (const order of Object.values(state.orders))
        if (isObject(order)) order.price = null;
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
          entry.batches =
            entry.shelf > 0
              ? [{ qty: entry.shelf, expiresAtMs: timeMs + life }]
              : [];
        }
      }
    }
    if (isObject(state.orders)) {
      for (const order of Object.values(state.orders)) {
        if (isObject(order))
          order.productExpiresAtMs = order.productId ? timeMs + life : null;
      }
    }
    if (isObject(state.customers)) {
      for (const customer of Object.values(state.customers))
        if (isObject(customer)) customer.loyaltyId = null;
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
  3: (state) => {
    // v4: danh mục mở rộng. Save cũ nhận hàng mẫu và giá mặc định cho các mặt hàng mới.
    const stock = isObject(state.stock) ? state.stock : {};
    const prices = isObject(state.prices) ? state.prices : {};
    const timeMs = isNum(state.timeMs) ? state.timeMs : 0;
    const config = isObject(state.config) ? state.config : {};
    const life = isNum(config.stockShelfLifeMs)
      ? config.stockShelfLifeMs
      : DEFAULT_CONFIG.stockShelfLifeMs;
    for (const id of PRODUCT_IDS) {
      if (!isObject(stock[id])) {
        const qty = PRODUCTS[id].shelfCapacity;
        stock[id] = {
          shelf: qty,
          capacity: qty,
          batches: [{ qty, expiresAtMs: timeMs + life }],
        };
      }
      if (!isNum(prices[id])) prices[id] = PRODUCTS[id].price;
    }
    state.stock = stock;
    state.prices = prices;
  },
  4: (state) => {
    // Người chơi v4 đã có cả 20 món, nên giữ quyền nhập và trưng bày toàn bộ.
    const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
    for (let level = 2; level <= 5; level++) {
      for (const facility of ["warehouse", "storefront"]) {
        const id = `${facility}-${level}`;
        if (!upgrades.includes(id)) upgrades.push(id);
      }
    }
    state.upgrades = upgrades;
  },
  5: (state) => {
    // v6: ca làm, chuẩn bị mở cửa, chấm công, lãi lỗ theo hoạt động. Ngày đang dở coi như đã mở cửa.
    const config = isObject(state.config) ? state.config : {};
    if (config.dayMs === 180_000) config.dayMs = DEFAULT_CONFIG.dayMs;
    const dayMs = isNum(config.dayMs) ? config.dayMs : DEFAULT_CONFIG.dayMs;
    const elapsed =
      (isNum(state.timeMs) ? state.timeMs : 0) -
      (isNum(state.dayStartedAtMs) ? state.dayStartedAtMs : 0);
    const shift = elapsed < dayMs / 2 ? "morning" : "afternoon";
    const newStats = {
      costOfSales: 0,
      expiredCost: 0,
      waitMsSum: 0,
      servedCount: 0,
    };
    const fillStats = (stats: unknown) => {
      if (!isObject(stats)) return;
      for (const [key, value] of Object.entries(newStats))
        if (!isNum(stats[key])) stats[key] = value;
    };
    fillStats(state.stats);
    if (isObject(state.dayStart)) fillStats(state.dayStart.stats);
    if (!isObject(state.prep)) {
      state.prep = {
        required: false,
        openedAtMs: isNum(state.dayStartedAtMs) ? state.dayStartedAtMs : 0,
        done: [],
      };
    }
    if (!isObject(state.shiftMark)) {
      const base =
        isObject(state.dayStart) && isObject(state.dayStart.stats)
          ? state.dayStart.stats
          : state.stats;
      state.shiftMark = { shift, stats: { ...(isObject(base) ? base : {}) } };
    }
    if (!Array.isArray(state.shiftSummaries)) state.shiftSummaries = [];
    if (!Array.isArray(state.ratingMilestones)) state.ratingMilestones = [];
    if (isObject(state.workers)) {
      for (const worker of Object.values(state.workers)) {
        if (!isObject(worker)) continue;
        if (!Array.isArray(worker.shifts))
          worker.shifts = ["morning", "afternoon"];
        // Người đã làm từ đầu ngày được tính đủ ca như cách trả lương theo ngày trước đây.
        if (!Array.isArray(worker.shiftsToday))
          worker.shiftsToday =
            shift === "morning" ? ["morning"] : ["morning", "afternoon"];
      }
    }
    // Báo cáo cũ không có số liệu ca/giá vốn: để trống (shifts rỗng) để giao diện không chấm sao sai.
    if (Array.isArray(state.dayReports)) {
      for (const report of state.dayReports) {
        if (!isObject(report) || Array.isArray(report.shifts)) continue;
        Object.assign(report, {
          costOfSales: 0,
          expiredCost: 0,
          vouchers: 0,
          netProfit: isNum(report.profit) ? report.profit : 0,
          avgWaitMs: null,
          prepDone: null,
          shifts: [],
          storeRating: 0,
          grade: 0,
        });
      }
    }
  },
  6: (state) => {
    // v7: nhân viên mới — nhiều đặc điểm, độ hiếm, giới tính, tay nghề, mệt mỏi; lương tính theo ca;
    // danh sách ứng viên hằng ngày (sinh sau khi tải, xem loadSave).
    if (isObject(state.rng))
      state.rng.staff = createStream(
        isNum(state.seed) ? state.seed : 0,
        "staff",
      );
    for (const stats of [
      state.stats,
      isObject(state.dayStart) ? state.dayStart.stats : null,
      isObject(state.shiftMark) ? state.shiftMark.stats : null,
    ]) {
      if (!isObject(stats)) continue;
      if (!isNum(stats.tips)) stats.tips = 0;
      if (!isNum(stats.pilfered)) stats.pilfered = 0;
    }
    if (Array.isArray(state.dayReports)) {
      for (const report of state.dayReports)
        if (isObject(report))
          Object.assign(report, { tips: 0, pilfered: 0 }, { ...report });
    }
    if (isObject(state.workers)) {
      for (const worker of Object.values(state.workers)) {
        if (!isObject(worker)) continue;
        const preset =
          typeof worker.id === "string"
            ? STAFF_CANDIDATES[worker.id.replace(/^w-/, "")]
            : undefined;
        if (!Array.isArray(worker.traits))
          worker.traits =
            typeof worker.trait === "string" ? [worker.trait] : [];
        delete worker.trait;
        if (!Array.isArray(worker.hiddenTraits)) worker.hiddenTraits = [];
        if (typeof worker.rarity !== "string")
          worker.rarity = preset?.rarity ?? "common";
        const look = isObject(worker.look) ? worker.look : {};
        if (typeof look.gender !== "string")
          look.gender = preset?.look.gender ?? "female";
        if (typeof look.messy !== "boolean") look.messy = false;
        worker.look = look;
        // Lương cũ là lương trọn ngày (hai ca) → lương mỗi ca bằng một nửa, tổng mỗi ngày không đổi.
        if (worker.controller === "ai" && isNum(worker.wage))
          worker.wage = Math.max(1, Math.round(worker.wage / 2));
        const served = isNum(worker.served) ? worker.served : 0;
        if (!isNum(worker.xp))
          worker.xp = worker.controller === "ai" ? served : 0;
        if (!isNum(worker.level))
          worker.level = worker.controller === "ai" ? levelFor(served) : 1;
        if (!isNum(worker.fatigue)) worker.fatigue = 0;
        if (typeof worker.resigning !== "boolean") worker.resigning = false;
        if (!isNum(worker.arrivesAtMs)) worker.arrivesAtMs = 0;
      }
    }
    if (!Array.isArray(state.recruits)) state.recruits = [];
    if (!isNum(state.recruitRerollDay)) state.recruitRerollDay = 0;
  },
  7: (state) => {
    // v8: ngày làm liên tục, lịch nghỉ, tuỳ chọn giữ quầy khi đổi ca.
    if (isObject(state.workers)) {
      for (const worker of Object.values(state.workers)) {
        if (!isObject(worker)) continue;
        if (!isNum(worker.streak)) worker.streak = 0;
        if (!(worker.restDay === null || isNum(worker.restDay)))
          worker.restDay = null;
      }
    }
    if (typeof state.keepCounterOnShiftChange !== "boolean")
      state.keepCounterOnShiftChange = false;
  },
  8: (state) => {
    // v9: vị trí làm việc (quầy / kho / hỗ trợ). Mọi người đang làm được xếp vào "Hỗ trợ" như hành vi cũ.
    if (isObject(state.workers)) {
      for (const worker of Object.values(state.workers))
        if (isObject(worker) && typeof worker.station !== "string")
          worker.station = "support";
    }
  },
  9: (state) => {
    // v10: số chỗ nhân viên suy ra từ nâng cấp đã mua (progression.ts), không còn nằm trong config.
    // Đội đông hơn giới hạn mới được giữ nguyên, chỉ không tuyển thêm được tới khi nâng cấp.
    if (isObject(state.config)) {
      delete state.config.maxStaff;
      delete state.config.maxPerShift;
    }
  },
  10: (state) => {
    // v11: đơn ship (online và khách hẹn giao sau vì hết hàng), số liệu giao hàng trong sổ sách.
    if (isObject(state.rng))
      state.rng.delivery = createStream(
        isNum(state.seed) ? state.seed : 0,
        "delivery",
      );
    if (!Array.isArray(state.deliveries)) state.deliveries = [];
    const config = isObject(state.config) ? state.config : {};
    if (!isNum(state.nextDeliveryAtMs)) {
      state.nextDeliveryAtMs =
        (isNum(state.timeMs) ? state.timeMs : 0) +
        (isNum(config.firstDeliveryMs)
          ? config.firstDeliveryMs
          : DEFAULT_CONFIG.firstDeliveryMs);
    }
    const fresh = {
      deliveries: 0,
      lateDeliveries: 0,
      cancelledDeliveries: 0,
      backorders: 0,
      wentElsewhere: 0,
    };
    for (const stats of [
      state.stats,
      isObject(state.dayStart) ? state.dayStart.stats : null,
      isObject(state.shiftMark) ? state.shiftMark.stats : null,
    ]) {
      if (isObject(stats))
        for (const [key, value] of Object.entries(fresh))
          if (!isNum(stats[key])) stats[key] = value;
    }
    if (Array.isArray(state.dayReports)) {
      for (const report of state.dayReports)
        if (isObject(report)) Object.assign(report, { ...fresh, ...report });
    }
  },
  11: (state) => {
    // v12: khách quen có tên gọi.
    if (!Array.isArray(state.loyalty)) return;
    for (const profile of state.loyalty) {
      if (!isObject(profile) || typeof profile.name === "string") continue;
      const look = isObject(profile.look) ? profile.look : {};
      const archetype =
        typeof profile.archetypeId === "string" &&
        profile.archetypeId in ARCHETYPES
          ? (profile.archetypeId as ArchetypeId)
          : "curious";
      profile.name = loyalName(
        String(profile.id),
        archetype,
        isNum(look.hairStyle) ? look.hairStyle : 0,
      );
    }
  },
  12: (state) => {
    // v13: người chơi hiển thị là "Tôi"; đánh giá có người ký tên (hoặc ẩn danh) và độ quen.
    const player = isObject(state.workers)
      ? state.workers[PLAYER_WORKER_ID]
      : undefined;
    if (isObject(player) && player.name === "An") player.name = "Tôi";
    // Đánh giá cũ coi như ẩn danh của khách mới.
    if (!Array.isArray(state.reviews)) return;
    for (const review of state.reviews) {
      if (!isObject(review)) continue;
      if (!(review.author === null || typeof review.author === "string"))
        review.author = null;
      if (typeof review.familiarity !== "string") review.familiarity = "new";
      if (!isNum(review.visits)) review.visits = 0;
    }
  },
  13: (state) => {
    // v14: điểm quản lý vùng và sự cố vận hành; save cũ tiếp tục từ điểm trung lập.
    state.operations = {
      score: 65,
      scoreAtDayStart: 65,
      choice: null,
      demandFactor: 1,
      transfers: 0,
      pendingTransfer: false,
    };
    if (isObject(state.stats)) state.stats.spentOnOperations = 0;
    if (isObject(state.dayStart) && isObject(state.dayStart.stats))
      state.dayStart.stats.spentOnOperations = 0;
    if (Array.isArray(state.dayReports))
      for (const report of state.dayReports) {
        if (!isObject(report)) continue;
        report.operationsScore = 65;
        report.operationsChange = 0;
        report.incident = null;
        report.incidentChoice = null;
        report.operationsCost = 0;
      }
  },
  14: (state) => {
    // Một số bản v14 được lưu khi bộ đếm chi phí sự cố chưa có mặt. JSON biến
    // phép tính NaN thành null; khôi phục bộ đếm và các báo cáo đã bị ảnh hưởng.
    const costOf = (incident: unknown, choice: unknown): number =>
      OPERATIONS_CASES.find((item) => item.id === incident)?.choices.find(
        (item) => item.id === choice,
      )?.cost ?? 0;
    const operations = isObject(state.operations) ? state.operations : {};
    const incidentIndex =
      isNum(state.seed) && isNum(state.day) && state.day >= 2
        ? (((state.seed + state.day - 2) % OPERATIONS_CASES.length) +
            OPERATIONS_CASES.length) %
          OPERATIONS_CASES.length
        : -1;
    const todayCost = costOf(
      OPERATIONS_CASES[incidentIndex]?.id,
      operations.choice,
    );
    const stats = isObject(state.stats) ? state.stats : null;
    const start =
      isObject(state.dayStart) && isObject(state.dayStart.stats)
        ? state.dayStart.stats
        : null;
    if (stats && start) {
      if (!isNum(start.spentOnOperations))
        start.spentOnOperations = isNum(stats.spentOnOperations)
          ? Math.max(0, stats.spentOnOperations - todayCost)
          : 0;
      if (!isNum(stats.spentOnOperations))
        stats.spentOnOperations =
          (start.spentOnOperations as number) + todayCost;
    }
    if (Array.isArray(state.dayReports))
      for (const report of state.dayReports) {
        if (!isObject(report)) continue;
        if (!isNum(report.operationsCost))
          report.operationsCost = costOf(
            report.incident,
            report.incidentChoice,
          );
        if (!isNum(report.netProfit)) {
          report.netProfit =
            (isNum(report.revenue) ? report.revenue : 0) -
            (isNum(report.costOfSales) ? report.costOfSales : 0) -
            (isNum(report.wages) ? report.wages : 0) -
            (isNum(report.vouchers) ? report.vouchers : 0) -
            (report.operationsCost as number) -
            (isNum(report.expiredCost) ? report.expiredCost : 0) -
            (isNum(report.pilfered) ? report.pilfered : 0);
          report.grade = dayGoals(report as unknown as DayReport).filter(
            (goal) => goal.met,
          ).length;
        }
      }
  },
  15: (state) => {
    // v16: hai khách quen không được trùng tên gọi; người đến sau đổi sang tên kế tiếp còn trống.
    if (!Array.isArray(state.loyalty)) return;
    const taken = new Set<string>();
    for (const profile of state.loyalty) {
      if (!isObject(profile) || typeof profile.name !== "string") continue;
      if (taken.has(profile.name)) {
        const look = isObject(profile.look) ? profile.look : {};
        const archetype =
          typeof profile.archetypeId === "string" &&
          profile.archetypeId in ARCHETYPES
            ? (profile.archetypeId as ArchetypeId)
            : "curious";
        profile.name = loyalName(
          String(profile.id),
          archetype,
          isNum(look.hairStyle) ? look.hairStyle : 0,
          taken,
        );
      }
      taken.add(profile.name as string);
    }
  },
  16: (state) => {
    // v17: độ nhận biết tiệm, hạng khu vực, trò chuyện khách quen, đồ sưu tầm, thưởng mục tiêu ngày.
    const seed = isNum(state.seed) ? state.seed : 0;
    if (isObject(state.rng)) {
      state.rng.chat = createStream(seed, "chat");
      state.rng.loot = createStream(seed, "loot");
    }
    // Tiệm cũ đã mở một thời gian: coi như khu phố đã biết tới theo số ngày, không bị hụt khách đột ngột.
    const day = isNum(state.day) ? state.day : 1;
    state.awareness = Math.min(100, 25 + 8 * Math.max(0, day - 1));
    state.standing = { day: 0, revenue: null, rating: null, staff: null };
    state.collection = emptyCollection();
    const fresh = { rewardCoins: 0, itemSales: 0, chats: 0, chatsCompleted: 0 };
    for (const stats of [
      state.stats,
      isObject(state.dayStart) ? state.dayStart.stats : null,
      isObject(state.shiftMark) ? state.shiftMark.stats : null,
    ]) {
      if (isObject(stats))
        for (const [key, value] of Object.entries(fresh))
          if (!isNum(stats[key])) stats[key] = value;
    }
    if (isObject(state.workers))
      for (const worker of Object.values(state.workers))
        if (isObject(worker) && !isObject(worker.dayStat))
          worker.dayStat = emptyDayStat();
    if (isObject(state.customers))
      for (const customer of Object.values(state.customers))
        if (isObject(customer)) {
          customer.chat = null;
          customer.chatBonus = 0;
        }
    if (Array.isArray(state.loyalty))
      for (const profile of state.loyalty) {
        if (!isObject(profile)) continue;
        const look = isObject(profile.look) ? profile.look : {};
        const archetype =
          typeof profile.archetypeId === "string" &&
          profile.archetypeId in ARCHETYPES
            ? (profile.archetypeId as ArchetypeId)
            : "curious";
        profile.persona = personaFor(
          String(profile.id),
          archetype,
          looksFemale(isNum(look.hairStyle) ? look.hairStyle : 0),
        );
        profile.rapport = Math.min(
          100,
          (isNum(profile.goodVisits) ? profile.goodVisits : 0) * 10,
        );
        profile.story = null;
        profile.storiesDone = [];
      }
    if (Array.isArray(state.dayReports))
      for (const report of state.dayReports)
        if (isObject(report))
          Object.assign(report, {
            staff: [],
            awareness: state.awareness,
            awarenessChange: 0,
            chats: 0,
            chatsCompleted: 0,
            reward: { coins: 0, itemUid: null },
          });
  },
};

/** Khoá config mới thêm lấy giá trị mặc định; giá trị đã bị nâng cấp thay đổi được giữ nguyên. */
function mergeConfig(state: Loose): void {
  const saved = isObject(state.config) ? state.config : {};
  const defaults = cloneConfig(DEFAULT_CONFIG);
  state.config = {
    ...defaults,
    ...saved,
    reputation: {
      ...defaults.reputation,
      ...(isObject(saved.reputation) ? saved.reputation : {}),
    },
    patienceRate: {
      ...defaults.patienceRate,
      ...(isObject(saved.patienceRate) ? saved.patienceRate : {}),
    },
  };
}

const DELIVERY_STATUSES = ["packing", "packed", "awaiting-pickup", "shipping"];

function isValidDelivery(d: unknown): boolean {
  return (
    isObject(d) &&
    typeof d.id === "string" &&
    (d.source === "online" || d.source === "backorder") &&
    typeof d.archetypeId === "string" &&
    d.archetypeId in ARCHETYPES &&
    DELIVERY_STATUSES.includes(d.status as string) &&
    [d.createdAtMs, d.dueDay, d.dueAtMs].every(isNum) &&
    [d.price, d.pickupAtMs, d.deliverAtMs].every(
      (v) => v === null || isNum(v),
    ) &&
    Array.isArray(d.handledBy) &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    d.items.every(
      (i: unknown) =>
        isObject(i) &&
        PRODUCT_IDS.includes(i.productId as ProductId) &&
        isNum(i.qty) &&
        Number.isInteger(i.qty) &&
        i.qty > 0 &&
        Array.isArray(i.packed) &&
        i.packed.length <= i.qty &&
        i.packed.every(isNum),
    )
  );
}

function isValidCollection(c: unknown): boolean {
  if (!isObject(c) || !Array.isArray(c.items) || !isObject(c.equipped))
    return false;
  if (!isNum(c.nextUid)) return false;
  const uids = new Set<string>();
  for (const item of c.items) {
    if (
      !isObject(item) ||
      typeof item.uid !== "string" ||
      typeof item.defId !== "string" ||
      !(item.defId in COLLECTIBLES) ||
      !GRADES.includes(item.grade as (typeof GRADES)[number]) ||
      !Array.isArray(item.effects) ||
      !item.effects.every(
        (e: unknown) => isObject(e) && typeof e.stat === "string" && isNum(e.value),
      )
    )
      return false;
    uids.add(item.uid);
  }
  return Object.values(c.equipped).every(
    (uid) => typeof uid === "string" && uids.has(uid),
  );
}

const isTraitList = (v: unknown): boolean =>
  Array.isArray(v) && v.every((id) => typeof id === "string" && id in TRAITS);

const isShiftList = (v: unknown): boolean =>
  Array.isArray(v) && v.every((id) => SHIFT_IDS.includes(id as ShiftId));

function isValidState(state: Loose): state is SimState & Loose {
  const s = state as Partial<Record<keyof SimState, unknown>>;
  // Neither value changes through upgrades. Keep the offline work budget fixed for imported saves.
  if (
    !isObject(s.config) ||
    s.config.tickMs !== DEFAULT_CONFIG.tickMs ||
    s.config.offlineCapMs !== DEFAULT_CONFIG.offlineCapMs
  )
    return false;
  if (
    ![
      s.seed,
      s.tick,
      s.timeMs,
      s.nextId,
      s.money,
      s.nextSpawnAtMs,
      s.day,
      s.dayStartedAtMs,
    ].every(isNum)
  )
    return false;
  if ((s.money as number) < 0) return false;
  if (
    !isObject(s.rng) ||
    !["spawn", "customer", "ai", "review", "staff", "delivery", "chat", "loot"].every(
      (k) => isObject(s.rng) && isObject(s.rng[k]) && isNum(s.rng[k].s),
    )
  )
    return false;
  if (!isObject(s.stock) || !isObject(s.prices)) return false;
  for (const id of PRODUCT_IDS) {
    const entry = s.stock[id];
    if (
      !isObject(entry) ||
      !isNum(entry.shelf) ||
      !isNum(entry.capacity) ||
      !Number.isInteger(entry.shelf) ||
      !Number.isInteger(entry.capacity) ||
      entry.capacity < 0 ||
      entry.shelf < 0 ||
      entry.shelf > entry.capacity
    )
      return false;
    if (
      !Array.isArray(entry.batches) ||
      !entry.batches.every(
        (b: unknown) =>
          isObject(b) &&
          isNum(b.qty) &&
          Number.isInteger(b.qty) &&
          b.qty > 0 &&
          isNum(b.expiresAtMs),
      )
    )
      return false;
    if (
      entry.batches.reduce(
        (sum: number, b: { qty: number }) => sum + b.qty,
        0,
      ) !== entry.shelf
    )
      return false;
    if (!isNum(s.prices[id])) return false;
  }
  if (!isObject(s.workers) || !isObject(s.customers) || !isObject(s.orders))
    return false;
  if (
    !Array.isArray(s.loyalty) ||
    !s.loyalty.every(
      (p: unknown) =>
        isObject(p) &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        isNum(p.visits) &&
        isNum(p.goodVisits) &&
        p.goodVisits <= p.visits &&
        isNum(p.nextEligibleAtMs) &&
        isObject(p.look),
    )
  )
    return false;
  if (
    !isObject(s.stats) ||
    !isNum(s.stats.expiredStock) ||
    !isNum(s.stats.returningCustomers)
  )
    return false;
  for (const worker of Object.values(s.workers)) {
    if (
      !isObject(worker) ||
      typeof worker.id !== "string" ||
      !isNum(worker.speed) ||
      !isNum(worker.wage) ||
      !isNum(worker.wageOwed) ||
      !isShiftList(worker.shifts) ||
      !isShiftList(worker.shiftsToday) ||
      !isTraitList(worker.traits) ||
      !isTraitList(worker.hiddenTraits) ||
      !isNum(worker.level) ||
      !isNum(worker.xp) ||
      !isNum(worker.fatigue) ||
      typeof worker.resigning !== "boolean" ||
      !isNum(worker.streak) ||
      !BACK_STATION_IDS.includes(worker.station as BackStationId) ||
      !(worker.restDay === null || isNum(worker.restDay)) ||
      !isObject(worker.look) ||
      (worker.look.gender !== "female" && worker.look.gender !== "male")
    )
      return false;
  }
  if (
    !isObject(s.prep) ||
    typeof s.prep.required !== "boolean" ||
    !(s.prep.openedAtMs === null || isNum(s.prep.openedAtMs)) ||
    !Array.isArray(s.prep.done) ||
    !s.prep.done.every((id: unknown) =>
      PREP_TASK_IDS.includes(id as PrepTaskId),
    )
  )
    return false;
  if (
    !isObject(s.shiftMark) ||
    !SHIFT_IDS.includes(s.shiftMark.shift as ShiftId) ||
    !isObject(s.shiftMark.stats) ||
    !Array.isArray(s.shiftSummaries) ||
    !Array.isArray(s.ratingMilestones)
  )
    return false;
  if (typeof s.keepCounterOnShiftChange !== "boolean") return false;
  if (
    !Array.isArray(s.recruits) ||
    !isNum(s.recruitRerollDay) ||
    !isNum(s.stats.tips) ||
    !isNum(s.stats.pilfered)
  )
    return false;
  if (
    !s.recruits.every(
      (r: unknown) =>
        r === null ||
        (isObject(r) &&
          typeof r.id === "string" &&
          isTraitList(r.traits) &&
          isTraitList(r.hiddenTraits)),
    )
  ) {
    return false;
  }
  if (
    !isNum(s.stats.costOfSales) ||
    !isNum(s.stats.expiredCost) ||
    !isNum(s.stats.waitMsSum) ||
    !isNum(s.stats.servedCount)
  )
    return false;
  for (const customer of Object.values(s.customers)) {
    if (
      !isObject(customer) ||
      typeof customer.id !== "string" ||
      !(customer.loyaltyId === null || typeof customer.loyaltyId === "string")
    )
      return false;
  }
  for (const order of Object.values(s.orders)) {
    if (
      !isObject(order) ||
      typeof order.id !== "string" ||
      !(order.productExpiresAtMs === null || isNum(order.productExpiresAtMs))
    )
      return false;
  }
  const workers = s.workers;
  if (!Array.isArray(s.counters) || s.counters.length === 0) return false;
  if (
    !s.counters.every(
      (c: unknown) =>
        isObject(c) &&
        typeof c.id === "string" &&
        (c.customerId === null || typeof c.customerId === "string") &&
        (c.operatorId === null ||
          (typeof c.operatorId === "string" &&
            isObject(workers[c.operatorId]))),
    )
  )
    return false;
  const assigned = s.counters
    .map((c: { operatorId: string | null }) => c.operatorId)
    .filter((id: string | null): id is string => id !== null);
  if (new Set(assigned).size !== assigned.length) return false;
  if (
    !Array.isArray(s.queue) ||
    !Array.isArray(s.upgrades) ||
    !Array.isArray(s.interactions)
  )
    return false;
  if (
    !isNum(s.nextDeliveryAtMs) ||
    !Array.isArray(s.deliveries) ||
    !s.deliveries.every(isValidDelivery)
  )
    return false;
  if (
    !Array.isArray(s.reviews) ||
    !Array.isArray(s.complaints) ||
    !Array.isArray(s.dayReports)
  )
    return false;
  if (!isObject(s.reputation) || !isObject(s.stats) || !isObject(s.dayStart))
    return false;
  if (
    !isNum(s.stats.spentOnOperations) ||
    !isObject(s.dayStart.stats) ||
    !isNum(s.dayStart.stats.spentOnOperations)
  )
    return false;
  if (
    !isNum(s.awareness) ||
    s.awareness < 0 ||
    s.awareness > 100 ||
    !isObject(s.standing) ||
    !isNum(s.standing.day) ||
    !isValidCollection(s.collection)
  )
    return false;
  for (const worker of Object.values(s.workers))
    if (
      !isObject(worker) ||
      !isObject(worker.dayStat) ||
      !["sales", "perfSum", "perfCount", "starsSum", "starsCount"].every(
        (k) => isObject(worker.dayStat) && isNum(worker.dayStat[k]),
      )
    )
      return false;
  if (
    !s.loyalty.every(
      (p: unknown) =>
        isObject(p) &&
        isObject(p.persona) &&
        isNum(p.persona.openness) &&
        isNum(p.rapport) &&
        Array.isArray(p.storiesDone) &&
        (p.story === null || isObject(p.story)),
    )
  )
    return false;
  if (
    !Object.values(s.customers).every(
      (c) => isObject(c) && (c.chat === null || isObject(c.chat)),
    )
  )
    return false;
  if (
    !["rewardCoins", "itemSales", "chats", "chatsCompleted"].every(
      (k) =>
        isObject(s.stats) &&
        isNum(s.stats[k]) &&
        isObject(s.dayStart) &&
        isObject(s.dayStart.stats) &&
        isNum(s.dayStart.stats[k]),
    )
  )
    return false;
  if (!isObject(s.operations)) return false;
  const operations = s.operations;
  if (
    ![
      operations.score,
      operations.scoreAtDayStart,
      operations.demandFactor,
      operations.transfers,
    ].every(isNum) ||
    !isNum(operations.score) ||
    operations.score < 0 ||
    operations.score > 100 ||
    !isNum(operations.scoreAtDayStart) ||
    operations.scoreAtDayStart < 0 ||
    operations.scoreAtDayStart > 100 ||
    !isNum(operations.demandFactor) ||
    operations.demandFactor <= 0 ||
    !isNum(operations.transfers) ||
    !Number.isInteger(operations.transfers) ||
    operations.transfers < 0 ||
    !(
      operations.choice === null ||
      ["careful", "practical", "shortcut"].includes(operations.choice as string)
    ) ||
    typeof operations.pendingTransfer !== "boolean"
  )
    return false;
  return true;
}
