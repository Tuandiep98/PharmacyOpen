import {
  runOffline,
  type Command,
  type CommandResult,
  type DeepReadonly,
  type OfflineSummary,
  type SimEvent,
  type Simulation,
  type SimState,
} from "@pharmacy/simulation";

/** Giới hạn chạy bù mỗi lần thức dậy, không phụ thuộc tần số màn hình. */
const MAX_TICKS_PER_WAKE = 10;
const AUTOSAVE_MS = 10_000;
/** Ẩn tab ngắn hơn mức này thì chỉ tiếp tục, không tính là vắng mặt. */
const MIN_AWAY_MS = 5_000;

type Listener = () => void;
type EventListener = (events: SimEvent[]) => void;
type OfflineListener = (summary: OfflineSummary) => void;

export interface Persistence {
  save(state: DeepReadonly<SimState>): void | boolean;
}

/**
 * Cầu nối duy nhất giữa UI và mô phỏng: UI chỉ đọc snapshot (readonly) và gửi lệnh.
 * Vòng lặp chạy bước cố định; khi tab bị ẩn thì dừng hẳn và lưu game. Quay lại thì chạy bù
 * phần thời gian đã vắng (qua runOffline — cùng mô phỏng, có trần) rồi báo cho UI.
 */
export class GameBridge {
  private readonly listeners = new Set<Listener>();
  private readonly eventListeners = new Set<EventListener>();
  private readonly offlineListeners = new Set<OfflineListener>();
  private version = 0;
  private loopId = 0;
  private savedVersion = -1;
  private lastFrame = 0;
  private accumulator = 0;
  private running = false;
  private attached = false;
  private autosaveId = 0;
  private hiddenAtWallMs: number | null = null;

  constructor(
    private readonly sim: Simulation,
    private readonly persistence: Persistence | null = null,
  ) {}

  get state(): DeepReadonly<SimState> {
    return this.sim.snapshot;
  }

  getVersion = (): number => this.version;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  onEvents(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  onOffline(listener: OfflineListener): () => void {
    this.offlineListeners.add(listener);
    return () => this.offlineListeners.delete(listener);
  }

  dispatch(command: Command): CommandResult {
    const result = this.sim.dispatch(command);
    this.publish();
    return result;
  }

  /** Chạy bù thời gian vắng mặt (lúc mở game hoặc quay lại tab). */
  catchUp(awayMs: number): OfflineSummary {
    const summary = runOffline(this.sim, awayMs);
    this.version++;
    for (const l of this.listeners) l();
    this.save();
    return summary;
  }

  /** Gắn lưu tự động và theo dõi ẩn/hiện tab; gọi một lần khi khởi động. */
  attach(): void {
    if (this.attached) return;
    this.attached = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.save);
    this.autosaveId = window.setInterval(this.autosave, AUTOSAVE_MS);
  }

  detach(): void {
    this.attached = false;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.save);
    window.clearInterval(this.autosaveId);
    this.setRunning(false);
  }

  /** Tạm dừng khi có hộp thoại che màn hình; tiếp tục khi đóng. */
  setRunning(running: boolean): void {
    if (running === this.running) return;
    this.running = running;
    window.clearTimeout(this.loopId);
    if (running && !document.hidden) this.resumeLoop();
  }

  private resumeLoop(): void {
    this.lastFrame = performance.now();
    this.accumulator = 0;
    this.schedule();
  }

  private save = (): void => {
    if (this.persistence && this.persistence.save(this.sim.snapshot) !== false)
      this.savedVersion = this.version;
  };

  private autosave = (): void => {
    // Lifecycle saves still refresh the wall clock, even while paused.
    if (this.version !== this.savedVersion) this.save();
  };

  private schedule(): void {
    this.loopId = window.setTimeout(
      this.frame,
      Math.max(1, this.sim.snapshot.config.tickMs - this.accumulator),
    );
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      window.clearTimeout(this.loopId);
      this.save();
      this.hiddenAtWallMs = this.running ? Date.now() : null;
      return;
    }
    if (!this.running) return;
    const awayMs =
      this.hiddenAtWallMs === null ? 0 : Date.now() - this.hiddenAtWallMs;
    this.hiddenAtWallMs = null;
    if (awayMs >= MIN_AWAY_MS) {
      const summary = this.catchUp(awayMs);
      for (const l of this.offlineListeners) l(summary);
    }
    this.resumeLoop();
  };

  private frame = (): void => {
    const now = performance.now();
    const tickMs = this.sim.snapshot.config.tickMs;
    this.accumulator += Math.min(
      now - this.lastFrame,
      tickMs * MAX_TICKS_PER_WAKE,
    );
    this.lastFrame = now;
    let ticks = 0;
    while (this.accumulator >= tickMs && ticks < MAX_TICKS_PER_WAKE) {
      this.sim.step();
      this.accumulator -= tickMs;
      ticks++;
    }
    if (ticks > 0) this.publish();
    if (this.running && !document.hidden) this.schedule();
  };

  private publish(): void {
    const events = this.sim.drainEvents();
    this.version++;
    if (events.length) for (const l of this.eventListeners) l(events);
    for (const l of this.listeners) l();
  }
}
