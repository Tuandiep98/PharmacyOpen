import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_IDS,
  ARCHETYPES,
  countsForStaff,
  createInitialState,
  demandMultiplier,
  evaluateSatisfaction,
  performanceScore,
  PLAYER_WORKER_ID,
  PRODUCTS,
  reviewProbability,
  Simulation,
  starsFrom,
  storeRating,
  type SimState,
} from "../src";
import { autoPlay, runFor } from "./helpers";

function placeCustomer(
  state: SimState,
  id: string,
  archetypeId: "hurried" | "curious" | "demanding",
  requestId: string,
) {
  state.customers[id] = {
    id,
    archetypeId,
    requestId,
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    phase: "counter",
    arrivedAtMs: state.timeMs,
    servedAtMs: null,
    patienceMs: 60_000,
    patienceMaxMs: 60_000,
    expression: "neutral",
    emoteUntilMs: 0,
    orderId: null,
    outcome: null,
    leaveAtMs: 0,
    loyaltyId: null,
    chat: null,
    chatBonus: 0,
  };
  state.counters[0]!.customerId = id;
}

/** Người chơi bán đúng món cho khách ở quầy, đi qua đủ các lệnh. */
function serveCorrectly(
  sim: Simulation,
  customerId: string,
  productId: "sunscreen" | "mask",
) {
  const state = sim.snapshot as SimState;
  sim.dispatch({
    type: "startService",
    workerId: PLAYER_WORKER_ID,
    customerId,
  });
  const orderId = state.customers[customerId]!.orderId!;
  expect(
    sim.dispatch({
      type: "pickProduct",
      workerId: PLAYER_WORKER_ID,
      orderId,
      productId,
    }).ok,
  ).toBe(true);
  runFor(sim, state.config.retrieveMs);
  expect(
    sim.dispatch({ type: "checkout", workerId: PLAYER_WORKER_ID, orderId }).ok,
  ).toBe(true);
  runFor(sim, state.config.checkoutMs + state.config.leaveMs + 200);
}

describe("ba thước đo tách biệt", () => {
  it("phục vụ đúng nhưng khách khó tính chê giá: sao thấp, hiệu suất vẫn 100, không tính vào danh tiếng cá nhân", () => {
    const { satisfaction, reasons } = evaluateSatisfaction({
      archetype: ARCHETYPES.demanding,
      outcome: "bought",
      served: true,
      queueWaitMs: 5000,
      serviceMs: 5000,
      patienceRatio: 0.5,
      wrongCount: 0,
      price: PRODUCTS.sunscreen.price,
      referencePrice: PRODUCTS.sunscreen.referencePrice,
      server: { communication: 0.7, traits: [] },
    });
    const stars = starsFrom(satisfaction);
    expect(stars).toBeLessThanOrEqual(2);
    expect(reasons).toContain("price-high");
    expect(performanceScore(["correct-item"])).toBe(100);
    expect(countsForStaff(PLAYER_WORKER_ID, stars, reasons)).toBe(false);
  });

  it("tích luỹ nhiều lượt: danh tiếng cửa hàng giảm vì giá, nhân viên không bị trừ điểm nghề hay danh tiếng cá nhân", () => {
    const state = createInitialState(9);
    state.money = 10_000;
    state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    const sim = new Simulation(state);
    for (let i = 0; i < 30; i++) {
      placeCustomer(state, `x${i}`, "demanding", "named-sunscreen");
      serveCorrectly(sim, `x${i}`, "sunscreen");
      if (state.stock.sunscreen.shelf === 0)
        sim.dispatch({ type: "restock", productId: "sunscreen" });
    }
    const worker = state.workers[PLAYER_WORKER_ID]!;
    expect(state.stats.sales).toBe(30);
    expect(worker.perfSum / worker.perfCount).toBe(100);
    expect(state.reviews.length).toBeGreaterThan(5);
    expect(state.reviews.every((r) => r.reasons.includes("price-high"))).toBe(
      true,
    );
    expect(worker.repCount).toBe(0);
    expect(storeRating(state)).toBeLessThan(
      state.config.reputation.priorRating,
    );
    // Lịch sử tương tác giữ lý do để người chơi xem "vì sao".
    expect(state.interactions.at(-1)!.reasons).toContain("price-high");
  });

  it("lỗi nghiệp vụ (đưa nhầm, định bán cho khách có triệu chứng) mới làm giảm hiệu suất", () => {
    expect(performanceScore(["wrong-item", "correct-item"])).toBe(75);
    expect(performanceScore(["safety-warning", "appropriate-referral"])).toBe(
      60,
    );
    expect(performanceScore(["unnecessary-referral"])).toBe(60);
    expect(
      performanceScore([
        "wrong-item",
        "wrong-item",
        "safety-warning",
        "customer-left",
      ]),
    ).toBe(0);
  });
});

