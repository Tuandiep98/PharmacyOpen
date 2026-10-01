import { STORIES, STORY_IDS, type StoryDef } from "./content/stories";
import type { Emit } from "./events";
import { profileOf } from "./loyalty";
import { trafficPressure } from "./market";
import { hasTrait } from "./recruit";
import { serviceTone, type ServiceTone } from "./reputation";
import { nextFloat, pickWeighted } from "./rng";
import { dismissCustomer } from "./state";
import type {
  ChatState,
  Customer,
  DeepReadonly,
  LoyaltyProfile,
  Order,
  SimState,
  Worker,
} from "./types";

/*
 * Trò chuyện với khách quen (spec §3m). Sau khi bán xong, khách quen có thể nán lại kể chuyện: chuyện
 * hợp với tuổi, giới tính, độ cởi mở và độ thân (chuyện sâu hơn khi đã thân). Người bán giao tiếp tốt
 * đỡ lời được lâu hơn (kể được nhiều đoạn hơn) và được khách quý hơn, nhưng khách xếp hàng phía sau phải
 * chờ lâu hơn. Tiệm càng đông, chuyện càng ngắn (vẫn giữ tối thiểu mở đầu – một đoạn – kết). Có thể
 * "nhường khách sau": khách thông cảm và hẹn kể tiếp lần sau.
 */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

type Talker = Pick<Worker, "communication" | "traits" | "hiddenTraits">;

/** Số đoạn một người bán đỡ lời được trong một lượt (1–5), theo giao tiếp và tính cách. */
export function talkReach(worker: DeepReadonly<Talker>): number {
  let reach = 1 + Math.round(worker.communication * 3);
  if (hasTrait(worker, "talkative")) reach += 1;
  if (hasTrait(worker, "silver-tongue")) reach += 1;
  if (hasTrait(worker, "regulars-favorite")) reach += 1;
  if (hasTrait(worker, "hot-tempered")) reach -= 2;
  if (toneOf(worker) === "awkward") reach -= 1;
  return clamp(reach, 1, 5);
}

function toneOf(worker: DeepReadonly<Talker>): ServiceTone {
  return serviceTone({
    communication: worker.communication,
    traits: [...worker.traits, ...worker.hiddenTraits],
  });
}

/** Hệ số khách quý cuộc trò chuyện theo giọng người bán. */
const TONE_WARMTH: Record<ServiceTone, number> = {
  warm: 1.2,
  chatty: 1.1,
  plain: 1,
  awkward: 0.6,
  curt: 0.3,
};

/** NPC tự "nhường khách sau" khi có người chờ mà kiên nhẫn còn dưới ngưỡng này. */
export function yieldThreshold(worker: DeepReadonly<Talker>): number {
  if (hasTrait(worker, "hot-tempered")) return 0.75;
  if (hasTrait(worker, "talkative")) return 0.25;
  return 0.45;
}

/** Độ sâu chuyện khách sẵn lòng kể: thân và cởi mở hơn thì kể chuyện riêng hơn. */
export function storyDepth(profile: DeepReadonly<LoyaltyProfile>): 1 | 2 | 3 {
  if (
    profile.visits >= 3 &&
    profile.rapport >= 55 &&
    profile.persona.openness >= 0.55
  )
    return 3;
  if (profile.visits >= 2 && profile.rapport >= 30) return 2;
  return 1;
}

export function storiesFor(profile: DeepReadonly<LoyaltyProfile>): StoryDef[] {
  const depth = storyDepth(profile);
  return STORY_IDS.map((id) => STORIES[id]!).filter(
    (story) =>
      story.depth <= depth &&
      story.ages.includes(profile.persona.age) &&
      (!story.gender ||
        (story.gender === "female") === profile.persona.female) &&
      !profile.storiesDone.includes(story.id),
  );
}

/**
 * Gọi ngay khi bán xong cho khách: có thể bắt đầu trò chuyện (trả về true, khách ở lại quầy) hoặc không
 * (người gọi cho khách rời tiệm như thường).
 */
export function maybeStartChat(
  state: SimState,
  order: Order,
  customer: Customer,
  emit: Emit,
): boolean {
  const profile = profileOf(state, customer);
  const worker = state.workers[order.workerId];
  if (!profile || !worker || profile.visits < 1) return false;
  const resume =
    profile.story && STORIES[profile.story.id]
      ? { story: STORIES[profile.story.id]!, from: profile.story.beat }
      : null;
  const pool = resume ? [] : storiesFor(profile);
  if (!resume && pool.length === 0) return false;

  const pressure = trafficPressure(state);
  const tone = toneOf(worker);
  const chance =
    profile.persona.openness *
    (0.55 + 0.1 * Math.min(4, profile.visits)) *
    (resume ? 1.3 : 1) *
    (1 - 0.6 * pressure) *
    (tone === "curt" ? 0.4 : tone === "awkward" ? 0.7 : 1);
  const rng = state.rng.chat;
  if (nextFloat(rng) >= clamp(chance, 0, 0.9)) return false;

  const story =
    resume?.story ??
    pickWeighted(
      rng,
      pool.map((s) => [s, s.depth] as const),
    );
  const from = resume ? Math.min(resume.from, story.beats.length - 1) : 0;
  // Đông khách thì kể ngắn lại; hàng chờ dài càng rút ngắn, nhưng luôn có ít nhất một đoạn.
  const trafficCap = Math.max(
    1,
    1 +
      Math.round(3 * (1 - pressure)) -
      Math.min(2, Math.floor(state.queue.length / 2)),
  );
  const planned = Math.max(
    1,
    Math.min(story.beats.length - from, talkReach(worker), trafficCap),
  );
  const chat: ChatState = {
    storyId: story.id,
    from,
    planned,
    step: 0,
    stepMs: Math.max(
      state.config.chatMinStepMs,
      Math.round(state.config.chatStepMs * (1.15 - 0.45 * pressure)),
    ),
    stepStartedAtMs: state.timeMs,
    closing: null,
    told: 0,
  };
  order.state = "chatting";
  customer.chat = chat;
  customer.expression = "happy";
  state.stats.chats += 1;
  emit({
    type: "chatStarted",
    customerId: customer.id,
    workerId: worker.id,
    storyId: story.id,
    resumed: from > 0,
  });
  return true;
}

