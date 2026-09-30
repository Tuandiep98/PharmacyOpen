import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./segmented.css";

/**
 * Bộ chuyển mục con trong một tab quản lý (vd. Đội ngũ | Tuyển dụng). Mỗi ô ≥ 44 px, trạng thái chọn
 * có cả màu nền lẫn gạch chân và aria-pressed; badge số luôn đi kèm chữ.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  inline = false,
  compact = false,
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode; badge?: number }[];
  onChange: (id: T) => void;
  label: string;
  /** Bộ chọn phụ nằm trong nội dung (không dính trên đầu vùng cuộn). */
  inline?: boolean;
  /**
   * Tiết kiệm chỗ khi hẹp: nếu các ô chia đều không đủ chỗ hiện hết chữ thì chỉ mục đang chọn hiện chữ,
   * mục khác còn icon + badge (chữ vẫn đọc được qua aria). Đủ chỗ thì hiện đầy đủ như thường.
   */
  compact?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [tight, setTight] = useState(false);
  const labelsKey = options.map((o) => `${o.label}:${o.badge ?? ""}`).join("|");
  useLayoutEffect(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!compact || !root || !measure) return;
    // Bản sao ẩn luôn hiện đủ chữ; các ô chia đều nên cần ô rộng nhất × số ô.
    const check = () => {
      const items = [...measure.children] as HTMLElement[];
      const widest = Math.max(0, ...items.map((el) => el.offsetWidth));
      const style = getComputedStyle(root);
      const gap = parseFloat(style.columnGap) || 0;
      const inner =
        root.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      setTight(widest * items.length + gap * (items.length - 1) > inner + 0.5);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(root);
    return () => observer.disconnect();
  }, [compact, labelsKey]);
  const isCompact = compact && tight;
  return (
    <div
      ref={rootRef}
      className={`segmented ${inline ? "inline" : ""} ${isCompact ? "compact" : ""}`}
      role="group"
      aria-label={label}
    >
      {compact && (
        <div ref={measureRef} className="segmented-measure" aria-hidden>
          {options.map((option) => (
            <span key={option.id} className="segmented-item">
              {option.icon && (
                <span className="segmented-icon">{option.icon}</span>
              )}
              <span className="segmented-label">{option.label}</span>
              {option.badge ? (
                <span className="segmented-badge">{option.badge}</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`segmented-item ${option.id === value ? "active" : ""}`}
          aria-pressed={option.id === value}
          aria-label={
            isCompact && option.id !== value
              ? `${option.label}${option.badge ? ` (${option.badge})` : ""}`
              : undefined
          }
          title={isCompact && option.id !== value ? option.label : undefined}
          onClick={() => onChange(option.id)}
        >
          {option.icon && (
            <span className="segmented-icon" aria-hidden>
              {option.icon}
            </span>
          )}
          <span className="segmented-label">{option.label}</span>
          {option.badge ? (
            <span className="segmented-badge">{option.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
