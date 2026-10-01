import { describe, expect, it, vi } from "vitest";
import {
  createInitialState,
  createSave,
  loadSave,
  serializeSave,
  Simulation,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { createSelection } from "../src/game/selection";
import {
  expansionSignal,
  inventorySignal,
  navigationSignal,
  reviewsSignal,
} from "../src/game/signals";
import { GameBridge } from "../src/game/GameBridge";
import { useUi } from "../src/ui/uiStore";

describe("immutable UI signals over mutable simulation", () => {
  it("mở Túi mù thành panel riêng, không đổi mục con của Mở rộng", () => {
    useUi.getState().setExpansionView("collection");
    useUi.getState().openView({ tab: "blindbag" });
    expect(useUi.getState().tab).toBe("blindbag");
    expect(useUi.getState().expansionView).toBe("collection");
    useUi.getState().setTab("store");
  });

  it("caches reads per revision but observes in-place mutations on commands", () => {
    const state = createInitialState(42);
    state.money = 10_000;
    const bridge = new GameBridge(new Simulation(state));
    const select = vi.fn((state: DeepReadonly<SimState>) => state.money);
    const read = createSelection(bridge, select);
    const original = bridge.state;
    const money = read();
    read();
    expect(select).toHaveBeenCalledTimes(1);
    expect(bridge.dispatch({ type: "hire", candidateId: "binh" }).ok).toBe(
      true,
    );
    expect(bridge.state).toBe(original);
    expect(read()).not.toBe(money);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("inventory ignores unrelated ticks and responds to prices, stock, unlocks and expiry", () => {
    const s = createInitialState(42);
    const before = inventorySignal(s);
    s.timeMs += 100;
    s.workers["w-player"]!.expression = "focused";
    expect(inventorySignal(s)).toBe(before);
    s.prices.mask++;
    expect(inventorySignal(s)).not.toBe(before);
    const price = inventorySignal(s);
    s.stock.mask.shelf--;
    expect(inventorySignal(s)).not.toBe(price);
    const stock = inventorySignal(s);
    s.stats.sales = 1000;
    s.day = 30;
    expect(inventorySignal(s)).not.toBe(stock);
    s.stock.mask.batches = [
      { qty: 1, expiresAtMs: s.timeMs + s.config.dayMs + 100 },
    ];
    const expiry = inventorySignal(s);
    s.timeMs += 100;
    expect(inventorySignal(s)).not.toBe(expiry);
  });

  it("collection and review signals invalidate when their visible data changes", () => {
    const s = createInitialState(42);
    const collection = expansionSignal(s);
    s.collection.fusePity++;
    expect(expansionSignal(s)).not.toBe(collection);
    const reviews = reviewsSignal(s);
    s.workers["w-player"]!.perfCount++;
    s.workers["w-player"]!.perfSum += 100;
    expect(reviewsSignal(s)).not.toBe(reviews);
  });

  it("navigation badges ignore timer changes even for a worker needing attention", () => {
    const state = createInitialState(42);
    state.money = 10_000;
    const sim = new Simulation(state);
    expect(sim.dispatch({ type: "hire", candidateId: "binh" }).ok).toBe(true);
    state.workers["w-binh"]!.resigning = true;
    const before = navigationSignal(state);
    state.workers["w-binh"]!.thinkUntilMs++;
    state.workers["w-binh"]!.expression = "focused";
    expect(navigationSignal(state)).toBe(before);
    state.workers["w-binh"]!.resigning = false;
    expect(navigationSignal(state)).not.toBe(before);
  });

  it("direct save serialization matches the old file format and stays independent of later mutations", () => {
    const s = createInitialState(42);
    const text = serializeSave(s, 12345);
    expect(JSON.parse(text)).toEqual(createSave(s, 12345));
    const loaded = loadSave(JSON.parse(text));
    expect(loaded.ok).toBe(true);
    s.money++;
    expect(JSON.parse(text).state.money).not.toBe(s.money);
  });
});
