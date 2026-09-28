import type { ComplaintResponse } from './content/reviews';
import type { ArchetypeId, ProductId, ReasonCode, RequestKind, StaffLook, StaffRole, TraitId } from './content/types';
import type { RngState } from './rng';

export const SAVE_VERSION = 4;

export interface ReputationConfig {
  /** Điểm sao "mặc định" khi còn ít đánh giá (làm mượt kiểu Bayes). */
  priorRating: number;
  /** Số đánh giá ảo ở mức priorRating; càng lớn càng khó dao động. */
  priorWeight: number;
  /** Lượng khách thay đổi theo mỗi 1 sao lệch khỏi priorRating. */
  demandSlope: number;
  /** Trần/sàn hệ số lượng khách để tránh vòng xoáy tăng/giảm mất kiểm soát. */
  demandMin: number;
  demandMax: number;
  /** Xác suất viết đánh giá không bao giờ vượt mức này. */
  reviewMaxProbability: number;
  voucherCost: number;
  /** Số bản ghi lịch sử giữ lại trong save. */
  keepInteractions: number;
  keepReviews: number;
  keepComplaints: number;
}

export interface SimConfig {
  tickMs: number;
  startingMoney: number;
  firstSpawnMs: number;
  spawnIntervalMs: [number, number];
  /** Số nhân viên NPC tối đa (không tính người chơi). */
  maxStaff: number;
  /** Thời gian NPC suy nghĩ trước khi chọn món (chia cho speed, cộng thêm khi kiến thức thấp). */
  aiThinkMs: number;
  /** Thời gian một lần NPC đi bổ sung kệ (chia cho speed). */
  aiRestockMs: number;
  /** NPC bổ sung kệ khi số hàng trên kệ ≤ tỉ lệ này × sức chứa. */
  aiRestockThreshold: number;
  reputation: ReputationConfig;
  /** Độ dài một ngày trong game; cuối ngày trả lương và chốt sổ. */
  dayMs: number;
  /** Giá bán tối đa = giá tham khảo × hệ số này (giá tối thiểu = giá vốn + 1). */
  priceMaxFactor: number;
  /** Nhân viên đang bị nợ lương làm việc chậm hơn theo hệ số này. */
  owedWageSpeedFactor: number;
  /** Tiến trình khi vắng mặt được tính tối đa chừng này thời gian. */
  offlineCapMs: number;
  /** Số bản tổng kết ngày giữ lại. */
  keepDayReports: number;
  /** Tuổi thọ một lô hàng, tính theo thời gian mô phỏng. */
  stockShelfLifeMs: number;
  /** Xác suất ưu tiên khách quen đã đủ thời gian quay lại. */
  returningCustomerChance: number;
  /** Số khách tối đa đang xếp hàng (không tính khách ở quầy). */
  maxQueue: number;
  retrieveMs: number;
  checkoutMs: number;
  referMs: number;
  leaveMs: number;
  /** Tốc độ hao kiên nhẫn theo trạng thái khách (1 = theo thời gian thực). */
  patienceRate: { queue: number; deciding: number; working: number };
  /** Phần kiên nhẫn tối đa bị trừ khi đưa nhầm hàng. */
  wrongItemPenalty: number;
  emoteMs: number;
}

export type CustomerExpression =
  | 'neutral'
  | 'happy'
  | 'grateful'
  | 'thinking'
  | 'confused'
  | 'impatient'
  | 'angry'
  | 'unwell';

export type CustomerPhase = 'queue' | 'counter' | 'leaving';

export type CustomerOutcome = 'bought' | 'referred' | 'left-angry' | 'left-unserved';

export interface CustomerLook {
  skin: number;
  hair: number;
  hairStyle: number;
  outfit: number;
}

