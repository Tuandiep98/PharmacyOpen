import { describe, expect, it } from "vitest";
import {
  createInitialState,
  PLAYER_WORKER_ID,
  PRODUCT_IDS,
  PRODUCTS,
  replay,
  REQUESTS,
  Simulation,
  STAFF_CANDIDATES,
  UPGRADES,
  type SimEvent,
  type SimState,
} from "../src";
import { hireAllDay, runFor } from "./helpers";

/** Ván có sẵn nhiều tiền, đã tuyển `candidateId` và giao quầy cho NPC đó. */
function withNpc(seed = 3, candidateId = "chi", money = 1000) {
  const state = createInitialState(seed);
  state.money = money;
  // Tiệm đã quen mặt với khu phố (độ nhận biết tối đa) để đo NPC ở nhịp khách bình thường.
  state.awareness = 100;
  const sim = new Simulation(state);
  const workerId = hireAllDay(sim, candidateId);
  expect(
    sim.dispatch({ type: "assignCounter", counterId: "counter-1", workerId })
      .ok,
  ).toBe(true);
  return { sim, state: sim.snapshot as SimState, workerId };
}

/** Đặt sẵn một khách ở quầy với yêu cầu cho trước, tắt spawn ngẫu nhiên. */
function placeCustomer(state: SimState, requestId: string, patienceMs = 60000) {
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
    chat: null,
    chatBonus: 0,
  };
  state.counters[0]!.customerId = "c1";
}

/** Chạy và gom sự kiện, kiểm tra bất biến sau từng tick. */
function runChecked(
  sim: Simulation,
  ms: number,
  onEvents?: (events: SimEvent[], state: SimState) => void,
) {
  const state = sim.snapshot as SimState;
  for (let i = 0; i < ms / state.config.tickMs; i++) {
    sim.step();
    onEvents?.(sim.drainEvents(), state);
    expect(state.money).toBeGreaterThanOrEqual(0);
    for (const id of PRODUCT_IDS) {
      expect(state.stock[id].shelf).toBeGreaterThanOrEqual(0);
      expect(state.stock[id].shelf).toBeLessThanOrEqual(
        state.stock[id].capacity,
      );
    }
  }
}

describe("NPC tự phục vụ (idle)", () => {
  it("không cần người chơi: NPC bán hàng, tự bổ sung kệ, không bao giờ bán cho khách có triệu chứng", () => {
    const { sim, state, workerId } = withNpc(11, "binh", 300);
    let soldToSymptomCustomer = 0;
    let npcRestocks = 0;
    runChecked(sim, 20 * 60_000, (events, s) => {
      for (const e of events) {
        if (
          e.type === "saleCompleted" &&
          REQUESTS[s.customers[e.customerId]!.requestId]!.kind === "refer"
        )
          soldToSymptomCustomer++;
        if (e.type === "restocked" && e.workerId === workerId) npcRestocks++;
      }
    });
    expect(state.stats.sales).toBeGreaterThan(40);
    expect(state.workers[workerId]!.served).toBe(state.stats.sales);
    expect(npcRestocks).toBeGreaterThan(0);
    expect(soldToSymptomCustomer).toBe(0);
    const { stats } = state;
    expect(state.money).toBe(
      300 -
        STAFF_CANDIDATES.binh!.hireCost +
        stats.revenue -
        stats.spentOnStock -
        stats.spentOnUpgrades -
        stats.spentOnVouchers -
        stats.spentOnWages +
        stats.rewardCoins +
        stats.itemSales,
    );
  });

  it("NPC kiến thức thấp định bán cho khách có triệu chứng thì bị luật an toàn chặn, rồi khuyên đi khám", () => {
    const { sim, state, workerId } = withNpc();
    state.workers[workerId]!.knowledge = 0;
    placeCustomer(state, "refer-dizzy");
    const events: SimEvent[] = [];
    runChecked(sim, 15_000, (e) => events.push(...e));
    expect(
      events.some((e) => e.type === "safetyWarning" && e.workerId === workerId),
    ).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "referralCompleted", appropriate: true }),
    );
    expect(state.customers.c1?.outcome ?? "referred").toBe("referred");
    expect(state.stats.sales).toBe(0);
  });

  it("NPC đưa nhầm thì không đưa lại đúng món đã bị từ chối", () => {
    const { sim, state, workerId } = withNpc();
    state.workers[workerId]!.knowledge = 0;
    placeCustomer(state, "need-beach");
    const wrong: string[] = [];
    runChecked(sim, 60_000, (events) => {
      for (const e of events)
        if (e.type === "wrongProduct") wrong.push(e.productId);
    });
    // Mỗi món sai chỉ bị thử một lần và không bao giờ là món đúng.
    expect(new Set(wrong).size).toBe(wrong.length);
    expect(wrong).not.toContain("sunscreen");
    expect(wrong.length).toBeGreaterThan(0);
  });
});

