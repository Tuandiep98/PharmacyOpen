import { describe, expect, it } from "vitest";
import {
  arrivalFactor,
  AWARENESS_DAILY_MAX,
  AWARENESS_DAILY_MIN,
  collectionBonus,
  createInitialState,
  dayRewardCoins,
  hireCostFor,
  loadSave,
  localLeaderboard,
  makeItem,
  RANKING_RULES,
  allRoundScore,
  restoreCollection,
  SAVE_FORMAT,
  Simulation,
  staffScore,
  talkReach,
  wageFor,
  type LoyaltyProfile,
  type SimState,
} from "../src";
import { generateRecruit } from "../src/recruit";
import { createStream } from "../src/rng";
import { autoPlay, runDays, runFor } from "./helpers";

const mutable = (sim: Simulation) => sim.snapshot as SimState;

describe("tiệm mới mở: khách ghé thưa, tăng dần theo độ nhận biết", () => {
  it("tiệm mới ít khách hơn tiệm đã quen mặt", () => {
    const arrivals = (awareness: number) => {
      const state = createInitialState(21);
      state.awareness = awareness;
      const sim = new Simulation(state);
      runFor(sim, 3 * 60_000);
      return state.stats.customersArrived + state.stats.turnedAway;
    };
    expect(arrivals(10)).toBeLessThan(arrivals(100));
    const fresh = createInitialState(1);
    expect(fresh.awareness).toBe(fresh.config.awarenessStart);
    const known = { ...fresh, awareness: 100 };
    expect(arrivalFactor(fresh)).toBeLessThan(arrivalFactor(known));
    expect(arrivalFactor(fresh)).toBeGreaterThan(0.4);
  });

  it("độ nhận biết tăng khi phục vụ tốt nhưng có trần; bỏ mặc khách thì giảm", () => {
    const served = createInitialState(5);
    const sim = new Simulation(served);
    const before = served.awareness;
    runDays(sim, 1, autoPlay);
    const report = served.dayReports.at(-1)!;
    expect(served.awareness).toBeGreaterThan(before);
    expect(report.awarenessChange).toBeLessThanOrEqual(AWARENESS_DAILY_MAX);
    expect(report.awareness).toBe(served.awareness);

    // Không ai phục vụ: khách bỏ về, tiếng xấu lan nhanh hơn tiếng tốt nhưng cũng có sàn mỗi ngày.
    const ignored = createInitialState(5);
    ignored.awareness = 40;
    runDays(new Simulation(ignored), 1);
    expect(ignored.awareness).toBeLessThan(40);
    expect(ignored.awareness).toBeGreaterThanOrEqual(40 + AWARENESS_DAILY_MIN);
  });

  it("biển hiệu, khách quen và top khu vực đều kéo thêm khách", () => {
    const state = createInitialState(2);
    const base = arrivalFactor(state);
    state.standing = { day: 1, revenue: 1, rating: null, staff: null };
    expect(arrivalFactor(state)).toBeGreaterThan(base);
    state.standing = { day: 1, revenue: null, rating: null, staff: null };
    const profile = {
      id: "p1",
      name: "Chị Dung",
      archetypeId: "curious",
      look: { skin: 0, hair: 0, hairStyle: 1, outfit: 0 },
      visits: 3,
      goodVisits: 3,
      lastOutcome: "bought",
      nextEligibleAtMs: 0,
      persona: { age: "young", female: true, openness: 0.8 },
      rapport: 80,
      story: null,
      storiesDone: [],
    } satisfies LoyaltyProfile;
    state.loyalty.push(profile);
    expect(arrivalFactor(state)).toBeGreaterThan(base);
  });
});

