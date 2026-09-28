import { nextFloat, nextInt } from './rng';
import type { Customer, CustomerOutcome, LoyaltyProfile, SimState } from './types';

const MAX_PROFILES = 40;

export function returningProfile(state: SimState): LoyaltyProfile | null {
  const active = new Set(Object.values(state.customers).map((c) => c.loyaltyId));
  const eligible = state.loyalty.filter((p) => p.nextEligibleAtMs <= state.timeMs && p.goodVisits > 0 && p.lastOutcome !== 'left-angry' && !active.has(p.id));
  if (!eligible.length || nextFloat(state.rng.customer) >= state.config.returningCustomerChance) return null;
  return eligible[nextInt(state.rng.customer, 0, eligible.length - 1)] ?? null;
}

export function recordVisit(state: SimState, customer: Customer, outcome: CustomerOutcome): void {
  let profile = customer.loyaltyId ? state.loyalty.find((p) => p.id === customer.loyaltyId) : undefined;
  if (!profile) {
    profile = {
      id: customer.id,
      archetypeId: customer.archetypeId,
      look: { ...customer.look },
      visits: 0,
      goodVisits: 0,
      lastOutcome: outcome,
      nextEligibleAtMs: 0,
    };
    state.loyalty.push(profile);
  }
  profile.visits += 1;
  if (outcome === 'bought' || outcome === 'referred') profile.goodVisits += 1;
  profile.lastOutcome = outcome;
  profile.nextEligibleAtMs = state.timeMs + state.config.dayMs;
  if (state.loyalty.length > MAX_PROFILES) state.loyalty.splice(0, state.loyalty.length - MAX_PROFILES);
}
