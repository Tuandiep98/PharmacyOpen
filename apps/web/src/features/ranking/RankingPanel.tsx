import {
  ALL_ROUND_WEIGHTS,
  arrivalFactor,
  RANKING_RULES,
  RANKING_WINDOW_DAYS,
  standingBoost,
  type DeepReadonly,
  type Leaderboard,
  type RankingBoard,
  type RankingEntry,
  type SimState,
} from "@pharmacy/simulation";
import { useEffect, useMemo, useState } from "react";
import { BRAND, useBrandIdentity } from "../../brand";
import { TrophyIcon } from "../../art/Icons";
import { formatRating } from "../../ui/Stars";
import { PanelHeading } from "../../ui/primitives";
import { Segmented } from "../../ui/Segmented";
import { currentRankingProvider } from "./rankingService";
import "./ranking.css";

type State = DeepReadonly<SimState>;

const BOARD_LABEL: Record<RankingBoard, string> = {
  revenue: "Doanh thu",
  rating: "Đánh giá",
  staff: "Nhân viên",
};

const BOARD_RULE: Record<RankingBoard, string> = {
  revenue: `Doanh thu trung bình mỗi ngày trong ${RANKING_WINDOW_DAYS} ngày gần nhất. Cần ít nhất ${RANKING_RULES.minRevenueDays} ngày số liệu.`,
  rating: `Sao trung bình của các đánh giá mới trong ${RANKING_WINDOW_DAYS} ngày. Cần ít nhất ${RANKING_RULES.minReviews} đánh giá để không ăn may.`,
  staff: `Điểm toàn năng 0–100: sao cá nhân ${ALL_ROUND_WEIGHTS.rating * 100}% · số đơn mỗi ca ${ALL_ROUND_WEIGHTS.sales * 100}% · nghiệp vụ ${ALL_ROUND_WEIGHTS.performance * 100}% · tay nghề ${ALL_ROUND_WEIGHTS.level * 100}%. Cần ≥ ${RANKING_RULES.minStaffShifts} ca và ≥ ${RANKING_RULES.minStaffSales} đơn.`,
};

function formatValue(board: RankingBoard, entry: RankingEntry): string {
  if (board === "revenue") return `${entry.value} ${BRAND.currency}/ngày`;
  if (board === "rating") return `${formatRating(entry.value)}★`;
  return `${entry.value} điểm`;
}

function sampleText(board: RankingBoard, entry: RankingEntry): string {
  if (board === "revenue") return `${entry.sample} ngày`;
  if (board === "rating") return `${entry.sample} đánh giá`;
  return `${entry.sample} ca`;
}

/** Điều còn thiếu để lên bảng (hiện cho mục của người chơi chưa đủ điều kiện). */
function missingText(board: RankingBoard, entry: RankingEntry): string {
  if (board === "revenue")
    return `cần thêm ${RANKING_RULES.minRevenueDays - entry.sample} ngày số liệu`;
  if (board === "rating")
    return `cần thêm ${RANKING_RULES.minReviews - entry.sample} đánh giá trong 7 ngày`;
  return `cần ≥ ${RANKING_RULES.minStaffShifts} ca và ≥ ${RANKING_RULES.minStaffSales} đơn`;
}

/** Top nhà thuốc trong khu vực: ba bảng, mục của người chơi luôn được ghim để so sánh. */
export function RankingPanel({ state }: { state: State }) {
  const { name } = useBrandIdentity();
  const [board, setBoard] = useState<RankingBoard>("revenue");
  const [data, setData] = useState<Leaderboard | null>(null);
  const provider = useMemo(() => currentRankingProvider(), []);
  // Bảng chỉ đổi khi chốt ngày: tải lại theo ngày đã chốt gần nhất, không theo từng tick.
  const closedDay = state.dayReports.at(-1)?.day ?? 0;
  useEffect(() => {
    let alive = true;
    void provider.load(board, state, name).then((result) => {
      if (alive) setData(result);
    });
    return () => {
      alive = false;
    };
    // `state` là snapshot sống của mô phỏng (cùng tham chiếu mỗi tick); `closedDay` quyết định khi nào tải lại.
  }, [provider, board, closedDay, name, state]);

  return (
    <>
      <PanelHeading description="Xếp hạng các nhà thuốc trong khu vực theo 7 ngày gần nhất, cập nhật mỗi lần chốt ngày. Lên top giúp nhiều người biết tới tiệm hơn.">
        Top khu vực
      </PanelHeading>
      <AwarenessCard state={state} />
      <Segmented
        inline
        label="Chọn bảng xếp hạng"
        value={board}
        onChange={setBoard}
        options={(["revenue", "rating", "staff"] as const).map((id) => ({
          id,
          label: BOARD_LABEL[id],
        }))}
      />
      <p className="small muted ranking-rule">{BOARD_RULE[board]}</p>
      {!data || data.board !== board ? (
        <p className="small muted">Đang tải bảng…</p>
      ) : (
        <BoardList board={board} data={data} shopName={name} />
      )}
      <p className="small muted ranking-note">
        {provider.mode === "local"
          ? "Chế độ chơi đơn: các tiệm khác trong phường là tiệm mô phỏng. Khi có máy chủ, bảng dùng số liệu của người chơi thật với cùng cách tính."
          : "Đang dùng bảng xếp hạng trực tuyến."}
      </p>
    </>
  );
}

