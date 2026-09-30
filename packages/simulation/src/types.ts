import type { ComplaintResponse } from "./content/reviews";
import type { BackStationId } from "./content/stations";
import type {
  ArchetypeId,
  ProductId,
  Rarity,
  ReasonCode,
  ReviewerFamiliarity,
  RequestKind,
  StaffCandidateDef,
  StaffLook,
  StaffRole,
  TraitId,
} from "./content/types";
import type { RngState } from "./rng";

export const SAVE_VERSION = 17;

/** Hạng đánh giá dùng chung cho nhân viên và đồ sưu tầm: S > A > B > C. */
export type Grade = "S" | "A" | "B" | "C";
export const GRADES: readonly Grade[] = ["S", "A", "B", "C"];

/** Nhóm tuổi của khách quen, quyết định kiểu chuyện họ hay kể. */
export type AgeGroup = "young" | "adult" | "senior";

/** Tính cách khách quen suy ra một lần khi lập hồ sơ (không tốn RNG mô phỏng). */
export interface Persona {
  age: AgeGroup;
  female: boolean;
  /** Độ cởi mở 0..1: càng cao càng hay kể chuyện và kể sâu. */
  openness: number;
}

/**
 * Một lượt trò chuyện với khách quen sau khi bán xong. Chuỗi bước: mở đầu (hoặc kể tiếp) → các đoạn
 * giữa → câu kết. Khách vẫn đứng ở quầy, người bán vẫn bận, nên khách xếp hàng phía sau phải chờ.
 */
export interface ChatState {
  storyId: string;
  /** Đoạn giữa bắt đầu ở lượt này (0 = kể từ đầu, > 0 = kể tiếp chuyện dở lần trước). */
  from: number;
  /** Số đoạn giữa dự định kể trong lượt này. */
  planned: number;
  /** Bước hiện tại: 0 = mở đầu, 1..planned = đoạn giữa, planned + 1 = câu kết. */
  step: number;
  stepMs: number;
  stepStartedAtMs: number;
  /** Cách kết thúc: kể trọn chuyện, hẹn kể tiếp, nhường khách sau, hay cắt ngang khi không ai chờ. */
  closing: "complete" | "pause" | "yield" | "cut" | null;
  /** Số đoạn giữa đã kể xong khi bước vào câu kết. */
  told: number;
}

/** Số liệu trong ngày của một người, chốt vào DayReport để xếp hạng nhân viên. */
export interface WorkerDayStat {
  sales: number;
  perfSum: number;
  perfCount: number;
  starsSum: number;
  starsCount: number;
}

export interface StaffDayRecord extends WorkerDayStat {
  workerId: string;
  name: string;
  role: StaffRole;
  level: number;
  /** Số ca đã vào làm trong ngày (người chơi tính đủ hai ca). */
  shifts: number;
}

/** Thưởng mục tiêu ngày: xu và (có thể) một món đồ sưu tầm. */
export interface DayReward {
  coins: number;
  itemUid: string | null;
}

export type CollectibleSlot = "wear" | "counter" | "shelf" | "store";
/** Chỉ số đồ sưu tầm tác động; giá trị có thể âm (đồ không hợp tiệm). */
export type CollectStat =
  | "returnChance"
  | "rating"
  | "recruitLuck"
  | "queuePatience"
  | "awareness";

export interface CollectibleItem {
  uid: string;
  defId: string;
  grade: Grade;
  effects: { stat: CollectStat; value: number }[];
  obtainedDay: number;
}

/**
 * Bộ sưu tập thuộc về người chơi, không thuộc chi nhánh: điều chuyển hay mở tiệm mới vẫn giữ.
 * `equipped`: chỗ đặt → uid (vd. "counter-1", "shelf", "store-wall", "wear:w-player").
 */
export interface CollectionState {
  items: CollectibleItem[];
  equipped: Record<string, string>;
  nextUid: number;
}

/** Hạng của tiệm trong khu vực ở lần chốt ngày gần nhất (null = chưa đủ điều kiện lên bảng). */
export interface RegionStanding {
  day: number;
  revenue: number | null;
  rating: number | null;
  staff: number | null;
}

