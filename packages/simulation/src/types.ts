import type { ComplaintResponse } from './content/reviews';
import type { BackStationId } from './content/stations';
import type {
  ArchetypeId,
  ProductId,
  Rarity,
  ReasonCode,
  RequestKind,
  StaffCandidateDef,
  StaffLook,
  StaffRole,
  TraitId,
} from './content/types';
import type { RngState } from './rng';

export const SAVE_VERSION = 12;

/** Hai ca trong ngày; ca chiều bắt đầu ở giữa ngày. */
export type ShiftId = 'morning' | 'afternoon';
export const SHIFT_IDS: readonly ShiftId[] = ['morning', 'afternoon'];

/** Chuẩn bị (chưa mở cửa) → mở cửa đón khách → đóng cửa (không nhận khách mới, phục vụ nốt). */
export type DayPhase = 'prep' | 'open' | 'closing';

/** Việc chuẩn bị đầu ngày, lấy cảm hứng từ quy trình mở ca của nhà thuốc bán lẻ. */
export type PrepTaskId = 'cash' | 'climate' | 'expiry' | 'shelves';
export const PREP_TASK_IDS: readonly PrepTaskId[] = ['cash', 'climate', 'expiry', 'shelves'];

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
  /** Số ứng viên mỗi ngày và giá làm mới danh sách (một lần mỗi ngày). */
  recruitSlots: number;
  recruitRerollCost: number;
  /** Phí phỏng vấn để xem trước đặc điểm ẩn của một ứng viên. */
  interviewCost: number;
  /** Làm liên tục từ chừng này ngày trở lên thì mỗi ngày mệt thêm `streakFatigue`. */
  streakFatigueDays: number;
  streakFatigue: number;
  /** Người ở kho bổ sung kệ khi kệ còn dưới tỉ lệ này, và làm nhanh hơn theo hệ số thời gian. */
  stockStationThreshold: number;
  stockStationTimeFactor: number;
  /** Thời gian NPC suy nghĩ trước khi chọn món (chia cho speed, cộng thêm khi kiến thức thấp). */
  aiThinkMs: number;
  /** Thời gian một lần NPC đi bổ sung kệ (chia cho speed). */
  aiRestockMs: number;
  /** NPC bổ sung kệ khi số hàng trên kệ ≤ tỉ lệ này × sức chứa. */
  aiRestockThreshold: number;
  reputation: ReputationConfig;
  /** Độ dài một ngày trong game; cuối ngày trả lương và chốt sổ. */
  dayMs: number;
  /** Đầu ngày có chừng này thời gian chuẩn bị; hết thời gian thì tiệm tự mở cửa. */
  prepMs: number;
  /** Cuối ngày ngừng nhận khách mới trong khoảng này để phục vụ nốt rồi chốt sổ. */
  closingMs: number;
  /** Hoàn tất đủ việc chuẩn bị thì khách hao kiên nhẫn chậm hơn theo hệ số này trong ngày. */
  prepPatienceFactor: number;
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
  /** Khoảng giữa hai đơn online (chia cho hệ số đông khách, xem delivery.ts) và lúc đơn đầu tiên trong ngày tới sau khi mở cửa. */
  deliveryIntervalMs: [number, number];
  firstDeliveryMs: number;
  /** Số đơn online chờ gói tối đa khi chưa có nhân viên; mỗi nhân viên thêm 1 (trần `maxOpenDeliveries`). */
  maxOpenDeliveries: number;
  /** Thời gian NPC gói một món vào đơn và ghi phiếu gửi (chia cho speed). */
  deliveryPackMs: number;
  deliveryLabelMs: number;
  /** Shipper tới lấy sau khi gửi, rồi mất chừng này để giao tới khách. */
  shipperPickupMs: number;
  deliveryTransitMs: number;
  /** Quá hạn giao chừng này mà chưa gửi thì khách huỷ đơn. */
  deliveryGraceMs: number;
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

/** backordered: hết hàng, khách đồng ý chờ đơn ship; went-elsewhere: hết hàng, khách đi mua chỗ khác. */
export type CustomerOutcome = 'bought' | 'referred' | 'left-angry' | 'left-unserved' | 'backordered' | 'went-elsewhere';

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
  /** Đang báo khách tạm hết hàng và hỏi có muốn chờ giao sau không. */
  | 'deferring'
  | 'done'
  | 'cancelled';

/** Sự kiện khách quan của một lượt phục vụ, dùng cho hiệu suất nội bộ (bước 4). */
export type InteractionFact =
  'correct-item' | 'wrong-item' | 'safety-warning' | 'appropriate-referral' | 'unnecessary-referral' | 'customer-left';

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

