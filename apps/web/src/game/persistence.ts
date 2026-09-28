import { createSave, loadSave, type DeepReadonly, type LoadResult, type SimState } from '@pharmacy/simulation';

/*
 * Lưu tự động vào localStorage với 2 ô luân phiên: nếu lần ghi mới nhất bị hỏng (tắt tab giữa chừng,
 * đầy bộ nhớ…) vẫn còn bản trước đó. Save nhỏ (lịch sử đã được cắt gọn) nên không cần IndexedDB.
 */

const SLOTS = ['bo-cong-anh.save.a', 'bo-cong-anh.save.b'] as const;
const CORRUPT_KEY = 'bo-cong-anh.save.corrupt';

type Loaded = Extract<LoadResult, { ok: true }>;

export interface StartupLoad {
  save: Loaded | null;
  /** Có dữ liệu cũ nhưng không đọc được (đã được cất riêng để không bị ghi đè). */
  hadCorrupt: boolean;
}

let nextSlot = 0;
let enabled = true;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadLatest(): StartupLoad {
  let best: Loaded | null = null;
  let bestSlot = -1;
  let hadCorrupt = false;
  SLOTS.forEach((key, index) => {
    const raw = read(key);
    if (raw === null) return;
    let result: LoadResult;
    try {
      result = loadSave(JSON.parse(raw));
    } catch {
      result = { ok: false, error: 'corrupt' };
    }
    if (!result.ok) {
      hadCorrupt = true;
      try {
        localStorage.setItem(CORRUPT_KEY, raw);
      } catch {
        // Không cất được thì thôi; vẫn chơi tiếp bằng ô còn lại.
      }
      return;
    }
    if (!best || result.savedAtWallMs > best.savedAtWallMs) {
      best = result;
      bestSlot = index;
    }
  });
  // Ghi đè vào ô KHÔNG chứa bản tốt nhất, để luôn giữ một bản đọc được.
  nextSlot = bestSlot === 0 ? 1 : 0;
  // Nếu chỉ còn một bản tốt, bản hỏng được bỏ qua (không tính là mất tiến trình).
  return { save: best, hadCorrupt: hadCorrupt && !best };
}

export function writeSave(state: DeepReadonly<SimState>): boolean {
  if (!enabled) return false;
  try {
    localStorage.setItem(SLOTS[nextSlot]!, JSON.stringify(createSave(state, Date.now())));
    nextSlot = (nextSlot + 1) % SLOTS.length;
    return true;
  } catch {
    return false;
  }
}

/** Dừng lưu tự động (trước khi tải lại trang sau khi xoá/nhập save). */
function disable(): void {
  enabled = false;
}

export function resetAndReload(): void {
  disable();
  try {
    for (const key of SLOTS) localStorage.removeItem(key);
  } catch {
    // Bỏ qua: trường hợp xấu nhất là tải lại vẫn vào tiệm cũ.
  }
  location.reload();
}

export function downloadSave(state: DeepReadonly<SimState>): void {
  const blob = new Blob([JSON.stringify(createSave(state, Date.now()))], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bo-cong-anh-ngay-${state.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Đọc file save người chơi chọn; hợp lệ thì ghi vào cả hai ô và tải lại trang. */
export async function importSaveFile(file: File): Promise<LoadResult> {
  let result: LoadResult;
  try {
    result = loadSave(JSON.parse(await file.text()));
  } catch {
    result = { ok: false, error: 'not-a-save' };
  }
  if (!result.ok) return result;
  disable();
  try {
    // Mốc thời gian = lúc nhập, để không tính "vắng mặt" từ lúc file được xuất.
    const text = JSON.stringify(createSave(result.state, Date.now()));
    for (const key of SLOTS) localStorage.setItem(key, text);
  } catch {
    return { ok: false, error: 'corrupt' };
  }
  location.reload();
  return result;
}
