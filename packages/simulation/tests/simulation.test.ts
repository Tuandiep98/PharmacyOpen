import { describe, expect, it } from "vitest";
import {
  ARCHETYPES,
  createInitialState,
  PRODUCT_IDS,
  PRODUCTS,
  replay,
  REQUESTS,
  Simulation,
  type SimState,
} from "../src";
import { autoPlay, runFor } from "./helpers";

/** Tạo một khách đứng sẵn ở quầy với yêu cầu cho trước (bỏ qua spawn ngẫu nhiên). */
function withCustomerAtCounter(requestId: string, patienceMs = 30000) {
  const state = createInitialState(1);
  state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
  state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
  state.customers.c1 = {
    id: "c1",
    archetypeId: "curious",
    requestId,
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    phase: "counter",
    arrivedAtMs: 0,
    servedAtMs: null,
    patienceMs,
    patienceMaxMs: patienceMs,
    expression: "neutral",
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
    loyaltyId: null,
  };
  state.counters[0]!.customerId = "c1";
  const sim = new Simulation(state);
  const started = sim.dispatch({
    type: "startService",
    workerId: "w-player",
    customerId: "c1",
  });
  expect(started.ok).toBe(true);
  const orderId = (sim.snapshot as SimState).customers.c1!.orderId!;
  return { sim, orderId };
}

describe("nội dung game", () => {
  it("mọi tham chiếu yêu cầu/sản phẩm đều hợp lệ", () => {
    for (const archetype of Object.values(ARCHETYPES)) {
      for (const requestId of Object.keys(archetype.requestWeights))
        expect(REQUESTS[requestId]).toBeDefined();
    }
    for (const request of Object.values(REQUESTS)) {
      for (const pid of request.acceptable) expect(PRODUCTS[pid]).toBeDefined();
      if (request.kind === "refer") expect(request.acceptable).toEqual([]);
      else expect(request.acceptable.length).toBeGreaterThan(0);
    }
    for (const id of PRODUCT_IDS)
      expect(PRODUCTS[id].price).toBeGreaterThan(PRODUCTS[id].cost);
  });
});

describe("tính tất định", () => {
  it("cùng seed + cùng luồng lệnh cho cùng kết quả, và replay tái hiện được", () => {
    const run = () => {
      const sim = Simulation.create(42);
      const initial = sim.serialize();
      runFor(sim, 10 * 60_000, autoPlay);
      return { sim, initial };
    };
    const a = run();
    const b = run();
    expect(a.sim.serialize()).toEqual(b.sim.serialize());
    expect(a.sim.snapshot.stats.sales).toBeGreaterThan(10);

    const replayed = replay(a.initial, a.sim.commandLog, a.sim.snapshot.tick);
    expect(replayed).toEqual(a.sim.serialize());
  });

  it("seed khác cho diễn biến khác", () => {
    const a = Simulation.create(1);
    const b = Simulation.create(2);
    runFor(a, 5 * 60_000, autoPlay);
    runFor(b, 5 * 60_000, autoPlay);
    expect(a.serialize().interactions).not.toEqual(b.serialize().interactions);
  });
});

describe("kho và tiền", () => {
  it("kho không âm và sổ sách khớp sau phiên chơi dài có sai sót", () => {
    const sim = Simulation.create(7);
    const ticks = (30 * 60_000) / sim.snapshot.config.tickMs;
    for (let i = 0; i < ticks; i++) {
      autoPlay(sim, { mistakes: true });
      sim.step();
      for (const id of PRODUCT_IDS) {
        const { shelf, capacity } = sim.snapshot.stock[id];
        expect(shelf).toBeGreaterThanOrEqual(0);
        expect(shelf).toBeLessThanOrEqual(capacity);
      }
    }
    const { stats, money, config } = sim.snapshot;
    expect(money).toBe(
      config.startingMoney +
        stats.revenue -
        stats.spentOnStock -
        stats.spentOnStaff -
        stats.spentOnUpgrades -
        stats.spentOnVouchers,
    );
    expect(stats.wrongItems).toBeGreaterThan(0);
  });

  it("nhập hàng mua tối đa số lượng đủ tiền, từ chối khi không đủ hoặc kệ đầy", () => {
    const sim = Simulation.create(1);
    expect(sim.dispatch({ type: "restock", productId: "mask" })).toEqual({
      ok: false,
      reason: "shelf-full",
    });
    const state = sim.snapshot as SimState;
    state.stock.sunscreen.shelf = 0;
    state.money = 40; // đủ 2 tuýp giá vốn 15
    expect(sim.dispatch({ type: "restock", productId: "sunscreen" }).ok).toBe(
      true,
    );
    expect(state.stock.sunscreen.shelf).toBe(2);
    expect(state.money).toBe(10);
    expect(sim.dispatch({ type: "restock", productId: "sunscreen" })).toEqual({
      ok: false,
      reason: "insufficient-funds",
    });
  });
  it("nhập số lượng chọn trước, kiểm tra số nguyên, chỗ trống và số xu", () => {
    const sim = Simulation.create(1);
    const state = sim.snapshot as SimState;
    state.stock.sunscreen.shelf = 0;
    state.money = 40;
    expect(
      sim.dispatch({ type: "restock", productId: "sunscreen", quantity: 0 }),
    ).toEqual({ ok: false, reason: "invalid-quantity" });
    expect(
      sim.dispatch({ type: "restock", productId: "sunscreen", quantity: 1.5 }),
    ).toEqual({ ok: false, reason: "invalid-quantity" });
    expect(
      sim.dispatch({ type: "restock", productId: "sunscreen", quantity: 5 }),
    ).toEqual({ ok: false, reason: "invalid-quantity" });
    expect(
      sim.dispatch({ type: "restock", productId: "sunscreen", quantity: 3 }),
    ).toEqual({ ok: false, reason: "insufficient-funds" });
    expect(state.money).toBe(40);
    expect(state.stock.sunscreen.shelf).toBe(0);
    expect(
      sim.dispatch({ type: "restock", productId: "sunscreen", quantity: 1 }).ok,
    ).toBe(true);
    expect(state.money).toBe(25);
    expect(state.stock.sunscreen.shelf).toBe(1);
    expect(state.stats.spentOnStock).toBe(15);
  });
});

