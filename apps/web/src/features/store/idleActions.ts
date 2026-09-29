import type { Customer, DeepReadonly, Worker } from "@pharmacy/simulation";
import type { CharacterAction } from "../../art/Character";

const CUSTOMER_ACTIONS: CharacterAction[] = [
  "idle",
  "look-shelf",
  "look-left",
  "phone",
  "look-right",
  "inspect",
];
const WORKER_ACTIONS: CharacterAction[] = [
  "idle",
  "inspect",
  "look-right",
  "look-shelf",
  "look-left",
];

function stableOffset(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function rotatingAction(
  id: string,
  timeMs: number,
  actions: CharacterAction[],
): CharacterAction {
  const offset = stableOffset(id);
  const step = Math.floor((timeMs + (offset % 3000)) / 4700);
  return actions[(step + offset) % actions.length]!;
}

export function customerAction(
  customer: DeepReadonly<Customer>,
  timeMs: number,
): CharacterAction {
  if (customer.phase !== "queue") return "idle";
  if (customer.expression === "angry" || customer.expression === "unwell")
    return "idle";
  if (timeMs - customer.arrivedAtMs < 1200) return "idle";
  const action = rotatingAction(customer.id, timeMs, CUSTOMER_ACTIONS);
  if (customer.expression === "impatient" && action === "phone")
    return "look-right";
  return action;
}

export function workerAction(
  worker: DeepReadonly<Worker>,
  timeMs: number,
): CharacterAction {
  if (worker.task?.kind === "slack") return "phone";
  if (worker.task?.kind === "restock") return "look-shelf";
  if (worker.task || worker.orderId) return "idle";
  if (worker.expression === "worried") return "idle";
  return rotatingAction(worker.id, timeMs, WORKER_ACTIONS);
}