function BoardList({
  board,
  data,
  shopName,
}: {
  board: RankingBoard;
  data: Leaderboard;
  shopName: string;
}) {
  const top = data.entries.slice(0, 10);
  const pinned = data.mine.filter((e) => !top.some((t) => t.id === e.id));
  if (data.day === 0)
    return (
      <p className="notice small">
        Bảng xếp hạng mở sau khi chốt ngày đầu tiên.
      </p>
    );
  return (
    <ol className="ranking-list">
      {top.map((e) => (
        <RankRow key={e.id} board={board} entry={e} shopName={shopName} />
      ))}
      {pinned.length > 0 && (
        <li className="ranking-gap" aria-hidden>
          ⋯
        </li>
      )}
      {pinned.map((e) => (
        <RankRow key={e.id} board={board} entry={e} shopName={shopName} />
      ))}
    </ol>
  );
}

function RankRow({
  board,
  entry,
  shopName,
}: {
  board: RankingBoard;
  entry: RankingEntry;
  shopName: string;
}) {
  const mine = entry.owner === "player";
  const shop = mine ? shopName : entry.shopName;
  const medal =
    entry.rank === 1
      ? "gold"
      : entry.rank === 2
        ? "silver"
        : entry.rank === 3
          ? "bronze"
          : "";
  return (
    <li
      className={`ranking-row ${mine ? "mine" : ""} ${entry.qualified ? "" : "unqualified"}`}
    >
      <span
        className={`rank-badge ${medal}`}
        aria-label={entry.rank ? `Hạng ${entry.rank}` : "Chưa xếp hạng"}
      >
        {medal ? <TrophyIcon size={16} /> : null}
        {entry.rank ?? "–"}
      </span>
      <span className="rank-name">
        <strong>{entry.staffName ?? shop}</strong>
        <span className="small muted">
          {entry.staffName ? `${shop} · ` : ""}
          {mine && !entry.staffName ? "Tiệm của bạn · " : ""}
          {entry.qualified
            ? sampleText(board, entry)
            : missingText(board, entry)}
        </span>
        {entry.parts && mine && (
          <span className="rank-parts small">
            Sao {entry.parts.rating} · Năng suất {entry.parts.sales} · Nghiệp vụ{" "}
            {entry.parts.performance} · Tay nghề {entry.parts.level}
          </span>
        )}
      </span>
      <b className="rank-value">{formatValue(board, entry)}</b>
    </li>
  );
}

/** Độ nhận biết của tiệm và các cách làm khách mới biết tới tiệm nhiều hơn. */
function AwarenessCard({ state }: { state: State }) {
  const awareness = Math.round(state.awareness);
  const factor = Math.round(arrivalFactor(state) * 100);
  const boost = Math.round(standingBoost(state.standing) * 100);
  const ranks = [
    ["Doanh thu", state.standing.revenue],
    ["Đánh giá", state.standing.rating],
    ["Nhân viên", state.standing.staff],
  ] as const;
  return (
    <section className="awareness-card" aria-label="Độ nhận biết của tiệm">
      <div className="awareness-head">
        <span>
          <span className="small muted">Người trong khu biết tới tiệm</span>
          <strong>{awareness}/100</strong>
        </span>
        <span className="awareness-factor">
          <span className="small muted">Lượt khách ghé</span>
          <strong>{factor}%</strong>
        </span>
      </div>
      <span
        className="progress-track"
        role="meter"
        aria-label="Độ nhận biết"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={awareness}
      >
        <span className="progress-fill" style={{ width: `${awareness}%` }} />
      </span>
      <p className="small muted">
        Tiệm mới mở ít người biết nên khách thưa; mỗi ngày tăng dần (tối đa vài
        điểm) nhờ biển hiệu sáng đèn, khách quen quay lại, phục vụ đúng món,
        nhân viên giao tiếp tốt và thứ hạng trong khu vực. Khách bỏ về hay đưa
        nhầm món làm giảm.
      </p>
      <ul className="awareness-ranks">
        {ranks.map(([label, rank]) => (
          <li key={label}>
            {label}: <b>{rank ? `#${rank}` : "chưa lên bảng"}</b>
          </li>
        ))}
        <li>
          Thưởng thứ hạng: <b>{boost > 0 ? `+${boost}% khách` : "chưa có"}</b>{" "}
          <span className="muted">(top 10 +2%, top 3 +5%, top 1 +8%)</span>
        </li>
      </ul>
    </section>
  );
}