describe("tính cách tác động theo ngữ cảnh", () => {
  const base = {
    outcome: "bought" as const,
    served: true,
    queueWaitMs: 3000,
    serviceMs: 3000,
    patienceRatio: 0.5,
    wrongCount: 0,
    price: 12,
    referencePrice: 12,
  };
  it("nhân viên hoạt ngôn: khách hay hỏi vui hơn, khách vội phiền hơn", () => {
    const talk = { communication: 0.85, traits: ["talkative" as const] };
    const quiet = { communication: 0.85, traits: [] };
    const curiousTalk = evaluateSatisfaction({
      ...base,
      archetype: ARCHETYPES.curious,
      server: talk,
    });
    const curiousQuiet = evaluateSatisfaction({
      ...base,
      archetype: ARCHETYPES.curious,
      server: quiet,
    });
    const hurriedTalk = evaluateSatisfaction({
      ...base,
      archetype: ARCHETYPES.hurried,
      server: talk,
    });
    const hurriedQuiet = evaluateSatisfaction({
      ...base,
      archetype: ARCHETYPES.hurried,
      server: quiet,
    });
    expect(curiousTalk.satisfaction).toBeGreaterThan(curiousQuiet.satisfaction);
    expect(hurriedTalk.satisfaction).toBeLessThan(hurriedQuiet.satisfaction);
    expect(hurriedTalk.reasons).toContain("too-chatty");
  });
});

