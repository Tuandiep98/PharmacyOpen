import type { ReactNode } from "react";
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
}: {
  value: T;
  options: { id: T; label: string; icon?: ReactNode; badge?: number }[];
  onChange: (id: T) => void;
  label: string;
  /** Bộ chọn phụ nằm trong nội dung (không dính trên đầu vùng cuộn). */
  inline?: boolean;
}) {
  return (
    <div
      className={`segmented ${inline ? "inline" : ""}`}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`segmented-item ${option.id === value ? "active" : ""}`}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.icon && (
            <span className="segmented-icon" aria-hidden>
              {option.icon}
            </span>
          )}
          <span>{option.label}</span>
          {option.badge ? (
            <span className="segmented-badge">{option.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
