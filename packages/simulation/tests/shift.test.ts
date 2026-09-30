import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createSave,
  currentShift,
  dayGoals,
  dayPhase,
  loadSave,
  PREP_TASK_IDS,
  SAVE_FORMAT,
  Simulation,
  type SimEvent,
  type SimState,
} from "../src";
import { autoPlay, runDays, runFor } from "./helpers";

const mutable = (sim: Simulation) => sim.snapshot as SimState;

/** Chạy tới đầu ngày 2 (pha chuẩn bị) mà không có khách nào tới. */
function startOfDay2(
  seed: number,
  setup?: (sim: Simulation) => void,
): Simulation {
  const state = createInitialState(seed);
  state.money = 500;
  state.dayStart.money = 500;
  state.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
  state.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
  const sim = new Simulation(state);
  setup?.(sim);
  runFor(sim, state.config.dayMs);
  expect(sim.snapshot.day).toBe(2);
  // Ngày 2 đón khách bình thường theo lịch sau khi mở cửa.
  mutable(sim).nextSpawnAtMs = sim.snapshot.timeMs;
  sim.drainEvents();
  return sim;
}

describe("mở cửa và chuẩn bị", () => {
  it("ngày khai trương mở cửa ngay; từ ngày 2 có pha chuẩn bị, không đón khách tới khi mở", () => {
    const sim = Simulation.create(1);
    expect(dayPhase(sim.snapshot)).toBe("open");

    const day2 = startOfDay2(2);
    expect(dayPhase(day2.snapshot)).toBe("prep");
    const arrived = day2.snapshot.stats.customersArrived;
    runFor(day2, day2.snapshot.config.prepMs - 200);
    expect(day2.snapshot.stats.customersArrived).toBe(arrived);
    expect(dayPhase(day2.snapshot)).toBe("prep");

    runFor(day2, 400);
    expect(dayPhase(day2.snapshot)).toBe("open");
    const opened = day2.drainEvents().find((e) => e.type === "storeOpened");
    expect(opened).toMatchObject({ auto: true, prepDone: 0 });
    // Khách đầu tiên tới sau khi mở cửa, không dồn cục ngay lúc mở.
    runFor(day2, day2.snapshot.config.firstSpawnMs + 200);
    expect(day2.snapshot.stats.customersArrived).toBe(arrived + 1);
  });

  it("người chơi làm việc chuẩn bị rồi mở cửa sớm; lệnh sai bị từ chối", () => {
    const sim = startOfDay2(3);
    expect(
      sim.dispatch({
        type: "completePrep",
        taskId: "cash",
        workerId: "w-player",
      }).ok,
    ).toBe(true);
    expect(
      sim.dispatch({
        type: "completePrep",
        taskId: "cash",
        workerId: "w-player",
      }),
    ).toEqual({
      ok: false,
      reason: "prep-already-done",
    });
    expect(
      sim.dispatch({
        type: "completePrep",
        taskId: "nope" as never,
        workerId: "w-player",
      }),
    ).toEqual({
      ok: false,
      reason: "unknown-prep-task",
    });
    expect(sim.dispatch({ type: "openStore" }).ok).toBe(true);
    expect(dayPhase(sim.snapshot)).toBe("open");
    expect(sim.dispatch({ type: "openStore" })).toEqual({
      ok: false,
      reason: "store-already-open",
    });
    expect(
      sim.dispatch({
        type: "completePrep",
        taskId: "climate",
        workerId: "w-player",
      }),
    ).toEqual({
      ok: false,
      reason: "store-already-open",
    });
    expect(
      sim.drainEvents().find((e) => e.type === "storeOpened"),
    ).toMatchObject({ auto: false, prepDone: 1 });
  });

  it("NPC đứng quầy tự làm đủ việc chuẩn bị trước giờ mở cửa (tiệm chạy khi vắng mặt)", () => {
    const sim = startOfDay2(4, (s) => {
      s.dispatch({ type: "hire", candidateId: "chi" });
      s.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: "w-chi",
      });
    });
    runFor(sim, sim.snapshot.config.prepMs);
    expect([...sim.snapshot.prep.done].sort()).toEqual(
      [...PREP_TASK_IDS].sort(),
    );
    expect(
      sim.drainEvents().filter((e) => e.type === "prepTaskDone"),
    ).toHaveLength(PREP_TASK_IDS.length);
  });

  it("giờ đóng cửa không nhận khách mới", () => {
    const sim = Simulation.create(5);
    const { dayMs, closingMs } = sim.snapshot.config;
    runFor(sim, dayMs - closingMs + 100, (x) => autoPlay(x));
    expect(dayPhase(sim.snapshot)).toBe("closing");
    const arrived = sim.snapshot.stats.customersArrived;
    runFor(sim, closingMs - 300, (x) => autoPlay(x));
    expect(sim.snapshot.stats.customersArrived).toBe(arrived);
  });
});