describe("hạng nhân viên S/A/B/C và lương theo năng lực", () => {
  it("năng lực cao thì hạng cao, lương cao hơn nhưng có trần", () => {
    const weak = staffScore({
      role: "clerk",
      speed: 0.8,
      knowledge: 0.45,
      communication: 0.5,
      traits: ["lazy"],
    });
    const strong = staffScore({
      role: "pharmacist",
      speed: 1.25,
      knowledge: 0.92,
      communication: 0.9,
      traits: ["silver-tongue", "hardworking"],
    });
    expect(weak.grade).toBe("C");
    expect(strong.grade).toBe("S");
    expect(wageFor(strong.score, "pharmacist")).toBeGreaterThan(
      wageFor(weak.score, "clerk"),
    );
    expect(wageFor(100, "pharmacist")).toBeLessThanOrEqual(14);
    expect(wageFor(0, "clerk")).toBeGreaterThanOrEqual(4);
    expect(hireCostFor(6, "C")).toBeLessThan(hireCostFor(12, "S"));
  });

  it("ứng viên đủ mọi hạng, kỹ năng không quá khó gặp", () => {
    const r = createStream(7, "staff");
    const counts = { S: 0, A: 0, B: 0, C: 0 };
    let withTrait = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      const recruit = generateRecruit(r, `r${i}`);
      counts[staffScore(recruit).grade] += 1;
      if (recruit.traits.length + recruit.hiddenTraits.length > 0)
        withTrait += 1;
      expect(recruit.wage).toBeGreaterThanOrEqual(4);
      expect(recruit.wage).toBeLessThanOrEqual(14);
    }
    for (const grade of ["S", "A", "B", "C"] as const)
      expect(counts[grade]).toBeGreaterThan(n * 0.03);
    expect(counts.S).toBeLessThan(n * 0.2);
    expect(withTrait / n).toBeGreaterThan(0.75);
  });

  it("đồ may mắn tuyển dụng làm ứng viên giỏi xuất hiện nhiều hơn", () => {
    const share = (luck: number) => {
      const r = createStream(3, "staff");
      let good = 0;
      for (let i = 0; i < 2000; i++)
        if (generateRecruit(r, `r${i}`, luck).rarity !== "common") good += 1;
      return good;
    };
    expect(share(0.3)).toBeGreaterThan(share(0));
  });
});

describe("top khu vực", () => {
  it("chưa đủ số liệu thì chưa lên bảng; đối thủ luôn xếp theo thứ tự", () => {
    const state = createInitialState(4);
    const board = localLeaderboard(state, "revenue");
    expect(board.mine[0]!.qualified).toBe(false);
    for (let i = 1; i < board.entries.length; i++)
      expect(board.entries[i - 1]!.value).toBeGreaterThanOrEqual(
        board.entries[i]!.value,
      );
  });

  it("bảng đánh giá cần ít nhất 30 đánh giá trong 7 ngày", () => {
    const sim = new Simulation(createInitialState(8));
    const state = mutable(sim);
    runDays(sim, 3);
    const mine = localLeaderboard(state, "rating").mine[0]!;
    expect(mine.qualified).toBe(mine.sample >= RANKING_RULES.minReviews);
    expect(localLeaderboard(state, "revenue").mine[0]!.qualified).toBe(true);
  });

  it("điểm toàn năng tăng theo sao, năng suất, nghiệp vụ và tay nghề", () => {
    const base = {
      id: "a",
      name: "A",
      role: "clerk" as const,
      level: 3,
      shifts: 6,
      sales: 40,
      perfSum: 6 * 80,
      perfCount: 6,
      starsSum: 16,
      starsCount: 4,
    };
    const better = { ...base, sales: 70, level: 6, perfSum: 6 * 95 };
    expect(allRoundScore(better).score).toBeGreaterThan(
      allRoundScore(base).score,
    );
    expect(allRoundScore(better).score).toBeLessThanOrEqual(100);
  });
});

