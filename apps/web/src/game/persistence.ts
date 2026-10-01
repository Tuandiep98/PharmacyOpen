import {
  serializeSave,
  loadSave,
  type DeepReadonly,
  type LoadResult,
  type SimState,
} from "@pharmacy/simulation";

/*
 * Lưu tự động vào localStorage với 2 ô luân phiên: nếu lần ghi mới nhất bị hỏng (tắt tab giữa chừng,
 * đầy bộ nhớ…) vẫn còn bản trước đó. Save nhỏ (lịch sử đã được cắt gọn) nên không cần IndexedDB.
 */

const SLOTS = ["bo-cong-anh.save.a", "bo-cong-anh.save.b"] as const;
const CORRUPT_KEY = "bo-cong-anh.save.corrupt";
/** Bộ sưu tập của người chơi, tách khỏi save của tiệm (thiết kế hướng tài khoản online sau này). */
const COLLECTION_KEY = "bo-cong-anh.collection";
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

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
      result = { ok: false, error: "corrupt" };
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
    localStorage.setItem(
      SLOTS[nextSlot]!,
      serializeSave(state, Date.now()),
    );
    nextSlot = (nextSlot + 1) % SLOTS.length;
    // Bộ sưu tập là của người chơi: giữ thêm một bản riêng, không bị xoá khi chơi lại từ đầu.
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(state.collection));
    return true;
  } catch {
    return false;
  }
}

/** Bộ sưu tập đã lưu riêng (null nếu chưa có hoặc hỏng); mô phỏng tự kiểm tra lại khi nạp. */
export function readCollectionBackup(): unknown {
  const raw = read(COLLECTION_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
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
  const blob = new Blob([serializeSave(state, Date.now())], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bo-cong-anh-ngay-${state.day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Đọc file save người chơi chọn; hợp lệ thì ghi vào cả hai ô và tải lại trang. */
export async function importSaveFile(file: File): Promise<LoadResult> {
  if (file.size > MAX_IMPORT_BYTES)
    return { ok: false, error: "file-too-large" };
  let result: LoadResult;
  try {
    result = loadSave(JSON.parse(await file.text()));
  } catch {
    result = { ok: false, error: "not-a-save" };
  }
  if (!result.ok) return result;
  disable();
  try {
    // Mốc thời gian = lúc nhập, để không tính "vắng mặt" từ lúc file được xuất.
    const text = serializeSave(result.state, Date.now());
    for (const key of SLOTS) localStorage.setItem(key, text);
  } catch {
    return { ok: false, error: "corrupt" };
  }
  location.reload();
  return result;
}