describe("ca làm và chấm công", () => {
  it("nhân viên chỉ làm ca sáng: nhận nửa lương, hết ca thì quầy về người chơi", () => {
    const sim = startOfDay2(6, (s) => {
      s.dispatch({ type: "hire", candidateId: "dung" });
    });
    expect(
      sim.dispatch({ type: "setShifts", workerId: "w-dung", shifts: [] }),
    ).toEqual({ ok: false, reason: "invalid-shifts" });
    expect(
      sim.dispatch({
        type: "setShifts",
        workerId: "w-player",
        shifts: ["morning"],
      }),
    ).toEqual({
      ok: false,
      reason: "cannot-schedule-player",
    });
    expect(
      sim.dispatch({
        type: "setShifts",
        workerId: "w-dung",
        shifts: ["morning"],
      }).ok,
    ).toBe(true);
    expect(
      sim.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: "w-dung",
      }).ok,
    ).toBe(true);

    const s = mutable(sim);
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    s.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    const events: SimEvent[] = [];
    runFor(sim, s.config.dayMs / 2 - (s.timeMs - s.dayStartedAtMs) + 100, () =>
      events.push(...sim.drainEvents()),
    );
    expect(currentShift(s)).toBe("afternoon");
    expect(s.counters[0]!.operatorId).toBe("w-player");
    expect(
      events.some((e) => e.type === "shiftChanged" && e.shift === "afternoon"),
    ).toBe(true);
    expect(
      sim.dispatch({
        type: "assignCounter",
        counterId: "counter-1",
        workerId: "w-dung",
      }),
    ).toEqual({
      ok: false,
      reason: "worker-off-duty",
    });

    const moneyBefore = s.money;
    runFor(sim, s.config.dayMs);
    // Dũng: 35 xu/ngày → một ca 18 xu (làm tròn).
    expect(s.dayReports.at(-1)!.wages).toBe(18);
    expect(moneyBefore - s.money).toBe(18);
    expect(s.workers["w-dung"]!.shiftsToday).toEqual(["morning"]);
  });

  it("thêm ca đang diễn ra thì vào làm ngay và được trả lương ca đó", () => {
    const sim = startOfDay2(7, (s) => {
      s.dispatch({ type: "hire", candidateId: "binh" });
      s.dispatch({
        type: "setShifts",
        workerId: "w-binh",
        shifts: ["afternoon"],
      });
    });
    const s = mutable(sim);
    expect(s.workers["w-binh"]!.shiftsToday).toEqual([]);
    expect(
      sim.dispatch({
        type: "setShifts",
        workerId: "w-binh",
        shifts: ["morning", "afternoon"],
      }).ok,
    ).toBe(true);
    expect(s.workers["w-binh"]!.shiftsToday).toEqual(["morning"]);
  });
});

