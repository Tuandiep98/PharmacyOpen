import { describe, expect, it } from "vitest";
import {
  ARCHETYPES,
  createInitialState,
  createSave,
  evaluateSatisfaction,
  loadSave,
  priceBounds,
  PRODUCTS,
  runOffline,
  SAVE_FORMAT,
  Simulation,
  type SimEvent,
  type SimState,
} from "../src";
import { autoPlay, hireAllDay, runFor } from "./helpers";

// Package mô phỏng không nạp kiểu DOM/Node; test chỉ cần đồng hồ để đo hiệu năng.
const clock = (globalThis as unknown as { performance: { now(): number } })
  .performance;

const mutable = (sim: Simulation) => sim.snapshot as SimState;

/** Tiệm có một nhân viên NPC đứng quầy, đủ vốn để tự chạy. */
function staffedStore(
  seed: number,
  candidateId = "dung",
  money = 400,
): Simulation {
  const state = createInitialState(seed);
  state.money = money;
  state.dayStart.money = money;
  const sim = new Simulation(state);
  const workerId = hireAllDay(sim, candidateId);
  expect(
    sim.dispatch({ type: "assignCounter", counterId: "counter-1", workerId })
      .ok,
  ).toBe(true);
  return sim;
}

describe("ngày và lương", () => {
  it("cuối ngày trả lương, tổng kết khớp sổ sách", () => {
    const sim = staffedStore(3);
    const dayMs = sim.snapshot.config.dayMs;
    const events: SimEvent[] = [];
    runFor(sim, dayMs, () => events.push(...sim.drainEvents()));
    runFor(sim, 200);
    events.push(...sim.drainEvents());

    const s = sim.snapshot;
    expect(s.day).toBe(2);
    expect(s.dayReports).toHaveLength(1);
    const report = s.dayReports[0]!;
    expect(events.some((e) => e.type === "dayEnded")).toBe(true);
    // Dũng 18 xu/ca × 2 ca.
    expect(report.wages).toBe(36);
    expect(s.stats.spentOnWages).toBe(36);
    // Ngày 1 gồm cả tiền tuyển Dũng (300) — xuất hiện ở mục đầu tư, lợi nhuận = chênh lệch xu thật.
    expect(report.investments).toBe(300);
    expect(report.profit).toBe(
      report.revenue - report.stockCost - report.wages - report.investments,
    );
    expect(report.sales).toBeGreaterThan(0);
  });

  it("thiếu xu thì ghi nợ lương, nhân viên làm chậm lại cho tới khi được trả", () => {
    const sim = staffedStore(4, "binh", 80);
    const s = mutable(sim);
    expect(s.money).toBe(0);
    // Không có khách, kệ đầy: không phát sinh thu/chi nào ngoài lương.
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    s.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    runFor(sim, s.config.dayMs);
    expect(s.workers["w-binh"]!.wageOwed).toBe(12);
    expect(s.money).toBe(0);

    s.money = 100;
    runFor(sim, s.config.dayMs);
    // Nợ cũ + lương mới được trả trước khi ghi nợ tiếp.
    expect(s.workers["w-binh"]!.wageOwed).toBe(0);
    expect(s.money).toBe(100 - 24);
  });

  it("tiệm có nhân viên tự chạy nhiều ngày vẫn có lãi (kiểm tra cân bằng thô)", () => {
    const sim = staffedStore(11);
    const startMoney = sim.snapshot.money;
    runFor(sim, sim.snapshot.config.dayMs * 5 + 100);
    const s = sim.snapshot;
    expect(s.day).toBe(6);
    expect(s.money).toBeGreaterThan(startMoney);
    expect(s.workers["w-dung"]!.wageOwed).toBe(0);
    for (const report of s.dayReports)
      expect(report.profit).toBe(
        report.revenue - report.stockCost - report.wages - report.investments,
      );
  });
});

