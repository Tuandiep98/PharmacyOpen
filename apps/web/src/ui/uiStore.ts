import type {
  DayReport,
  OfflineSummary,
  ProductId,
} from "@pharmacy/simulation";
import { create } from "zustand";
import type { CatalogCategory } from "./catalog";

export type Selection =
  | { kind: "customer"; id: string }
  | { kind: "product"; id: ProductId }
  | { kind: "worker"; id: string }
  | { kind: "counter"; id: string }
  | { kind: "deliveries" }
  | { kind: "ledger" }
  | null;

export type Tab =
  "store" | "staff" | "inventory" | "reviews" | "expansion" | "blindbag";
/** Mục con trong từng tab quản lý. */
export type StaffView = "team" | "recruit";
export type ReviewsView = "reviews" | "ranking";
export type ExpansionView = "upgrades" | "collection" | "fusion";
export type ToastTone = "good" | "bad" | "warn" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

export interface DragState {
  productId: ProductId;
  x: number;
  y: number;
  /** Con trỏ đang nằm trên vùng thả (khách ở quầy) và id quầy của vùng đó. */
  over: boolean;
  target: string | null;
}

export interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface UiState {
  tab: Tab;
  staffView: StaffView;
  reviewsView: ReviewsView;
  expansionView: ExpansionView;
  setStaffView: (view: StaffView) => void;
  setReviewsView: (view: ReviewsView) => void;
  setExpansionView: (view: ExpansionView) => void;
  /** Mở thẳng một mục con của một tab (vd. từ tổng kết ngày sang Bộ sưu tập). */
  openView: (
    view:
      | { tab: "staff"; view: StaffView }
      | { tab: "reviews"; view: ReviewsView }
      | { tab: "expansion"; view: ExpansionView }
      | { tab: "blindbag" },
  ) => void;
  selection: Selection;
  activeCounterId: string;
  setActiveCounterId: (id: string) => void;
  drag: DragState | null;
  toasts: Toast[];
  floaters: Floater[];
  /** Tổng kết lần vắng mặt gần nhất, hiện thành hộp thoại "Chào mừng trở lại". */
  offline: OfflineSummary | null;
  /** Báo cáo ngày vừa chốt, hiện thành hộp thoại tổng kết cuối ngày. */
  daySummary: DayReport | null;
  setDaySummary: (report: DayReport | null) => void;
  catalogCategory: CatalogCategory;
  catalogPage: number;
  setCatalogCategory: (category: CatalogCategory) => void;
  setCatalogPage: (page: number) => void;
  setOffline: (summary: OfflineSummary | null) => void;
  setTab: (tab: Tab) => void;
  select: (selection: Selection) => void;
  setDrag: (drag: DragState | null) => void;
  pushToast: (tone: ToastTone, text: string) => void;
  dismissToast: (id: number) => void;
  pushFloater: (text: string, x: number, y: number) => void;
  dropFloater: (id: number) => void;
}

let seq = 0;
const MAX_TOASTS = 3;
const MAX_FLOATERS = 12;
const FLOATER_TTL_MS = 1600;
const floaterTimers = new Map<number, ReturnType<typeof setTimeout>>();

function clearFloaterTimer(id: number) {
  clearTimeout(floaterTimers.get(id));
  floaterTimers.delete(id);
}

/** Chỉ chứa trạng thái giao diện; state game luôn đọc từ GameBridge, không sao chép vào đây. */
export const useUi = create<UiState>((set) => ({
  tab: "store",
  staffView: "team",
  reviewsView: "reviews",
  expansionView: "upgrades",
  setStaffView: (staffView) => set({ staffView }),
  setReviewsView: (reviewsView) => set({ reviewsView }),
  setExpansionView: (expansionView) => set({ expansionView }),
  openView: (target) =>
    set(
      target.tab === "staff"
        ? { tab: "staff", staffView: target.view }
        : target.tab === "reviews"
          ? { tab: "reviews", reviewsView: target.view }
          : target.tab === "expansion"
            ? { tab: "expansion", expansionView: target.view }
            : { tab: "blindbag" },
    ),
  selection: null,
  activeCounterId: "counter-1",
  setActiveCounterId: (activeCounterId) => set({ activeCounterId }),
  drag: null,
  toasts: [],
  floaters: [],
  offline: null,
  daySummary: null,
  setDaySummary: (daySummary) => set({ daySummary }),
  catalogCategory: "all",
  catalogPage: 0,
  setCatalogCategory: (catalogCategory) =>
    set({ catalogCategory, catalogPage: 0 }),
  setCatalogPage: (catalogPage) => set({ catalogPage }),
  setOffline: (offline) => set({ offline }),
  setTab: (tab) => set({ tab }),
  select: (selection) => set({ selection }),
  setDrag: (drag) => set({ drag }),
  pushToast: (tone, text) =>
    set((s) => ({
      toasts: [...s.toasts, { id: ++seq, tone, text }].slice(-MAX_TOASTS),
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pushFloater: (text, x, y) => {
    const id = ++seq;
    set((s) => {
      const floaters = [...s.floaters, { id, text, x, y }];
      for (const f of floaters.slice(0, -MAX_FLOATERS)) clearFloaterTimer(f.id);
      return { floaters: floaters.slice(-MAX_FLOATERS) };
    });
    // Cleanup must also work when the scene is unmounted or animation is disabled.
    floaterTimers.set(
      id,
      setTimeout(() => useUi.getState().dropFloater(id), FLOATER_TTL_MS),
    );
  },
  dropFloater: (id) => {
    clearFloaterTimer(id);
    set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) }));
  },
}));
