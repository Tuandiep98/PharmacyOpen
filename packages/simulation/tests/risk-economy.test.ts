import { describe, expect, it } from "vitest";
import {
  BLIND_BAG_GRADE_ODDS,
  blindBagPrice,
  openBlindBag,
} from "../src/blindBag";
import {
  burglaryChance,
  confrontShoplifter,
  ensureEmergencyCapital,
  resolveNightAndDebt,
  resolveShoplifting,
  rollShopliftingState,
  staffShoplifterCatchChance,
  staffShoplifterDetectionChance,
  SECURITY_LOCK_UPGRADE,
  SECURITY_LOCK_USES,
  shoplifterSpawnChance,
  tryStaffCatchShoplifter,
} from "../src/security";
import { chooseOperations, dailyOperationsCase } from "../src/operations";
import { createInitialState } from "../src/state";
import type { Customer } from "../src/types";

const noEvents = () => undefined;

function thief(state: ReturnType<typeof createInitialState>): Customer {
  return {
    id: "c-thief",
    archetypeId: "curious",
    requestId: "named-mask",
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    phase: "queue",
    arrivedAtMs: state.timeMs,
    servedAtMs: null,
    patienceMs: 20_000,
    patienceMaxMs: 20_000,
    expression: "neutral",
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
    loyaltyId: null,
    chat: null,
    chatBonus: 0,
    shoplifting: { revealed: true, confronted: false, forcedAttempt: false },
  };
}