describe("quy tắc phục vụ", () => {
  it("bán đúng hàng: lấy hàng → thanh toán → cộng tiền, khách rời đi vui vẻ", () => {
    const { sim, orderId } = withCustomerAtCounter("named-mask");
    const state = sim.snapshot as SimState;
    expect(
      sim.dispatch({ type: "checkout", workerId: "w-player", orderId }),
    ).toEqual({ ok: false, reason: "invalid-order-state" });
    expect(
      sim.dispatch({
        type: "pickProduct",
        workerId: "w-player",
        orderId,
        productId: "mask",
      }).ok,
    ).toBe(true);
    expect(state.stock.mask.shelf).toBe(PRODUCTS.mask.shelfCapacity - 1);
    runFor(sim, state.config.retrieveMs);
    expect(state.orders[orderId]!.state).toBe("ready");
    expect(
      sim.dispatch({ type: "checkout", workerId: "w-player", orderId }).ok,
    ).toBe(true);
    runFor(sim, state.config.checkoutMs);
    expect(state.money).toBe(state.config.startingMoney + PRODUCTS.mask.price);
    expect(state.customers.c1!.outcome).toBe("bought");
    expect(state.workers["w-player"]!.orderId).toBeNull();
  });

  it("đưa nhầm hàng: trả về kệ, quay lại bước chọn và trừ kiên nhẫn", () => {
    const { sim, orderId } = withCustomerAtCounter("need-beach");
    const state = sim.snapshot as SimState;
    sim.dispatch({
      type: "pickProduct",
      workerId: "w-player",
      orderId,
      productId: "bandage",
    });
    runFor(sim, state.config.retrieveMs);
    expect(state.orders[orderId]!.state).toBe("deciding");
    expect(state.stock.bandage.shelf).toBe(PRODUCTS.bandage.shelfCapacity);
    expect(state.customers.c1!.patienceMs).toBeLessThan(30000 * 0.8);
    expect(sim.drainEvents().some((e) => e.type === "wrongProduct")).toBe(true);
  });

  it("khách mô tả triệu chứng: không thể bán, phát cảnh báo an toàn; khuyên đi khám là đúng", () => {
    const { sim, orderId } = withCustomerAtCounter("refer-fever");
    const state = sim.snapshot as SimState;
    for (const productId of PRODUCT_IDS) {
      expect(
        sim.dispatch({
          type: "pickProduct",
          workerId: "w-player",
          orderId,
          productId,
        }),
      ).toEqual({
        ok: false,
        reason: "safety-referral-required",
      });
      expect(state.stock[productId].shelf).toBe(
        PRODUCT_IDS.indexOf(productId) < 4
          ? PRODUCTS[productId].shelfCapacity
          : 0,
      );
    }
    expect(
      sim.drainEvents().filter((e) => e.type === "safetyWarning"),
    ).toHaveLength(PRODUCT_IDS.length);

    expect(
      sim.dispatch({ type: "refer", workerId: "w-player", orderId }).ok,
    ).toBe(true);
    runFor(sim, state.config.referMs);
    expect(state.customers.c1!.outcome).toBe("referred");
    expect(state.money).toBe(state.config.startingMoney);
    expect(sim.drainEvents()).toContainEqual(
      expect.objectContaining({ type: "referralCompleted", appropriate: true }),
    );
  });

  it("khách hết kiên nhẫn thì bỏ đi và hàng đang giữ được trả lại kệ", () => {
    const { sim, orderId } = withCustomerAtCounter("named-sunscreen", 3000);
    const state = sim.snapshot as SimState;
    sim.dispatch({
      type: "pickProduct",
      workerId: "w-player",
      orderId,
      productId: "sunscreen",
    });
    runFor(sim, state.config.retrieveMs + 20_000);
    expect(state.customers.c1?.outcome ?? "left-angry").toBe("left-angry");
    expect(state.stock.sunscreen.shelf).toBe(PRODUCTS.sunscreen.shelfCapacity);
    expect(state.stats.leftAngry).toBe(1);
    expect(state.workers["w-player"]!.orderId).toBeNull();
  });

  it("không phục vụ được khách chưa tới quầy hoặc khi nhân viên đang bận", () => {
    const { sim } = withCustomerAtCounter("named-mask");
    const state = sim.snapshot as SimState;
    expect(
      sim.dispatch({
        type: "startService",
        workerId: "w-player",
        customerId: "c1",
      }),
    ).toEqual({
      ok: false,
      reason: "worker-busy",
    });
    state.workers["w-player"]!.orderId = null;
    expect(
      sim.dispatch({
        type: "startService",
        workerId: "w-player",
        customerId: "c1",
      }),
    ).toEqual({
      ok: false,
      reason: "customer-already-served",
    });
  });
});