export interface Customer {
  id: string;
  archetypeId: ArchetypeId;
  requestId: string;
  look: CustomerLook;
  phase: CustomerPhase;
  arrivedAtMs: number;
  /** Lúc bắt đầu được phục vụ lần đầu (null nếu chưa ai phục vụ). */
  servedAtMs: number | null;
  patienceMs: number;
  patienceMaxMs: number;
  expression: CustomerExpression;
  /** Biểu cảm tạm thời (vd. bối rối khi đưa nhầm hàng) có hiệu lực đến thời điểm này. */
  emoteUntilMs: number;
  orderId: string | null;
  outcome: CustomerOutcome | null;
  leaveAtMs: number;
  loyaltyId: string | null;
}

export type OrderState =
  | 'deciding'
  | 'retrieving'
  | 'ready'
  | 'checkingOut'
  | 'referring'
  | 'done'
  | 'cancelled';

/** Sự kiện khách quan của một lượt phục vụ, dùng cho hiệu suất nội bộ (bước 4). */
export type InteractionFact =
  | 'correct-item'
  | 'wrong-item'
  | 'safety-warning'
  | 'appropriate-referral'
  | 'unnecessary-referral'
  | 'customer-left';

export interface Order {
  id: string;
  customerId: string;
  workerId: string;
  requestId: string;
  state: OrderState;
  /** Sản phẩm đã lấy khỏi kệ (đã trừ kho). */
  productId: ProductId | null;
  /** Hạn của món đã lấy khỏi kệ; trả về đúng lô nếu khách từ chối. */
  productExpiresAtMs: number | null;
  timerMs: number;
  timerTotalMs: number;
  facts: InteractionFact[];
  /** Món khách đã từ chối trong lượt này (NPC không đưa lại món đó). */
  rejectedProductIds: ProductId[];
  /** Giá đã thu khi bán xong (chốt tại thời điểm thanh toán). */
  price: number | null;
}

export type WorkerExpression = 'neutral' | 'focused' | 'happy' | 'worried';

/** Việc không gắn với đơn hàng, có thời lượng (hiện chỉ có đi bổ sung kệ). */
export type WorkerTask = { kind: 'restock'; productId: ProductId; timerMs: number; timerTotalMs: number };

export interface Worker {
  id: string;
  name: string;
  role: StaffRole;
  controller: 'player' | 'ai';
  /** Hệ số tốc độ thao tác (1 = chuẩn). */
  speed: number;
  knowledge: number;
  communication: number;
  trait: TraitId | null;
  look: StaffLook;
  /** Lương mỗi ngày (0 với người chơi) và phần lương chưa trả được do thiếu xu. */
  wage: number;
  wageOwed: number;
  orderId: string | null;
  task: WorkerTask | null;
  /** NPC đang suy nghĩ cho đơn hiện tại tới thời điểm này (0 = chưa bắt đầu). */
  thinkUntilMs: number;
  expression: WorkerExpression;
  emoteUntilMs: number;
  served: number;
  /** Hiệu suất nghiệp vụ khách quan: tổng điểm (0–100 mỗi lượt) và số lượt đã chấm. */
  perfSum: number;
  perfCount: number;
  /** Danh tiếng cá nhân từ đánh giá công khai, đã loại các đánh giá không do lỗi của người này. */
  repStarsSum: number;
  repCount: number;
}

/** Nhật ký khách quan của một lượt khách, dùng để chấm điểm và giải thích đánh giá. */
export interface InteractionRecord {
  id: string;
  customerId: string;
  archetypeId: ArchetypeId;
  requestId: string;
  requestKind: RequestKind;
  workerId: string | null;
  outcome: CustomerOutcome;
  arrivedAtMs: number;
  servedAtMs: number | null;
  endedAtMs: number;
  productId: ProductId | null;
  price: number | null;
  wrongProductIds: ProductId[];
  safetyWarnings: number;
  /** Điểm nghiệp vụ của lượt này (null nếu chưa ai phục vụ — không tính cho nhân viên nào). */
  performance: number | null;
  /** Mức hài lòng chủ quan 0..1 và lý do. */
  satisfaction: number;
  reasons: ReasonCode[];
  reviewId: string | null;
}

