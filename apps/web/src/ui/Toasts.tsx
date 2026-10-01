import { useEffect, useState } from "react";
import {
  CheckIcon,
  CoinIcon,
  CrossMarkIcon,
  InfoIcon,
  WarningIcon,
} from "../art/Icons";
import { BRAND } from "../brand";
import { useUi, type Toast, type ToastTone } from "./uiStore";

/** Thời gian hiện một thông báo; thanh mảnh phía dưới cho thấy còn bao lâu thì tự đóng. */
const TOAST_MS = 3600;
/** Đóng nhanh hơn lúc hiện (UX: exit faster than enter). */
const EXIT_MS = 160;

const TONE_LABEL: Record<ToastTone, string> = {
  good: "Thành công",
  info: "Thông tin",
  warn: "Lưu ý",
  bad: "Không thực hiện được",
};

const ICON: Record<ToastTone, typeof CheckIcon> = {
  good: CheckIcon,
  info: InfoIcon,
  warn: WarningIcon,
  bad: CrossMarkIcon,
};

/**
 * Tách một câu thông báo thành tiêu đề + nội dung + số xu để phân cấp chữ, không phải sửa từng chỗ gọi:
 * "A — b" → tiêu đề A, nội dung B; "Khách: “…”" → tiêu đề Khách; "…: +30 xu." → số xu thành nhãn riêng.
 */
export function splitToast(text: string): {
  title: string;
  body?: string;
  coins?: string;
} {
  let rest = text.trim();
  let coins: string | undefined;
  const money = new RegExp(
    `[:,]?\\s*([+−-]\\s?\\d[\\d.,]*)\\s*${BRAND.currency}\\.?$`,
  ).exec(rest);
  if (money) {
    coins = money[1]!.replace(/\s/g, "").replace("-", "−");
    rest = rest.slice(0, money.index).trim();
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const dash = rest.indexOf(" — ");
  if (dash > 0)
    return {
      title: rest.slice(0, dash),
      body: cap(rest.slice(dash + 3)),
      coins,
    };
  const colon = rest.indexOf(": ");
  if (colon > 0 && colon <= 32 && colon < rest.length - 2)
    return { title: rest.slice(0, colon), body: rest.slice(colon + 2), coins };
  return { title: rest.replace(/\.$/, "") || text, coins };
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUi((s) => s.dismissToast);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setLeaving(true), TOAST_MS);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => dismiss(toast.id), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving, dismiss, toast.id]);
  const Icon = ICON[toast.tone];
  const { title, body, coins } = splitToast(toast.text);
  return (
    <div
      className={`toast-card toast ${toast.tone} ${leaving ? "leaving" : ""}`}
      role={toast.tone === "bad" ? "alert" : "status"}
      onClick={() => setLeaving(true)}
      style={{ ["--toast-ms" as string]: `${TOAST_MS}ms` }}
    >
      <span className="toast-card-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <span className="toast-card-text">
        <span className="sr-only">{TONE_LABEL[toast.tone]}: </span>
        <strong>{title}</strong>
        {body && <span>{body}</span>}
      </span>
      {coins && (
        <span
          className={`toast-card-coins ${coins.startsWith("−") ? "neg" : ""}`}
        >
          <CoinIcon size={16} />
          {coins}
        </span>
      )}
      <span className="toast-card-timer" aria-hidden />
    </div>
  );
}