export type OperationsCaseId =
  | "storage"
  | "supplier"
  | "staff"
  | "rumour"
  | "outage"
  | "leak"
  | "expiry"
  | "audit"
  | "queue"
  | "delivery";
export type OperationsChoiceId = "careful" | "practical" | "shortcut";

export interface OperationsState {
  /** Điểm đánh giá của quản lý vùng, 0–100. */
  score: number;
  scoreAtDayStart: number;
  /** Lựa chọn cho sự cố trong ngày; null nếu chưa xử lý. */
  choice: OperationsChoiceId | null;
  /** Hệ số khách tới trong ngày do cách xử lý sự cố. */
  demandFactor: number;
  transfers: number;
  pendingTransfer: boolean;
}

/** Hai ca trong ngày; ca chiều bắt đầu ở giữa ngày. */
export type ShiftId = "morning" | "afternoon";
export const SHIFT_IDS: readonly ShiftId[] = ["morning", "afternoon"];

/** Chuẩn bị (chưa mở cửa) → mở cửa đón khách → đóng cửa (không nhận khách mới, phục vụ nốt). */
export type DayPhase = "prep" | "open" | "closing";

/** Việc chuẩn bị đầu ngày, lấy cảm hứng từ quy trình mở ca của nhà thuốc bán lẻ. */
export type PrepTaskId = "cash" | "climate" | "expiry" | "shelves";
export const PREP_TASK_IDS: readonly PrepTaskId[] = [
  "cash",
  "climate",
  "expiry",
  "shelves",
];

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
  /**
   * Hết giờ mà còn khách trong tiệm thì tăng ca phục vụ nốt, chưa chốt ngày; trần an toàn để một
   * ngày không kéo dài mãi (khách còn lại lúc đó sang ngày sau như trước).
   */
  overtimeMaxMs: number;
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
  /** Độ nhận biết (0–100) của tiệm mới mở; khách mới ghé tăng dần theo độ nhận biết (market.ts). */
  awarenessStart: number;
  /** Hệ số khách ghé khi chưa ai biết tới tiệm (độ nhận biết 0); đạt 100 thì hệ số là 1. */
  arrivalFloor: number;
  /** Thời lượng chuẩn một bước trò chuyện với khách quen (co lại khi tiệm đông, có sàn). */
  chatStepMs: number;
  chatMinStepMs: number;
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
  | "neutral"
  | "happy"
  | "grateful"
  | "thinking"
  | "confused"
  | "impatient"
  | "angry"
  | "unwell";

export type CustomerPhase = "queue" | "counter" | "leaving";

/** backordered: hết hàng, khách đồng ý chờ đơn ship; went-elsewhere: hết hàng, khách đi mua chỗ khác. */
export type CustomerOutcome =
  | "bought"
  | "referred"
  | "left-angry"
  | "left-unserved"
  | "backordered"
  | "went-elsewhere";

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
  /** Đang trò chuyện ở quầy sau khi mua xong (chỉ khách quen). */
  chat: ChatState | null;
  /** Mức hài lòng cộng/trừ từ lượt trò chuyện, tính khi khách rời tiệm. */
  chatBonus: number;
}

export type OrderState =
  | "deciding"
  | "retrieving"
  | "ready"
  | "checkingOut"
  | "referring"
  /** Đang báo khách tạm hết hàng và hỏi có muốn chờ giao sau không. */
  | "deferring"
  /** Đã bán xong, khách quen nán lại trò chuyện (customer.chat). */
  | "chatting"
  | "done"
  | "cancelled";

/** Sự kiện khách quan của một lượt phục vụ, dùng cho hiệu suất nội bộ (bước 4). */
export type InteractionFact =
  | "correct-item"
  | "wrong-item"
  | "safety-warning"
  | "appropriate-referral"
  | "unnecessary-referral"
  | "customer-left";

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

export type WorkerExpression = "neutral" | "focused" | "happy" | "worried";

