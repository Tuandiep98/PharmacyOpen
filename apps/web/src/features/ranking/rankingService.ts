import {
  buildLeaderboard,
  localLeaderboard,
  playerSubmission,
  type DeepReadonly,
  type Leaderboard,
  type RankingBoard,
  type RankingSubmission,
  type SimState,
} from "@pharmacy/simulation";

/*
 * Nguồn dữ liệu bảng xếp hạng. Giao diện chỉ làm việc với `RankingProvider`, nên khi có máy chủ chỉ cần
 * thêm một provider gọi API mà không đổi màn hình hay cách tính điểm (dùng chung `buildLeaderboard`).
 *
 * Luồng online dự kiến:
 *   1. Cuối mỗi ngày game, `submit(playerSubmission(state, tên tiệm))` gửi số liệu đã tổng hợp.
 *   2. Máy chủ lưu submission mới nhất của mỗi tiệm trong khu vực, dựng bảng bằng `buildLeaderboard`.
 *   3. `load(board)` lấy bảng; hạng của tiệm được gửi vào mô phỏng bằng lệnh `setStanding`
 *      để lượng khách theo hạng thật.
 */
export interface RankingProvider {
  readonly mode: "local" | "online";
  load(
    board: RankingBoard,
    state: DeepReadonly<SimState>,
    shopName: string,
  ): Promise<Leaderboard>;
  submit?(submission: RankingSubmission): Promise<void>;
}

/** Chơi đơn: đối thủ là các tiệm hư cấu sinh tất định từ seed (không cần mạng). */
export const localRankingProvider: RankingProvider = {
  mode: "local",
  load: (board, state, shopName) =>
    Promise.resolve(localLeaderboard(state, board, shopName)),
};

/**
 * Khung provider online: `baseUrl` trỏ tới API bảng xếp hạng. Chưa bật trong bản hiện tại; lỗi mạng
 * thì rơi về bảng chơi đơn để màn hình luôn có dữ liệu.
 */
export function onlineRankingProvider(baseUrl: string): RankingProvider {
  return {
    mode: "online",
    async load(board, state, shopName) {
      try {
        const res = await fetch(
          `${baseUrl}/boards/${board}?day=${state.dayReports.at(-1)?.day ?? 0}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const submissions = (await res.json()) as RankingSubmission[];
        const mine = playerSubmission(state, shopName);
        return buildLeaderboard(
          board,
          [mine, ...submissions.filter((s) => s.shopId !== mine.shopId)],
          mine.day,
        );
      } catch {
        return localLeaderboard(state, board, shopName);
      }
    },
    async submit(submission) {
      await fetch(`${baseUrl}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
    },
  };
}

/** Provider đang dùng: có biến môi trường VITE_RANKING_URL thì dùng máy chủ, không thì chơi đơn. */
export function currentRankingProvider(): RankingProvider {
  const url = (import.meta.env as Record<string, string | undefined>)
    .VITE_RANKING_URL;
  return url ? onlineRankingProvider(url) : localRankingProvider;
}
