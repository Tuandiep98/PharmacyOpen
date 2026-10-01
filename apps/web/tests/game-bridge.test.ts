import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInitialState,
  runOffline,
  Simulation,
} from "@pharmacy/simulation";
import { GameBridge } from "../src/game/GameBridge";

let page: EventTarget & { hidden: boolean };
let browser: EventTarget;
let bridge: GameBridge | undefined;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
      "performance",
    ],
  });
  page = Object.assign(new EventTarget(), { hidden: false });
  browser = Object.assign(new EventTarget(), {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
  vi.stubGlobal("document", page);
  vi.stubGlobal("window", browser);
});
afterEach(() => {
  bridge?.detach();
  bridge = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function staffed() {
  const state = createInitialState(42);
  state.money = 10_000;
  const sim = new Simulation(state);
  expect(sim.dispatch({ type: "hire", candidateId: "binh" }).ok).toBe(true);
  expect(
    sim.dispatch({
      type: "setShifts",
      workerId: "w-binh",
      shifts: ["morning", "afternoon"],
    }).ok,
  ).toBe(true);
  expect(
    sim.dispatch({
      type: "assignCounter",
      workerId: "w-binh",
      counterId: "counter-1",
    }).ok,
  ).toBe(true);
  sim.drainEvents();
  return sim;
}

describe("fixed-step browser scheduler", () => {
  it("matches direct NPC simulation snapshots and events without display-rate polling", () => {
    const sim = staffed();
    const expected = Simulation.fromState(sim.serialize());
    bridge = new GameBridge(sim);
    const publish = vi.fn();
    const events: unknown[] = [];
    bridge.subscribe(publish);
    bridge.onEvents((batch) => events.push(...batch));
    bridge.setRunning(true);
    vi.advanceTimersByTime(20_000);
    for (let i = 0; i < 200; i++) expected.step();
    expect(sim.serialize()).toEqual(expected.serialize());
    expect(events).toEqual(expected.drainEvents());
    expect(publish).toHaveBeenCalledTimes(200);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("pauses completely and resumes without simulating paused wall time", () => {
    const sim = Simulation.create(42);
    bridge = new GameBridge(sim);
    bridge.setRunning(true);
    vi.advanceTimersByTime(250);
    expect(sim.snapshot.tick).toBe(2);
    bridge.setRunning(false);
    vi.advanceTimersByTime(10_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(sim.snapshot.tick).toBe(2);
    bridge.setRunning(true);
    vi.advanceTimersByTime(100);
    expect(sim.snapshot.tick).toBe(3);
  });

  it("caps a delayed wake-up at ten ticks", () => {
    const sim = Simulation.create(42);
    bridge = new GameBridge(sim);
    bridge.setRunning(true);
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    vi.advanceTimersByTime(100);
    expect(sim.snapshot.tick).toBe(10);
    now.mockRestore();
  });

  it("stops while hidden and catches up NPC work with the same offline rules", () => {
    const sim = staffed();
    bridge = new GameBridge(sim);
    bridge.attach();
    bridge.setRunning(true);
    vi.advanceTimersByTime(1000);
    const expected = Simulation.fromState(sim.serialize());
    const summaries = vi.fn();
    bridge.onOffline(summaries);
    page.hidden = true;
    page.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(6000);
    expect(sim.snapshot.tick).toBe(10);
    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    const summary = runOffline(expected, 6000);
    expect(sim.serialize()).toEqual(expected.serialize());
    expect(summaries).toHaveBeenCalledWith(summary);
    vi.advanceTimersByTime(100);
    expected.step();
    expect(sim.serialize()).toEqual(expected.serialize());
  });

  it("skips unchanged periodic saves, retries failed saves, and always saves pagehide", () => {
    const save = vi.fn((): boolean => true);
    bridge = new GameBridge(Simulation.create(42), { save });
    bridge.attach();
    vi.advanceTimersByTime(30_000);
    expect(save).toHaveBeenCalledTimes(1);
    browser.dispatchEvent(new Event("pagehide"));
    expect(save).toHaveBeenCalledTimes(2);
    bridge.dispatch({ type: "setPrice", productId: "mask", price: 12 });
    save.mockReturnValueOnce(false);
    vi.advanceTimersByTime(20_000);
    expect(save).toHaveBeenCalledTimes(4);
    bridge.detach();
    expect(vi.getTimerCount()).toBe(0);
  });
});
