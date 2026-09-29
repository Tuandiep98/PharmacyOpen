import { describe, expect, it } from "vitest";
import {
  createInitialState,
  Simulation,
  wagesDueTonight,
  type SimState,
} from "../src";
import { hireAllDay, runFor } from "./helpers";

/** Tiệm có một nhân viên làm cả hai ca, đủ vốn trả lương. */
function store(): { sim: Simulation; workerId: string } {
  const state = createInitialState(7);
  state.money = 5000;
  state.dayStart.money = 5000;
  const sim = new Simulation(state);
  return { sim, workerId: hireAllDay(sim, "dung") };
}

describe("lương phải trả cuối ngày", () => {
  it("đầu ngày tính đủ các ca theo lịch và khớp số tiền thực trả lúc đóng ngày", () => {
    const { sim, workerId } = store();
    const s = sim.snapshot as SimState;
    const wage = s.workers[workerId]!.wage;
    const projected = wagesDueTonight(s);
    expect(projected).toEqual({ owed: 0, today: wage * 2, total: wage * 2 });
    const spentBefore = s.stats.spentOnWages;
    const day = s.day;
    runFor(sim, s.config.dayMs + s.config.tickMs * 2);
    expect(sim.snapshot.day).toBe(day + 1);
    expect(sim.snapshot.stats.spentOnWages - spentBefore).toBe(projected.total);
  });

  it("cộng nợ cũ và bỏ các ca của người nghỉ hôm nay", () => {
    const { sim, workerId } = store();
    const s = sim.snapshot as SimState;
    const worker = s.workers[workerId]!;
    worker.wageOwed = 7;
    worker.restDay = s.day;
    expect(wagesDueTonight(s)).toEqual({
      owed: 7,
      today: worker.wage * worker.shiftsToday.length,
      total: 7 + worker.wage * worker.shiftsToday.length,
    });
  });
});
