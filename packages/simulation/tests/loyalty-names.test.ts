import { describe, expect, it } from "vitest";
import { createInitialState, loadSave, SAVE_FORMAT } from "../src";
import { loyalName } from "../src/content/names";

describe("tên khách quen", () => {
  it("bỏ qua tên đã có người dùng, giữ tên cũ khi không trùng", () => {
    const first = loyalName("c-1", "curious", 1);
    expect(loyalName("c-1", "curious", 1, new Set())).toBe(first);
    const next = loyalName("c-1", "curious", 1, new Set([first]));
    expect(next).not.toBe(first);
  });

  it("save cũ có hai khách quen trùng tên được đổi tên người đến sau", () => {
    const state = createInitialState(3);
    const look = { ...Object.values(state.workers)[0]!.look, hairStyle: 1 };
    const profile = (id: string) => ({
      id,
      name: "Cô Hương",
      archetypeId: "curious",
      look,
      visits: 2,
      goodVisits: 2,
      lastOutcome: "bought",
      nextEligibleAtMs: 0,
    });
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.loyalty = [profile("c-1"), profile("c-2")];
    raw.version = 15;
    const loaded = loadSave({
      format: SAVE_FORMAT,
      version: 15,
      state: raw,
      savedAtWallMs: 1,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const names = loaded.state.loyalty.map((p) => p.name);
    expect(names[0]).toBe("Cô Hương");
    expect(new Set(names).size).toBe(2);
  });
});
