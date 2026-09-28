import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { SimEvent } from '@pharmacy/simulation';
import type { GameBridge } from './GameBridge';

export const GameContext = createContext<GameBridge | null>(null);

export function useBridge(): GameBridge {
  const bridge = useContext(GameContext);
  if (!bridge) throw new Error('Thiếu GameContext');
  return bridge;
}

/** Re-render mỗi khi mô phỏng tiến một bước (~10 lần/giây) và trả về state chỉ đọc. */
export function useGameState() {
  const bridge = useBridge();
  useSyncExternalStore(bridge.subscribe, bridge.getVersion);
  return bridge.state;
}

export function useGameEvents(handler: (events: SimEvent[]) => void): void {
  const bridge = useBridge();
  useEffect(() => bridge.onEvents(handler), [bridge, handler]);
}
