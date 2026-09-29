import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSave,
  isProductUnlocked,
  isTrending,
  loadSave,
  playerLevel,
  productLevel,
  REQUESTS,
  SAVE_FORMAT,
  Simulation,
  staffLimits,
  stockUnitCost,
  unlockedProducts,
} from "../src";
import { hireAllDay, runFor } from "./helpers";

describe("tiến trình mặt hàng và nâng cấp", () => {
  it("ván mới chỉ có 4 món; khách không hỏi món chưa mở và lệnh nhập hàng bị chặn", () => {
    const sim = Simulation.create(81);
    const state = sim.snapshot;
    expect(unlockedProducts(state)).toHaveLength(4);
    expect(state.stock.lipbalm.shelf).toBe(0);
    expect(sim.dispatch({ type: "restock", productId: "lipbalm" })).toEqual({
      ok: false,
      reason: "product-locked",
    });
    runFor(sim, 60_000);
    const requested = [
      ...Object.values(sim.snapshot.customers).map((c) => c.requestId),
      ...sim.snapshot.interactions.map((r) => r.requestId),
    ];
    expect(requested.length).toBeGreaterThan(0);
    for (const id of requested)
      expect(
        REQUESTS[id]!.acceptable.every((productId) =>
          isProductUnlocked(state, productId),
        ),
      ).toBe(true);
  });

  it("mốc ngày, bán hàng, kho và cửa hàng đều cần thiết để mở nhóm mới", () => {
    const state = createInitialState(8);
    state.money = 1000;
    const sim = new Simulation(state);
    expect(productLevel("lipbalm")).toBe(2);
    expect(
      sim.dispatch({ type: "buyUpgrade", upgradeId: "warehouse-2" }),
    ).toEqual({ ok: false, reason: "level-locked" });
    state.stats.sales = 8;
    state.day = 2;
    expect(playerLevel(state)).toBe(2);
    expect(
      sim.dispatch({ type: "buyUpgrade", upgradeId: "storefront-3" }),
    ).toEqual({ ok: false, reason: "previous-level-required" });
    expect(
      sim.dispatch({ type: "buyUpgrade", upgradeId: "warehouse-2" }).ok,
    ).toBe(true);
    expect(isProductUnlocked(state, "lipbalm")).toBe(false);
    expect(
      sim.dispatch({ type: "buyUpgrade", upgradeId: "storefront-2" }).ok,
    ).toBe(true);
    expect(isProductUnlocked(state, "lipbalm")).toBe(true);
    expect(sim.dispatch({ type: "restock", productId: "lipbalm" }).ok).toBe(
      true,
    );
    expect(state.stock.lipbalm.shelf).toBeGreaterThan(0);
    expect(state.stock.lipbalm.batches[0]?.qty).toBe(state.stock.lipbalm.shelf);
  });

  it("món bán chạy đổi theo ngày và giá nhập tăng đúng lúc", () => {
    const state = createInitialState(9);
    const first = unlockedProducts(state).find((id) => isTrending(state, id))!;
    expect(stockUnitCost(state, first)).toBeGreaterThan(0);
    const cost = stockUnitCost(state, first);
    state.day = 2;
    expect(isTrending(state, first)).toBe(false);
    expect(stockUnitCost(state, first)).toBeLessThan(cost);
  });

  it("save v4 giữ quyền nhập bán toàn bộ danh mục", () => {
    const state = createInitialState(5);
    const raw = createSave(state, 100) as unknown as Record<string, unknown>;
    raw.version = 4;
    const loaded = loadSave({ ...raw, format: SAVE_FORMAT });
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(unlockedProducts(loaded.state)).toHaveLength(20);
  });

  it("người chơi giao quầy cho NPC có thể tự tích tiền mở liên tiếp các nhóm hàng", () => {
    const state = createInitialState(18);
    state.money = 400;
    state.dayStart.money = 400;
    const sim = new Simulation(state);
    // Chi làm cả hai ca; làm liên tục 5 ngày thì cho nghỉ một ngày để không mệt rồi xin thôi việc.
    hireAllDay(sim, "chi");
    expect(
      sim.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: "w-chi",
      }).ok,
    ).toBe(true);
    for (
      let tick = 0;
      tick < (18 * state.config.dayMs) / state.config.tickMs;
      tick++
    ) {
      if (tick % 50 === 0) {
        const chi = state.workers["w-chi"];
        if (chi && chi.streak >= 5 && chi.restDay === null)
          sim.dispatch({ type: "setRestDay", workerId: "w-chi", rest: true });
        for (let level = 2; level <= 5; level++) {
          if (playerLevel(state) < level) break;
          for (const facility of ["warehouse", "storefront"] as const) {
            const id = `${facility}-${level}`;
            if (!state.upgrades.includes(id))
              sim.dispatch({ type: "buyUpgrade", upgradeId: id });
          }
        }
      }
      sim.step();
    }
    expect(unlockedProducts(state).length).toBe(20);
    expect(state.money).toBeGreaterThanOrEqual(0);
  });

  it("chỗ nhân viên tăng theo nâng cấp Cửa hàng và Quầy 2, tới đủ người tự chạy hai quầy", () => {
    const state = createInitialState(5);
    state.money = 5000;
    state.stats.sales = 80;
    state.day = 7;
    const sim = new Simulation(state);
    const steps: [string, number, number][] = [
      ["storefront-2", 2, 4],
      ["storefront-3", 2, 5],
      ["counter-2", 3, 7],
      ["storefront-4", 4, 9],
      ["storefront-5", 4, 10],
    ];
    expect(staffLimits(state)).toEqual({ perShift: 1, total: 2 });
    for (const [upgradeId, perShift, total] of steps) {
      expect(sim.dispatch({ type: "buyUpgrade", upgradeId }).ok).toBe(true);
      expect(staffLimits(state)).toEqual({ perShift, total });
    }
    // Cuối lộ trình mỗi ca đủ hai quầy, một người kho và một người hỗ trợ.
    expect(staffLimits(state).perShift).toBeGreaterThanOrEqual(
      state.counters.length + 2,
    );
  });

  it("save cũ bỏ giới hạn nhân sự trong config và giữ nguyên đội đông hơn giới hạn mới", () => {
    const state = createInitialState(6);
    state.money = 5000;
    state.upgrades.push("storefront-2");
    const sim = new Simulation(state);
    for (const id of ["binh", "chi", "dung"])
      expect(sim.dispatch({ type: "hire", candidateId: id }).ok).toBe(true);
    const save = createSave(state, 1);
    save.state.upgrades = [];
    Object.assign(save.state.config, { maxStaff: 4, maxPerShift: 2 });
    (save as { version: number }).version = 9;
    const loaded = loadSave(save);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect("maxStaff" in loaded.state.config).toBe(false);
    expect(Object.keys(loaded.state.workers)).toHaveLength(4);
    expect(
      new Simulation(loaded.state).dispatch({
        type: "hire",
        candidateId: loaded.state.recruits[0]!.id,
      }),
    ).toEqual({
      ok: false,
      reason: "staff-full",
    });
  });
});