describe("cùng một đơn, người chơi hay NPC đều qua cùng luật", () => {
  it("người chơi và NPC phục vụ cùng yêu cầu cho cùng kết quả kinh tế", () => {
    const byPlayer = new Simulation(createInitialState(5));
    const ps = byPlayer.snapshot as SimState;
    placeCustomer(ps, "named-sunscreen");
    byPlayer.dispatch({
      type: "startService",
      workerId: PLAYER_WORKER_ID,
      customerId: "c1",
    });
    const orderId = ps.customers.c1!.orderId!;
    byPlayer.dispatch({
      type: "pickProduct",
      workerId: PLAYER_WORKER_ID,
      orderId,
      productId: "sunscreen",
    });
    runFor(byPlayer, ps.config.retrieveMs);
    byPlayer.dispatch({
      type: "checkout",
      workerId: PLAYER_WORKER_ID,
      orderId,
    });
    runFor(byPlayer, ps.config.checkoutMs);

    const { sim: byNpc, state: ns } = withNpc(5);
    const before = ns.money;
    placeCustomer(ns, "named-sunscreen");
    runChecked(byNpc, 15_000);

    expect(ps.customers.c1!.outcome).toBe("bought");
    expect(ns.customers.c1?.outcome ?? "bought").toBe("bought");
    expect(ps.money - ps.config.startingMoney).toBe(PRODUCTS.sunscreen.price);
    expect(ns.money - before).toBe(PRODUCTS.sunscreen.price);
  });

  it("không ai được thao tác đơn của người khác; quầy chỉ nhận người được giao", () => {
    const { sim, state } = withNpc();
    placeCustomer(state, "named-mask");
    expect(
      sim.dispatch({
        type: "startService",
        workerId: PLAYER_WORKER_ID,
        customerId: "c1",
      }),
    ).toEqual({
      ok: false,
      reason: "counter-assigned-elsewhere",
    });
    runFor(sim, 300);
    const orderId = state.customers.c1!.orderId!;
    expect(orderId).toBeTruthy();
    expect(
      sim.dispatch({
        type: "pickProduct",
        workerId: PLAYER_WORKER_ID,
        orderId,
        productId: "mask",
      }),
    ).toEqual({
      ok: false,
      reason: "not-your-order",
    });
    expect(
      sim.dispatch({ type: "refer", workerId: PLAYER_WORKER_ID, orderId }),
    ).toEqual({ ok: false, reason: "not-your-order" });
  });

  it("lấy lại quầy: NPC hoàn tất đơn dở, khách tiếp theo do người chơi phục vụ", () => {
    const { sim, state, workerId } = withNpc();
    placeCustomer(state, "named-mask");
    runFor(sim, 300);
    expect(state.orders[state.customers.c1!.orderId!]!.workerId).toBe(workerId);
    expect(
      sim.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: PLAYER_WORKER_ID,
      }).ok,
    ).toBe(true);
    runChecked(sim, 12_000);
    expect(state.stats.sales).toBe(1);
    expect(state.workers[workerId]!.served).toBe(1);
    // Khách mới ở quầy thì NPC không còn được bắt đầu phục vụ.
    state.nextSpawnAtMs = state.timeMs + 100;
    runFor(sim, 3_000);
    const next = state.counters[0]!.customerId;
    expect(next).toBeTruthy();
    expect(state.customers[next!]!.orderId).toBeNull();
  });
});