/** Bước sang câu kết với một cách kết thúc cho trước. */
function close(
  state: SimState,
  chat: ChatState,
  closing: ChatState["closing"],
) {
  const inBeat = chat.step >= 1 && chat.step <= chat.planned;
  // Đoạn đang kể dở quá nửa coi như đã kể.
  const half =
    inBeat && state.timeMs - chat.stepStartedAtMs >= chat.stepMs / 2 ? 1 : 0;
  chat.told =
    closing === "complete" || closing === "pause"
      ? chat.planned
      : Math.max(0, Math.min(chat.planned, chat.step - 1 + half));
  chat.closing = closing;
  chat.step = chat.planned + 1;
  chat.stepStartedAtMs = state.timeMs;
}

/**
 * Nhường khách sau / cắt ngang câu chuyện. Có người đang chờ thì khách thông cảm ("nhường"), không ai chờ
 * mà cắt ngang thì khách hơi hụt hẫng.
 */
export function endChat(state: SimState, order: Order): boolean {
  const customer = state.customers[order.customerId];
  const chat = customer?.chat;
  if (!customer || !chat || order.state !== "chatting" || chat.closing)
    return false;
  close(state, chat, state.queue.length > 0 ? "yield" : "cut");
  return true;
}

/** Gọi mỗi tick: chuyển bước theo thời gian; hết câu kết thì khách rời tiệm. */
export function chatTick(state: SimState, emit: Emit): void {
  for (const customer of Object.values(state.customers)) {
    const chat = customer.chat;
    if (!chat || customer.phase !== "counter") continue;
    if (state.timeMs - chat.stepStartedAtMs < chat.stepMs) continue;
    if (chat.closing) {
      finishChat(state, customer, emit);
      continue;
    }
    if (chat.step >= chat.planned) {
      const story = STORIES[chat.storyId];
      close(
        state,
        chat,
        story && chat.from + chat.planned >= story.beats.length
          ? "complete"
          : "pause",
      );
      continue;
    }
    chat.step += 1;
    chat.stepStartedAtMs = state.timeMs;
  }
}

function finishChat(state: SimState, customer: Customer, emit: Emit): void {
  const chat = customer.chat!;
  const order = customer.orderId ? state.orders[customer.orderId] : undefined;
  const worker = order ? state.workers[order.workerId] : undefined;
  const profile = profileOf(state, customer);
  const warmth = worker ? TONE_WARMTH[toneOf(worker)] : 1;
  const complete = chat.closing === "complete";
  let bonus =
    (0.025 * chat.told + (complete ? 0.05 : 0)) * warmth +
    (chat.closing === "yield" ? 0.01 : 0) -
    (chat.closing === "cut" ? 0.03 : 0);
  bonus = clamp(bonus, -0.05, 0.18);
  customer.chatBonus = Math.round(bonus * 1000) / 1000;
  if (profile) {
    profile.rapport = clamp(
      profile.rapport +
        (chat.closing === "cut" ? -3 : 3 + 3 * chat.told + (complete ? 6 : 0)),
      0,
      100,
    );
    if (complete) {
      if (!profile.storiesDone.includes(chat.storyId))
        profile.storiesDone.push(chat.storyId);
      profile.story = null;
    } else {
      profile.story = { id: chat.storyId, beat: chat.from + chat.told };
    }
  }
  if (complete) state.stats.chatsCompleted += 1;
  emit({
    type: "chatEnded",
    customerId: customer.id,
    workerId: worker?.id ?? null,
    storyId: chat.storyId,
    closing: chat.closing!,
    told: chat.told,
  });
  if (order) order.state = "done";
  dismissCustomer(state, customer, "bought", emit);
}

/** Có quầy nào đang trò chuyện không (khách xếp hàng thấy vậy nên sốt ruột nhanh hơn). */
export function anyChatting(state: DeepReadonly<SimState>): boolean {
  return state.counters.some((c) => {
    const customer = c.customerId ? state.customers[c.customerId] : undefined;
    return !!customer?.chat && !customer.chat.closing;
  });
}
