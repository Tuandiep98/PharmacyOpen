import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSave,
  dailyOperationsCase,
  loadSave,
  Simulation,
} from "../src";
import { runFor } from "./helpers";

describe("sự cố vận hành và điều chuyển", () => {
  it("quyết định một lần mỗi ngày, có chi phí và ảnh hưởng lượng khách", () => {
    const state = createInitialState(3);
    state.day = 2;
    const sim = new Simulation(state);
    const incident = dailyOperationsCase(sim.snapshot)!;
    expect(incident.choices).toHaveLength(3);
    const before = sim.snapshot.money;
    expect(
      sim.dispatch({ type: "chooseOperations", choice: "careful" }).ok,
    ).toBe(true);
    expect(sim.snapshot.money).toBe(before - incident.choices[0]!.cost);
    expect(sim.snapshot.stats.spentOnOperations).toBe(
      incident.choices[0]!.cost,
    );
    expect(
      sim.dispatch({ type: "chooseOperations", choice: "shortcut" }),
    ).toEqual({ ok: false, reason: "operations-already-chosen" });
    const saved = loadSave(createSave(sim.snapshot, 0));
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.state.operations.choice).toBe("careful");
  });

  it("điểm thấp sau đủ ngày buộc nhận chi nhánh nhỏ và giữ số lần điều chuyển", () => {
    const state = createInitialState(7);
    state.day = 10;
    state.operations.score = 8;
    state.operations.scoreAtDayStart = 8;
    state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    const sim = new Simulation(state);
    runFor(sim, state.config.dayMs);
    expect(sim.snapshot.operations.pendingTransfer).toBe(true);
    const haltedTick = sim.snapshot.tick;
    sim.step();
    expect(sim.snapshot.tick).toBe(haltedTick);
    expect(sim.dispatch({ type: "acceptTransfer" }).ok).toBe(true);
    expect(sim.snapshot.day).toBe(1);
    expect(sim.snapshot.operations.transfers).toBe(1);
    expect(sim.snapshot.operations.pendingTransfer).toBe(false);
    expect(sim.snapshot.money).toBe(sim.snapshot.config.startingMoney);
  });

  it("save v13 nhận hồ sơ quản lý trung lập", () => {
    const old = createSave(createInitialState(2), 0) as unknown as {
      version: number;
      state: Record<string, unknown>;
    };
    old.version = 13;
    delete old.state.operations;
    const loaded = loadSave(old);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.state.operations.score).toBe(65);
  });
});