describe("giá bán", () => {
  it("chỉ nhận giá nguyên trong khoảng [giá vốn + 1, giá tham khảo × 1.5]", () => {
    const sim = Simulation.create(1);
    const { min, max } = priceBounds(sim.snapshot, "mask");
    expect(min).toBe(PRODUCTS.mask.cost + 1);
    expect(max).toBe(18);
    expect(
      sim.dispatch({ type: "setPrice", productId: "mask", price: min - 1 }),
    ).toEqual({ ok: false, reason: "price-out-of-range" });
    expect(
      sim.dispatch({ type: "setPrice", productId: "mask", price: max + 1 }),
    ).toEqual({ ok: false, reason: "price-out-of-range" });
    expect(
      sim.dispatch({ type: "setPrice", productId: "mask", price: 12.5 }),
    ).toEqual({ ok: false, reason: "price-out-of-range" });
    expect(
      sim.dispatch({ type: "setPrice", productId: "mask", price: 15 }).ok,
    ).toBe(true);
    expect(sim.snapshot.prices.mask).toBe(15);
  });

  it("doanh thu và nhật ký lượt khách dùng giá đang áp dụng", () => {
    const sim = Simulation.create(5);
    for (const id of Object.keys(PRODUCTS) as (keyof typeof PRODUCTS)[]) {
      sim.dispatch({
        type: "setPrice",
        productId: id,
        price: priceBounds(sim.snapshot, id).max,
      });
    }
    runFor(sim, 90_000, (x) => autoPlay(x));
    const s = sim.snapshot;
    const sold = s.interactions.filter((i) => i.outcome === "bought");
    expect(sold.length).toBeGreaterThan(0);
    for (const i of sold) expect(i.price).toBe(s.prices[i.productId!]);
    expect(s.interactions.some((i) => i.reasons.includes("price-high"))).toBe(
      true,
    );
  });

  it("bán rẻ hơn giá tham khảo làm khách nhạy giá vui hơn, nhưng có trần", () => {
    const base = {
      archetype: ARCHETYPES.demanding,
      outcome: "bought" as const,
      served: true,
      queueWaitMs: 1000,
      serviceMs: 3000,
      patienceRatio: 0.5,
      wrongCount: 0,
      referencePrice: 20,
      server: { communication: 0.5, traits: [] },
    };
    const fair = evaluateSatisfaction({ ...base, price: 20 });
    const cheap = evaluateSatisfaction({ ...base, price: 15 });
    const veryCheap = evaluateSatisfaction({ ...base, price: 11 });
    expect(cheap.satisfaction).toBeGreaterThan(fair.satisfaction);
    expect(cheap.reasons).toContain("fair-price");
    expect(veryCheap.satisfaction - fair.satisfaction).toBeLessThanOrEqual(
      0.12 + 1e-9,
    );
  });
});

describe("cho nhân viên nghỉ", () => {
  it("phải trả hết nợ lương; quầy trả về người chơi; không cho người chơi nghỉ", () => {
    const sim = staffedStore(6, "binh", 80);
    const s = mutable(sim);
    s.workers["w-binh"]!.wageOwed = 20;
    expect(
      sim.dispatch({ type: "dismissStaff", workerId: "w-player" }),
    ).toEqual({ ok: false, reason: "cannot-dismiss-player" });
    expect(sim.dispatch({ type: "dismissStaff", workerId: "w-binh" })).toEqual({
      ok: false,
      reason: "insufficient-funds",
    });
    s.money = 30;
    expect(sim.dispatch({ type: "dismissStaff", workerId: "w-binh" }).ok).toBe(
      true,
    );
    expect(s.money).toBe(10);
    expect(s.workers["w-binh"]).toBeUndefined();
    expect(s.counters[0]!.operatorId).toBe("w-player");
    // Có thể tuyển lại (trả phí tuyển lần nữa).
    s.money = 200;
    expect(sim.dispatch({ type: "hire", candidateId: "binh" }).ok).toBe(true);
  });
});

describe("lưu & tải", () => {
  it("lưu rồi tải tiếp tục đúng y hệt như không hề dừng (tất định)", () => {
    const a = staffedStore(21);
    runFor(a, 40_000);
    const file = JSON.parse(
      JSON.stringify(createSave(a.snapshot, 1_700_000_000_000)),
    );
    const loaded = loadSave(file);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.savedAtWallMs).toBe(1_700_000_000_000);
    const b = Simulation.fromState(loaded.state);
    runFor(a, 60_000);
    runFor(b, 60_000);
    expect(b.serialize()).toEqual(a.serialize());
  });

  it("nâng cấp save v1 lên phiên bản hiện tại", () => {
    const v1 = JSON.parse(JSON.stringify(staffedStore(8).snapshot)) as Record<
      string,
      unknown
    >;
    for (const key of [
      "prices",
      "day",
      "dayStartedAtMs",
      "dayStart",
      "dayReports",
    ])
      delete v1[key];
    const config = v1.config as Record<string, unknown>;
    for (const key of [
      "dayMs",
      "priceMaxFactor",
      "owedWageSpeedFactor",
      "offlineCapMs",
      "keepDayReports",
    ])
      delete config[key];
    for (const w of Object.values(
      v1.workers as Record<string, Record<string, unknown>>,
    )) {
      delete w.wage;
      delete w.wageOwed;
    }
    v1.version = 1;
    const loaded = loadSave({
      format: SAVE_FORMAT,
      version: 1,
      savedAtWallMs: 5,
      state: v1,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.prices.sunscreen).toBe(PRODUCTS.sunscreen.price);
    // Save v1 lưu lương trọn ngày; từ v6 lương tính theo ca.
    expect(loaded.state.workers["w-dung"]!.wage).toBe(18);
    expect(loaded.state.config.dayMs).toBeGreaterThan(0);
    const sim = Simulation.fromState(loaded.state);
    runFor(sim, sim.snapshot.config.dayMs + 200);
    expect(sim.snapshot.day).toBe(2);
  });

  it("từ chối save hỏng, không phải save, hoặc từ phiên bản mới hơn", () => {
    const good = createSave(createInitialState(1), 0);
    expect(loadSave(null)).toEqual({ ok: false, error: "not-a-save" });
    expect(loadSave({ hello: 1 })).toEqual({ ok: false, error: "not-a-save" });
    expect(loadSave({ ...good, version: 999 })).toEqual({
      ok: false,
      error: "newer-version",
    });
    const negative = JSON.parse(JSON.stringify(good));
    negative.state.money = -5;
    expect(loadSave(negative)).toEqual({ ok: false, error: "corrupt" });
    const noStock = JSON.parse(JSON.stringify(good));
    delete noStock.state.stock.mask;
    expect(loadSave(noStock)).toEqual({ ok: false, error: "corrupt" });
    const ghostOperator = JSON.parse(JSON.stringify(good));
    ghostOperator.state.counters[0].operatorId = "w-nobody";
    expect(loadSave(ghostOperator)).toEqual({ ok: false, error: "corrupt" });
    const zeroTick = JSON.parse(JSON.stringify(good));
    zeroTick.state.config.tickMs = 0;
    expect(loadSave(zeroTick)).toEqual({ ok: false, error: "corrupt" });
    const tinyTick = JSON.parse(JSON.stringify(good));
    tinyTick.state.config.tickMs = 1;
    expect(loadSave(tinyTick)).toEqual({ ok: false, error: "corrupt" });
    const excessiveOffline = JSON.parse(JSON.stringify(good));
    excessiveOffline.state.config.offlineCapMs = 1_000_000_000;
    expect(loadSave(excessiveOffline)).toEqual({ ok: false, error: "corrupt" });
  });
});

