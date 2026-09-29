import type { LoadError } from "@pharmacy/simulation";
import { useRef, useState } from "react";
import {
  downloadSave,
  importSaveFile,
  resetAndReload,
} from "../../game/persistence";
import { useGameState } from "../../game/useGame";
import { GameButton } from "../../ui/primitives";

const IMPORT_ERROR: Record<LoadError, string> = {
  "not-a-save": "File này không phải bản lưu của Tiệm thuốc Bồ Công Anh.",
  "newer-version":
    "Bản lưu đến từ phiên bản game mới hơn, hãy cập nhật game trước.",
  corrupt: "Bản lưu bị hỏng hoặc không ghi được vào trình duyệt.",
  "file-too-large": "File bản lưu quá lớn (tối đa 2 MB).",
};

/** Quản lý bản lưu: tự lưu trên trình duyệt, xuất/nhập file, chơi lại từ đầu (chạm hai lần). */
export function SaveSection() {
  const state = useGameState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <section className="save-section" aria-label="Bản lưu">
      <h2>Bản lưu</h2>
      <p className="small muted">
        Tiến trình tự lưu trên trình duyệt này (không gửi đi đâu). Xuất file để
        chuyển sang máy khác hoặc giữ bản dự phòng.
      </p>
      <div className="save-actions">
        <GameButton size="small" onClick={() => downloadSave(state)}>
          Xuất file
        </GameButton>
        <GameButton size="small" onClick={() => fileRef.current?.click()}>
          Nhập file
        </GameButton>
        <GameButton
          size="small"
          tone={confirmReset ? "danger" : "secondary"}
          onBlur={() => setConfirmReset(false)}
          onClick={() =>
            confirmReset ? resetAndReload() : setConfirmReset(true)
          }
        >
          {confirmReset ? "Chạm lần nữa: xoá & chơi lại" : "Chơi lại từ đầu"}
        </GameButton>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const result = await importSaveFile(file);
          setError(result.ok ? null : IMPORT_ERROR[result.error]);
        }}
      />
      {error && (
        <p className="notice bad" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
