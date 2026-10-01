import {
  currentShift, dailyOperationsCase, dayPhase, isPresent, playerLevel, wagesDueTonight,
  type DeepReadonly, type SimState,
} from "@pharmacy/simulation";
import { staffAlerts } from "../features/staff/staffAlerts";

type State = DeepReadonly<SimState>;

export const appSignal = (s: State) => JSON.stringify([
  s.seed, s.day, dayPhase(s), playerLevel(s), dailyOperationsCase(s)?.id,
  s.operations, s.money, wagesDueTonight(s).total,
]);

export const hudSignal = (s: State) => JSON.stringify([
  s.money, s.day, Math.floor((s.timeMs - s.dayStartedAtMs) / 1000),
  dayPhase(s), Object.values(s.workers).some(w => w.wageOwed > 0),
]);

export const navigationSignal = (s: State) => JSON.stringify([
  s.complaints.filter(c => c.status === "open").length,
  staffAlerts(s).map(alert => [alert.worker.id, alert.kind]),
]);

// Worker timers do not affect management panels; visible portraits and stats do.
// Presence invalidates bonuses when shifts change or workers arrive/leave.
function teamSignal(s: State) {
  return Object.values(s.workers).map(w => ({
    id: w.id, name: w.name, role: w.role, look: w.look, controller: w.controller,
    speed: w.speed, knowledge: w.knowledge, communication: w.communication,
    traits: w.traits, hiddenTraits: w.hiddenTraits, level: w.level,
    shifts: w.shifts, restDay: w.restDay, present: isPresent(s, w),
    expression: w.expression, repCount: w.repCount, repStarsSum: w.repStarsSum,
    perfCount: w.perfCount, perfSum: w.perfSum,
  }));
}

export const inventorySignal = (s: State) => JSON.stringify([
  s.money, s.day, playerLevel(s), s.upgrades, s.stock, s.prices, s.config, s.operations,
  Object.values(s.stock).map(entry => entry.batches[0]
    ? Math.max(0, Math.ceil((entry.batches[0].expiresAtMs - s.timeMs) / s.config.dayMs))
    : null),
]);

export const expansionSignal = (s: State) => JSON.stringify([
  s.money, s.day, s.stats.sales, s.upgrades, s.collection, s.counters,
  currentShift(s), teamSignal(s), s.config,
]);

export const reviewsSignal = (s: State) => JSON.stringify([
  s.money, s.day, s.reputation, s.reviews,
  [...s.reviews, ...s.complaints].map(entry =>
    Math.floor((s.timeMs - entry.atMs) / 60_000)),
  s.complaints, s.interactions, s.dayReports, s.stats, s.awareness, s.standing,
  teamSignal(s), s.config, s.operations,
]);
