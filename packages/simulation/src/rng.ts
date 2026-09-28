/**
 * RNG có seed (mulberry32). Trạng thái là một số uint32 nên lưu/tải được cùng save.
 * Mỗi hệ thống dùng một luồng riêng để thêm một lần random ở hệ này không làm lệch hệ khác.
 */
export interface RngState {
  s: number;
}

export function nextFloat(r: RngState): number {
  let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Số nguyên trong [min, max] (bao gồm hai đầu). */
export function nextInt(r: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(r) * (max - min + 1));
}

export function pickWeighted<T>(r: RngState, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = nextFloat(r) * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('pickWeighted: danh sách rỗng');
  return last[0];
}

/** Tạo luồng RNG riêng từ seed gốc và tên hệ thống (FNV-1a). */
export function createStream(seed: number, name: string): RngState {
  let h = 0x811c9dc5 ^ (seed >>> 0);
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return { s: h >>> 0 };
}