describe("xác suất đánh giá và giới hạn", () => {
  it("xác suất viết đánh giá luôn < 1 và nằm trong giới hạn cấu hình", () => {
    for (const id of ARCHETYPE_IDS) {
      for (let s = 0; s <= 1; s += 0.05) {
        const p = reviewProbability(ARCHETYPES[id], s, 0.9);
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it("trong một phiên dài, số đánh giá ít hơn số lượt khách", () => {
    const sim = Simulation.create(4);
    runFor(sim, 20 * 60_000, autoPlay);
    const state = sim.snapshot as SimState;
    const reviewed = state.interactions.filter((i) => i.reviewId).length;
    expect(state.interactions.length).toBeGreaterThan(20);
    expect(reviewed).toBeGreaterThan(0);
    expect(reviewed).toBeLessThan(state.interactions.length);
    expect(state.reputation.histogram.reduce((a, b) => a + b, 0)).toBe(
      state.reputation.count,
    );
  });
});

describe("danh tiếng → lượng khách (có trần/sàn)", () => {
  it("hệ số lượng khách bị chặn trong [demandMin, demandMax]", () => {
    const state = createInitialState(1);
    state.reputation = {
      starsSum: 5 * 10_000,
      count: 10_000,
      histogram: [0, 0, 0, 0, 10_000],
    };
    // Làm mượt Bayes nên 5 sao tuyệt đối vẫn chỉ ~4,999 → sát trần, không vượt trần.
    expect(demandMultiplier(state)).toBeLessThanOrEqual(
      state.config.reputation.demandMax,
    );
    expect(demandMultiplier(state)).toBeCloseTo(
      state.config.reputation.demandMax,
      2,
    );
    state.reputation = {
      starsSum: 10_000,
      count: 10_000,
      histogram: [10_000, 0, 0, 0, 0],
    };
    expect(demandMultiplier(state)).toBe(state.config.reputation.demandMin);
    state.reputation = { starsSum: 0, count: 0, histogram: [0, 0, 0, 0, 0] };
    expect(demandMultiplier(state)).toBe(1);
  });

  it("danh tiếng cao làm nhiều khách ghé hơn, nhưng hàng chờ giới hạn số khách thực sự vào được", () => {
    const arrivals = (stars: number) => {
      const state = createInitialState(12);
      state.awareness = 100;
      state.reputation = {
        starsSum: stars * 400,
        count: 400,
        histogram: [0, 0, 0, 0, 0],
      };
      const sim = new Simulation(state);
      runFor(sim, 15 * 60_000);
      return state;
    };
    const good = arrivals(5);
    const bad = arrivals(1);
    const total = (s: SimState) =>
      s.stats.customersArrived + s.stats.turnedAway;
    expect(total(good)).toBeGreaterThan(total(bad));
    // Không ai phục vụ: tiệm đông khách chỉ làm nhiều người bỏ đi hơn, không tự sinh doanh thu.
    expect(good.stats.revenue).toBe(0);
    expect(good.stats.turnedAway).toBeGreaterThan(bad.stats.turnedAway);
  });
});

describe("khiếu nại", () => {
  function withComplaint() {
    const state = createInitialState(9);
    state.money = 10_000;
    state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    const sim = new Simulation(state);
    for (let i = 0; i < 40 && !state.complaints.length; i++) {
      placeCustomer(state, `x${i}`, "demanding", "named-sunscreen");
      serveCorrectly(sim, `x${i}`, "sunscreen");
      if (state.stock.sunscreen.shelf === 0)
        sim.dispatch({ type: "restock", productId: "sunscreen" });
    }
    const complaint = state.complaints[0]!;
    expect(complaint).toBeDefined();
    return { sim, state, complaint };
  }

  it("phản hồi không xoá đánh giá, tối đa +1 sao, chỉ phản hồi được một lần", () => {
    const { sim, state, complaint } = withComplaint();
    const review = state.reviews.find((r) => r.id === complaint.reviewId)!;
    const before = review.stars;
    const count = state.reputation.count;
    expect(
      sim.dispatch({
        type: "respondComplaint",
        complaintId: complaint.id,
        response: "explain",
      }).ok,
    ).toBe(true);
    expect(
      state.reviews.find((r) => r.id === complaint.reviewId),
    ).toBeDefined();
    expect(review.stars - before).toBeLessThanOrEqual(1);
    expect(review.stars).toBe(before + (complaint.improved ? 1 : 0));
    expect(review.originalStars).toBe(before);
    expect(state.reputation.count).toBe(count);
    expect(
      sim.dispatch({
        type: "respondComplaint",
        complaintId: complaint.id,
        response: "apologize",
      }),
    ).toEqual({
      ok: false,
      reason: "complaint-closed",
    });
  });

  it("tặng phiếu giảm giá tốn xu và bị từ chối khi không đủ tiền", () => {
    const { sim, state, complaint } = withComplaint();
    state.money = 5;
    expect(
      sim.dispatch({
        type: "respondComplaint",
        complaintId: complaint.id,
        response: "voucher",
      }),
    ).toEqual({
      ok: false,
      reason: "insufficient-funds",
    });
    state.money = 100;
    expect(
      sim.dispatch({
        type: "respondComplaint",
        complaintId: complaint.id,
        response: "voucher",
      }).ok,
    ).toBe(true);
    expect(state.money).toBe(100 - state.config.reputation.voucherCost);
  });
});
