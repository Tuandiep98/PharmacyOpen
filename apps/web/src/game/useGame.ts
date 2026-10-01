import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { SimEvent } from "@pharmacy/simulation";
import type { GameBridge } from "./GameBridge";
import { createSelection, type GameSelector } from "./selection";

export const GameContext = createContext<GameBridge | null>(null);

export function useBridge(): GameBridge {
  const bridge = useContext(GameContext);
  if (!bridge) throw new Error("Thiếu GameContext");
  return bridge;
}

/** Live state; optional primitive signal narrows which changes trigger a render. */
export function useGameState(select?: GameSelector) {
  const bridge = useBridge();
  const getSnapshot = useMemo(
    () => select ? createSelection(bridge, select) : bridge.getVersion,
    [bridge, select],
  );
  useSyncExternalStore(bridge.subscribe, getSnapshot);
  return bridge.state;
}

export function useGameEvents(handler: (events: SimEvent[]) => void): void {
  const bridge = useBridge();
  useEffect(() => bridge.onEvents(handler), [bridge, handler]);
}
