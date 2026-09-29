import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonTone =
  "neutral" | "primary" | "secondary" | "sun" | "danger" | "quiet";
type ButtonSize = "regular" | "small" | "large";
type ButtonSurface = "raised" | "inset" | "flat" | "custom";

export function GameButton({
  tone = "neutral",
  size = "regular",
  surface = "raised",
  icon,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  surface?: ButtonSurface;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${surface === "custom" ? "" : "btn "}game-button ${tone} ${size === "large" ? "big" : size} surface-${surface} ${className}`.trim()}
      {...props}
    >
      {icon && (
        <span className="game-button-icon" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

export function IconButton({
  tone = "neutral",
  surface = "inset",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  surface?: ButtonSurface;
  "aria-label": string;
  children: ReactNode;
}) {
  return (
    <GameButton
      tone={tone}
      surface={surface}
      className={`icon-btn ${className}`.trim()}
      icon={children}
      {...props}
    />
  );
}

export function PanelHeading({
  children,
  description,
}: {
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="panel-heading">
      <h2>{children}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden>
        {icon}
      </span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