export interface Review {
  id: string;
  interactionId: string;
  archetypeId: ArchetypeId;
  workerId: string | null;
  stars: number;
  originalStars: number;
  comment: string;
  reasons: ReasonCode[];
  /** Có tính vào danh tiếng cá nhân của workerId không (false nếu lỗi không thuộc về người đó). */
  countsForStaff: boolean;
  atMs: number;
  response: ComplaintResponse | null;
}

export interface Complaint {
  id: string;
  reviewId: string;
  status: 'open' | 'resolved' | 'closed';
  response: ComplaintResponse | null;
  improved: boolean;
  atMs: number;
}

export interface ReputationState {
  starsSum: number;
  count: number;
  /** Số đánh giá theo số sao, index 0 = 1 sao. */
  histogram: [number, number, number, number, number];
}

export interface Counter {
  id: string;
  customerId: string | null;
  /** Nhân viên được giao phục vụ quầy này; chỉ người này được bắt đầu phục vụ khách ở quầy. */
  operatorId: string;
}

export interface StockEntry {
  shelf: number;
  capacity: number;
  batches: StockBatch[];
}

export interface StockBatch {
  qty: number;
  expiresAtMs: number;
}

export interface LoyaltyProfile {
  id: string;
  archetypeId: ArchetypeId;
  look: CustomerLook;
  visits: number;
  goodVisits: number;
  lastOutcome: CustomerOutcome;
  nextEligibleAtMs: number;
}

export interface SimStats {
  customersArrived: number;
  sales: number;
  revenue: number;
  referrals: number;
  leftAngry: number;
  wrongItems: number;
  safetyWarnings: number;
  spentOnStock: number;
  spentOnStaff: number;
  spentOnUpgrades: number;
  spentOnVouchers: number;
  spentOnWages: number;
  /** Khách tới nhưng hàng chờ đầy nên bỏ đi ngay. */
  turnedAway: number;
  expiredStock: number;
  returningCustomers: number;
}

/** Tổng kết một ngày: chênh lệch sổ sách giữa đầu và cuối ngày. */
export interface DayReport {
  day: number;
  revenue: number;
  stockCost: number;
  wages: number;
  /** Lương còn nợ sau khi chốt ngày. */
  wagesOwed: number;
  /** Tuyển người, nâng cấp, phiếu giảm giá. */
  investments: number;
  /** Chênh lệch số xu đầu và cuối ngày. */
  profit: number;
  customers: number;
  sales: number;
  referrals: number;
  leftAngry: number;
  turnedAway: number;
  reviews: number;
  expiredStock: number;
  returningCustomers: number;
  /** Trung bình sao của các đánh giá mới trong ngày (null nếu không có). */
  avgStars: number | null;
}

/** Mốc sổ sách lúc bắt đầu ngày, để tính tổng kết. */
export interface DayStart {
  money: number;
  stats: SimStats;
  starsSum: number;
  reviewCount: number;
}

export interface SimState {
  version: typeof SAVE_VERSION;
  seed: number;
  tick: number;
  timeMs: number;
  nextId: number;
  money: number;
  config: SimConfig;
  rng: { spawn: RngState; customer: RngState; ai: RngState; review: RngState };
  nextSpawnAtMs: number;
  customers: Record<string, Customer>;
  queue: string[];
  counters: Counter[];
  workers: Record<string, Worker>;
  orders: Record<string, Order>;
  stock: Record<ProductId, StockEntry>;
  loyalty: LoyaltyProfile[];
  /** Giá bán đang áp dụng; người chơi chỉnh bằng lệnh setPrice. */
  prices: Record<ProductId, number>;
  /** Ngày hiện tại (bắt đầu từ 1) và thời điểm ngày bắt đầu. */
  day: number;
  dayStartedAtMs: number;
  dayStart: DayStart;
  dayReports: DayReport[];
  /** Id nâng cấp đã mua, theo thứ tự mua. */
  upgrades: string[];
  interactions: InteractionRecord[];
  reviews: Review[];
  complaints: Complaint[];
  reputation: ReputationState;
  stats: SimStats;
}

export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