describe("tiến trình khi vắng mặt", () => {
  it("người chơi tự đứng quầy → tiệm đóng cửa, thời gian không trôi", () => {
    const sim = Simulation.create(2);
    runFor(sim, 5000, (x) => autoPlay(x));
    const before = sim.serialize();
    const summary = runOffline(sim, 30 * 60_000);
    expect(summary.storeOpen).toBe(false);
    expect(summary.simulatedMs).toBe(0);
    expect(sim.serialize()).toEqual(before);
  });

  it("nhân viên đứng quầy → chạy đúng mô phỏng thật, có trần thời gian", () => {
    const online = staffedStore(9);
    const offline = Simulation.fromState(online.serialize());
    const cap = online.snapshot.config.offlineCapMs;

    const t0 = clock.now();
    const summary = runOffline(offline, cap * 3);
    const elapsed = clock.now() - t0;

    expect(summary.storeOpen).toBe(true);
    expect(summary.capped).toBe(true);
    expect(summary.simulatedMs).toBe(cap);
    runFor(online, cap);
    // Offline không có công thức riêng: kết quả trùng khớp với chơi online cùng khoảng thời gian.
    expect(offline.serialize()).toEqual(online.serialize());
    expect(summary.moneyDelta).toBe(online.snapshot.money - 100);
    expect(summary.daysEnded).toBe(
      Math.floor(cap / online.snapshot.config.dayMs),
    );
    expect(summary.wages).toBe(summary.daysEnded * 36);
    // Một giờ chạy bù phải đủ nhanh để không làm treo lúc mở game.
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("tăng ca cuối ngày", () => {
  /** Tiệm vừa hết giờ (còn một tick) với ít nhất một khách không bao giờ hết kiên nhẫn. */
  function closingWithCustomer(seed: number): Simulation {
    const sim = new Simulation(createInitialState(seed));
    for (let i = 0; i < 20_000; i++) {
      if (Object.keys(sim.snapshot.customers).length > 0) break;
      sim.step();
    }
    const s = mutable(sim);
    expect(Object.keys(s.customers).length).toBeGreaterThan(0);
    for (const c of Object.values(s.customers))
      c.patienceMs = c.patienceMaxMs = 1e9;
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    s.dayStartedAtMs = s.timeMs - s.config.dayMs + s.config.tickMs;
    return sim;
  }

  it("hết giờ còn khách thì chưa chốt ngày, khách đi hết mới sang ngày mới", () => {
    const sim = closingWithCustomer(5);
    const day = sim.snapshot.day;
    runFor(sim, 5_000);
    expect(sim.snapshot.day).toBe(day);
    expect(sim.snapshot.dayReports.at(-1)?.day).not.toBe(day);
    for (const c of Object.values(mutable(sim).customers)) c.patienceMs = 0;
    runFor(sim, sim.snapshot.config.tickMs * 3);
    expect(sim.snapshot.day).toBe(day + 1);
    expect(sim.snapshot.dayReports.at(-1)?.day).toBe(day);
  });

  it("tăng ca có trần: quá overtimeMaxMs thì vẫn chốt ngày", () => {
    const sim = closingWithCustomer(9);
    const day = sim.snapshot.day;
    runFor(sim, sim.snapshot.config.overtimeMaxMs - 1_000);
    expect(sim.snapshot.day).toBe(day);
    runFor(sim, 2_000);
    expect(sim.snapshot.day).toBe(day + 1);
  });
});