/** Việc không gắn với khách ở quầy, có thời lượng: bổ sung kệ, gói một món vào đơn ship, ghi phiếu gửi đơn. */
export type WorkerTask =
  | {
      kind: "restock";
      productId: ProductId;
      timerMs: number;
      timerTotalMs: number;
    }
  | {
      kind: "pack";
      deliveryId: string;
      productId: ProductId;
      timerMs: number;
      timerTotalMs: number;
    }
  | { kind: "label"; deliveryId: string; timerMs: number; timerTotalMs: number }
  /** Nhân viên "Siêu lười" lướt điện thoại vài giây trước khi làm việc. */
  | { kind: "slack"; timerMs: number; timerTotalMs: number };

export interface Worker {
  id: string;
  name: string;
  role: StaffRole;
  controller: "player" | "ai";
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
  /** Số liệu hôm nay (xếp hạng nhân viên), đặt lại mỗi sáng. */
  dayStat: WorkerDayStat;
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
  /** Tên ký dưới đánh giá; null = ẩn danh. Khách quen ký bằng tên gọi (vd. "Chị Dung"). */
  author: string | null;
  familiarity: ReviewerFamiliarity;
  /** Số lần khách đã ghé trước lượt được đánh giá này (0 với khách mới). */
  visits: number;
  reasons: ReasonCode[];
  /** Có tính vào danh tiếng cá nhân của workerId không (false nếu lỗi không thuộc về người đó). */
  countsForStaff: boolean;
  atMs: number;
  response: ComplaintResponse | null;
}

export interface Complaint {
  id: string;
  reviewId: string;
  status: "open" | "resolved" | "closed";
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
export type DeliverySource = "online" | "backorder";

/** Gói hàng → ghi phiếu & gửi → chờ shipper tới lấy → đang giao. Giao xong hoặc huỷ thì đơn rời danh sách. */
export type DeliveryStatus =
  "packing" | "packed" | "awaiting-pickup" | "shipping";

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
  persona: Persona;
  /** Độ thân 0–100: phục vụ đúng, chu đáo và trò chuyện làm tăng; đưa nhầm hay để khách bỏ về làm giảm. */
  rapport: number;
  /** Chuyện đang kể dở (kể tiếp ở lần ghé sau) và các chuyện đã kể trọn. */
  story: { id: string; beat: number } | null;
  storiesDone: string[];
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
  spentOnOperations: number;
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
  /** Xu thưởng mục tiêu ngày và xu bán đồ sưu tầm (thu nhập ngoài bán hàng, không tính vào lãi ròng). */
  rewardCoins: number;
  itemSales: number;
  /** Lượt trò chuyện với khách quen: bắt đầu và kể trọn chuyện. */
  chats: number;
  chatsCompleted: number;
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
  operationsCost: number;
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
  /** Điểm vận hành sau đánh giá cuối ngày. */
  operationsScore: number;
  operationsChange: number;
  incident: OperationsCaseId | null;
  incidentChoice: OperationsChoiceId | null;
  /** Số liệu từng người trong ngày (xếp hạng nhân viên toàn năng). */
  staff: StaffDayRecord[];
  /** Độ nhận biết của tiệm sau khi chốt ngày và mức thay đổi trong ngày. */
  awareness: number;
  awarenessChange: number;
  chats: number;
  chatsCompleted: number;
  reward: DayReward;
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
  rng: {
    spawn: RngState;
    customer: RngState;
    ai: RngState;
    review: RngState;
    staff: RngState;
    delivery: RngState;
    chat: RngState;
    loot: RngState;
  };
  /** Độ nhận biết 0–100: tiệm mới mở ít người biết nên khách mới ghé thưa, tăng dần theo ngày. */
  awareness: number;
  /** Hạng trong khu vực ở lần chốt ngày gần nhất (ranking.ts). */
  standing: RegionStanding;
  /** Đồ sưu tầm của người chơi (không thuộc chi nhánh, giữ qua điều chuyển). */
  collection: CollectionState;
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
  operations: OperationsState;
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