/** Việc không gắn với khách ở quầy, có thời lượng: bổ sung kệ, gói một món vào đơn ship, ghi phiếu gửi đơn. */
export type WorkerTask =
  | { kind: 'restock'; productId: ProductId; timerMs: number; timerTotalMs: number }
  | { kind: 'pack'; deliveryId: string; productId: ProductId; timerMs: number; timerTotalMs: number }
  | { kind: 'label'; deliveryId: string; timerMs: number; timerTotalMs: number }
  /** Nhân viên "Siêu lười" lướt điện thoại vài giây trước khi làm việc. */
  | { kind: 'slack'; timerMs: number; timerTotalMs: number };

export interface Worker {
  id: string;
  name: string;
  role: StaffRole;
  controller: 'player' | 'ai';
  /** Hệ số tốc độ thao tác (1 = chuẩn). */
  speed: number;
  knowledge: number;
  communication: number;
  traits: TraitId[];
  /** Đặc điểm chưa lộ (giao diện hiện "???"), vẫn có tác dụng; lộ ra sau ca làm đầu tiên. */
  hiddenTraits: TraitId[];
  rarity: Rarity;
  look: StaffLook;
  /** Lương mỗi ca đã vào làm (0 với người chơi) và phần lương chưa trả được do thiếu xu. */
  wage: number;
  wageOwed: number;
  /** Lịch ca của người này; chỉ làm việc mới khi đang trong ca của mình. */
  shifts: ShiftId[];
  /** Các ca đã vào làm hôm nay (chấm công); lương cuối ngày tính theo số ca này. */
  shiftsToday: ShiftId[];
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
  /** Tay nghề: kinh nghiệm từ lượt bán đúng và cấp tương ứng (1–10), tăng nhẹ tốc độ và hiểu biết. */
  xp: number;
  level: number;
  /** Mệt mỏi 0–100; làm hai ca liền làm tăng, nghỉ ca làm giảm. Chạm 100 thì xin thôi việc. */
  fatigue: number;
  /** Đang xin thôi việc: chủ tiệm tăng lương giữ chân hoặc đồng ý cho nghỉ; để quá một ngày thì tự nghỉ. */
  resigning: boolean;
  /** Người "Hay đi trễ" chỉ bắt đầu làm từ thời điểm này trong ca. */
  arrivesAtMs: number;
  /** Số ngày làm liên tục (có vào ít nhất một ca); nghỉ trọn một ngày thì về 0. */
  streak: number;
  /** Ngày được cho nghỉ (không vào ca nào), null nếu không có lịch nghỉ. */
  restDay: number | null;
  /** Vị trí ngoài quầy (kho, hỗ trợ…). Đang đứng quầy thì vẫn giữ để quay về khi rời quầy. */
  station: BackStationId;
}

/** Ứng viên trong danh sách tuyển hằng ngày; khoá thì được giữ sang ngày sau. */
export type Recruit = StaffCandidateDef & { locked: boolean };

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
  operatorId: string | null;
}

/** online: đơn đặt qua mạng; backorder: khách ở quầy gặp lúc hết hàng và đồng ý chờ giao. */
export type DeliverySource = 'online' | 'backorder';

/** Gói hàng → ghi phiếu & gửi → chờ shipper tới lấy → đang giao. Giao xong hoặc huỷ thì đơn rời danh sách. */
export type DeliveryStatus = 'packing' | 'packed' | 'awaiting-pickup' | 'shipping';

export interface DeliveryItem {
  productId: ProductId;
  qty: number;
  /** Hạn dùng của từng món đã gói (đã lấy khỏi kệ); đủ `qty` phần tử là gói xong món này. */
  packed: number[];
}

