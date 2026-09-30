import { looksFemale, loyalName } from "./content/names";
import { personaFor, returningChance } from "./market";
import { nextFloat, pickWeighted } from "./rng";
import type {
  Customer,
  CustomerOutcome,
  DeepReadonly,
  LoyaltyProfile,
  Order,
  SimState,
} from "./types";

const MAX_PROFILES = 40;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Chọn khách quen quay lại cho lượt khách này (hoặc null = khách mới). Xác suất theo `returningChance`
 * (market.ts); người càng thân (độ thân cao) càng hay được chọn.
 */
export function returningProfile(state: SimState): LoyaltyProfile | null {
  const active = new Set(
    Object.values(state.customers).map((c) => c.loyaltyId),
  );
  const eligible = state.loyalty.filter(
    (p) =>
      p.nextEligibleAtMs <= state.timeMs &&
      p.goodVisits > 0 &&
      p.lastOutcome !== "left-angry" &&
      !active.has(p.id),
  );
  if (
    !eligible.length ||
    nextFloat(state.rng.customer) >= returningChance(state)
  )
    return null;
  return pickWeighted(
    state.rng.customer,
    eligible.map((p) => [p, 20 + p.rapport] as const),
  );
}

/** Tên khách quen đang ở tiệm (null nếu là khách lần đầu). */
export function customerName(
  state: DeepReadonly<SimState>,
  customer: DeepReadonly<Customer>,
): string | null {
  if (!customer.loyaltyId) return null;
  return state.loyalty.find((p) => p.id === customer.loyaltyId)?.name ?? null;
}

export function profileOf(
  state: SimState,
  customer: DeepReadonly<Customer>,
): LoyaltyProfile | undefined {
  return customer.loyaltyId
    ? state.loyalty.find((p) => p.id === customer.loyaltyId)
    : undefined;
}

/**
 * Độ thân thay đổi sau mỗi lượt: phục vụ đúng, không nhầm món và người bán giao tiếp tốt thì tăng;
 * đưa nhầm hay để khách bỏ về thì giảm. Trò chuyện cộng thêm ở chat.ts.
 */
export function rapportDelta(
  state: DeepReadonly<SimState>,
  outcome: CustomerOutcome,
  order: DeepReadonly<Order> | undefined,
): number {
  let delta = 0;
  if (outcome === "bought" || outcome === "referred") delta += 6;
  else if (outcome === "backordered") delta += 2;
  else if (outcome === "went-elsewhere") delta -= 5;
  else if (outcome === "left-angry") delta -= 30;
  else delta -= 8;
  const wrong = order?.rejectedProductIds.length ?? 0;
  if (order && (outcome === "bought" || outcome === "referred"))
    delta += wrong === 0 ? 4 : -12 * wrong;
  const server = order ? state.workers[order.workerId] : undefined;
  if (server && server.communication >= 0.7) delta += 3;
  return delta;
}

export function recordVisit(
  state: SimState,
  customer: Customer,
  outcome: CustomerOutcome,
  order?: Order,
): void {
  let profile = profileOf(state, customer);
  if (!profile) {
    profile = {
      id: customer.id,
      name: loyalName(
        customer.id,
        customer.archetypeId,
        customer.look.hairStyle,
        new Set(state.loyalty.map((p) => p.name)),
      ),
      archetypeId: customer.archetypeId,
      look: { ...customer.look },
      visits: 0,
      goodVisits: 0,
      lastOutcome: outcome,
      nextEligibleAtMs: 0,
      persona: personaFor(
        customer.id,
        customer.archetypeId,
        looksFemale(customer.look.hairStyle),
      ),
      rapport: 0,
      story: null,
      storiesDone: [],
    };
    state.loyalty.push(profile);
  }
  profile.visits += 1;
  if (outcome === "bought" || outcome === "referred") profile.goodVisits += 1;
  profile.lastOutcome = outcome;
  profile.nextEligibleAtMs = state.timeMs + state.config.dayMs;
  profile.rapport = clamp(
    profile.rapport + rapportDelta(state, outcome, order),
    0,
    100,
  );
  if (state.loyalty.length > MAX_PROFILES)
    state.loyalty.splice(0, state.loyalty.length - MAX_PROFILES);
}
