import { stableHash } from "./content/names";
import { REGION_NAME, RIVAL_SHOPS } from "./content/region";
import { FAMILY_NAMES, GIVEN_NAMES } from "./content/staff";
import type { StaffRole } from "./content/types";
import type { DeepReadonly, RegionStanding, SimState } from "./types";

/*
 * Top nhà thuốc trong khu vực (spec §3l). Ba bảng, cùng cửa sổ 7 ngày gần nhất:
 *   - Doanh thu: doanh thu trung bình mỗi ngày (cần ít nhất 3 ngày số liệu).
 *   - Đánh giá: điểm sao trung bình của các đánh giá mới trong 7 ngày (cần ≥ 30 đánh giá).
 *   - Nhân viên toàn năng: điểm 0–100 gộp sao cá nhân, số đơn mỗi ca, điểm nghiệp vụ và tay nghề
 *     (cần ≥ 3 ca và ≥ 10 đơn).
 *
 * Kiến trúc hướng online: mỗi tiệm nộp một `RankingSubmission` (số liệu thô đã tổng hợp); bảng được dựng
 * từ danh sách submission bằng hàm thuần `buildLeaderboard`. Chơi đơn thì đối thủ là các tiệm hư cấu
 * sinh tất định từ seed + ngày; khi có máy chủ chỉ cần thay nguồn submission, cách tính giữ nguyên.
 */

export type RankingBoard = "revenue" | "rating" | "staff";
export const RANKING_BOARDS: readonly RankingBoard[] = [
  "revenue",
  "rating",
  "staff",
];

export const RANKING_WINDOW_DAYS = 7;
export const RANKING_RULES = {
  minRevenueDays: 3,
  minReviews: 30,
  minStaffShifts: 3,
  minStaffSales: 10,
  /** Số đơn mỗi ca để đạt điểm tối đa phần "năng suất". */
  salesPerShiftRef: 12,
} as const;

/** Trọng số điểm toàn năng: sao cá nhân 35 · năng suất 30 · nghiệp vụ 25 · tay nghề 10. */
export const ALL_ROUND_WEIGHTS = {
  rating: 0.35,
  sales: 0.3,
  performance: 0.25,
  level: 0.1,
} as const;

export interface StaffSubmission {
  id: string;
  name: string;
  role: StaffRole;
  level: number;
  shifts: number;
  sales: number;
  perfSum: number;
  perfCount: number;
  starsSum: number;
  starsCount: number;
}

/** Số liệu một tiệm gửi lên bảng xếp hạng (định dạng dùng chung cho chơi đơn và máy chủ). */
export interface RankingSubmission {
  shopId: string;
  shopName: string;
  owner: "player" | "rival";
  day: number;
  /** Số ngày có số liệu trong cửa sổ (≤ 7). */
  days: number;
  revenueTotal: number;
  reviews: number;
  starsSum: number;
  staff: StaffSubmission[];
}

export interface AllRoundScore {
  score: number;
  parts: { rating: number; sales: number; performance: number; level: number };
}

/** Điểm toàn năng 0–100 của một nhân viên trong cửa sổ xếp hạng. */
export function allRoundScore(s: DeepReadonly<StaffSubmission>): AllRoundScore {
  // Sao cá nhân làm mượt kiểu Bayes (3,5★ × 5 lượt) để vài đánh giá 5★ không đẩy điểm lên trần.
  const stars = (3.5 * 5 + s.starsSum) / (5 + s.starsCount);
  const parts = {
    rating: ((stars - 1) / 4) * 100,
    sales: Math.min(
      100,
      (s.shifts > 0 ? s.sales / s.shifts / RANKING_RULES.salesPerShiftRef : 0) *
        100,
    ),
    performance: s.perfCount > 0 ? s.perfSum / s.perfCount : 70,
    level: Math.min(10, s.level) * 10,
  };
  const score =
    parts.rating * ALL_ROUND_WEIGHTS.rating +
    parts.sales * ALL_ROUND_WEIGHTS.sales +
    parts.performance * ALL_ROUND_WEIGHTS.performance +
    parts.level * ALL_ROUND_WEIGHTS.level;
  return {
    score: Math.round(score),
    parts: {
      rating: Math.round(parts.rating),
      sales: Math.round(parts.sales),
      performance: Math.round(parts.performance),
      level: Math.round(parts.level),
    },
  };
}

