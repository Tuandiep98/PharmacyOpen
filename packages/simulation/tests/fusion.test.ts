import { describe, expect, it } from "vitest";
import {
  COLLECTIBLES,
  createInitialState,
  FUSE_PITY,
  fuseGradeOdds,
  fuseSlotOdds,
  makeItem,
  Simulation,
  type SimState,
} from "../src";

const mutable = (sim: Simulation) => sim.snapshot as SimState;

describe("ghép đồ: 3 món đổi 1 món ngẫu nhiên", () => {
  it("tỉ lệ hạng cộng đủ 100%, hạng đưa vào càng cao càng dễ ra hạng cao", () => {
    for (const grades of [
      ["C", "C", "C"],
      ["B", "C", "A"],
      ["A", "A", "S"],
      ["S", "S", "S"],
    ] as const) {
      const odds = fuseGradeOdds(grades);
      expect(Object.values(odds).reduce((a, b) => a + b, 0)).toBeCloseTo(
        100,
        1,
      );
    }
    expect(fuseGradeOdds(["B", "B", "B"]).S).toBeGreaterThan(
      fuseGradeOdds(["C", "C", "C"]).S,
    );
    expect(fuseGradeOdds(["S", "S", "S"]).S).toBe(100);
    const pity = fuseGradeOdds(["C", "C", "C"], true);
    expect(pity.B + pity.C).toBe(0);
  });

  it("loại món mới theo loại 3 món đưa vào", () => {
    expect(fuseSlotOdds(["round-glasses", "care-pin", "neck-bow"])).toEqual({
      wear: 100,
    });
    const mixed = fuseSlotOdds(["round-glasses", "care-pin", "succulent"]);
    expect(Object.keys(mixed)).toHaveLength(2);
  });

  it("dùng hết 3 món (kể cả món đang đeo), thêm đúng 1 món mới", () => {
    const sim = new Simulation(createInitialState(5));
    const s = mutable(sim);
    const items = [
      makeItem(s, "round-glasses", "C"),
      makeItem(s, "care-pin", "B"),
      makeItem(s, "neck-bow", "C"),
      makeItem(s, "succulent", "B"),
    ];
    s.collection.items.push(...items);
    sim.dispatch({
      type: "equipItem",
      uid: items[0]!.uid,
      place: "wear:w-player:eyes",
    });
    const uids = items.slice(0, 3).map((i) => i.uid);
    expect(sim.dispatch({ type: "fuseItems", uids }).ok).toBe(true);
    expect(s.collection.items).toHaveLength(2);
    expect(s.collection.items.some((i) => uids.includes(i.uid))).toBe(false);
    expect(Object.keys(s.collection.equipped)).toHaveLength(0);
    const made = s.collection.items[1]!;
    expect(COLLECTIBLES[made.defId]!.slot).toBe("wear");
  });

  it("từ chối khi thiếu món, trùng món hoặc món không có", () => {
    const sim = new Simulation(createInitialState(6));
    const s = mutable(sim);
    const a = makeItem(s, "succulent", "C");
    const b = makeItem(s, "succulent", "C");
    s.collection.items.push(a, b);
    expect(sim.dispatch({ type: "fuseItems", uids: [a.uid, b.uid] })).toEqual({
      ok: false,
      reason: "fuse-needs-three",
    });
    expect(
      sim.dispatch({ type: "fuseItems", uids: [a.uid, b.uid, b.uid] }),
    ).toEqual({ ok: false, reason: "fuse-needs-three" });
    expect(
      sim.dispatch({ type: "fuseItems", uids: [a.uid, b.uid, "it999"] }),
    ).toEqual({ ok: false, reason: "unknown-item" });
    expect(s.collection.items).toHaveLength(2);
  });

  it("bảo hiểm: ghép liên tiếp không ra A/S thì lần kế chắc chắn A trở lên", () => {
    const sim = new Simulation(createInitialState(7));
    const s = mutable(sim);
    s.collection.fusePity = FUSE_PITY - 1;
    const inputs = [0, 1, 2].map(() => makeItem(s, "succulent", "C"));
    s.collection.items.push(...inputs);
    expect(
      sim.dispatch({ type: "fuseItems", uids: inputs.map((i) => i.uid) }).ok,
    ).toBe(true);
    expect(["A", "S"]).toContain(s.collection.items[0]!.grade);
    expect(s.collection.fusePity).toBe(0);
  });

  it("cùng seed cùng kết quả", () => {
    const run = () => {
      const sim = new Simulation(createInitialState(9));
      const s = mutable(sim);
      const inputs = [0, 1, 2].map(() => makeItem(s, "succulent", "B"));
      s.collection.items.push(...inputs);
      sim.dispatch({ type: "fuseItems", uids: inputs.map((i) => i.uid) });
      return s.collection.items[0];
    };
    expect(run()).toEqual(run());
  });
});
