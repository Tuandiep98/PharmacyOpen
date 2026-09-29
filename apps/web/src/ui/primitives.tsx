import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonTone = "primary" | "secondary" | "danger" | "quiet";
type ButtonSize = "regular" | "small" | "large";

export function GameButton({
  tone = "secondary",
  size = "regular",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  children: ReactNode;
}) {
  return (
    <button
      className={`btn ${tone} ${size === "large" ? "big" : size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  children: ReactNode;
}) {
  return (
    <button className={`icon-btn ${className}`.trim()} {...props}>
      {children}
    </button>
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
