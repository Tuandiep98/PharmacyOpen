import type { ProductId } from './content/types';
import type { DayReport } from './types';

export type SimEvent = { at: number } & (
  | { type: 'customerArrived'; customerId: string }
  | { type: 'customerAtCounter'; customerId: string; counterId: string }
  | { type: 'serviceStarted'; orderId: string; workerId: string; customerId: string }
  | { type: 'productPicked'; orderId: string; productId: ProductId }
  | { type: 'wrongProduct'; orderId: string; productId: ProductId; customerId: string }
  | { type: 'safetyWarning'; orderId: string; productId: ProductId; customerId: string; workerId: string }
  | { type: 'productReady'; orderId: string; productId: ProductId }
  | { type: 'saleCompleted'; orderId: string; productId: ProductId; amount: number; customerId: string; workerId: string }
  | { type: 'referralCompleted'; orderId: string; customerId: string; appropriate: boolean }
  | { type: 'customerLeft'; customerId: string; reason: 'angry' | 'unserved' }
  | { type: 'customerTurnedAway' }
  | { type: 'restocked'; productId: ProductId; qty: number; cost: number; workerId: string | null }
  | { type: 'restockStarted'; productId: ProductId; workerId: string }
  | { type: 'staffHired'; workerId: string; cost: number }
  | { type: 'counterAssigned'; counterId: string; workerId: string }
  | { type: 'upgradeBought'; upgradeId: string; cost: number }
  | { type: 'reviewPosted'; reviewId: string; stars: number; workerId: string | null }
  | { type: 'complaintOpened'; complaintId: string; reviewId: string }
  | { type: 'complaintResolved'; complaintId: string; improved: boolean }
  | { type: 'priceChanged'; productId: ProductId; price: number }
  | { type: 'staffDismissed'; workerId: string; name: string }
  | { type: 'dayEnded'; report: DayReport }
);

export type SimEventType = SimEvent['type'];

/** Phân phối một kiểu con của SimEvent mà không cần tự ghi field `at`. */
export type EventInput = SimEvent extends infer E ? (E extends SimEvent ? Omit<E, 'at'> : never) : never;

export type Emit = (event: EventInput) => void;