describe("tuyển người, nâng cấp, giới hạn hàng chờ", () => {
  it("kiểm tra tiền, trùng người và số chỗ nhân sự", () => {
    const state = createInitialState(1);
    const sim = new Simulation(state);
    expect(sim.dispatch({ type: "hire", candidateId: "binh" })).toEqual({
      ok: false,
      reason: "insufficient-funds",
    });
    state.money = 10_000;
    expect(sim.dispatch({ type: "hire", candidateId: "nobody" })).toEqual({
      ok: false,
      reason: "unknown-candidate",
    });
    expect(sim.dispatch({ type: "hire", candidateId: "binh" }).ok).toBe(true);
    expect(sim.dispatch({ type: "hire", candidateId: "binh" })).toEqual({
      ok: false,
      reason: "already-hired",
    });
    // Tiệm mới: 1 người mỗi ca, người thứ hai sang ca chiều, người thứ ba hết chỗ.
    expect(sim.dispatch({ type: "hire", candidateId: "chi" }).ok).toBe(true);
    expect(state.workers["w-chi"]!.shifts).toEqual(["afternoon"]);
    expect(
      sim.dispatch({
        type: "setShifts",
        workerId: "w-chi",
        shifts: ["morning", "afternoon"],
      }),
    ).toEqual({
      ok: false,
      reason: "shift-full",
    });
    expect(sim.dispatch({ type: "hire", candidateId: "dung" })).toEqual({
      ok: false,
      reason: "staff-full",
    });
    // Cửa hàng cấp 2: thêm 1 chỗ mỗi ca.
    state.stats.sales = 8;
    state.day = 2;
    expect(
      sim.dispatch({ type: "buyUpgrade", upgradeId: "storefront-2" }).ok,
    ).toBe(true);
    expect(sim.dispatch({ type: "hire", candidateId: "dung" }).ok).toBe(true);
    expect(state.workers["w-dung"]!.shifts).toEqual(["morning"]);
    const recruit = state.recruits[0]!;
    expect(sim.dispatch({ type: "hire", candidateId: recruit.id }).ok).toBe(
      true,
    );
    expect(state.recruits[0]).toBeNull();
    expect(
      sim.dispatch({ type: "hire", candidateId: state.recruits[1]!.id }),
    ).toEqual({ ok: false, reason: "staff-full" });
    expect(state.stats.spentOnStaff).toBe(
      STAFF_CANDIDATES.binh!.hireCost +
        STAFF_CANDIDATES.chi!.hireCost +
        STAFF_CANDIDATES.dung!.hireCost +
        recruit.hireCost,
    );
  });

  it("nâng cấp áp dụng hiệu ứng một lần, có kiểm tra tiền", () => {
    const state = createInitialState(1);
    const sim = new Simulation(state);
    expect(sim.dispatch({ type: "buyUpgrade", upgradeId: "scanner" })).toEqual({
      ok: false,
      reason: "insufficient-funds",
    });
    state.money = 10_000;
    const checkout = state.config.checkoutMs;
    const cap = state.stock.mask.capacity;
    const maxQueue = state.config.maxQueue;
    for (const id of [
      "scanner",
      "wide-shelf",
      "bench",
      "signboard",
      "sorted-shelf",
    ]) {
      expect(sim.dispatch({ type: "buyUpgrade", upgradeId: id }).ok).toBe(true);
    }
    expect(sim.dispatch({ type: "buyUpgrade", upgradeId: "scanner" })).toEqual({
      ok: false,
      reason: "already-owned",
    });
    expect(state.config.checkoutMs).toBe(checkout / 2);
    expect(state.stock.mask.capacity).toBe(cap + 2);
    expect(state.config.maxQueue).toBe(maxQueue + 1);
    const total = [
      "scanner",
      "wide-shelf",
      "bench",
      "signboard",
      "sorted-shelf",
    ].reduce((sum, id) => sum + UPGRADES[id]!.cost, 0);
    expect(state.stats.spentOnUpgrades).toBe(total);
    // Config mặc định không bị sửa theo (mỗi ván có bản riêng).
    expect(createInitialState(1).config.checkoutMs).toBe(checkout);
  });

  it("hàng chờ đầy thì khách mới bỏ đi và được đếm lại", () => {
    const sim = Simulation.create(2);
    // Khách tới dồn dập để chắc chắn hàng chờ đầy (không ai phục vụ).
    (sim.snapshot as SimState).config.spawnIntervalMs = [1500, 2500];
    const events: SimEvent[] = [];
    runChecked(sim, 3 * 60_000, (e) => events.push(...e));
    const state = sim.snapshot as SimState;
    expect(state.queue.length).toBeLessThanOrEqual(state.config.maxQueue);
    expect(state.stats.turnedAway).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === "customerTurnedAway")).toHaveLength(
      state.stats.turnedAway,
    );
  });
});

describe("tất định khi có NPC", () => {
  it("cùng seed + cùng lệnh cho cùng kết quả, replay tái hiện được", () => {
    const run = () => {
      const state = createInitialState(21);
      state.money = 500;
      const sim = new Simulation(state);
      const initial = sim.serialize();
      sim.dispatch({ type: "hire", candidateId: "dung" });
      sim.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: "w-dung",
      });
      runFor(sim, 5 * 60_000);
      sim.dispatch({ type: "buyUpgrade", upgradeId: "signboard" });
      runFor(sim, 5 * 60_000);
      return { sim, initial };
    };
    const a = run();
    const b = run();
    expect(a.sim.serialize()).toEqual(b.sim.serialize());
    expect(replay(a.initial, a.sim.commandLog, a.sim.snapshot.tick)).toEqual(
      a.sim.serialize(),
    );
  });
});
