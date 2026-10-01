import { afterEach, expect, it, vi } from "vitest";
import { useUi } from "../src/ui/uiStore";

afterEach(() => {
  for (const f of useUi.getState().floaters) useUi.getState().dropFloater(f.id);
  vi.useRealTimers();
});

it("bounds and expires floaters even without mounted animation elements", () => {
  vi.useFakeTimers();
  for (let i = 0; i < 20; i++) useUi.getState().pushFloater(`+${i}`, 0, 0);
  expect(useUi.getState().floaters).toHaveLength(12);
  expect(vi.getTimerCount()).toBe(12);
  vi.advanceTimersByTime(1600);
  expect(useUi.getState().floaters).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});