/** Tổng hợp số liệu của tiệm người chơi trong 7 ngày gần nhất (các ngày đã chốt). */
export function playerSubmission(
  state: DeepReadonly<SimState>,
  shopName = "Tiệm của bạn",
): RankingSubmission {
  const reports = state.dayReports.slice(-RANKING_WINDOW_DAYS);
  const staff = new Map<string, StaffSubmission>();
  for (const report of reports)
    for (const r of report.staff) {
      // Chỉ xếp hạng người còn làm ở tiệm.
      const worker = state.workers[r.workerId];
      if (!worker) continue;
      const entry = staff.get(r.workerId) ?? {
        id: r.workerId,
        name: worker.name,
        role: worker.role,
        level: worker.level,
        shifts: 0,
        sales: 0,
        perfSum: 0,
        perfCount: 0,
        starsSum: 0,
        starsCount: 0,
      };
      entry.shifts += r.shifts;
      entry.sales += r.sales;
      entry.perfSum += r.perfSum;
      entry.perfCount += r.perfCount;
      entry.starsSum += r.starsSum;
      entry.starsCount += r.starsCount;
      staff.set(r.workerId, entry);
    }
  return {
    shopId: "player",
    shopName,
    owner: "player",
    day: state.day,
    days: reports.length,
    revenueTotal: reports.reduce((sum, r) => sum + r.revenue, 0),
    reviews: reports.reduce((sum, r) => sum + r.reviews, 0),
    starsSum: reports.reduce(
      (sum, r) => sum + (r.avgStars === null ? 0 : r.avgStars * r.reviews),
      0,
    ),
    staff: [...staff.values()],
  };
}

const unit = (key: string) => (stableHash(key) % 10_000) / 10_000;

/**
 * Doanh thu mỗi ngày của một tiệm trung bình ở tuổi đời `day` (đường cong thị trường, cân bằng theo
 * balance simulator để người chơi chăm chỉ lên được nửa trên bảng sau vài tuần).
 */
export function marketRevenue(day: number): number {
  return 150 + 18 * Math.min(day, 30);
}

/**
 * Submission tất định của các tiệm hư cấu trong khu vực, tính tới hết ngày `closedDay` (ngày đã chốt
 * gần nhất; cùng cửa sổ 7 ngày với tiệm người chơi).
 */
export function rivalSubmissions(
  seed: number,
  closedDay: number,
): RankingSubmission[] {
  const day = Math.max(0, closedDay);
  const days = Math.min(RANKING_WINDOW_DAYS, day);
  return RIVAL_SHOPS.map((shop) => {
    const key = `${seed}:${shop.id}`;
    // Mỗi tuần một nhịp riêng để thứ hạng đối thủ nhích lên xuống, không đứng yên.
    const week = Math.floor(day / RANKING_WINDOW_DAYS);
    const swing = 0.9 + 0.2 * unit(`${key}:w${week}`);
    const revenuePerDay = shop.tier * marketRevenue(day) * swing;
    const reviewsPerDay =
      (2 + 4.5 * shop.tier) * (0.8 + 0.4 * unit(`${key}:rv${week}`));
    const reviews = Math.round(reviewsPerDay * days);
    const avg = Math.max(
      3,
      Math.min(
        4.85,
        3.35 +
          1.1 * (shop.tier - 0.55) +
          0.35 * (unit(`${key}:st${week}`) - 0.5),
      ),
    );
    const staff: StaffSubmission[] = [0, 1].map((i) => {
      const female = unit(`${key}:g${i}`) < 0.5;
      const names = GIVEN_NAMES[female ? "female" : "male"];
      const given =
        names.given[stableHash(`${key}:n${i}`) % names.given.length]!;
      const family =
        FAMILY_NAMES[stableHash(`${key}:f${i}`) % FAMILY_NAMES.length]!;
      const skill = Math.max(
        0.3,
        Math.min(1.25, shop.tier * (0.82 + 0.3 * unit(`${key}:s${i}${week}`))),
      );
      const shifts = Math.round(days * (1 + (i === 0 ? 0.6 : 0.3)));
      // Nhân viên đối thủ: người giỏi nhất khu vực khoảng 75–80 điểm toàn năng, để nhân viên hạng A/S
      // của người chơi có tay nghề cao lên được top.
      return {
        id: `${shop.id}-${i}`,
        name: `${family} ${given}`,
        role: i === 0 ? "pharmacist" : "clerk",
        level: Math.max(1, Math.min(10, Math.round(1 + (day / 5) * skill))),
        shifts,
        sales: Math.round(shifts * 7.5 * skill),
        perfSum: Math.round(shifts * 4 * Math.min(100, 60 + 28 * skill)),
        perfCount: shifts * 4,
        starsCount: Math.round(shifts * 1.2),
        starsSum:
          Math.round(shifts * 1.2) *
          Math.max(2.8, Math.min(4.7, 3 + 1.1 * skill)),
      };
    });
    return {
      shopId: shop.id,
      shopName: shop.name,
      owner: "rival" as const,
      day,
      days,
      revenueTotal: Math.round(revenuePerDay * days),
      reviews,
      starsSum: Math.round(avg * reviews * 100) / 100,
      staff,
    };
  });
}

