import "@fontsource-variable/nunito";
import "./styles.css";
import "./ui/theme.css";
import {
  createInitialState,
  pruneEquipped,
  restoreCollection,
  Simulation,
} from "@pharmacy/simulation";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { unlockAudioOnFirstGesture } from "./audio/sfx";
import { GameBridge } from "./game/GameBridge";
import {
  loadLatest,
  readCollectionBackup,
  writeSave,
} from "./game/persistence";
import { GameContext } from "./game/useGame";
import { useUi } from "./ui/uiStore";

/** Vắng mặt ít hơn mức này thì không hiện hộp thoại tổng kết. */
const OFFLINE_DIALOG_MIN_MS = 60_000;

const { save, hadCorrupt } = loadLatest();

/** Tiệm mới: mang theo bộ sưu tập của người chơi (nếu có) từ bản lưu riêng. */
function newGame(): Simulation {
  // Seed chọn ở tầng web (được phép dùng API trình duyệt); mô phỏng chỉ nhận con số này.
  const state = createInitialState(
    crypto.getRandomValues(new Uint32Array(1))[0]!,
  );
  const collection = restoreCollection(readCollectionBackup());
  if (collection) {
    state.collection = collection;
    pruneEquipped(state);
  }
  return Simulation.fromState(state);
}

const sim = save ? Simulation.fromState(save.state) : newGame();
const bridge = new GameBridge(sim, { save: writeSave });

if (save && save.savedAtWallMs > 0) {
  const summary = bridge.catchUp(Date.now() - save.savedAtWallMs);
  if (summary.awayMs >= OFFLINE_DIALOG_MIN_MS)
    useUi.getState().setOffline(summary);
}
if (hadCorrupt)
  useUi
    .getState()
    .pushToast(
      "warn",
      "Không đọc được bản lưu cũ nên đã mở tiệm mới. Bản cũ vẫn được cất riêng.",
    );

bridge.attach();
bridge.onOffline((summary) => {
  if (summary.awayMs >= OFFLINE_DIALOG_MIN_MS)
    useUi.getState().setOffline(summary);
});
unlockAudioOnFirstGesture();

// Chạy offline như ứng dụng (PWA). Chỉ đăng ký ở bản build để không cache nhầm khi dev.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Không có service worker vẫn chơi bình thường, chỉ không mở được khi mất mạng.
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameContext.Provider value={bridge}>
      <App />
    </GameContext.Provider>
  </StrictMode>,
);