describe("đồ sưu tầm", () => {
  it("hạng cao mạnh hơn, mặt hại nhẹ hơn; tổng hiệu ứng có trần", () => {
    const state = createInitialState(1);
    const good = makeItem(state, "disco-lights", "S");
    const bad = makeItem(state, "disco-lights", "C");
    const awareness = (i: typeof good) =>
      i.effects.find((e) => e.stat === "awareness")!.value;
    const rating = (i: typeof good) =>
      i.effects.find((e) => e.stat === "rating")!.value;
    expect(awareness(good)).toBeGreaterThan(awareness(bad));
    expect(rating(good)).toBeGreaterThan(rating(bad));
    expect(rating(bad)).toBeLessThan(0);
  });

  it("đặt, cất, bán; món đeo chỉ có tác dụng khi người đeo đang có mặt", () => {
    const state = createInitialState(1);
    state.money = 500;
    const sim = new Simulation(state);
    const s = mutable(sim);
    const bell = makeItem(s, "service-bell", "A");
    const glasses = makeItem(s, "round-glasses", "S");
    s.collection.items.push(bell, glasses);
    expect(
      sim.dispatch({ type: "equipItem", uid: bell.uid, place: "shelf" }),
    ).toEqual({ ok: false, reason: "invalid-place" });
    expect(
      sim.dispatch({ type: "equipItem", uid: bell.uid, place: "counter-1" })
        .ok,
    ).toBe(true);
    expect(collectionBonus(s, "queuePatience")).toBeGreaterThan(0);
    sim.dispatch({ type: "hire", candidateId: "binh" });
    expect(
      sim.dispatch({
        type: "equipItem",
        uid: glasses.uid,
        place: "wear:w-binh",
      }).ok,
    ).toBe(true);
    expect(collectionBonus(s, "rating")).toBeGreaterThan(0);
    s.workers["w-binh"]!.restDay = s.day;
    expect(collectionBonus(s, "rating")).toBe(0);
    const before = s.money;
    expect(sim.dispatch({ type: "sellItem", uid: bell.uid }).ok).toBe(true);
    expect(s.money).toBeGreaterThan(before);
    expect(collectionBonus(s, "queuePatience")).toBe(0);
    // Cho nghỉ việc thì món đang đeo được cất lại.
    s.workers["w-binh"]!.restDay = null;
    sim.dispatch({ type: "dismissStaff", workerId: "w-binh" });
    expect(Object.keys(s.collection.equipped)).toHaveLength(0);
    expect(s.collection.items).toHaveLength(1);
  });

  it("một người đeo nhiều lớp, hai món cùng lớp thay nhau, đồ đặt được ở chỗ phù hợp", () => {
    const sim = new Simulation(createInitialState(11));
    const s = mutable(sim);
    const glasses = makeItem(s, "round-glasses", "S");
    const shades = makeItem(s, "beach-shades", "A");
    const pin = makeItem(s, "care-pin", "A");
    const bow = makeItem(s, "neck-bow", "B");
    const plant = makeItem(s, "succulent", "B");
    s.collection.items.push(glasses, shades, pin, bow, plant);
    for (const [item, layer] of [[glasses, "eyes"], [pin, "chest"], [bow, "neck"]] as const)
      expect(sim.dispatch({ type: "equipItem", uid: item.uid, place: `wear:w-player:${layer}` }).ok).toBe(true);
    expect(Object.keys(s.collection.equipped)).toHaveLength(3);
    expect(collectionBonus(s, "rating")).toBeGreaterThan(0);
    expect(collectionBonus(s, "returnChance")).toBeGreaterThan(0);
    expect(sim.dispatch({ type: "equipItem", uid: shades.uid, place: "wear:w-player:eyes" }).ok).toBe(true);
    expect(Object.values(s.collection.equipped)).not.toContain(glasses.uid);
    expect(Object.keys(s.collection.equipped)).toHaveLength(3);
    expect(sim.dispatch({ type: "equipItem", uid: plant.uid, place: "shelf" }).ok).toBe(true);
    expect(s.collection.equipped.shelf).toBe(plant.uid);
    expect(sim.dispatch({ type: "equipItem", uid: plant.uid, place: "store-wall" }).ok).toBe(false);
  });

  it("bộ sưu tập đi theo người chơi khi điều chuyển chi nhánh", () => {
    const sim = new Simulation(createInitialState(2));
    const s = mutable(sim);
    const plant = makeItem(s, "money-plant", "B");
    s.collection.items.push(plant);
    sim.dispatch({ type: "equipItem", uid: plant.uid, place: "store-wall" });
    s.operations.pendingTransfer = true;
    expect(sim.dispatch({ type: "acceptTransfer" }).ok).toBe(true);
    expect(s.collection.items.map((i) => i.uid)).toEqual([plant.uid]);
    expect(s.collection.equipped["store-wall"]).toBe(plant.uid);
    expect(s.awareness).toBe(s.config.awarenessStart);
  });

  it("khôi phục bộ sưu tập từ bản lưu riêng: bỏ món lạ, tính lại hiệu ứng theo hạng", () => {
    const state = createInitialState(3);
    const bell = makeItem(state, "service-bell", "A");
    const restored = restoreCollection({
      items: [
        { ...bell, effects: [{ stat: "queuePatience", value: 9 }] },
        { uid: "it99", defId: "không-có", grade: "S", effects: [] },
        { uid: "it98", defId: "teddy", grade: "Z", effects: [] },
      ],
      equipped: { "counter-1": bell.uid, "wear:w-old": bell.uid },
    });
    expect(restored).not.toBeNull();
    expect(restored!.items).toHaveLength(1);
    expect(restored!.items[0]!.effects).toEqual(bell.effects);
    expect(restored!.equipped).toEqual({ "counter-1": bell.uid });
    expect(restoreCollection("rác")).toBeNull();
  });

  it("thưởng mục tiêu ngày: xu theo số sao và tăng nhẹ theo cấp tiệm", () => {
    expect(dayRewardCoins(0, 1)).toBe(0);
    expect(dayRewardCoins(3, 1)).toBeGreaterThan(dayRewardCoins(1, 1));
    expect(dayRewardCoins(3, 5)).toBeGreaterThan(dayRewardCoins(3, 1));
  });
});

