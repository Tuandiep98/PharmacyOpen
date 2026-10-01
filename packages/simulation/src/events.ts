import type { StationId } from "./content/stations";
import type { ProductId, TraitId } from "./content/types";
import type {
  DayReport,
  OperationsCaseId,
  OperationsChoiceId,
  DeliverySource,
  Grade,
  PrepTaskId,
  ShiftId,
  ShiftSummary,
} from "./types";

export type SimEvent = { at: number } & (
  | {
      type: "operationsChosen";
      incident: OperationsCaseId;
      choice: OperationsChoiceId;
      score: number;
    }
  | { type: "transferOrdered"; score: number; wagesOwed: number }
  | { type: "transferAccepted"; transfers: number }
  | { type: "customerArrived"; customerId: string }
  | { type: "customerAtCounter"; customerId: string; counterId: string }
  | {
      type: "serviceStarted";
      orderId: string;
      workerId: string;
      customerId: string;
    }
  | { type: "productPicked"; orderId: string; productId: ProductId }
  | {
      type: "wrongProduct";
      orderId: string;
      productId: ProductId;
      customerId: string;
    }
  /** productId = null khi định báo hết hàng thay vì khuyên đi khám. */
  | {
      type: "safetyWarning";
      orderId: string;
      productId: ProductId | null;
      customerId: string;
      workerId: string;
    }
  | { type: "productReady"; orderId: string; productId: ProductId }
  | {
      type: "saleCompleted";
      orderId: string;
      productId: ProductId;
      amount: number;
      tip: number;
      customerId: string;
      workerId: string;
      counterId: string;
    }
  | {
      type: "referralCompleted";
      orderId: string;
      customerId: string;
      appropriate: boolean;
    }
  | { type: "customerLeft"; customerId: string; reason: "angry" | "unserved" }
  | { type: "customerTurnedAway" }
  | {
      type: "shoplifted";
      customerId: string;
      stolen: Partial<Record<ProductId, number>>;
      units: number;
      cost: number;
    }
  | {
      type: "shoplifterSpotted";
      customerId: string;
      workerId: string;
      line: string;
    }
  | {
      type: "shoplifterConfronted";
      customerId: string;
      line: string;
      workerId: string | null;
      staffLine: string | null;
    }
  | { type: "burglaryBlocked"; durability: number; broken: boolean }
  | { type: "overnightBurglary"; cashLost: number; stockLost: number }
  | { type: "emergencyLoanTaken"; amount: number; dueDay: number }
  | { type: "loanInterestCharged"; balance: number; daysLeft: number }
  | { type: "loanRepaid"; amount: number }
  | { type: "debtSeized"; amount: number }
  | { type: "bankruptcyDeclared"; balance: number }
  | {
      type: "blindBagOpened";
      price: number;
      outcome: "trash" | "product" | "collectible";
      label: string;
      uid: string | null;
      defId: string | null;
      grade: Grade | null;
      productId: ProductId | null;
      qty: number;
      overflowCoins: number;
    }
  | {
      type: "restocked";
      productId: ProductId;
      qty: number;
      cost: number;
      workerId: string | null;
    }
  | { type: "stockExpired"; productId: ProductId; qty: number }
  | { type: "restockStarted"; productId: ProductId; workerId: string }
  | { type: "staffHired"; workerId: string; cost: number }
  | { type: "counterAssigned"; counterId: string; workerId: string | null }
  | { type: "upgradeBought"; upgradeId: string; cost: number }
  | {
      type: "reviewPosted";
      reviewId: string;
      stars: number;
      workerId: string | null;
    }
  | { type: "complaintOpened"; complaintId: string; reviewId: string }
  | { type: "complaintResolved"; complaintId: string; improved: boolean }
  | { type: "priceChanged"; productId: ProductId; price: number }
  | { type: "staffDismissed"; workerId: string; name: string }
  | { type: "dayEnded"; report: DayReport }
  | { type: "prepTaskDone"; taskId: PrepTaskId; workerId: string }
  | { type: "storeOpened"; auto: boolean; prepDone: number }
  | { type: "shiftChanged"; shift: ShiftId; previous: ShiftSummary }
  | { type: "staffScheduled"; workerId: string; shifts: ShiftId[] }
  | { type: "ratingMilestone"; stars: number }
  | { type: "staffLevelUp"; workerId: string; level: number }
  | { type: "staffSkillSlipped"; workerId: string }
  | { type: "traitRevealed"; workerId: string; traits: TraitId[] }
  | { type: "resignationRequested"; workerId: string }
  | { type: "staffRetained"; workerId: string; wage: number }
  | { type: "staffQuit"; workerId: string; name: string }
  | { type: "recruitsRefreshed"; paid: boolean }
  | { type: "recruitInterviewed"; slot: number; traits: TraitId[] }
  | { type: "restScheduled"; workerId: string; day: number | null }
  | { type: "stationAssigned"; workerId: string; station: StationId }
  /** Báo hết hàng xong: khách đồng ý chờ giao (có deliveryId) hoặc đi chỗ khác; needless = thật ra vẫn còn hàng. */
  | {
      type: "backorderDecided";
      customerId: string;
      accepted: boolean;
      deliveryId: string | null;
      dueDay: number | null;
      needless: boolean;
    }
  | {
      type: "deliveryCreated";
      deliveryId: string;
      source: DeliverySource;
      dueDay: number;
    }
  | {
      type: "deliveryItemPacked";
      deliveryId: string;
      productId: ProductId;
      workerId: string | null;
    }
  | {
      type: "chatStarted";
      customerId: string;
      workerId: string;
      storyId: string;
      resumed: boolean;
    }
  | {
      type: "chatEnded";
      customerId: string;
      workerId: string | null;
      storyId: string;
      closing: "complete" | "pause" | "yield" | "cut";
      told: number;
    }
  /** place = null khi cất món vào bộ sưu tập. */
  | { type: "itemEquipped"; uid: string; place: string | null }
  | { type: "itemRemoved"; uid: string; defId: string; coins: number }
  /** Ghép 3 món (consumed = defId món đã dùng) ra 1 món mới; pity = lần này được bảo hiểm. */
  | {
      type: "itemsFused";
      consumed: string[];
      uid: string;
      defId: string;
      grade: Grade;
      pity: boolean;
    }
  /** Thưởng mục tiêu ngày; itemUid = null nếu không rơi đồ, overflowCoins > 0 nếu bộ sưu tập đầy. */
  | {
      type: "dayRewarded";
      day: number;
      coins: number;
      itemUid: string | null;
      overflowCoins: number;
    }
  | { type: "deliveryPacked"; deliveryId: string }
  | { type: "deliverySent"; deliveryId: string; workerId: string | null }
  | { type: "deliveryPickedUp"; deliveryId: string }
  | {
      type: "deliveryCompleted";
      deliveryId: string;
      amount: number;
      late: boolean;
    }
  | {
      type: "deliveryCancelled";
      deliveryId: string;
      reason: "shop" | "overdue";
    }
);

export type SimEventType = SimEvent["type"];

/** Phân phối một kiểu con của SimEvent mà không cần tự ghi field `at`. */
export type EventInput = SimEvent extends infer E
  ? E extends SimEvent
    ? Omit<E, "at">
    : never
  : never;

export type Emit = (event: EventInput) => void;
