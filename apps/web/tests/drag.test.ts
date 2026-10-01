import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beginProductGesture } from "../src/ui/drag";
import { useUi } from "../src/ui/uiStore";

vi.mock("../src/audio/sfx", () => ({ playSfx: vi.fn() }));
let browser: EventTarget;
let pending: FrameRequestCallback | undefined;
let hit: ReturnType<typeof vi.fn>;

beforeEach(() => {
  browser = new EventTarget();
  pending = undefined;
  hit = vi.fn((x: number) => ({ closest: () => ({ getAttribute: () => x > 50 ? "counter-2" : "counter-1" }) }));
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", { elementFromPoint: hit });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { pending = cb; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => { pending = undefined; });
  useUi.setState({ drag: null });
});
afterEach(() => { browser.dispatchEvent(new Event("blur")); vi.unstubAllGlobals(); });

function pointer(type: string, x: number, pointerId = 1) {
  browser.dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: 10, pointerId }));
}
function start(onDrop = vi.fn(), onTap = vi.fn()) {
  beginProductGesture({ clientX: 0, clientY: 10, pointerId: 1, pointerType: "touch", button: 0 } as React.PointerEvent,
    "mask", { onDrop, onTap });
  return { onDrop, onTap };
}

describe("coalesced product drag", () => {
  it("hit-tests and publishes only the latest move per animation frame", () => {
    start();
    pointer("pointermove", 15);
    pointer("pointermove", 20);
    pointer("pointermove", 65);
    expect(hit).not.toHaveBeenCalled();
    expect(useUi.getState().drag).toBeNull();
    const frame = pending!;
    pending = undefined;
    frame(0);
    expect(hit).toHaveBeenCalledTimes(1);
    expect(useUi.getState().drag).toMatchObject({ x: 65, target: "counter-2" });
  });
  it("uses final pointerup coordinates and cancels pending work", () => {
    const { onDrop } = start();
    pointer("pointermove", 20);
    pointer("pointerup", 70);
    expect(onDrop).toHaveBeenCalledWith("mask", "counter-2");
    expect(pending).toBeUndefined();
    expect(useUi.getState().drag).toBeNull();
  });
  it("ignores other fingers and preserves tap behavior", () => {
    const { onDrop, onTap } = start();
    pointer("pointermove", 70, 2);
    pointer("pointerup", 70, 2);
    expect(pending).toBeUndefined();
    pointer("pointerup", 2);
    expect(onTap).toHaveBeenCalledWith("mask");
    expect(onDrop).not.toHaveBeenCalled();
  });
  it("cleans up cancellation without a drop or a later ghost", () => {
    const { onDrop } = start();
    pointer("pointermove", 20);
    pointer("pointercancel", 20);
    expect(pending).toBeUndefined();
    pointer("pointermove", 70);
    expect(pending).toBeUndefined();
    expect(onDrop).not.toHaveBeenCalled();
  });
});