describe("trò chuyện với khách quen", () => {
  function regular(state: SimState, openness = 0.95): LoyaltyProfile {
    const profile: LoyaltyProfile = {
      id: "reg",
      name: "Chị Dung",
      archetypeId: "curious",
      look: { skin: 0, hair: 0, hairStyle: 1, outfit: 0 },
      visits: 4,
      goodVisits: 4,
      lastOutcome: "bought",
      nextEligibleAtMs: 0,
      persona: { age: "young", female: true, openness },
      rapport: 70,
      story: null,
      storiesDone: [],
    };
    state.loyalty.push(profile);
    return profile;
  }

  function sellToRegular(sim: Simulation, id: string) {
    const s = mutable(sim);
    s.nextSpawnAtMs = Number.MAX_SAFE_INTEGER;
    s.nextDeliveryAtMs = Number.MAX_SAFE_INTEGER;
    s.customers[id] = {
      id,
      archetypeId: "curious",
      requestId: "named-mask",
      look: { skin: 0, hair: 0, hairStyle: 1, outfit: 0 },
      phase: "counter",
      arrivedAtMs: s.timeMs,
      servedAtMs: null,
      patienceMs: 60_000,
      patienceMaxMs: 60_000,
      expression: "neutral",
      emoteUntilMs: 0,
      orderId: null,
      outcome: null,
      leaveAtMs: 0,
      loyaltyId: "reg",
      chat: null,
      chatBonus: 0,
    };
    s.counters[0]!.customerId = id;
    sim.dispatch({ type: "startService", workerId: "w-player", customerId: id });
    const orderId = s.customers[id]!.orderId!;
    sim.dispatch({
      type: "pickProduct",
      workerId: "w-player",
      orderId,
      productId: "mask",
    });
    runFor(sim, 3000);
    sim.dispatch({ type: "checkout", workerId: "w-player", orderId });
    runFor(sim, 2000);
    return orderId;
  }

  it("khách quen cởi mở nán lại kể chuyện; kể trọn thì hài lòng hơn và nhớ chuyện đã kể", () => {
    let started: SimState | null = null;
    for (let seed = 1; seed < 40 && !started; seed++) {
      const sim = new Simulation(createInitialState(seed));
      const s = mutable(sim);
      const profile = regular(s);
      sellToRegular(sim, "cx");
      if (!s.customers.cx?.chat) continue;
      started = s;
      expect(s.customers.cx.phase).toBe("counter");
      expect(s.workers["w-player"]!.orderId).not.toBeNull();
      const patience = s.customers.cx.patienceMs;
      runFor(sim, 60_000);
      expect(s.customers.cx?.phase ?? "gone").not.toBe("counter");
      expect(patience).toBeGreaterThan(0);
      expect(s.stats.chats).toBe(1);
      const record = s.interactions.at(-1)!;
      expect(record.outcome).toBe("bought");
      expect(profile.rapport).toBeGreaterThan(70);
      expect(
        profile.storiesDone.length > 0 || profile.story !== null,
      ).toBe(true);
    }
    expect(started).not.toBeNull();
  });

  it("nhường khách sau khi có người chờ: chuyện dừng lại, lần sau kể tiếp", () => {
    for (let seed = 1; seed < 40; seed++) {
      const sim = new Simulation(createInitialState(seed));
      const s = mutable(sim);
      const profile = regular(s);
      const orderId = sellToRegular(sim, "cx");
      if (!s.customers.cx?.chat) continue;
      // Một khách đang chờ phía sau.
      s.customers.q1 = {
        ...s.customers.cx,
        id: "q1",
        loyaltyId: null,
        phase: "queue",
        orderId: null,
        chat: null,
        chatBonus: 0,
      };
      s.queue.push("q1");
      expect(
        sim.dispatch({ type: "endChat", workerId: "w-player", orderId }).ok,
      ).toBe(true);
      expect(s.customers.cx.chat.closing).toBe("yield");
      runFor(sim, 5000);
      expect(s.counters[0]!.customerId).not.toBe("cx");
      if (s.customers.cx?.chat && s.customers.cx.chat.told < 3)
        expect(profile.story).not.toBeNull();
      return;
    }
    throw new Error("không có seed nào bắt đầu trò chuyện");
  });

  it("người giao tiếp tốt đỡ lời được nhiều đoạn hơn", () => {
    const quiet = talkReach({
      communication: 0.3,
      traits: [],
      hiddenTraits: [],
    });
    const warm = talkReach({
      communication: 0.9,
      traits: ["talkative"],
      hiddenTraits: [],
    });
    expect(warm).toBeGreaterThan(quiet);
    expect(
      talkReach({ communication: 0.9, traits: ["hot-tempered"], hiddenTraits: [] }),
    ).toBeLessThan(warm);
  });
});

describe("save v16 → v17", () => {
  it("save cũ được nâng cấp: độ nhận biết theo số ngày, bộ sưu tập rỗng, khách quen có chân dung", () => {
    const state = createInitialState(6);
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    raw.day = 12;
    delete raw.awareness;
    delete raw.collection;
    delete raw.standing;
    (raw.rng as Record<string, unknown>).chat = undefined;
    raw.loyalty = [
      {
        id: "old",
        name: "Cô Hương",
        archetypeId: "careful",
        look: { skin: 0, hair: 0, hairStyle: 1, outfit: 0 },
        visits: 3,
        goodVisits: 3,
        lastOutcome: "bought",
        nextEligibleAtMs: 0,
      },
    ];
    const loaded = loadSave({
      format: SAVE_FORMAT,
      version: 16,
      state: raw,
      savedAtWallMs: 1,
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.awareness).toBe(100);
    expect(loaded.state.collection.items).toEqual([]);
    expect(loaded.state.loyalty[0]!.persona.openness).toBeGreaterThan(0);
    expect(loaded.state.loyalty[0]!.rapport).toBe(30);
  });
});