export interface RankingEntry {
  /** shopId, hoặc shopId:staffId với bảng nhân viên. */
  id: string;
  owner: "player" | "rival";
  shopName: string;
  /** Tên nhân viên (chỉ bảng nhân viên). */
  staffName: string | null;
  role: StaffRole | null;
  value: number;
  /** Cỡ mẫu: số ngày (doanh thu), số đánh giá (sao), số ca (nhân viên). */
  sample: number;
  qualified: boolean;
  /** Chi tiết điểm toàn năng (chỉ bảng nhân viên). */
  parts: AllRoundScore["parts"] | null;
  rank: number | null;
}

export interface Leaderboard {
  board: RankingBoard;
  region: string;
  day: number;
  /** Các mục đủ điều kiện, đã xếp hạng (1 = cao nhất). */
  entries: RankingEntry[];
  /** Mục của người chơi (kể cả chưa đủ điều kiện) để giao diện ghim ở cuối. */
  mine: RankingEntry[];
}

function entriesFor(
  board: RankingBoard,
  sub: DeepReadonly<RankingSubmission>,
): RankingEntry[] {
  const base = {
    owner: sub.owner,
    shopName: sub.shopName,
    staffName: null,
    role: null,
    parts: null,
    rank: null,
  };
  if (board === "revenue")
    return [
      {
        ...base,
        id: sub.shopId,
        value: sub.days > 0 ? Math.round(sub.revenueTotal / sub.days) : 0,
        sample: sub.days,
        qualified: sub.days >= RANKING_RULES.minRevenueDays,
      },
    ];
  if (board === "rating")
    return [
      {
        ...base,
        id: sub.shopId,
        value:
          sub.reviews > 0
            ? Math.round((sub.starsSum / sub.reviews) * 100) / 100
            : 0,
        sample: sub.reviews,
        qualified: sub.reviews >= RANKING_RULES.minReviews,
      },
    ];
  return sub.staff.map((s) => {
    const { score, parts } = allRoundScore(s);
    return {
      ...base,
      id: `${sub.shopId}:${s.id}`,
      staffName: s.name,
      role: s.role,
      value: score,
      sample: s.shifts,
      qualified:
        s.shifts >= RANKING_RULES.minStaffShifts &&
        s.sales >= RANKING_RULES.minStaffSales,
      parts,
    };
  });
}

/** Dựng một bảng từ danh sách submission (hàm thuần, dùng được cả phía máy chủ). */
export function buildLeaderboard(
  board: RankingBoard,
  submissions: readonly DeepReadonly<RankingSubmission>[],
  day: number,
): Leaderboard {
  const all = submissions.flatMap((s) => entriesFor(board, s));
  const ranked = all
    .filter((e) => e.qualified)
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  ranked.forEach((e, i) => (e.rank = i + 1));
  return {
    board,
    region: REGION_NAME,
    day,
    entries: ranked,
    mine: all.filter((e) => e.owner === "player"),
  };
}

/** Bảng xếp hạng chơi đơn: tiệm người chơi + các tiệm hư cấu trong khu vực. */
export function localLeaderboard(
  state: DeepReadonly<SimState>,
  board: RankingBoard,
  shopName?: string,
): Leaderboard {
  const closedDay = state.dayReports.at(-1)?.day ?? 0;
  return buildLeaderboard(
    board,
    [
      playerSubmission(state, shopName),
      ...rivalSubmissions(state.seed, closedDay),
    ],
    closedDay,
  );
}

/** Hạng của tiệm trên ba bảng (bảng nhân viên lấy người có hạng cao nhất). */
export function regionStanding(state: DeepReadonly<SimState>): RegionStanding {
  const best = (board: RankingBoard) => {
    const ranks = localLeaderboard(state, board)
      .mine.map((e) => e.rank)
      .filter((r): r is number => r !== null);
    return ranks.length ? Math.min(...ranks) : null;
  };
  return {
    day: state.day,
    revenue: best("revenue"),
    rating: best("rating"),
    staff: best("staff"),
  };
}
