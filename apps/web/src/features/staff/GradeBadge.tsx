import {
  GRADE_THRESHOLDS,
  staffScore,
  wageFor,
  type DeepReadonly,
  type Grade,
  type Recruit,
  type StaffScore,
  type Worker,
} from "@pharmacy/simulation";
import { useEffect, useId, useRef, useState } from "react";
import { WorkerPortrait } from "../../art/WorkerFigure";
import { BRAND } from "../../brand";
import "./staff.css";

type Gradable = DeepReadonly<Worker> | DeepReadonly<Recruit>;

const GRADE_TEXT: Record<Grade, string> = {
  S: "Xuất sắc",
  A: "Giỏi",
  B: "Khá",
  C: "Cơ bản",
};

/** Chấm hạng theo năng lực nhìn thấy (đặc điểm ẩn chưa tính). Người chơi không có hạng. */
export function gradeOf(subject: Gradable): StaffScore | null {
  if ("controller" in subject && subject.controller === "player") return null;
  return staffScore({
    role: subject.role,
    speed: subject.speed,
    knowledge: subject.knowledge,
    communication: subject.communication,
    traits: subject.traits,
    level: "level" in subject ? subject.level : 1,
  });
}

/**
 * Nút một chữ S/A/B/C dưới chân dung. Chạm mở bảng giải thích điểm năng lực (tốc độ, hiểu hàng,
 * giao tiếp, đặc điểm) và mức lương tương ứng. `static` dùng khi nằm trong một nút khác (ô chọn người).
 */
export function GradeBadge({
  subject,
  size = "md",
  static: isStatic = false,
}: {
  subject: Gradable;
  size?: "sm" | "md" | "lg";
  static?: boolean;
}) {
  const result = gradeOf(subject);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!result) return null;
  const hidden = subject.hiddenTraits.length;
  const label = `Hạng ${result.grade} (${GRADE_TEXT[result.grade]}), ${result.score} điểm năng lực`;
  if (isStatic)
    return (
      <span
        className={`grade-badge grade-${result.grade} size-${size}`}
        aria-label={label}
        title={label}
      >
        {result.grade}
      </span>
    );
  return (
    <span className="grade-anchor" ref={ref}>
      <button
        type="button"
        className={`grade-badge grade-${result.grade} size-${size}`}
        aria-label={`${label}. Chạm xem cách tính`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {result.grade}
      </button>
      {open && (
        <span className="grade-pop" id={panelId} role="dialog" aria-label="Cách tính hạng">
          <strong>
            Hạng {result.grade} · {GRADE_TEXT[result.grade]}{" "}
            <span className="muted">({result.score}/100)</span>
          </strong>
          <GradeParts score={result} />
          <span className="small muted">
            S từ {GRADE_THRESHOLDS.S} · A từ {GRADE_THRESHOLDS.A} · B từ{" "}
            {GRADE_THRESHOLDS.B} điểm. Lương theo năng lực ~
            {wageFor(result.score, subject.role)} {BRAND.currency}/ca.
          </span>
          {hidden > 0 && (
            <span className="small grade-hidden">
              Còn {hidden} đặc điểm ẩn chưa tính: lộ ra thì hạng có thể lên
              hoặc xuống.
            </span>
          )}
        </span>
      )}
    </span>
  );
}

const PART_LABEL: [keyof StaffScore["parts"], string, number][] = [
  ["knowledge", "Hiểu hàng", 34],
  ["speed", "Tốc độ", 32],
  ["communication", "Giao tiếp", 24],
];

export function GradeParts({ score }: { score: StaffScore }) {
  return (
    <span className="grade-parts">
      {PART_LABEL.map(([key, text, max]) => (
        <span key={key} className="grade-part">
          <span>{text}</span>
          <span className="grade-part-track" aria-hidden>
            <span style={{ width: `${(score.parts[key] / max) * 100}%` }} />
          </span>
          <b>
            {Math.round(score.parts[key])}/{max}
          </b>
        </span>
      ))}
      <span className="grade-part">
        <span>Đặc điểm</span>
        <span className="grade-part-track" aria-hidden>
          <span
            className={score.parts.traits < 0 ? "neg" : ""}
            style={{ width: `${(Math.abs(score.parts.traits) / 10) * 100}%` }}
          />
        </span>
        <b>
          {score.parts.traits > 0 ? "+" : ""}
          {Math.round(score.parts.traits)}
        </b>
      </span>
    </span>
  );
}

/** Chân dung + nút hạng ngay bên dưới: dùng ở mọi nơi hiện nhân viên. */
export function StaffAvatar({
  worker,
  size = 48,
  badge = "md",
  staticBadge = false,
}: {
  worker: DeepReadonly<Worker>;
  size?: number;
  badge?: "sm" | "md" | "lg";
  staticBadge?: boolean;
}) {
  return (
    <span className="staff-avatar" style={{ width: size }}>
      <WorkerPortrait worker={worker} size={size} />
      <GradeBadge subject={worker} size={badge} static={staticBadge} />
    </span>
  );
}