describe("rủi ro late game và cứu vốn", () => {
  it("hạng, cấp và kỹ năng quyết định khả năng phát hiện/bắt trộm", () => {
    const weakState = createInitialState(101);
    const weak = Object.values(weakState.workers).find(
      (worker) => worker.controller === "player",
    )!;
    weak.controller = "ai";
    weak.role = "clerk";
    weak.speed = 0.8;
    weak.knowledge = 0.45;
    weak.communication = 0.5;
    weak.level = 1;
    weak.traits = ["lazy", "late", "early-leaver"];

    const strongState = createInitialState(102);
    const strong = Object.values(strongState.workers).find(
      (worker) => worker.controller === "player",
    )!;
    strong.controller = "ai";
    strong.role = "pharmacist";
    strong.speed = 1.3;
    strong.knowledge = 0.95;
    strong.communication = 0.95;
    strong.level = 10;
    strong.traits = ["sharp-eyed", "meticulous"];

    expect(staffShoplifterDetectionChance(strong)).toBeGreaterThan(
      staffShoplifterDetectionChance(weak),
    );
    expect(staffShoplifterCatchChance(strong)).toBeGreaterThan(
      staffShoplifterCatchChance(weak),
    );
    expect(staffShoplifterCatchChance(strong)).toBeGreaterThanOrEqual(0.9);
  });

  it("nhân viên có thể tự bắt và lộ tên Trộm vặt dù không có camera", () => {
    let caught = false;
    for (let seed = 1; seed < 100 && !caught; seed++) {
      const state = createInitialState(seed);
      const worker = Object.values(state.workers).find(
        (candidate) => candidate.controller === "player",
      )!;
      worker.controller = "ai";
      worker.speed = 1.3;
      worker.knowledge = 0.95;
      worker.communication = 0.95;
      worker.level = 10;
      worker.traits = ["sharp-eyed", "meticulous"];
      const customer = thief(state);
      customer.shoplifting!.revealed = false;
      const events: { type: string }[] = [];
      caught = tryStaffCatchShoplifter(state, customer, worker.id, (event) =>
        events.push(event),
      );
      if (!caught) continue;
      expect(customer.shoplifting).toMatchObject({
        revealed: true,
        confronted: true,
      });
      expect(customer.thiefLine).toBeTruthy();
      expect(
        events.some((event) => event.type === "shoplifterConfronted"),
      ).toBe(true);
    }
    expect(caught).toBe(true);
  });

  it("nguy cơ tăng mạnh theo ngày, độ nổi tiếng và mức nóng", () => {
    expect(shoplifterSpawnChance(1)).toBeGreaterThan(0);
    expect(shoplifterSpawnChance(5)).toBeLessThan(shoplifterSpawnChance(20));
    expect(shoplifterSpawnChance(20, 100)).toBeGreaterThan(
      shoplifterSpawnChance(20, 0),
    );
    expect(shoplifterSpawnChance(20, 100, 0.5)).toBeGreaterThan(
      shoplifterSpawnChance(20, 100, 0),
    );
    expect(shoplifterSpawnChance(100, 100, 2)).toBeLessThanOrEqual(0.45);
    expect(burglaryChance(30, false, 100)).toBeGreaterThan(
      burglaryChance(30, false, 0),
    );
    expect(burglaryChance(30, true, 100)).toBe(
      burglaryChance(30, false, 100) / 2,
    );
  });

  it("sự cố xử lý ẩu ép khách trộm xuất hiện và ra tay", () => {
    const state = createInitialState(18);
    state.security.forceShoplifter = true;
    const risk = rollShopliftingState(state, false);
    expect(risk?.forcedAttempt).toBe(true);
    expect(state.security.forceShoplifter).toBe(false);
    expect(rollShopliftingState(state, true)).toBeNull();
  });

  it("lựa chọn sự cố an ninh cộng trừ mức nóng và có thể bảo đảm gặp trộm", () => {
    const findCase = (id: "cash-leak" | "rear-door") => {
      for (let seed = 1; seed < 200; seed++) {
        const state = createInitialState(seed);
        state.money = 10_000;
        for (let day = 2; day < 80; day++) {
          state.day = day;
          state.operations.choice = null;
          if (dailyOperationsCase(state)?.id === id) return state;
        }
      }
      throw new Error(`Không tìm thấy sự cố ${id}`);
    };
    const shop = findCase("cash-leak");
    expect(chooseOperations(shop, "shortcut", noEvents)).toBe("ok");
    expect(shop.security.riskHeat).toBeGreaterThan(0);
    expect(shop.security.forceShoplifter).toBe(true);

    const night = findCase("rear-door");
    expect(chooseOperations(night, "shortcut", noEvents)).toBe("ok");
    expect(night.security.forceBurglary).toBe(true);
  });

  it("khoá vẫn chặn vụ cạy cửa bị ép bởi lựa chọn xấu", () => {
    const state = createInitialState(22);
    state.upgrades.push(SECURITY_LOCK_UPGRADE);
    state.security.lockDurability = SECURITY_LOCK_USES;
    state.security.forceBurglary = true;
    resolveNightAndDebt(state, noEvents);
    expect(state.security.lockDurability).toBe(SECURITY_LOCK_USES - 1);
    expect(state.finance.notice?.kind).toBe("lock-blocked");
    expect(state.security.forceBurglary).toBe(false);
  });

  it("trộm ngày sớm tối đa một món và không vét sạch hàng", () => {
    let verified = false;
    for (let seed = 1; seed < 200 && !verified; seed++) {
      const state = createInitialState(seed);
      state.day = 3;
      const customer = thief(state);
      const before = Object.values(state.stock).reduce(
        (sum, entry) => sum + entry.shelf,
        0,
      );
      resolveShoplifting(state, customer, noEvents);
      if (state.stats.shopliftedUnits === 0) continue;
      const after = Object.values(state.stock).reduce(
        (sum, entry) => sum + entry.shelf,
        0,
      );
      expect(state.stats.shopliftedUnits).toBe(1);
      expect(before - after).toBe(1);
      expect(after).toBeGreaterThanOrEqual(4);
      verified = true;
    }
    expect(verified).toBe(true);
  });

  it("camera cho phép bấm đuổi và giải phóng hàng chờ", () => {
    const state = createInitialState(4);
    const customer = thief(state);
    state.customers[customer.id] = customer;
    state.queue.push(customer.id);
    expect(confrontShoplifter(state, customer.id, noEvents)).toBe(true);
    expect(customer.phase).toBe("leaving");
    expect(state.queue).not.toContain(customer.id);
    expect(customer.shoplifting?.confronted).toBe(true);
  });

  it("hết sạch hàng và thiếu vốn tự vay đủ duy trì trong 7 ngày", () => {
    const state = createInitialState(9);
    state.money = 0;
    for (const entry of Object.values(state.stock)) {
      entry.shelf = 0;
      entry.batches = [];
    }
    ensureEmergencyCapital(state, noEvents);
    expect(state.finance.loan).not.toBeNull();
    expect(state.finance.loan?.dueDay).toBe(state.day + 7);
    expect(state.money).toBeGreaterThan(0);
    expect(state.finance.notice?.kind).toBe("emergency-loan");
  });

  it("quá thêm 7 ngày và không đủ trả thì phá sản", () => {
    const state = createInitialState(12);
    state.day = 20;
    state.money = 0;
    state.finance.loan = {
      principal: 100,
      balance: 100,
      borrowedDay: 6,
      dueDay: 13,
      seizureDay: 20,
      lastInterestDay: 12,
    };
    resolveNightAndDebt(state, noEvents);
    expect(state.finance.bankrupt).toBe(true);
    expect(state.finance.notice?.kind).toBe("bankrupt");
    expect(state.finance.loan?.balance).toBeGreaterThan(100);
  });

  it("chỉ tính lãi sau ngày đáo hạn", () => {
    const state = createInitialState(31);
    state.money = 0;
    state.finance.loan = {
      principal: 100,
      balance: 100,
      borrowedDay: 1,
      dueDay: 8,
      seizureDay: 15,
      lastInterestDay: 8,
    };
    state.day = 8;
    resolveNightAndDebt(state, noEvents);
    expect(state.finance.loan?.balance).toBe(100);
    state.finance.notice = null;
    state.day = 9;
    resolveNightAndDebt(state, noEvents);
    expect(state.finance.loan?.balance).toBe(111);
  });

  it("khoá chặn đúng ba lần rồi mòn và phải mua lại", () => {
    const state = createInitialState(41);
    state.day = 30;
    state.upgrades.push(SECURITY_LOCK_UPGRADE);
    state.security.lockDurability = SECURITY_LOCK_USES;
    let blocked = 0;
    for (
      let tries = 0;
      tries < 5_000 && blocked < SECURITY_LOCK_USES;
      tries++
    ) {
      const before = state.security.lockDurability;
      resolveNightAndDebt(state, noEvents);
      if (state.security.lockDurability < before) blocked++;
      state.finance.notice = null;
      state.day++;
    }
    expect(blocked).toBe(SECURITY_LOCK_USES);
    expect(state.security.lockDurability).toBe(0);
    expect(state.upgrades).not.toContain(SECURITY_LOCK_UPGRADE);
  });

  it("cạy cửa lấy 65–100% tiền nhưng giữ lại phần lớn hàng", () => {
    let verified = false;
    for (let seed = 1; seed < 2_000 && !verified; seed++) {
      const state = createInitialState(seed);
      state.day = 30;
      state.money = 1_000;
      const beforeStock = Object.fromEntries(
        Object.entries(state.stock).map(([id, entry]) => [id, entry.shelf]),
      );
      resolveNightAndDebt(state, noEvents);
      if (state.finance.notice?.kind !== "burglary") continue;
      expect(state.finance.notice.cashLost).toBeGreaterThanOrEqual(650);
      expect(state.finance.notice.cashLost).toBeLessThanOrEqual(1_000);
      for (const [id, before] of Object.entries(beforeStock)) {
        const after = state.stock[id as keyof typeof state.stock].shelf;
        expect(after).toBeGreaterThanOrEqual(Math.ceil(before * 0.8));
      }
      verified = true;
    }
    expect(verified).toBe(true);
  });
});

describe("túi mù", () => {
  it("giá tăng theo tiến độ và số lần mua; hạng A/S thấp", () => {
    const state = createInitialState(21);
    state.money = 100_000;
    const first = blindBagPrice(state);
    expect(openBlindBag(state, noEvents)).toBe("ok");
    expect(blindBagPrice(state)).toBeGreaterThan(first);
    expect(BLIND_BAG_GRADE_ODDS.S + BLIND_BAG_GRADE_ODDS.A).toBeLessThan(5);
    expect(state.stats.blindBagSpent).toBe(first);
  });
});
