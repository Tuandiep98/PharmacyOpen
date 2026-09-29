import { describe, expect, it } from "vitest";
import {
  createInitialState,
  Simulation,
  stationOf,
  type SimEvent,
  type SimState,
} from "../src";
import { runFor } from "./helpers";

const mutable = (sim: Simulation) => sim.snapshot as SimState;

/** Tiệm có Bình và Chi cùng ca sáng (hồ sơ cố định), nhiều vốn, tắt khách ngẫu nhiên. */
function twoStaff(seed = 1) {
  const state = createInitialState(seed);
  state.money = 2000;
  // Cửa hàng cấp 2: 2 người mỗi ca, tối đa 4 người.
  state.upgrades.push("storefront-2");
  state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
  state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
  const sim = new Simulation(state);
  sim.dispatch({ type: "hire", candidateId: "binh" });
  sim.dispatch({ type: "hire", candidateId: "chi" });
  return { sim, s: mutable(sim) };
}

describe("vị trí làm việc", () => {
  it("xếp vị trí: kiểm tra người chơi, vị trí lạ và số chỗ", () => {
    const { sim, s } = twoStaff();
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-player",
        station: "stock",
      }),
    ).toEqual({
      ok: false,
      reason: "cannot-schedule-player",
    });
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-binh",
        station: "nope" as never,
      }),
    ).toEqual({
      ok: false,
      reason: "unknown-station",
    });
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-binh",
        station: "stock",
      }).ok,
    ).toBe(true);
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-chi",
        station: "counter",
      }).ok,
    ).toBe(true);
    expect(stationOf(s, s.workers["w-binh"]!)).toBe("stock");
    expect(stationOf(s, s.workers["w-chi"]!)).toBe("counter");
    expect(stationOf(s, s.workers["w-player"]!)).toBe("support");

    // Kho tối đa 2 người.
    s.money = 5000;
    sim.dispatch({ type: "hire", candidateId: "dung" });
    sim.dispatch({ type: "hire", candidateId: s.recruits[0]!.id });
    const extra = Object.keys(s.workers).find((id) => id.startsWith("w-r"))!;
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-dung",
        station: "stock",
      }).ok,
    ).toBe(true);
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: extra,
        station: "stock",
      }),
    ).toEqual({ ok: false, reason: "station-full" });
  });

  it("người ở kho bổ sung kệ từ sớm, người hỗ trợ đợi kệ gần hết", () => {
    const { sim, s } = twoStaff(2);
    sim.dispatch({
      type: "assignStation",
      workerId: "w-binh",
      station: "stock",
    });
    // Kệ còn một nửa: dưới ngưỡng của kho (60%), trên ngưỡng của người hỗ trợ (34%).
    s.stock.mask.shelf = 3;
    s.stock.mask.batches = [{ qty: 3, expiresAtMs: s.config.stockShelfLifeMs }];
    const events: SimEvent[] = [];
    runFor(sim, 10_000, () => events.push(...sim.drainEvents()));
    events.push(...sim.drainEvents());
    const restocks = events.filter(
      (e) => e.type === "restocked" && e.productId === "mask",
    );
    expect(restocks.map((e) => e.type === "restocked" && e.workerId)).toEqual([
      "w-binh",
    ]);
    expect(s.stock.mask.shelf).toBe(s.stock.mask.capacity);
  });

  it("người đứng quầy chuyển sang kho: quầy giao cho người hỗ trợ trong ca; đầu ca không gọi người ở kho ra quầy", () => {
    const { sim, s } = twoStaff(3);
    sim.dispatch({
      type: "assignStation",
      workerId: "w-binh",
      station: "counter",
    });
    expect(
      sim.dispatch({
        type: "assignStation",
        workerId: "w-binh",
        station: "stock",
      }).ok,
    ).toBe(true);
    expect(s.counters[0]!.operatorId).toBe("w-chi");

    // Chỉ còn người ở kho trong ca: quầy về người chơi thay vì kéo người ở kho ra.
    sim.dispatch({
      type: "assignStation",
      workerId: "w-chi",
      station: "stock",
    });
    expect(s.counters[0]!.operatorId).toBe("w-player");
    runFor(sim, s.config.dayMs);
    expect(s.counters[0]!.operatorId).toBe("w-player");
  });

  it("một người bán, một người lo kho: tiệm tự chạy, người ở kho lo phần lớn việc nhập hàng", () => {
    const { sim, s } = twoStaff(4);
    s.nextSpawnAtMs = s.timeMs + 1000;
    sim.dispatch({
      type: "assignStation",
      workerId: "w-chi",
      station: "counter",
    });
    sim.dispatch({
      type: "assignStation",
      workerId: "w-binh",
      station: "stock",
    });
    const restockers: string[] = [];
    runFor(sim, s.config.dayMs / 2 - 1000, () => {
      for (const e of sim.drainEvents())
        if (e.type === "restocked" && e.workerId) restockers.push(e.workerId);
    });
    expect(s.workers["w-chi"]!.served).toBeGreaterThan(2);
    expect(restockers.length).toBeGreaterThan(0);
    expect(
      restockers.filter((id) => id === "w-binh").length,
    ).toBeGreaterThanOrEqual(restockers.length / 2);
  });
});