export interface Delivery {
  id: string;
  source: DeliverySource;
  archetypeId: ArchetypeId;
  items: DeliveryItem[];
  createdAtMs: number;
  /** Ngày hẹn giao và mốc hạn (giờ đóng cửa của ngày đó); giao sau mốc này là trễ. */
  dueDay: number;
  dueAtMs: number;
  status: DeliveryStatus;
  /** Tiền thu khi giao (chốt theo giá bán lúc gửi). */
  price: number | null;
  pickupAtMs: number | null;
  deliverAtMs: number | null;
  /** Những người đã gói hoặc gửi đơn này. */
  handledBy: string[];
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
  /** Tên gọi khi khách quay lại (vd. "Chị Dung", "Quân"). */
  name: string;
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
  /** Giá vốn của hàng đã bán và của hàng bị huỷ vì hết hạn. */
  costOfSales: number;
  expiredCost: number;
  /** Tổng thời gian chờ tới lúc được phục vụ, và số khách đã được phục vụ. */
  waitMsSum: number;
  servedCount: number;
  /** Tiền khách boa (đã nằm trong doanh thu) và tiền két bị cầm nhầm. */
  tips: number;
  pilfered: number;
  /** Đơn ship: giao xong, trong đó giao trễ, và bị huỷ; khách ở quầy đồng ý chờ giao / đi mua chỗ khác. */
  deliveries: number;
  lateDeliveries: number;
  cancelledDeliveries: number;
  backorders: number;
  wentElsewhere: number;
}

/** Tổng kết một ca: chênh lệch sổ sách giữa lúc vào ca và lúc giao ca. */
export interface ShiftSummary {
  shift: ShiftId;
  revenue: number;
  customers: number;
  sales: number;
  referrals: number;
  /** Khách bỏ về và khách không vào được vì hàng chờ đầy. */
  lost: number;
  /** Tên những người đã vào ca này. */
  staff: string[];
}

/** Mốc sổ sách lúc bắt đầu ca hiện tại. */
export interface ShiftMark {
  shift: ShiftId;
  stats: SimStats;
}

/** Chuẩn bị đầu ngày. `required = false` ở ngày khai trương (tiệm đã mở sẵn). */
export interface PrepState {
  required: boolean;
  openedAtMs: number | null;
  done: PrepTaskId[];
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
  /** Lãi lỗ theo hoạt động: doanh thu − giá vốn hàng bán − lương − phiếu giảm giá − hàng hết hạn. */
  costOfSales: number;
  expiredCost: number;
  vouchers: number;
  netProfit: number;
  /** Thời gian chờ trung bình tới lúc được phục vụ (null nếu chưa phục vụ ai). */
  avgWaitMs: number | null;
  /** Số việc chuẩn bị đã làm (null nếu ngày không yêu cầu chuẩn bị). */
  prepDone: number | null;
  shifts: ShiftSummary[];
  /** Điểm cửa hàng lúc chốt ngày. */
  storeRating: number;
  /** Số mục tiêu ngày đạt được (0–3), xem `dayGoals`. */
  grade: number;
  /** Tiền boa trong ngày (đã tính vào doanh thu) và số xu két thiếu khi đối soát. */
  tips: number;
  pilfered: number;
  /** Đơn ship giao xong / trễ / bị huỷ, và khách ở quầy hẹn giao sau / đi chỗ khác vì hết hàng. */
  deliveries: number;
  lateDeliveries: number;
  cancelledDeliveries: number;
  backorders: number;
  wentElsewhere: number;
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
  rng: { spawn: RngState; customer: RngState; ai: RngState; review: RngState; staff: RngState; delivery: RngState };
  nextSpawnAtMs: number;
  customers: Record<string, Customer>;
  queue: string[];
  counters: Counter[];
  workers: Record<string, Worker>;
  orders: Record<string, Order>;
  /** Đơn ship đang xử lý (chưa giao xong); lúc đơn online tiếp theo có thể rớt về. */
  deliveries: Delivery[];
  nextDeliveryAtMs: number;
  stock: Record<ProductId, StockEntry>;
  loyalty: LoyaltyProfile[];
  /** Giá bán đang áp dụng; người chơi chỉnh bằng lệnh setPrice. */
  prices: Record<ProductId, number>;
  /** Ngày hiện tại (bắt đầu từ 1) và thời điểm ngày bắt đầu. */
  day: number;
  dayStartedAtMs: number;
  dayStart: DayStart;
  dayReports: DayReport[];
  prep: PrepState;
  shiftMark: ShiftMark;
  /** Các ca đã chốt trong ngày hiện tại. */
  shiftSummaries: ShiftSummary[];
  /** Mốc sao cửa hàng đã đạt (mỗi mốc chúc mừng một lần). */
  ratingMilestones: number[];
  /** Danh sách ứng viên hôm nay (null = ô đã tuyển, trống tới ngày sau). */
  recruits: (Recruit | null)[];
  /** Ngày gần nhất đã dùng lượt làm mới danh sách có trả phí. */
  recruitRerollDay: number;
  /** Bật thì lúc đổi ca, quầy người chơi đang giữ không tự giao cho nhân viên. */
  keepCounterOnShiftChange: boolean;
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