describe("tổng kết ngày", () => {
  it("lãi ròng tách khỏi dòng tiền; số liệu theo ca cộng lại bằng cả ngày; xếp hạng khớp mục tiêu", () => {
    const state = createInitialState(8);
    state.money = 400;
    state.dayStart.money = 400;
    const sim = new Simulation(state);
    sim.dispatch({ type: "hire", candidateId: "dung" });
    sim.dispatch({
      type: "assignCounter",
      counterId: "counter-1",
      workerId: "w-dung",
    });
    runDays(sim, 2);

    for (const r of sim.snapshot.dayReports) {
      expect(r.netProfit).toBe(
        r.revenue - r.costOfSales - r.wages - r.vouchers - r.expiredCost,
      );
      expect(r.profit).toBe(r.revenue - r.stockCost - r.wages - r.investments);
      expect(r.shifts.map((x) => x.shift)).toEqual(["morning", "afternoon"]);
      expect(r.shifts.reduce((sum, x) => sum + x.sales, 0)).toBe(r.sales);
      expect(r.shifts.reduce((sum, x) => sum + x.customers, 0)).toBe(
        r.customers,
      );
      expect(r.grade).toBe(dayGoals(r).filter((g) => g.met).length);
      expect(r.costOfSales).toBeGreaterThan(0);
    }
    // Ngày 2 có pha chuẩn bị do NPC làm; ngày khai trương thì không.
    expect(sim.snapshot.dayReports[0]!.prepDone).toBeNull();
    expect(sim.snapshot.dayReports[1]!.prepDone).toBe(PREP_TASK_IDS.length);
  });

  it("mốc sao cửa hàng chỉ chúc mừng một lần", () => {
    const sim = Simulation.create(9);
    const s = mutable(sim);
    s.reputation.starsSum = 5 * 40;
    s.reputation.count = 40;
    runFor(sim, 300);
    const milestones = sim
      .drainEvents()
      .filter((e) => e.type === "ratingMilestone");
    expect(
      milestones.map((e) => e.type === "ratingMilestone" && e.stars),
    ).toEqual([4, 4.3, 4.6]);
    runFor(sim, 300);
    expect(sim.drainEvents().some((e) => e.type === "ratingMilestone")).toBe(
      false,
    );
  });
});

describe("lưu game v5", () => {
  it("nâng save v4: ngày đang dở coi như đã mở, nhân viên làm đủ hai ca, ngày dài theo cấu hình mới", () => {
    const state = createInitialState(10);
    // Đủ vốn nhập hàng mà vẫn trả đủ lương (ván mới chỉ mở 4 món, phải nhập thêm).
    state.money = 1000;
    const sim = new Simulation(state);
    sim.dispatch({ type: "hire", candidateId: "dung" });
    runFor(sim, 5000);
    const raw = JSON.parse(JSON.stringify(sim.snapshot)) as Record<
      string,
      unknown
    >;
    for (const key of [
      "prep",
      "shiftMark",
      "shiftSummaries",
      "ratingMilestones",
    ])
      delete raw[key];
    (raw.config as Record<string, unknown>).dayMs = 180_000;
    for (const stats of [
      raw.stats,
      (raw.dayStart as Record<string, unknown>).stats,
    ] as Record<string, unknown>[]) {
      for (const key of [
        "costOfSales",
        "expiredCost",
        "waitMsSum",
        "servedCount",
      ])
        delete stats[key];
    }
    // Save v4 chưa có hệ nhân viên mới (v6): lương trọn ngày, một đặc điểm, chưa có danh sách ứng viên.
    for (const w of Object.values(
      raw.workers as Record<string, Record<string, unknown>>,
    )) {
      delete w.shifts;
      delete w.shiftsToday;
      for (const key of [
        "traits",
        "hiddenTraits",
        "rarity",
        "xp",
        "level",
        "fatigue",
        "resigning",
        "arrivesAtMs",
      ])
        delete w[key];
      if (w.controller === "ai") w.wage = 36;
    }
    for (const key of ["recruits", "recruitRerollDay"]) delete raw[key];
    delete (raw.rng as Record<string, unknown>).staff;
    raw.dayReports = [{ day: 0, revenue: 10, profit: 4 }];
    raw.version = 4;

    const loaded = loadSave({
      format: SAVE_FORMAT,
      version: 4,
      savedAtWallMs: 1,
      state: raw,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.config.dayMs).toBe(240_000);
    expect(dayPhase(loaded.state)).toBe("open");
    expect(loaded.state.workers["w-dung"]!.shifts).toEqual([
      "morning",
      "afternoon",
    ]);
    expect(loaded.state.dayReports[0]).toMatchObject({
      shifts: [],
      netProfit: 4,
      grade: 0,
    });

    const resumed = Simulation.fromState(loaded.state);
    runFor(resumed, resumed.snapshot.config.dayMs);
    expect(resumed.snapshot.day).toBe(2);
    expect(resumed.snapshot.dayReports.at(-1)!.wages).toBe(36);
    expect(loaded.state.recruits).toHaveLength(3);
    expect(loadSave(createSave(resumed.snapshot, 2)).ok).toBe(true);
  });
});
