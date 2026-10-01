import type { DeepReadonly, SimState } from "@pharmacy/simulation";

// Primitive snapshots stay immutable even though the simulation mutates in place.
export type GameSignal = string | number | boolean | null;
export type GameSelector = (state: DeepReadonly<SimState>) => GameSignal;

export function createSelection(
  source: { getVersion(): number; readonly state: DeepReadonly<SimState> },
  select: GameSelector,
) {
  let version = -1;
  let value: GameSignal = null;
  return () => {
    const next = source.getVersion();
    if (next !== version) {
      value = select(source.state);
      version = next;
    }
    return value;
  };
}
