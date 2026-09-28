import { applyCommand, type Command, type CommandResult } from './commands';
import type { EventInput, SimEvent } from './events';
import { createInitialState } from './state';
import { tick } from './tick';
import type { DeepReadonly, SimState } from './types';

/** Giữ tối đa chừng này lệnh gần nhất để debug; game idle chạy lâu không được phình bộ nhớ. */
const MAX_COMMAND_LOG = 5000;

export interface RecordedCommand {
  tick: number;
  command: Command;
}

/**
 * Vỏ bọc tiện dụng quanh các hàm thuần: giữ state, gom sự kiện và ghi lại luồng lệnh
 * (kèm số tick) để phát lại tất định khi debug.
 */
export class Simulation {
  private events: SimEvent[] = [];
  readonly commandLog: RecordedCommand[] = [];

  constructor(private readonly state: SimState) {}

  static create(seed: number): Simulation {
    return new Simulation(createInitialState(seed));
  }

  /** Tiếp tục từ state đã tải (vd. từ save); nhận bản sao để không chia sẻ tham chiếu. */
  static fromState(state: SimState): Simulation {
    return new Simulation(clone(state));
  }

  get snapshot(): DeepReadonly<SimState> {
    return this.state;
  }

  /** Bản sao sâu, an toàn để lưu hoặc so sánh. */
  serialize(): SimState {
    return clone(this.state);
  }

  dispatch(command: Command): CommandResult {
    this.commandLog.push({ tick: this.state.tick, command });
    if (this.commandLog.length > MAX_COMMAND_LOG) this.commandLog.splice(0, this.commandLog.length - MAX_COMMAND_LOG);
    return applyCommand(this.state, command, this.emit);
  }

  step(): void {
    tick(this.state, this.emit);
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit = (event: EventInput): void => {
    this.events.push({ ...event, at: this.state.timeMs } as SimEvent);
  };
}

/** Phát lại một luồng lệnh từ state ban đầu; dùng cho test tất định và tái hiện lỗi. */
export function replay(initial: SimState, commands: readonly RecordedCommand[], ticks: number): SimState {
  const sim = new Simulation(clone(initial));
  let i = 0;
  for (let t = 0; t <= ticks; t++) {
    while (i < commands.length && commands[i]!.tick === sim.snapshot.tick) sim.dispatch(commands[i++]!.command);
    if (t < ticks) sim.step();
  }
  return sim.serialize();
}

// State chỉ gồm dữ liệu JSON thuần nên sao chép qua JSON là đủ và không phụ thuộc API môi trường.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
